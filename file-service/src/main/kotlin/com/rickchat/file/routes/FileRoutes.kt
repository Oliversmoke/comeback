package com.rickchat.file.routes

import com.rickchat.core.model.*
import com.rickchat.file.model.FileUpdateRequest
import com.rickchat.file.service.FileService
import io.ktor.http.*
import io.ktor.http.content.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

class FileRoutes {
    private val fileService = FileService()

    fun register(route: Route) {
        route("api/v1/files") {
            post("/upload") {
                val userId = call.request.headers["X-User-ID"]
                    ?: return@post call.respond(HttpStatusCode.Unauthorized)

                val multipart = call.receiveMultipart()
                var response: Any? = null

                multipart.forEachPart { part ->
                    when (part) {
                        is PartData.FileItem -> {
                            val bytes = part.streamProvider().readBytes()
                            val originalFilename = part.originalFileName ?: "unknown"
                            val mimeType = part.contentType?.toString() ?: "application/octet-stream"
                            val result = fileService.uploadFile(userId, bytes, originalFilename, mimeType)
                            response = success(result)
                        }
                        else -> {}
                    }
                    part.dispose()
                }

                if (response != null) {
                    call.respond(HttpStatusCode.Created, response)
                } else {
                    call.respond(HttpStatusCode.BadRequest, error<String>("no_file", "No file provided"))
                }
            }

            get {
                val userId = call.request.headers["X-User-ID"]
                    ?: return@get call.respond(HttpStatusCode.Unauthorized)
                val fileType = call.request.queryParameters["type"]
                val pagination = PaginationRequest(
                    page = call.request.queryParameters["page"]?.toIntOrNull() ?: 1,
                    limit = call.request.queryParameters["limit"]?.toIntOrNull() ?: 20
                )
                val (files, meta) = fileService.listFiles(userId, pagination, fileType)
                call.respond(success(files, meta))
            }

            get("/{id}") {
                val id = call.parameters["id"]
                    ?: return@get call.respond(HttpStatusCode.BadRequest)
                val userId = call.request.headers["X-User-ID"]
                    ?: return@get call.respond(HttpStatusCode.Unauthorized)
                val file = fileService.getFile(id, userId)
                call.respond(success(file))
            }

            get("/{id}/download") {
                val id = call.parameters["id"]
                    ?: return@get call.respond(HttpStatusCode.BadRequest)
                val bytes = fileService.getFileBytes(id)
                if (bytes != null) {
                    call.respondBytes(bytes)
                } else {
                    call.respond(HttpStatusCode.NotFound)
                }
            }

            put("/{id}") {
                val id = call.parameters["id"]
                    ?: return@put call.respond(HttpStatusCode.BadRequest)
                val userId = call.request.headers["X-User-ID"]
                    ?: return@put call.respond(HttpStatusCode.Unauthorized)
                val request = call.receive<FileUpdateRequest>()
                val file = fileService.updateFile(id, userId, request)
                call.respond(success(file))
            }

            delete("/{id}") {
                val id = call.parameters["id"]
                    ?: return@delete call.respond(HttpStatusCode.BadRequest)
                val userId = call.request.headers["X-User-ID"]
                    ?: return@delete call.respond(HttpStatusCode.Unauthorized)
                fileService.deleteFile(id, userId)
                call.respond(success(mapOf("message" to "File deleted")))
            }
        }
    }
}
