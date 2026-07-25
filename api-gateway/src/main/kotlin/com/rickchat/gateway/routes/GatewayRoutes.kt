package com.rickchat.gateway.routes

import com.rickchat.core.config.AppConfig
import com.rickchat.core.model.success
import com.rickchat.core.security.JwtService
import com.rickchat.core.security.RateLimiter
import io.ktor.client.HttpClient
import io.ktor.client.engine.cio.CIO
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.server.application.ApplicationCall
import io.ktor.server.auth.authenticate
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import kotlinx.serialization.json.Json
import org.koin.ktor.ext.inject

class GatewayRoutes {
    private val client = HttpClient(CIO)
    private val json = Json { ignoreUnknownKeys = true }

    private val serviceRegistry = mapOf(
        "auth" to "http://localhost:8081",
        "users" to "http://localhost:8082",
        "chat" to "http://localhost:8083",
        "ai" to "http://localhost:8084",
        "memory" to "http://localhost:8085",
        "marketplace" to "http://localhost:8086",
        "learning" to "http://localhost:8087",
        "translation" to "http://localhost:8088",
        "accessibility" to "http://localhost:8089",
        "camera" to "http://localhost:8090",
        "voice" to "http://localhost:8091",
        "notifications" to "http://localhost:8092",
        "payments" to "http://localhost:8093",
        "subscriptions" to "http://localhost:8094",
        "files" to "http://localhost:8095",
        "analytics" to "http://localhost:8096",
        "admin" to "http://localhost:8097"
    )

