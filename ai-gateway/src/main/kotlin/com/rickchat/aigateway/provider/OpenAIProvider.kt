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

class OpenAIProvider(private val config: AIConfig) : AIProvider {
    private val client = HttpClient(CIO) {
        engine {
            requestTimeout = config.timeoutSeconds * 1000L
            maxConnectionsCount = 100
        }
    }
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    override suspend fun chat(request: ChatCompletionRequest): ChatCompletionResponse {
        val response = client.post("${config.openaiEndpoint}/chat/completions") {
            header("Authorization", "Bearer ${config.openaiApiKey}")
            contentType(ContentType.Application.Json)
            setBody(
                buildJsonObject {
                    put("model", request.model ?: config.defaultModel)
                    putJsonArray("messages") {
                        request.messages.forEach { msg ->
                            addJsonObject {
                                put("role", msg.role)
                                put("content", msg.content)
                            }
                        }
                    }
                    put("temperature", request.temperature ?: 0.7)
                    request.maxTokens?.let { put("max_tokens", it) }
                }
            )
        }

        if (response.status != HttpStatusCode.OK) {
            val errorBody = response.bodyAsText()
            throw ServiceUnavailableException("OpenAI API error: $errorBody")
        }

        val body = response.bodyAsText()
        val result = json.decodeFromString<JsonObject>(body)

        val id = result["id"]?.jsonPrimitive?.content ?: "unknown"
        val model = result["model"]?.jsonPrimitive?.content ?: request.model ?: config.defaultModel
        val choices = result["choices"]?.jsonArray?.mapIndexed { index, choice ->
            val msg = choice.jsonObject["message"]?.jsonObject
            Choice(
                index = index,
                message = ChatMessage(
                    role = msg?.get("role")?.jsonPrimitive?.content ?: "assistant",
                    content = msg?.get("content")?.jsonPrimitive?.content ?: ""
                ),
                finishReason = choice.jsonObject["finish_reason"]?.jsonPrimitive?.content
            )
        } ?: emptyList()

        val usage = result["usage"]?.jsonObject?.let {
            Usage(
                promptTokens = it["prompt_tokens"]?.jsonPrimitive?.int ?: 0,
                completionTokens = it["completion_tokens"]?.jsonPrimitive?.int ?: 0,
                totalTokens = it["total_tokens"]?.jsonPrimitive?.int ?: 0,
                cost = null
            )
        }

        return ChatCompletionResponse(id = id, model = model, provider = "openai", choices = choices, usage = usage)
    }

    override fun chatStream(request: ChatCompletionRequest): Flow<ChatCompletionResponse> = flow {
        val response = client.post("${config.openaiEndpoint}/chat/completions") {
            header("Authorization", "Bearer ${config.openaiApiKey}")
            contentType(ContentType.Application.Json)
            setBody(
                buildJsonObject {
                    put("model", request.model ?: config.defaultModel)
                    putJsonArray("messages") {
                        request.messages.forEach { msg ->
                            addJsonObject {
                                put("role", msg.role)
                                put("content", msg.content)
                            }
                        }
                    }
                    put("temperature", request.temperature ?: 0.7)
                    put("stream", true)
                    request.maxTokens?.let { put("max_tokens", it) }
                }
            )
        }

        val channel = response.bodyAsChannel()
        while (!channel.isClosedForRead) {
            val line = channel.readUTF8Line() ?: break
            if (line.startsWith("data: ")) {
                val data = line.removePrefix("data: ")
                if (data == "[DONE]") break
                try {
                    val chunk = json.decodeFromString<JsonObject>(data)
                    val choice = chunk["choices"]?.jsonArray?.firstOrNull()?.jsonObject
                    val delta = choice?.get("delta")?.jsonObject
                    val content = delta?.get("content")?.jsonPrimitive?.content ?: ""
                    if (content.isNotBlank()) {
                        emit(
                            ChatCompletionResponse(
                                id = chunk["id"]?.jsonPrimitive?.content ?: "",
                                model = chunk["model"]?.jsonPrimitive?.content ?: "",
                                provider = "openai",
                                choices = listOf(
                                    Choice(0, ChatMessage("assistant", content), choice?.get("finish_reason")?.jsonPrimitive?.content)
                                )
                            )
                        )
                    }
                } catch (_: Exception) {}
            }
        }
    }

    override suspend fun embed(request: EmbeddingRequest): EmbeddingResponse {
        val response = client.post("${config.openaiEndpoint}/embeddings") {
            header("Authorization", "Bearer ${config.openaiApiKey}")
            contentType(ContentType.Application.Json)
            setBody(
                buildJsonObject {
                    put("model", request.model ?: "text-embedding-3-small")
                    put("input", request.input)
                }
            )
        }

        val body = json.decodeFromString<JsonObject>(response.bodyAsText())
        val data = body["data"]?.jsonArray?.firstOrNull()?.jsonObject
        val embedding = data?.get("embedding")?.jsonArray?.map { it.jsonPrimitive.float } ?: emptyList()

        return EmbeddingResponse(
            model = body["model"]?.jsonPrimitive?.content ?: request.model ?: "text-embedding-3-small",
            provider = "openai",
            embedding = embedding,
            dimensions = embedding.size
        )
    }
}
