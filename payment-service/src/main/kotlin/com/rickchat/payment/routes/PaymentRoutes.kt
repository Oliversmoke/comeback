package com.rickchat.payment.routes

import com.rickchat.core.model.*
import com.rickchat.payment.model.*
import com.rickchat.payment.service.PaymentService
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

class PaymentRoutes {
    private val paymentService = PaymentService()

    fun register(route: Route) {
        route("api/v1/payments") {
            post {
                val userId = call.request.headers["X-User-ID"]
                    ?: return@post call.respond(HttpStatusCode.Unauthorized, error<String>("unauthorized", "Missing X-User-ID header"))
                val request = call.receive<PaymentRequest>()
                val payment = paymentService.createPayment(userId, request)
                call.respond(HttpStatusCode.Created, success(payment))
            }

            get {
                val userId = call.request.headers["X-User-ID"]
                    ?: return@get call.respond(HttpStatusCode.Unauthorized, error<String>("unauthorized", "Missing X-User-ID header"))
                val page = call.request.queryParameters["page"]?.toIntOrNull() ?: 1
                val limit = call.request.queryParameters["limit"]?.toIntOrNull() ?: 20
                val (payments, meta) = paymentService.listPayments(userId, page, limit)
                call.respond(success(payments, meta))
            }

            get("/{id}") {
                val userId = call.request.headers["X-User-ID"]
                    ?: return@get call.respond(HttpStatusCode.Unauthorized, error<String>("unauthorized", "Missing X-User-ID header"))
                val id = call.parameters["id"]
                    ?: return@get call.respond(HttpStatusCode.BadRequest, error<String>("missing_id", "Payment ID required"))
                val payment = paymentService.getPayment(id, userId)
                call.respond(success(payment))
            }

            post("/{id}/refund") {
                val userId = call.request.headers["X-User-ID"]
                    ?: return@post call.respond(HttpStatusCode.Unauthorized, error<String>("unauthorized", "Missing X-User-ID header"))
                val id = call.parameters["id"]
                    ?: return@post call.respond(HttpStatusCode.BadRequest, error<String>("missing_id", "Payment ID required"))
                val request = call.receive<RefundRequest>()
                paymentService.refundPayment(id, userId, request)
                call.respond(success(mapOf("message" to "Payment refunded")))
            }

            route("methods") {
                post {
                    val userId = call.request.headers["X-User-ID"]
                        ?: return@post call.respond(HttpStatusCode.Unauthorized, error<String>("unauthorized", "Missing X-User-ID header"))
                    val request = call.receive<PaymentMethodRequest>()
                    val method = paymentService.addPaymentMethod(userId, request)
                    call.respond(HttpStatusCode.Created, success(method))
                }

                get {
                    val userId = call.request.headers["X-User-ID"]
                        ?: return@get call.respond(HttpStatusCode.Unauthorized, error<String>("unauthorized", "Missing X-User-ID header"))
                    val methods = paymentService.getPaymentMethods(userId)
                    call.respond(success(methods))
                }

                delete("/{id}") {
                    val userId = call.request.headers["X-User-ID"]
                        ?: return@delete call.respond(HttpStatusCode.Unauthorized, error<String>("unauthorized", "Missing X-User-ID header"))
                    val id = call.parameters["id"]
                        ?: return@delete call.respond(HttpStatusCode.BadRequest, error<String>("missing_id", "Payment method ID required"))
                    paymentService.deletePaymentMethod(id, userId)
                    call.respond(success(mapOf("message" to "Payment method deleted")))
                }
            }

            get("/revenue") {
                val userId = call.request.headers["X-User-ID"]
                    ?: return@get call.respond(HttpStatusCode.Unauthorized, error<String>("unauthorized", "Missing X-User-ID header"))
                val page = call.request.queryParameters["page"]?.toIntOrNull() ?: 1
                val limit = call.request.queryParameters["limit"]?.toIntOrNull() ?: 20
                val (shares, meta) = paymentService.getRevenueShares(userId, page, limit)
                call.respond(success(shares, meta))
            }
        }
    }
}
