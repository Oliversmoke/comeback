package com.rickchat.voice.routes

import com.rickchat.core.model.success
import com.rickchat.voice.model.*
import com.rickchat.voice.service.VoiceService
import io.ktor.server.application.call
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post

class VoiceRoutes {
    private val service = VoiceService()

    fun register(route: Route) {
        route.apply {
            post("/api/v1/voice/synthesize") {
                val request = call.receive<VoiceSynthesisRequest>()
                val response = service.synthesize(request)
                call.respond(success(response))
            }

            post("/api/v1/voice/recognize") {
                val request = call.receive<VoiceRecognitionRequest>()
                val response = service.recognize(request)
                call.respond(success(response))
            }

            get("/api/v1/voice/voices") {
                val voices = service.getVoices()
                call.respond(success(voices))
            }

            get("/api/v1/voice/profiles") {
                val userId = call.request.headers["X-User-ID"] ?: "anonymous"
                val profiles = service.getVoiceProfiles(userId)
                call.respond(success(profiles))
            }

            post("/api/v1/voice/profiles") {
                val userId = call.request.headers["X-User-ID"] ?: "anonymous"
                val request = call.receive<Map<String, String>>()
                val profile = service.createVoiceProfile(userId, request)
                call.respond(success(profile))
            }

            post("/api/v1/voice/clone") {
                val userId = call.request.headers["X-User-ID"] ?: "anonymous"
                val request = call.receive<VoiceCloningRequest>()
                val response = service.cloneVoice(userId, request)
                call.respond(success(response))
            }
        }
    }
}
