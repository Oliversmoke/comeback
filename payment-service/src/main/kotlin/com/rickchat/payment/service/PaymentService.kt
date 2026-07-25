package com.rickchat.payment.service

import com.rickchat.core.error.NotFoundException
import com.rickchat.core.model.PaginationMeta
import com.rickchat.payment.model.*
import org.jetbrains.exposed.sql.transactions.transaction
import java.util.UUID

class PaymentService {

    fun createPayment(userId: String, request: PaymentRequest): PaymentResponse {
        val paymentId = "pay_${UUID.randomUUID().toString().take(24)}"
        val fee = (request.amount * 0.029 + 0.30).let { String.format("%.2f", it).toDouble() }
        val netAmount = String.format("%.2f", request.amount - fee).toDouble()

        transaction {
            exec(
                """INSERT INTO payments (id, user_id, amount, currency, fee, net_amount, status, provider, description, metadata, created_at)
                   VALUES ('$paymentId', '$userId', ${request.amount}, '${request.currency}', $fee, $netAmount,
                           'pending', NULL, ${if (request.description != null) "'${request.description.replace("'", "''")}'" else "NULL"},
                           ${if (request.metadata != null) "'${serializeJsonMap(request.metadata)}'" else "NULL"}, NOW())"""
            )

            if (request.itemType != null || request.itemId != null) {
                val itemId = "pitem_${UUID.randomUUID().toString().take(24)}"
                val itemName = request.itemName ?: request.itemType ?: "item"
                exec(
                    """INSERT INTO payment_items (id, payment_id, item_type, item_id, item_name, quantity, unit_price, total_price)
                       VALUES ('$itemId', '$paymentId', ${if (request.itemType != null) "'${request.itemType}'" else "NULL"},
                               ${if (request.itemId != null) "'${request.itemId}'" else "NULL"},
                               '${itemName.replace("'", "''")}', 1, ${request.amount}, ${request.amount})"""
                )
            }
        }

        return getPayment(paymentId, userId)
    }

    fun getPayment(id: String, userId: String): PaymentResponse {
        return transaction {
            exec(
                """SELECT p.*, COALESCE(json_agg(json_build_object(
                       'id', pi.id, 'item_type', pi.item_type, 'item_id', pi.item_id,
                       'item_name', pi.item_name, 'quantity', pi.quantity,
                       'unit_price', pi.unit_price, 'total_price', pi.total_price
                   )) FILTER (WHERE pi.id IS NOT NULL), '[]') as items_json
                   FROM payments p
                   LEFT JOIN payment_items pi ON pi.payment_id = p.id
                   WHERE p.id = '$id' AND p.user_id = '$userId'
                   GROUP BY p.id"""
            ) {
                if (it.next()) mapToPaymentResponse(it)
                else throw NotFoundException("Payment", id)
            }
        }
    }

    fun listPayments(userId: String, page: Int, limit: Int): Pair<List<PaymentResponse>, PaginationMeta> {
        val offset = (page - 1) * limit
        return transaction {
            val total = exec("SELECT COUNT(*) FROM payments WHERE user_id = '$userId'") {
                if (it.next()) it.getLong(1) else 0L
            }

            val payments = exec(
                """SELECT p.*, COALESCE(json_agg(json_build_object(
                       'id', pi.id, 'item_type', pi.item_type, 'item_id', pi.item_id,
                       'item_name', pi.item_name, 'quantity', pi.quantity,
                       'unit_price', pi.unit_price, 'total_price', pi.total_price
                   )) FILTER (WHERE pi.id IS NOT NULL), '[]') as items_json
                   FROM payments p
                   LEFT JOIN payment_items pi ON pi.payment_id = p.id
                   WHERE p.user_id = '$userId'
                   GROUP BY p.id
                   ORDER BY p.created_at DESC
                   LIMIT $limit OFFSET $offset"""
            ) {
                val list = mutableListOf<PaymentResponse>()
                while (it.next()) list.add(mapToPaymentResponse(it))
                list
            }

            val totalPages = ((total + limit - 1) / limit).toInt()
            payments to PaginationMeta(
                page = page, limit = limit, total = total,
                totalPages = totalPages,
                hasNext = page < totalPages,
                hasPrevious = page > 1
            )
        }
    }

    fun refundPayment(id: String, userId: String, request: RefundRequest) {
        transaction {
            val existing = exec(
                "SELECT status FROM payments WHERE id = '$id' AND user_id = '$userId'"
            ) {
                if (it.next()) it.getString("status") else throw NotFoundException("Payment", id)
            }
            if (existing != "completed") throw IllegalStateException("Payment is not in a refundable state")

            val refundReason = request.reason?.replace("'", "''")
            exec(
                """UPDATE payments SET status = 'refunded', updated_at = NOW()
                   WHERE id = '$id' AND user_id = '$userId'"""
            )
            exec(
                """INSERT INTO payment_refunds (id, payment_id, amount, reason, created_at)
                   VALUES ('ref_${UUID.randomUUID().toString().take(24)}', '$id',
                           ${request.amount ?: "NULL"},
                           ${if (refundReason != null) "'$refundReason'" else "NULL"}, NOW())"""
            )
        }
    }

