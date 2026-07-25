package com.rickchat.chat.websocket

import com.rickchat.chat.model.*
import io.ktor.server.application.*
import io.ktor.server.routing.*
import io.ktor.server.websocket.*
import io.ktor.websocket.*
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.*
import kotlinx.serialization.json.*
import java.util.concurrent.ConcurrentHashMap

class ChatWebSocketHandler {
    private val chatRooms = ConcurrentHashMap<String, MutableSet<WebSocketSession>>()
    private val userSessions = ConcurrentHashMap<String, MutableSet<WebSocketSession>>()
    private val json = Json { ignoreUnknownKeys = true }

    fun register(route: Route) {
        route("ws/chat") {
            webSocket {
                val userId = call.request.headers["X-User-ID"] ?: run {
                    close(CloseReason(CloseReason.Codes.VIOLATED_POLICY, "Authentication required"))
                    return@webSocket
                }

                val session = this
                userSessions.getOrPut(userId) { ConcurrentHashMap.newKeySet() }.add(session)

                try {
                    for (frame in incoming) {
                        when (frame) {
                            is Frame.Text -> {
                                val text = frame.readText()
                                try {
                                    val message = json.decodeFromString<WebSocketMessage>(text)
                                    handleMessage(userId, session, message)
                                } catch (e: Exception) {
                                    session.send(Frame.Text(json.encodeToString(
                                        mapOf("type" to "error", "payload" to "Invalid message format")
                                    )))
                                }
                            }
                            else -> {}
                        }
                    }
                } catch (e: Exception) {
                    println("WebSocket error for user $userId: ${e.message}")
                } finally {
                    userSessions[userId]?.remove(session)
                    chatRooms.values.forEach { it.remove(session) }
                }
            }
        }
    }

    private suspend fun handleMessage(userId: String, session: WebSocketSession, message: WebSocketMessage) {
        when (message.type) {
            "join" -> {
                val payload = json.decodeFromString<JsonObject>(message.payload)
                val chatId = payload["chatId"]?.jsonPrimitive?.content ?: return
                chatRooms.getOrPut(chatId) { ConcurrentHashMap.newKeySet() }.add(session)
                broadcastToChat(chatId, WebSocketMessage("user_joined",
                    """{"userId": "$userId", "chatId": "$chatId"}"""), exclude = session)
            }

            "leave" -> {
                val payload = json.decodeFromString<JsonObject>(message.payload)
                val chatId = payload["chatId"]?.jsonPrimitive?.content ?: return
                chatRooms[chatId]?.remove(session)
                broadcastToChat(chatId, WebSocketMessage("user_left",
                    """{"userId": "$userId", "chatId": "$chatId"}"""))
            }

            "message" -> {
                val payload = json.decodeFromString<JsonObject>(message.payload)
                val chatId = payload["chatId"]?.jsonPrimitive?.content ?: return
                val content = payload["content"]?.jsonPrimitive?.content ?: return
                val msgPayload = """{"userId": "$userId", "chatId": "$chatId", "content": "$content", "timestamp": "${System.currentTimeMillis()}"}"""
                broadcastToChat(chatId, WebSocketMessage("new_message", msgPayload))
            }

            "typing" -> {
                val payload = json.decodeFromString<JsonObject>(message.payload)
                val chatId = payload["chatId"]?.jsonPrimitive?.content ?: return
                val isTyping = payload["isTyping"]?.jsonPrimitive?.boolean ?: false
                broadcastToChat(chatId, WebSocketMessage("typing",
                    """{"userId": "$userId", "chatId": "$chatId", "isTyping": $isTyping}"""), exclude = session)
            }

            "read" -> {
                val payload = json.decodeFromString<JsonObject>(message.payload)
                val chatId = payload["chatId"]?.jsonPrimitive?.content ?: return
                broadcastToChat(chatId, WebSocketMessage("read_receipt",
                    """{"userId": "$userId", "chatId": "$chatId", "timestamp": "${System.currentTimeMillis()}"}"""), exclude = session)
            }
        }
    }

    private suspend fun broadcastToChat(chatId: String, message: WebSocketMessage, exclude: WebSocketSession? = null) {
        val sessions = chatRooms[chatId] ?: return
        val frame = Frame.Text(json.encodeToString(message))
        sessions.forEach { session ->
            if (session != exclude && session.isActive) {
                try {
                    session.send(frame)
                } catch (_: Exception) {}
            }
        }
    }
}
