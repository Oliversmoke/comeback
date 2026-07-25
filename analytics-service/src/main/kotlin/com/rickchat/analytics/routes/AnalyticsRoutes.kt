package com.rickchat.analytics.routes

import com.rickchat.analytics.model.TrackEventRequest
import com.rickchat.analytics.service.AnalyticsService
import com.rickchat.core.model.*
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

data class TrackPageViewRequest(
    val path: String,
    val title: String? = null,
    val referrer: String? = null,
    val duration: Long? = null,
    val sessionId: String? = null
)

class AnalyticsRoutes {
    private val analyticsService = AnalyticsService()

    fun register(route: Route) {
        route("api/v1/analytics") {
            post("/events") {
                val userId = call.request.headers["X-User-ID"]
                    ?: return@post call.respond(HttpStatusCode.Unauthorized)
                val request = call.receive<TrackEventRequest>()
                analyticsService.trackEvent(userId, request)
                call.respond(HttpStatusCode.Created, success(mapOf("message" to "Event tracked")))
            }

            post("/page-view") {
                val userId = call.request.headers["X-User-ID"]
                    ?: return@post call.respond(HttpStatusCode.Unauthorized)
                val request = call.receive<TrackPageViewRequest>()
                analyticsService.trackPageView(userId, request.path, request.title, request.referrer, request.duration, request.sessionId)
                call.respond(HttpStatusCode.Created, success(mapOf("message" to "Page view tracked")))
            }

            get("/dashboard") {
                val dashboard = analyticsService.getDashboard()
                call.respond(success(dashboard))
            }

            get("/stats") {
                val metricName = call.request.queryParameters["metric"] ?: "events"
                val fromDate = call.request.queryParameters["from"]
                    ?: return@get call.respond(HttpStatusCode.BadRequest, error<String>("missing_from", "from date required"))
                val toDate = call.request.queryParameters["to"]
                    ?: return@get call.respond(HttpStatusCode.BadRequest, error<String>("missing_to", "to date required"))
                val stats = analyticsService.getDailyStats(metricName, fromDate, toDate)
                call.respond(success(stats))
            }
        }
    }
}
