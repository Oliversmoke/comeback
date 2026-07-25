package com.rickchat.subscription.service

import com.rickchat.core.error.NotFoundException
import com.rickchat.core.model.PaginationMeta
import com.rickchat.subscription.model.*
import org.jetbrains.exposed.sql.transactions.transaction
import java.util.UUID

class SubscriptionService {

    fun getPlans(): List<PlanResponse> {
        return transaction {
            exec(
                """SELECT id, name, description, price, currency, interval, features, limits, is_active, sort_order
                   FROM subscription_plans WHERE is_active = TRUE
                   ORDER BY sort_order ASC, price ASC"""
            ) {
                val list = mutableListOf<PlanResponse>()
                while (it.next()) {
                    list.add(
                        PlanResponse(
                            id = it.getString("id"),
                            name = it.getString("name"),
                            description = it.getString("description"),
                            price = it.getDouble("price"),
                            currency = it.getString("currency"),
                            interval = it.getString("interval"),
                            features = parseStringArray(it.getString("features")),
                            limits = parseLimitsJson(it.getString("limits")),
                            isActive = it.getBoolean("is_active"),
                            sortOrder = it.getInt("sort_order")
                        )
                    )
                }
                list
            }
        }
    }

    fun subscribe(userId: String, request: SubscribeRequest): SubscriptionResponse {
        val subscriptionId = "sub_${UUID.randomUUID().toString().take(24)}"

        transaction {
            exec(
                """INSERT INTO subscriptions (id, user_id, plan_id, status, provider, provider_subscription_id,
                   current_period_start, current_period_end, trial_end, cancel_at_period_end, created_at)
                   VALUES ('$subscriptionId', '$userId', '${request.planId}', 'active',
                           ${if (request.provider != null) "'${request.provider}'" else "NULL"},
                           ${if (request.providerSubscriptionId != null) "'${request.providerSubscriptionId}'" else "NULL"},
                           NOW(), NOW() + INTERVAL '1 month', NULL, FALSE, NOW())
                   ON CONFLICT (user_id) WHERE status IN ('active', 'trialing')
                   DO UPDATE SET plan_id = EXCLUDED.plan_id, status = 'active',
                       current_period_start = NOW(), current_period_end = NOW() + INTERVAL '1 month',
                       updated_at = NOW()"""
            )
        }

        return getSubscription(subscriptionId)
    }

    fun getSubscriptionByUser(userId: String): SubscriptionResponse? {
        return transaction {
            exec(
                """SELECT s.*, p.name as plan_name
                   FROM subscriptions s
                   LEFT JOIN subscription_plans p ON p.id = s.plan_id
                   WHERE s.user_id = '$userId'
                   ORDER BY s.created_at DESC LIMIT 1"""
            ) {
                if (it.next()) {
                    SubscriptionResponse(
                        id = it.getString("id"),
                        userId = it.getString("user_id"),
                        planId = it.getString("plan_id"),
                        planName = it.getString("plan_name"),
                        status = it.getString("status"),
                        currentPeriodStart = it.getTimestamp("current_period_start")?.toString(),
                        currentPeriodEnd = it.getTimestamp("current_period_end")?.toString(),
                        trialEnd = it.getTimestamp("trial_end")?.toString(),
                        cancelAtPeriodEnd = it.getBoolean("cancel_at_period_end"),
                        createdAt = it.getTimestamp("created_at").toString()
                    )
                } else null
            }
        }
    }

    fun getSubscription(id: String): SubscriptionResponse {
        return transaction {
            exec(
                """SELECT s.*, p.name as plan_name
                   FROM subscriptions s
                   LEFT JOIN subscription_plans p ON p.id = s.plan_id
                   WHERE s.id = '$id'"""
            ) {
                if (it.next()) {
                    SubscriptionResponse(
                        id = it.getString("id"),
                        userId = it.getString("user_id"),
                        planId = it.getString("plan_id"),
                        planName = it.getString("plan_name"),
                        status = it.getString("status"),
                        currentPeriodStart = it.getTimestamp("current_period_start")?.toString(),
                        currentPeriodEnd = it.getTimestamp("current_period_end")?.toString(),
                        trialEnd = it.getTimestamp("trial_end")?.toString(),
                        cancelAtPeriodEnd = it.getBoolean("cancel_at_period_end"),
                        createdAt = it.getTimestamp("created_at").toString()
                    )
                } else throw NotFoundException("Subscription", id)
            }
        }
    }

    fun updateSubscription(userId: String, id: String, request: UpdateSubscriptionRequest): SubscriptionResponse {
        val updates = mutableListOf<String>()

        if (request.status != null) updates.add("status = '${request.status}'")
        if (request.cancelAtPeriodEnd != null) updates.add("cancel_at_period_end = ${request.cancelAtPeriodEnd}")

        if (updates.isEmpty()) return getSubscription(id)

        transaction {
            exec(
                """UPDATE subscriptions SET ${updates.joinToString(", ")}, updated_at = NOW()
                   WHERE id = '$id' AND user_id = '$userId'"""
            )
        }

        return getSubscription(id)
    }

    fun cancelSubscription(userId: String, id: String) {
        transaction {
            val updated = exec(
                """UPDATE subscriptions SET status = 'cancelled', cancel_at_period_end = FALSE, updated_at = NOW()
                   WHERE id = '$id' AND user_id = '$userId'"""
            )
            if (updated == 0) throw NotFoundException("Subscription", id)
        }
    }

    fun listSubscriptions(page: Int, limit: Int): Pair<List<SubscriptionResponse>, PaginationMeta> {
        val offset = (page - 1) * limit
        return transaction {
            val total = exec("SELECT COUNT(*) FROM subscriptions") {
                if (it.next()) it.getLong(1) else 0L
            }

            val subscriptions = exec(
                """SELECT s.*, p.name as plan_name
                   FROM subscriptions s
                   LEFT JOIN subscription_plans p ON p.id = s.plan_id
                   ORDER BY s.created_at DESC
                   LIMIT $limit OFFSET $offset"""
            ) {
                val list = mutableListOf<SubscriptionResponse>()
                while (it.next()) {
                    list.add(
                        SubscriptionResponse(
                            id = it.getString("id"),
                            userId = it.getString("user_id"),
                            planId = it.getString("plan_id"),
                            planName = it.getString("plan_name"),
                            status = it.getString("status"),
                            currentPeriodStart = it.getTimestamp("current_period_start")?.toString(),
                            currentPeriodEnd = it.getTimestamp("current_period_end")?.toString(),
                            trialEnd = it.getTimestamp("trial_end")?.toString(),
                            cancelAtPeriodEnd = it.getBoolean("cancel_at_period_end"),
                            createdAt = it.getTimestamp("created_at").toString()
                        )
                    )
                }
                list
            }

            val totalPages = ((total + limit - 1) / limit).toInt()
            subscriptions to PaginationMeta(
                page = page, limit = limit, total = total,
                totalPages = totalPages,
                hasNext = page < totalPages,
                hasPrevious = page > 1
            )
        }
    }

    private fun parseStringArray(value: String?): List<String> {
        if (value.isNullOrBlank()) return emptyList()
        return try {
            value.removeSurrounding("{", "}")
                .split(",")
                .map { it.trim().removeSurrounding("\"") }
                .filter { it.isNotBlank() }
        } catch (e: Exception) { emptyList() }
    }

    private fun parseLimitsJson(value: String?): Map<String, Int>? {
        if (value.isNullOrBlank()) return null
        return try {
            kotlinx.serialization.json.Json.decodeFromString<Map<String, Int>>(value)
        } catch (e: Exception) { null }
    }
}
