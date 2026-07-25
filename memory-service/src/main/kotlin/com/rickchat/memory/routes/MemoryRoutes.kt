package com.rickchat.memory.routes

import com.rickchat.core.config.AppConfig
import com.rickchat.core.model.*
import com.rickchat.memory.model.*
import com.rickchat.memory.service.MemoryService
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

class MemoryRoutes(private val appConfig: AppConfig) {
    private val memoryService = MemoryService(appConfig)

    fun register(route: Route) {
        route("api/v1/memory") {
            get {
                val userId = call.request.headers["X-User-ID"] ?: return@get call.respond(HttpStatusCode.Unauthorized)
                val type = call.request.queryParameters["type"]
                val pagination = PaginationRequest(
                    page = call.request.queryParameters["page"]?.toIntOrNull() ?: 1,
                    limit = call.request.queryParameters["limit"]?.toIntOrNull() ?: 20
                )
                val (memories, meta) = memoryService.listMemories(userId, pagination, type)
                call.respond(success(memories, meta))
            }

            get("/{id}") {
                val id = call.parameters["id"] ?: return@get call.respond(HttpStatusCode.BadRequest)
                val memory = memoryService.getMemory(id)
                call.respond(success(memory))
            }

            post {
                val userId = call.request.headers["X-User-ID"] ?: return@post call.respond(HttpStatusCode.Unauthorized)
                val request = call.receive<MemoryCreateRequest>()
                val memory = memoryService.createMemory(userId, request)
                call.respond(HttpStatusCode.Created, success(memory))
            }

            put("/{id}") {
                val id = call.parameters["id"] ?: return@put call.respond(HttpStatusCode.BadRequest)
                val userId = call.request.headers["X-User-ID"] ?: return@put call.respond(HttpStatusCode.Unauthorized)
                val request = call.receive<MemoryUpdateRequest>()
                val memory = memoryService.updateMemory(id, userId, request)
                call.respond(success(memory))
            }

            delete("/{id}") {
                val id = call.parameters["id"] ?: return@delete call.respond(HttpStatusCode.BadRequest)
                val userId = call.request.headers["X-User-ID"] ?: return@delete call.respond(HttpStatusCode.Unauthorized)
                memoryService.deleteMemory(id, userId)
                call.respond(success(mapOf("message" to "Memory deleted")))
            }

            get("/search") {
                val userId = call.request.headers["X-User-ID"] ?: return@get call.respond(HttpStatusCode.Unauthorized)
                val query = call.request.queryParameters["q"] ?: return@get call.respond(HttpStatusCode.BadRequest)
                val type = call.request.queryParameters["type"]
                val category = call.request.queryParameters["category"]
                val limit = call.request.queryParameters["limit"]?.toIntOrNull() ?: 10
                val searchRequest = MemorySearchRequest(query = query, type = type, category = category, limit = limit)
                val results = memoryService.searchMemories(userId, searchRequest)
                call.respond(success(results))
            }
        }
    }
}
