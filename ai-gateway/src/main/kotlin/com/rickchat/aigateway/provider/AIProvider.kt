package com.rickchat.aigateway.provider

import com.rickchat.aigateway.model.ChatCompletionRequest
import com.rickchat.aigateway.model.ChatCompletionResponse
import com.rickchat.aigateway.model.EmbeddingRequest
import com.rickchat.aigateway.model.EmbeddingResponse
import kotlinx.coroutines.flow.Flow

interface AIProvider {
    suspend fun chat(request: ChatCompletionRequest): ChatCompletionResponse
    fun chatStream(request: ChatCompletionRequest): Flow<ChatCompletionResponse>
    suspend fun embed(request: EmbeddingRequest): EmbeddingResponse
}