    fun register(route: Route) {
        route {
            get("/health") {
                call.respond(success(mapOf("status" to "healthy", "service" to "api-gateway")))
            }

            // Auth routes
            route("auth") {
                post("/register") { proxy(call, "auth", "/api/v1/auth/register") }
                post("/login") { proxy(call, "auth", "/api/v1/auth/login") }
                post("/refresh") { proxy(call, "auth", "/api/v1/auth/refresh") }
                post("/logout") { proxy(call, "auth", "/api/v1/auth/logout") }
                post("/reset-password") { proxy(call, "auth", "/api/v1/auth/reset-password") }
                post("/verify-email") { proxy(call, "auth", "/api/v1/auth/verify-email") }
                post("/oauth/{provider}") { proxy(call, "auth", "/api/v1/auth/oauth/${call.parameters["provider"]}") }
            }

            // User routes
            authenticate {
                route("users") {
                    get("/me") { proxy(call, "users", "/api/v1/users/me") }
                    get("/{id}") { proxy(call, "users", "/api/v1/users/${call.parameters["id"]}") }
                    post { proxy(call, "users", "/api/v1/users") }
                    put("/{id}") { proxy(call, "users", "/api/v1/users/${call.parameters["id"]}") }
                    delete("/{id}") { proxy(call, "users", "/api/v1/users/${call.parameters["id"]}") }
                }
            }

            // Chat routes
            authenticate {
                route("chat") {
                    get { proxy(call, "chat", "/api/v1/chat") }
                    get("/{id}") { proxy(call, "chat", "/api/v1/chat/${call.parameters["id"]}") }
                    post { proxy(call, "chat", "/api/v1/chat") }
                    put("/{id}") { proxy(call, "chat", "/api/v1/chat/${call.parameters["id"]}") }
                    delete("/{id}") { proxy(call, "chat", "/api/v1/chat/${call.parameters["id"]}") }
                    get("/{id}/messages") { proxy(call, "chat", "/api/v1/chat/${call.parameters["id"]}/messages") }
                    post("/{id}/messages") { proxy(call, "chat", "/api/v1/chat/${call.parameters["id"]}/messages") }
                }
            }

            // AI routes
            authenticate {
                route("ai") {
                    post("/chat") { proxy(call, "ai", "/api/v1/ai/chat") }
                    post("/complete") { proxy(call, "ai", "/api/v1/ai/complete") }
                    post("/embed") { proxy(call, "ai", "/api/v1/ai/embed") }
                    get("/models") { proxy(call, "ai", "/api/v1/ai/models") }
                }
            }

            // Memory routes
            authenticate {
                route("memory") {
                    get { proxy(call, "memory", "/api/v1/memory") }
                    get("/{id}") { proxy(call, "memory", "/api/v1/memory/${call.parameters["id"]}") }
                    post { proxy(call, "memory", "/api/v1/memory") }
                    put("/{id}") { proxy(call, "memory", "/api/v1/memory/${call.parameters["id"]}") }
                    delete("/{id}") { proxy(call, "memory", "/api/v1/memory/${call.parameters["id"]}") }
                    get("/search") { proxy(call, "memory", "/api/v1/memory/search") }
                }
            }

            // Marketplace routes
            authenticate {
                route("marketplace") {
                    get { proxy(call, "marketplace", "/api/v1/marketplace") }
                    get("/{id}") { proxy(call, "marketplace", "/api/v1/marketplace/${call.parameters["id"]}") }
                    post { proxy(call, "marketplace", "/api/v1/marketplace") }
                    put("/{id}") { proxy(call, "marketplace", "/api/v1/marketplace/${call.parameters["id"]}") }
                    delete("/{id}") { proxy(call, "marketplace", "/api/v1/marketplace/${call.parameters["id"]}") }
                    get("/{id}/reviews") { proxy(call, "marketplace", "/api/v1/marketplace/${call.parameters["id"]}/reviews") }
                    post("/{id}/reviews") { proxy(call, "marketplace", "/api/v1/marketplace/${call.parameters["id"]}/reviews") }
                    get("/{id}/download") { proxy(call, "marketplace", "/api/v1/marketplace/${call.parameters["id"]}/download") }
                }
            }

            // Learning routes
            authenticate {
                route("learning") {
                    get("/courses") { proxy(call, "learning", "/api/v1/learning/courses") }
                    get("/courses/{id}") { proxy(call, "learning", "/api/v1/learning/courses/${call.parameters["id"]}") }
                    post("/courses") { proxy(call, "learning", "/api/v1/learning/courses") }
                    get("/enrollments") { proxy(call, "learning", "/api/v1/learning/enrollments") }
                    post("/enrollments") { proxy(call, "learning", "/api/v1/learning/enrollments") }
                    get("/progress") { proxy(call, "learning", "/api/v1/learning/progress") }
                    post("/quiz/{id}/submit") { proxy(call, "learning", "/api/v1/learning/quiz/${call.parameters["id"]}/submit") }
                }
            }

            // Translation routes
            authenticate {
                route("translate") {
                    post { proxy(call, "translation", "/api/v1/translate") }
                    get("/languages") { proxy(call, "translation", "/api/v1/translate/languages") }
                }
            }

            // Notification routes
            authenticate {
                route("notifications") {
                    get { proxy(call, "notifications", "/api/v1/notifications") }
                    put("/{id}/read") { proxy(call, "notifications", "/api/v1/notifications/${call.parameters["id"]}/read") }
                    put("/read-all") { proxy(call, "notifications", "/api/v1/notifications/read-all") }
                }
            }

            // Payment routes
            authenticate {
                route("payments") {
                    get { proxy(call, "payments", "/api/v1/payments") }
                    post { proxy(call, "payments", "/api/v1/payments") }
                    get("/{id}") { proxy(call, "payments", "/api/v1/payments/${call.parameters["id"]}") }
                    post("/{id}/refund") { proxy(call, "payments", "/api/v1/payments/${call.parameters["id"]}/refund") }
                }
            }

            // Subscription routes
            authenticate {
                route("subscriptions") {
                    get { proxy(call, "subscriptions", "/api/v1/subscriptions") }
                    post { proxy(call, "subscriptions", "/api/v1/subscriptions") }
                    get("/plans") { proxy(call, "subscriptions", "/api/v1/subscriptions/plans") }
                    put("/{id}") { proxy(call, "subscriptions", "/api/v1/subscriptions/${call.parameters["id"]}") }
                    delete("/{id}") { proxy(call, "subscriptions", "/api/v1/subscriptions/${call.parameters["id"]}") }
                }
            }

            // File routes
            authenticate {
                route("files") {
                    get { proxy(call, "files", "/api/v1/files") }
                    post("/upload") { proxy(call, "files", "/api/v1/files/upload") }
                    get("/{id}") { proxy(call, "files", "/api/v1/files/${call.parameters["id"]}") }
                    delete("/{id}") { proxy(call, "files", "/api/v1/files/${call.parameters["id"]}") }
                }
            }

            // Analytics routes
            authenticate {
                route("analytics") {
                    post("/events") { proxy(call, "analytics", "/api/v1/analytics/events") }
                    get("/dashboard") { proxy(call, "analytics", "/api/v1/analytics/dashboard") }
                }
            }

            // Admin routes
            authenticate {
                route("admin") {
                    get("/dashboard") { proxy(call, "admin", "/api/v1/admin/dashboard") }
                    get("/users") { proxy(call, "admin", "/api/v1/admin/users") }
                    post("/users/{id}/action") { proxy(call, "admin", "/api/v1/admin/users/${call.parameters["id"]}/action") }
                    get("/reports") { proxy(call, "admin", "/api/v1/admin/reports") }
                    get("/logs") { proxy(call, "admin", "/api/v1/admin/logs") }
                    get("/config") { proxy(call, "admin", "/api/v1/admin/config") }
                }
            }
        }
    }

    private suspend fun proxy(call: ApplicationCall, service: String, path: String) {
        val baseUrl = serviceRegistry[service] ?: return call.respond(
            HttpStatusCode.ServiceUnavailable,
            mapOf("error" to "service_unavailable", "message" to "Service $service not found")
        )
        try {
            val response = client.get("$baseUrl$path")
            call.respond(HttpStatusCode.fromValue(response.status.value), response.bodyAsText())
        } catch (e: Exception) {
            call.respond(
                HttpStatusCode.BadGateway,
                mapOf("error" to "upstream_error", "message" to "Failed to reach service: $service")
            )
        }
    }
}
