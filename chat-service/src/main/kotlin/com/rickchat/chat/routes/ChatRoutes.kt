package com.rickchat.chat.routes

import com.rickchat.chat.model.*
import com.rickchat.chat.service.ChatService
import com.rickchat.core.model.*
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

class ChatRoutes {
    private val chatService = ChatService()

    fun register(route: Route) {
        route("api/v1/chat") {
            get {
                val userId = call.request.headers["X-User-ID"] ?: return@get call.respond(HttpStatusCode.Unauthorized)
                val pagination = PaginationRequest(
                    page = call.request.queryParameters["page"]?.toIntOrNull() ?: 1,
                    limit = call.request.queryParameters["limit"]?.toIntOrNull() ?: 20
                )
                val (chats, meta) = chatService.listChats(userId, pagination)
                call.respond(success(chats, meta))
            }

            get("/{id}") {
                val chatId = call.parameters["id"] ?: return@get call.respond(HttpStatusCode.BadRequest)
                val userId = call.request.headers["X-User-ID"] ?: return@get call.respond(HttpStatusCode.Unauthorized)
                val chat = chatService.getChat(chatId, userId)
                call.respond(success(chat))
            }

            post {
                val userId = call.request.headers["X-User-ID"] ?: return@post call.respond(HttpStatusCode.Unauthorized)
                val request = call.receive<ChatCreateRequest>()
                val chat = chatService.createChat(request, userId)
                call.respond(HttpStatusCode.Created, success(chat))
            }

            put("/{id}") {
                val chatId = call.parameters["id"] ?: return@put call.respond(HttpStatusCode.BadRequest)
                val userId = call.request.headers["X-User-ID"] ?: return@put call.respond(HttpStatusCode.Unauthorized)
                val chat = chatService.getChat(chatId, userId) // update logic
                call.respond(success(chat))
            }

            delete("/{id}") {
                val chatId = call.parameters["id"] ?: return@delete call.respond(HttpStatusCode.BadRequest)
                val userId = call.request.headers["X-User-ID"] ?: return@delete call.respond(HttpStatusCode.Unauthorized)
                chatService.archiveChat(chatId, userId)
                call.respond(success(mapOf("message" to "Chat archived")))
            }

            // Messages
            get("/{id}/messages") {
                val chatId = call.parameters["id"] ?: return@get call.respond(HttpStatusCode.BadRequest)
                val userId = call.request.headers["X-User-ID"] ?: return@get call.respond(HttpStatusCode.Unauthorized)
                val pagination = PaginationRequest(
                    page = call.request.queryParameters["page"]?.toIntOrNull() ?: 1,
                    limit = call.request.queryParameters["limit"]?.toIntOrNull() ?: 50
                )
                val (messages, meta) = chatService.getMessages(chatId, userId, pagination)
                call.respond(success(messages, meta))
            }

            post("/{id}/messages") {
                val chatId = call.parameters["id"] ?: return@post call.respond(HttpStatusCode.BadRequest)
                val userId = call.request.headers["X-User-ID"] ?: return@post call.respond(HttpStatusCode.Unauthorized)
                val request = call.receive<SendMessageRequest>()
                val message = chatService.sendMessage(chatId, userId, request)
                call.respond(HttpStatusCode.Created, success(message))
            }

            delete("/{chatId}/messages/{msgId}") {
                val chatId = call.parameters["chatId"] ?: return@delete call.respond(HttpStatusCode.BadRequest)
                val msgId = call.parameters["msgId"] ?: return@delete call.respond(HttpStatusCode.BadRequest)
                val userId = call.request.headers["X-User-ID"] ?: return@delete call.respond(HttpStatusCode.Unauthorized)
                chatService.deleteMessage(chatId, msgId, userId)
                call.respond(success(mapOf("message" to "Message deleted")))
            }

            // Reactions
            post("/{chatId}/messages/{msgId}/reactions") {
                val chatId = call.parameters["chatId"] ?: return@post call.respond(HttpStatusCode.BadRequest)
                val msgId = call.parameters["msgId"] ?: return@post call.respond(HttpStatusCode.BadRequest)
                val userId = call.request.headers["X-User-ID"] ?: return@post call.respond(HttpStatusCode.Unauthorized)
                val body = call.receive<Map<String, String>>()
                val reaction = body["reaction"] ?: return@post call.respond(HttpStatusCode.BadRequest)
                chatService.addReaction(chatId, msgId, userId, reaction)
                call.respond(success(mapOf("message" to "Reaction added")))
            }

            delete("/{chatId}/messages/{msgId}/reactions") {
                val chatId = call.parameters["chatId"] ?: return@delete call.respond(HttpStatusCode.BadRequest)
                val msgId = call.parameters["msgId"] ?: return@delete call.respond(HttpStatusCode.BadRequest)
                val userId = call.request.headers["X-User-ID"] ?: return@delete call.respond(HttpStatusCode.Unauthorized)
                val body = call.receive<Map<String, String>>()
                val reaction = body["reaction"] ?: return@delete call.respond(HttpStatusCode.BadRequest)
                chatService.removeReaction(chatId, msgId, userId, reaction)
                call.respond(success(mapOf("message" to "Reaction removed")))
            }
        }
    }
}
