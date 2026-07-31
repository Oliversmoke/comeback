package com.rickchat.aigateway.provider

import com.rickchat.aigateway.model.*
import com.rickchat.core.config.AIConfig
import com.rickchat.core.error.ServiceUnavailableException
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.engine.cio.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.json.*

class GeminiProvider(private val config: AIConfig) : AIProvider {
    private val client = HttpClient(CIO) {
        engine {
            requestTimeout = config.timeoutSeconds * 1000L
            maxConnectionsCount = 100
        }
    }
    private val json = Json { ignoreUnknownKeys = true }

    override suspend fun chat(request: ChatCompletionRequest): ChatCompletionResponse {
        val model = request.model ?: "gemini-pro"
        val response = client.post("${config.geminiEndpoint}/models/$model:generateContent?key=${config.geminiApiKey}") {
            contentType(ContentType.Application.Json)
            setBody(
                buildJsonObject {
                    putJsonArray("contents") {
                        request.messages.forEach { msg ->
                            addJsonObject {
                                put("role", if (msg.role == "assistant") "model" else msg.role)
                                putJsonArray("parts") {
                                    addJsonObject { put("text", msg.content) }
                                }
                            }
                        }
                    }
                    putJsonObject("generationConfig") {
                        put("temperature", request.temperature ?: 0.7)
                        request.maxTokens?.let { put("maxOutputTokens", it) }
                    }
                }
            )
        }

        if (response.status != HttpStatusCode.OK) {
            throw ServiceUnavailableException("Gemini API error: ${response.bodyAsText()}")
        }

        val body = json.decodeFromString<JsonObject>(response.bodyAsText())
        val candidate = body["candidates"]?.jsonArray?.firstOrNull()?.jsonObject
        val content = candidate?.get("content")?.jsonObject
        val parts = content?.get("parts")?.jsonArray
        val text = parts?.firstOrNull()?.jsonObject?.get("text")?.jsonPrimitive?.content ?: ""

        return ChatCompletionResponse(
            id = "gemini-${System.currentTimeMillis()}",
            model = model,
            provider = "gemini",
            choices = listOf(Choice(0, ChatMessage("assistant", text), "stop")),
            usage = null
        )
    }

    override fun chatStream(request: ChatCompletionRequest): Flow<ChatCompletionResponse> = flow {
        val model = request.model ?: "gemini-pro"
        val response = client.post("${config.geminiEndpoint}/models/$model:streamGenerateContent?key=${config.geminiApiKey}") {
            contentType(ContentType.Application.Json)
            setBody(
                buildJsonObject {
                    putJsonArray("contents") {
                        request.messages.forEach { msg ->
                            addJsonObject {
                                put("role", if (msg.role == "assistant") "model" else msg.role)
                                putJsonArray("parts") {
                                    addJsonObject { put("text", msg.content) }
                                }
                            }
                        }
                    }
                    putJsonObject("generationConfig") {
                        put("temperature", request.temperature ?: 0.7)
                    }
                }
            )
        }
        val body = response.bodyAsText()
        val lines = body.lines().filter { it.isNotBlank() }
        for (line in lines) {
            try {
                val chunk = json.decodeFromString<JsonObject>(line)
                val candidate = chunk["candidates"]?.jsonArray?.firstOrNull()?.jsonObject
                val content = candidate?.get("content")?.jsonObject
                val parts = content?.get("parts")?.jsonArray
                val text = parts?.firstOrNull()?.jsonObject?.get("text")?.jsonPrimitive?.content ?: ""
                if (text.isNotBlank()) {
                    emit(
                        ChatCompletionResponse(
                            id = "gemini-${System.currentTimeMillis()}",
                            model = model,
                            provider = "gemini",
                            choices = listOf(Choice(0, ChatMessage("assistant", text))),
                            usage = null
                        )
                    )
                }
            } catch (_: Exception) {}
        }
    }

    override suspend fun embed(request: EmbeddingRequest): EmbeddingResponse {
        val model = "models/embedding-001"
        val response = client.post("${config.geminiEndpoint}/$model:embedContent?key=${config.geminiApiKey}") {
            contentType(ContentType.Application.Json)
            setBody(
                buildJsonObject {
                    putJsonObject("content") {
                        putJsonArray("parts") { addJsonObject { put("text", request.input) } }
                    }
                }
            )
        }

        val body = json.decodeFromString<JsonObject>(response.bodyAsText())
        val embedding = body["embedding"]?.jsonObject?.get("values")?.jsonArray?.map { it.jsonPrimitive.float } ?: emptyList()

        return EmbeddingResponse(
            model = model,
            provider = "gemini",
            embedding = embedding,
            dimensions = embedding.size
        )
    }
}
