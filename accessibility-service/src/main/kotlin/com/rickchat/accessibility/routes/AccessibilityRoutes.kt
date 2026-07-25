package com.rickchat.accessibility.routes

import com.rickchat.accessibility.model.*
import com.rickchat.accessibility.service.AccessibilityService
import com.rickchat.core.model.success
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.put

class AccessibilityRoutes {
    private val service = AccessibilityService()

    fun register(route: Route) {
        route.apply {
            post("/api/v1/accessibility/tts") {
                val request = call.receive<TextToSpeechRequest>()
                val response = service.textToSpeech(request)
                call.respond(success(response))
            }

            post("/api/v1/accessibility/stt") {
                val language = call.request.queryParameters["language"] ?: "en-US"
                val audioBytes = call.receive<ByteArray>()
                val response = service.speechToText(audioBytes, language)
                call.respond(success(response))
            }

            post("/api/v1/accessibility/ocr") {
                val request = call.receive<OcrRequest>()
                val response = service.ocr(request)
                call.respond(success(response))
            }

            post("/api/v1/accessibility/describe") {
                val request = call.receive<SceneDescriptionRequest>()
                val response = service.describeScene(request)
                call.respond(success(response))
            }

            post("/api/v1/accessibility/voice-command") {
                val userId = call.request.headers["X-User-ID"] ?: "anonymous"
                val command = call.receive<VoiceNavigationCommand>()
                val response = service.processVoiceCommand(userId, command)
                call.respond(success(response))
            }

            post("/api/v1/accessibility/live-caption") {
                val request = call.receive<LiveCaptionRequest>()
                val response = service.saveLiveCaption(request)
                call.respond(success(response))
            }

            get("/api/v1/accessibility/settings") {
                val userId = call.request.headers["X-User-ID"] ?: return@get call.respond(
                    HttpStatusCode.Unauthorized, mapOf("error" to "X-User-ID header required")
                )
                val response = service.getSettings(userId)
                call.respond(success(response))
            }

            put("/api/v1/accessibility/settings") {
                val userId = call.request.headers["X-User-ID"] ?: return@put call.respond(
                    HttpStatusCode.Unauthorized, mapOf("error" to "X-User-ID header required")
                )
                val request = call.receive<AccessibilitySettingsUpdateRequest>()
                val response = service.updateSettings(userId, request)
                call.respond(success(response))
            }
        }
    }
}
