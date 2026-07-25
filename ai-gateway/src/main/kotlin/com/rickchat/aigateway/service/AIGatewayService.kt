package com.rickchat.aigateway.service

import com.rickchat.aigateway.model.*
import com.rickchat.aigateway.provider.*
import com.rickchat.core.config.AIConfig
import com.rickchat.core.error.ServiceUnavailableException
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

class AIGatewayService(private val aiConfig: AIConfig) {
    private val providers = mapOf(
        "openai" to OpenAIProvider(aiConfig),
        "gemini" to GeminiProvider(aiConfig),
        "anthropic" to AnthropicProvider(aiConfig)
    )

    private val modelRegistry = listOf(
        ModelInfo("gpt-4-turbo", "GPT-4 Turbo", "openai", ModelCategory.CHAT,
            listOf("chat", "reasoning", "vision"), ModelPricing(0.01, 0.03), 128000),
        ModelInfo("gpt-4", "GPT-4", "openai", ModelCategory.CHAT,
            listOf("chat", "reasoning"), ModelPricing(0.03, 0.06), 8192),
        ModelInfo("gpt-3.5-turbo", "GPT-3.5 Turbo", "openai", ModelCategory.CHAT,
            listOf("chat", "fast"), ModelPricing(0.001, 0.002), 16384),
        ModelInfo("gemini-pro", "Gemini Pro", "gemini", ModelCategory.CHAT,
            listOf("chat", "reasoning", "code"), ModelPricing(0.001, 0.002), 30720),
        ModelInfo("gemini-pro-vision", "Gemini Pro Vision", "gemini", ModelCategory.VISION,
            listOf("vision", "chat"), ModelPricing(0.001, 0.002), 30720),
        ModelInfo("claude-3-opus", "Claude 3 Opus", "anthropic", ModelCategory.CHAT,
            listOf("chat", "reasoning", "code"), ModelPricing(0.015, 0.075), 200000),
        ModelInfo("claude-3-sonnet", "Claude 3 Sonnet", "anthropic", ModelCategory.CHAT,
            listOf("chat", "reasoning", "code"), ModelPricing(0.003, 0.015), 200000),
        ModelInfo("text-embedding-3-small", "Text Embedding 3 Small", "openai", ModelCategory.EMBEDDING,
            listOf("embedding"), ModelPricing(0.00002, 0.0), 8191),
        ModelInfo("text-embedding-3-large", "Text Embedding 3 Large", "openai", ModelCategory.EMBEDDING,
            listOf("embedding"), ModelPricing(0.00013, 0.0), 8191)
    )

    suspend fun chat(request: ChatCompletionRequest): ChatCompletionResponse {
        val model = request.model ?: selectBestModel(request)
        val provider = resolveProvider(model)
        val providerImpl = providers[provider] ?: throw ServiceUnavailableException("AI provider $provider")

        val startTime = System.currentTimeMillis()
        val response = providerImpl.chat(request.copy(model = model))
        val duration = System.currentTimeMillis() - startTime

        return response
    }

    fun chatStream(request: ChatCompletionRequest): Flow<ChatCompletionResponse> = flow {
        val model = request.model ?: selectBestModel(request)
        val provider = resolveProvider(model)
        val providerImpl = providers[provider] ?: throw ServiceUnavailableException("AI provider $provider")

        providerImpl.chatStream(request.copy(model = model, stream = true)).collect { chunk ->
            emit(chunk)
        }
    }

    suspend fun embed(request: EmbeddingRequest): EmbeddingResponse {
        val model = request.model ?: "text-embedding-3-small"
        val provider = resolveProvider(model)
        val providerImpl = providers[provider] ?: throw ServiceUnavailableException("AI provider $provider")
        return providerImpl.embed(request.copy(model = model))
    }

    fun getAvailableModels(): List<ModelInfo> = modelRegistry

    fun getProviderStatus(): List<AIProviderStatus> {
        return providers.map { (name, _) ->
            AIProviderStatus(
                provider = name,
                isAvailable = true,
                latency = 0,
                modelsAvailable = modelRegistry.count { it.provider == name }
            )
        }
    }

    private fun selectBestModel(request: ChatCompletionRequest): String {
        val hasVisionContent = request.messages.any { it.content.contains("image", ignoreCase = true) }
        val hasCodeContent = request.messages.any { it.content.contains("```", ignoreCase = true) }
        val totalLength = request.messages.sumOf { it.content.length }

        return when {
            hasVisionContent -> "gpt-4-turbo"
            hasCodeContent && totalLength > 8000 -> "claude-3-sonnet"
            hasCodeContent -> "gpt-4-turbo"
            totalLength > 12000 -> "claude-3-sonnet"
            request.temperature != null && request.temperature <= 0.3 -> "gpt-4-turbo"
            else -> aiConfig.defaultModel
        }
    }

    private fun resolveProvider(model: String): String {
        return when {
            model.startsWith("gpt") || model.startsWith("text-embedding") || model.startsWith("dall-e") || model.startsWith("whisper") -> "openai"
            model.startsWith("gemini") -> "gemini"
            model.startsWith("claude") -> "anthropic"
            else -> "openai"
        }
    }
}
