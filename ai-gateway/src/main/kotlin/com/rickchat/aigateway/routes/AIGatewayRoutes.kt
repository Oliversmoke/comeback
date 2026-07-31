package com.rickchat.aigateway.routes

import com.rickchat.aigateway.model.*
import com.rickchat.aigateway.service.AIGatewayService
import com.rickchat.core.config.AppConfig
import com.rickchat.core.model.*
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.request.*

class AIGatewayRoutes(private val appConfig: AppConfig) {
    private val aiGatewayService = AIGatewayService(appConfig.ai)

    fun register(route: Route) {
        route("api/v1/ai") {
            get("/models") {
                val models = aiGatewayService.getAvailableModels()
                call.respond(success(models))
            }

            get("/providers") {
                val status = aiGatewayService.getProviderStatus()
                call.respond(success(status))
            }

            post("/chat") {
                val request = call.receive<ChatCompletionRequest>()
                if (request.stream) {
                    call.response.header("Content-Type", "text/event-stream")
                    call.response.header("Cache-Control", "no-cache")
                    call.response.header("Connection", "keep-alive")
                    val flow = aiGatewayService.chatStream(request)
                    flow.collect { chunk ->
                        call.response.writeOutputStream {
                            write("data: ${kotlinx.serialization.json.Json.encodeToString(chunk)}\n\n".toByteArray())
                            flush()
                        }
                    }
                    call.response.writeOutputStream {
                        write("data: [DONE]\n\n".toByteArray())
                    }
                } else {
                    val response = aiGatewayService.chat(request)
                    call.respond(success(response))
                }
            }

            post("/complete") {
                val request = call.receive<ChatCompletionRequest>()
                val response = aiGatewayService.chat(request)
                call.respond(success(response))
            }

            post("/embed") {
                val request = call.receive<EmbeddingRequest>()
                val response = aiGatewayService.embed(request)
                call.respond(success(response))
            }
        }
    }
}
