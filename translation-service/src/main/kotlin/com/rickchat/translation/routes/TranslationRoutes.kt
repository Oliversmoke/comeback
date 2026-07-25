package com.rickchat.translation.routes

import com.rickchat.core.model.success
import com.rickchat.translation.model.*
import com.rickchat.translation.service.TranslationService
import io.ktor.server.application.call
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post

class TranslationRoutes {
    private val translationService = TranslationService()

    fun register(route: Route) {
        route.apply {
            post("/api/v1/translate") {
                val userId = call.request.headers["X-User-ID"]
                val request = call.receive<TranslateRequest>()
                val response = translationService.translate(request, userId)
                call.respond(success(response))
            }

            post("/api/v1/translate/batch") {
                val userId = call.request.headers["X-User-ID"]
                val request = call.receive<BatchTranslateRequest>()
                val response = translationService.batchTranslate(request, userId)
                call.respond(success(response))
            }

            get("/api/v1/translate/languages") {
                val languages = translationService.getSupportedLanguages()
                call.respond(success(languages))
            }

            post("/api/v1/translate/live-caption") {
                val userId = call.request.headers["X-User-ID"]
                val request = call.receive<LiveCaptionRequest>()
                val response = translationService.saveLiveCaption(request, userId)
                call.respond(success(response))
            }
        }
    }
}
