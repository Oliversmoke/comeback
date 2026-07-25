package com.rickchat.camera.routes

import com.rickchat.camera.model.*
import com.rickchat.camera.service.CameraService
import com.rickchat.core.model.success
import io.ktor.server.application.call
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.post

class CameraRoutes {
    private val service = CameraService()

    fun register(route: Route) {
        route.apply {
            post("/api/v1/camera/detect") {
                val request = call.receive<ObjectDetectionRequest>()
                val response = service.detectObjects(request)
                call.respond(success(response))
            }

            post("/api/v1/camera/analyze") {
                val request = call.receive<ObjectDetectionRequest>()
                val response = service.analyzeScene(request)
                call.respond(success(response))
            }

            post("/api/v1/camera/enhance") {
                val request = call.receive<ImageEnhancementRequest>()
                val response = service.enhanceImage(request)
                call.respond(success(response))
            }
        }
    }
}
