package com.rickchat.aigateway.provider

import com.rickchat.aigateway.model.*
import com.rickchat.core.config.AIConfig
import com.rickchat.core.error.ServiceUnavailableException
import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.json.*

class AnthropicProvider(private val config: AIConfig) : AIProvider {
    private val client = HttpClient(CIO) {
        engine {
            requestTimeout = config.timeoutSeconds * 1000L
            maxConnectionsCount = 100
        }
    }
    private val json = Json { ignoreUnknownKeys = true }

    override suspend fun chat(request: ChatCompletionRequest): ChatCompletionResponse {
        val model = request.model ?: "claude-3-sonnet-20240229"
        val response = client.post("${config.anthropicEndpoint}/messages") {
            header("x-api-key", config.anthropicApiKey)
            header("anthropic-version", "2023-06-01")
            contentType(ContentType.Application.Json)
            setBody(
                buildJsonObject {
                    put("model", model)
                    put("max_tokens", request.maxTokens ?: 4096)
                    put("temperature", request.temperature ?: 0.7)
                    putJsonArray("messages") {
                        request.messages.forEach { msg ->
                            addJsonObject {
                                put("role", msg.role)
                                put("content", msg.content)
                            }
                        }
                    }
                }
            )
        }

        if (response.status != HttpStatusCode.OK) {
            throw ServiceUnavailableException("Anthropic API error: ${response.bodyAsText()}")
        }

        val body = json.decodeFromString<JsonObject>(response.bodyAsText())
        val content = body["content"]?.jsonArray?.firstOrNull()?.jsonObject?.get("text")?.jsonPrimitive?.content ?: ""

        return ChatCompletionResponse(
            id = body["id"]?.jsonPrimitive?.content ?: "anthropic-${System.currentTimeMillis()}",
            model = model,
            provider = "anthropic",
            choices = listOf(Choice(0, ChatMessage("assistant", content), "end_turn")),
            usage = body["usage"]?.jsonObject?.let {
                Usage(
                    promptTokens = it["input_tokens"]?.jsonPrimitive?.int ?: 0,
                    completionTokens = it["output_tokens"]?.jsonPrimitive?.int ?: 0,
                    totalTokens = (it["input_tokens"]?.jsonPrimitive?.int ?: 0) + (it["output_tokens"]?.jsonPrimitive?.int ?: 0),
                    cost = null
                )
            }
        )
    }

    override fun chatStream(request: ChatCompletionRequest): Flow<ChatCompletionResponse> = flow {
        val model = request.model ?: "claude-3-sonnet-20240229"
        val response = client.post("${config.anthropicEndpoint}/messages") {
            header("x-api-key", config.anthropicApiKey)
            header("anthropic-version", "2023-06-01")
            contentType(ContentType.Application.Json)
            setBody(
                buildJsonObject {
                    put("model", model)
                    put("max_tokens", request.maxTokens ?: 4096)
                    put("temperature", request.temperature ?: 0.7)
                    put("stream", true)
                    putJsonArray("messages") {
                        request.messages.forEach { msg ->
                            addJsonObject {
                                put("role", msg.role)
                                put("content", msg.content)
                            }
                        }
                    }
                }
            )
        }

        val channel = response.bodyAsChannel()
        while (!channel.isClosedForRead) {
            val line = channel.readUTF8Line() ?: break
            if (line.startsWith("data: ")) {
                val data = line.removePrefix("data: ")
                try {
                    val chunk = json.decodeFromString<JsonObject>(data)
                    val delta = chunk["delta"]?.jsonObject
                    val text = delta?.get("text")?.jsonPrimitive?.content ?: ""
                    if (text.isNotBlank()) {
                        emit(
                            ChatCompletionResponse(
                                id = chunk["id"]?.jsonPrimitive?.content ?: "",
                                model = model,
                                provider = "anthropic",
                                choices = listOf(Choice(0, ChatMessage("assistant", text))),
                                usage = null
                            )
                        )
                    }
                } catch (_: Exception) {}
            }
        }
    }

    override suspend fun embed(request: EmbeddingRequest): EmbeddingResponse {
        throw ServiceUnavailableException("Anthropic does not provide embedding API")
    }
}