    fun addPaymentMethod(userId: String, request: PaymentMethodRequest): PaymentMethodResponse {
        val methodId = "pm_${UUID.randomUUID().toString().take(24)}"

        transaction {
            if (request.isDefault) {
                exec("UPDATE payment_methods SET is_default = FALSE WHERE user_id = '$userId'")
            }
            exec(
                """INSERT INTO payment_methods (id, user_id, provider, provider_payment_method_id, type,
                   last_four, expiry_month, expiry_year, cardholder_name, is_default, created_at)
                   VALUES ('$methodId', '$userId', '${request.provider}', '${request.providerPaymentMethodId}',
                           '${request.type}', ${if (request.lastFour != null) "'${request.lastFour}'" else "NULL"},
                           ${request.expiryMonth ?: "NULL"}, ${request.expiryYear ?: "NULL"},
                           ${if (request.cardholderName != null) "'${request.cardholderName.replace("'", "''")}'" else "NULL"},
                           ${request.isDefault}, NOW())"""
            )
        }

        return getPaymentMethod(methodId, userId)
    }

    fun getPaymentMethods(userId: String): List<PaymentMethodResponse> {
        return transaction {
            exec(
                """SELECT id, user_id, provider, type, last_four, is_default, created_at
                   FROM payment_methods WHERE user_id = '$userId'
                   ORDER BY is_default DESC, created_at DESC"""
            ) {
                val list = mutableListOf<PaymentMethodResponse>()
                while (it.next()) {
                    list.add(
                        PaymentMethodResponse(
                            id = it.getString("id"),
                            userId = it.getString("user_id"),
                            provider = it.getString("provider"),
                            type = it.getString("type"),
                            lastFour = it.getString("last_four"),
                            isDefault = it.getBoolean("is_default"),
                            createdAt = it.getTimestamp("created_at").toString()
                        )
                    )
                }
                list
            }
        }
    }

    fun deletePaymentMethod(id: String, userId: String) {
        transaction {
            val deleted = exec("DELETE FROM payment_methods WHERE id = '$id' AND user_id = '$userId'")
            if (deleted == 0) throw NotFoundException("PaymentMethod", id)
        }
    }

    fun getRevenueShares(creatorId: String, page: Int, limit: Int): Pair<List<RevenueShareResponse>, PaginationMeta> {
        val offset = (page - 1) * limit
        return transaction {
            val total = exec("SELECT COUNT(*) FROM revenue_shares WHERE creator_id = '$creatorId'") {
                if (it.next()) it.getLong(1) else 0L
            }

            val shares = exec(
                """SELECT id, payment_id, creator_id, amount, percentage, status, paid_at
                   FROM revenue_shares WHERE creator_id = '$creatorId'
                   ORDER BY COALESCE(paid_at, created_at) DESC
                   LIMIT $limit OFFSET $offset"""
            ) {
                val list = mutableListOf<RevenueShareResponse>()
                while (it.next()) {
                    list.add(
                        RevenueShareResponse(
                            id = it.getString("id"),
                            paymentId = it.getString("payment_id"),
                            creatorId = it.getString("creator_id"),
                            amount = it.getDouble("amount"),
                            percentage = it.getDouble("percentage"),
                            status = it.getString("status"),
                            paidAt = it.getTimestamp("paid_at")?.toString()
                        )
                    )
                }
                list
            }

            val totalPages = ((total + limit - 1) / limit).toInt()
            shares to PaginationMeta(
                page = page, limit = limit, total = total,
                totalPages = totalPages,
                hasNext = page < totalPages,
                hasPrevious = page > 1
            )
        }
    }

    private fun getPaymentMethod(methodId: String, userId: String): PaymentMethodResponse {
        return transaction {
            exec(
                """SELECT id, user_id, provider, type, last_four, is_default, created_at
                   FROM payment_methods WHERE id = '$methodId' AND user_id = '$userId'"""
            ) {
                if (it.next()) {
                    PaymentMethodResponse(
                        id = it.getString("id"),
                        userId = it.getString("user_id"),
                        provider = it.getString("provider"),
                        type = it.getString("type"),
                        lastFour = it.getString("last_four"),
                        isDefault = it.getBoolean("is_default"),
                        createdAt = it.getTimestamp("created_at").toString()
                    )
                } else throw NotFoundException("PaymentMethod", methodId)
            }
        }
    }

    private fun mapToPaymentResponse(rs: java.sql.ResultSet): PaymentResponse {
        return PaymentResponse(
            id = rs.getString("id"),
            userId = rs.getString("user_id"),
            amount = rs.getDouble("amount"),
            currency = rs.getString("currency"),
            fee = rs.getDouble("fee"),
            netAmount = rs.getDouble("net_amount"),
            status = rs.getString("status"),
            provider = rs.getString("provider"),
            description = rs.getString("description"),
            items = parseItemsJson(rs.getString("items_json")),
            createdAt = rs.getTimestamp("created_at").toString()
        )
    }

    private fun parseItemsJson(json: String?): List<PaymentItemResponse> {
        if (json.isNullOrBlank() || json == "[]") return emptyList()
        return try {
            kotlinx.serialization.json.Json.decodeFromString<List<PaymentItemResponse>>(json)
        } catch (e: Exception) { emptyList() }
    }

    private fun serializeJsonMap(map: Map<String, String>): String {
        return kotlinx.serialization.json.Json.encodeToString(map)
    }
}
