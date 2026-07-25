package com.rickchat.notification.routes

import com.rickchat.core.model.*
import com.rickchat.notification.model.*
import com.rickchat.notification.service.NotificationService
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.put
import io.ktor.server.routing.route

class NotificationRoutes {
    private val notificationService = NotificationService()

    fun register(route: Route) {
        route("api/v1/notifications") {
            get {
                val userId = call.request.headers["X-User-ID"]
                    ?: return@get call.respond(HttpStatusCode.Unauthorized, error<String>("unauthorized", "Missing X-User-ID header"))
                val page = call.request.queryParameters["page"]?.toIntOrNull() ?: 1
                val limit = call.request.queryParameters["limit"]?.toIntOrNull() ?: 20
                val unreadOnly = call.request.queryParameters["unread_only"]?.toBooleanStrictOrNull()
                val (notifications, meta) = notificationService.getNotifications(userId, page, limit, unreadOnly)
                call.respond(success(notifications, meta))
            }

            put("/read-all") {
                val userId = call.request.headers["X-User-ID"]
                    ?: return@put call.respond(HttpStatusCode.Unauthorized, error<String>("unauthorized", "Missing X-User-ID header"))
                notificationService.markAllAsRead(userId)
                call.respond(success(mapOf("message" to "All notifications marked as read")))
            }

            post("/send") {
                val request = call.receive<SendNotificationRequest>()
                notificationService.sendNotification(request)
                call.respond(success(mapOf("message" to "Notification sent")))
            }

            post("/devices") {
                val userId = call.request.headers["X-User-ID"]
                    ?: return@post call.respond(HttpStatusCode.Unauthorized, error<String>("unauthorized", "Missing X-User-ID header"))
                val request = call.receive<DeviceTokenRequest>()
                notificationService.registerDevice(userId, request)
                call.respond(success(mapOf("message" to "Device registered")))
            }

            get("/stats") {
                val userId = call.request.headers["X-User-ID"]
                    ?: return@get call.respond(HttpStatusCode.Unauthorized, error<String>("unauthorized", "Missing X-User-ID header"))
                val stats = notificationService.getStats(userId)
                call.respond(success(stats))
            }

            put("/{id}/read") {
                val userId = call.request.headers["X-User-ID"]
                    ?: return@put call.respond(HttpStatusCode.Unauthorized, error<String>("unauthorized", "Missing X-User-ID header"))
                val id = call.parameters["id"]
                    ?: return@put call.respond(HttpStatusCode.BadRequest, error<String>("missing_id", "Notification ID required"))
                notificationService.markAsRead(userId, id)
                call.respond(success(mapOf("message" to "Notification marked as read")))
            }

            delete("/{id}") {
                val userId = call.request.headers["X-User-ID"]
                    ?: return@delete call.respond(HttpStatusCode.Unauthorized, error<String>("unauthorized", "Missing X-User-ID header"))
                val id = call.parameters["id"]
                    ?: return@delete call.respond(HttpStatusCode.BadRequest, error<String>("missing_id", "Notification ID required"))
                notificationService.deleteNotification(userId, id)
                call.respond(success(mapOf("message" to "Notification deleted")))
            }
        }
    }
}
