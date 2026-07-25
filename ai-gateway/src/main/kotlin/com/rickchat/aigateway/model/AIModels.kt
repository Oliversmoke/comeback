package com.rickchat.aigateway.model

import kotlinx.serialization.Serializable

@Serializable
data class ChatCompletionRequest(
    val model: String? = null,
    val messages: List<ChatMessage>,
    val temperature: Double? = 0.7,
    val maxTokens: Int? = 4096,
    val stream: Boolean = false,
    val userId: String? = null
)

@Serializable
data class ChatMessage(
    val role: String,
    val content: String,
    val name: String? = null
)

@Serializable
data class ChatCompletionResponse(
    val id: String,
    val model: String,
    val provider: String,
    val choices: List<Choice>,
    val usage: Usage? = null
)

@Serializable
data class Choice(
    val index: Int,
    val message: ChatMessage,
    val finishReason: String? = null
)

@Serializable
data class Usage(
    val promptTokens: Int,
    val completionTokens: Int,
    val totalTokens: Int,
    val cost: Double? = null
)

@Serializable
data class EmbeddingRequest(
    val model: String? = null,
    val input: String,
    val userId: String? = null
)

@Serializable
data class EmbeddingResponse(
    val model: String,
    val provider: String,
    val embedding: List<Float>,
    val dimensions: Int
)

@Serializable
data class ModelInfo(
    val id: String,
    val name: String,
    val provider: String,
    val category: ModelCategory,
    val capabilities: List<String>,
    val pricing: ModelPricing,
    val contextWindow: Int,
    val isAvailable: Boolean = true
)

@Serializable
enum class ModelCategory {
    CHAT, CODE, VISION, REASONING, EMBEDDING, TRANSLATION
}

@Serializable
data class ModelPricing(
    val promptPrice: Double,
    val completionPrice: Double,
    val currency: String = "USD"
)

@Serializable
data class AIProviderStatus(
    val provider: String,
    val isAvailable: Boolean,
    val latency: Long,
    val modelsAvailable: Int
)
