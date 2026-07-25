package com.rickchat.subscription.routes

import com.rickchat.core.model.*
import com.rickchat.subscription.model.*
import com.rickchat.subscription.service.SubscriptionService
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

class SubscriptionRoutes {
    private val subscriptionService = SubscriptionService()

    fun register(route: Route) {
        route("api/v1/subscriptions") {
            get("/plans") {
                val plans = subscriptionService.getPlans()
                call.respond(success(plans))
            }

            post {
                val userId = call.request.headers["X-User-ID"]
                    ?: return@post call.respond(HttpStatusCode.Unauthorized, error<String>("unauthorized", "Missing X-User-ID header"))
                val request = call.receive<SubscribeRequest>()
                val subscription = subscriptionService.subscribe(userId, request)
                call.respond(HttpStatusCode.Created, success(subscription))
            }

            get {
                val userId = call.request.headers["X-User-ID"]
                    ?: return@get call.respond(HttpStatusCode.Unauthorized, error<String>("unauthorized", "Missing X-User-ID header"))
                val subscription = subscriptionService.getSubscriptionByUser(userId)
                if (subscription != null) {
                    call.respond(success(subscription))
                } else {
                    call.respond(success(null))
                }
            }

            put("/{id}") {
                val userId = call.request.headers["X-User-ID"]
                    ?: return@put call.respond(HttpStatusCode.Unauthorized, error<String>("unauthorized", "Missing X-User-ID header"))
                val id = call.parameters["id"]
                    ?: return@put call.respond(HttpStatusCode.BadRequest, error<String>("missing_id", "Subscription ID required"))
                val request = call.receive<UpdateSubscriptionRequest>()
                val subscription = subscriptionService.updateSubscription(userId, id, request)
                call.respond(success(subscription))
            }

            delete("/{id}") {
                val userId = call.request.headers["X-User-ID"]
                    ?: return@delete call.respond(HttpStatusCode.Unauthorized, error<String>("unauthorized", "Missing X-User-ID header"))
                val id = call.parameters["id"]
                    ?: return@delete call.respond(HttpStatusCode.BadRequest, error<String>("missing_id", "Subscription ID required"))
                subscriptionService.cancelSubscription(userId, id)
                call.respond(success(mapOf("message" to "Subscription cancelled")))
            }
        }
    }
}
