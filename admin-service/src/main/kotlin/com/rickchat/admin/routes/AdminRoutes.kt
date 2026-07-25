package com.rickchat.admin.routes

import com.rickchat.admin.model.AdminActionRequest
import com.rickchat.admin.model.ReportReviewRequest
import com.rickchat.admin.model.SystemConfigUpdateRequest
import com.rickchat.admin.service.AdminService
import com.rickchat.core.model.*
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

class AdminRoutes {
    private val adminService = AdminService()

    fun register(route: Route) {
        route("api/v1/admin") {
            get("/dashboard") {
                val dashboard = adminService.getDashboardStats()
                call.respond(success(dashboard))
            }

            get("/users") {
                val search = call.request.queryParameters["search"]
                val pagination = PaginationRequest(
                    page = call.request.queryParameters["page"]?.toIntOrNull() ?: 1,
                    limit = call.request.queryParameters["limit"]?.toIntOrNull() ?: 20
                )
                val (users, meta) = adminService.listUsers(pagination, search)
                call.respond(success(users, meta))
            }

            post("/users/{id}/action") {
                val targetId = call.parameters["id"]
                    ?: return@post call.respond(HttpStatusCode.BadRequest)
                val adminId = call.request.headers["X-User-ID"]
                    ?: return@post call.respond(HttpStatusCode.Unauthorized)
                val request = call.receive<AdminActionRequest>()
                val response = adminService.takeAction(adminId, request.copy(targetId = targetId))
                call.respond(success(response))
            }

            get("/reports") {
                val status = call.request.queryParameters["status"]
                val pagination = PaginationRequest(
                    page = call.request.queryParameters["page"]?.toIntOrNull() ?: 1,
                    limit = call.request.queryParameters["limit"]?.toIntOrNull() ?: 20
                )
                val (reports, meta) = adminService.getReports(pagination, status)
                call.respond(success(reports, meta))
            }

            put("/reports/{id}") {
                val reportId = call.parameters["id"]
                    ?: return@put call.respond(HttpStatusCode.BadRequest)
                val adminId = call.request.headers["X-User-ID"]
                    ?: return@put call.respond(HttpStatusCode.Unauthorized)
                val request = call.receive<ReportReviewRequest>()
                adminService.reviewReport(reportId, adminId, request)
                call.respond(success(mapOf("message" to "Report reviewed")))
            }

            get("/config") {
                val config = adminService.getSystemConfig()
                call.respond(success(config))
            }

            put("/config/{key}") {
                val key = call.parameters["key"]
                    ?: return@put call.respond(HttpStatusCode.BadRequest)
                val adminId = call.request.headers["X-User-ID"]
                    ?: return@put call.respond(HttpStatusCode.Unauthorized)
                val request = call.receive<SystemConfigUpdateRequest>()
                adminService.updateSystemConfig(key, request, adminId)
                call.respond(success(mapOf("message" to "Config updated")))
            }

            get("/logs") {
                val userId = call.request.queryParameters["userId"]
                val action = call.request.queryParameters["action"]
                val pagination = PaginationRequest(
                    page = call.request.queryParameters["page"]?.toIntOrNull() ?: 1,
                    limit = call.request.queryParameters["limit"]?.toIntOrNull() ?: 20
                )
                val (logs, meta) = adminService.getAuditLogs(pagination, userId, action)
                call.respond(success(logs, meta))
            }
        }
    }
}
