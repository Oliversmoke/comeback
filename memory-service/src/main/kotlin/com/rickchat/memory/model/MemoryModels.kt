package com.rickchat.memory.model

import kotlinx.serialization.Serializable

@Serializable
data class MemoryCreateRequest(
    val type: String = "knowledge",
    val title: String? = null,
    val content: String,
    val summary: String? = null,
    val tags: List<String> = emptyList(),
    val visibility: String = "private",
    val category: String? = null,
    val importance: Int = 0,
    val source: String? = null,
    val expiresInDays: Int? = null
)

@Serializable
data class MemoryUpdateRequest(
    val title: String? = null,
    val content: String? = null,
    val summary: String? = null,
    val tags: List<String>? = null,
    val visibility: String? = null,
    val category: String? = null,
    val importance: Int? = null
)

@Serializable
data class MemoryResponse(
    val id: String,
    val userId: String,
    val type: String,
    val title: String?,
    val content: String,
    val summary: String?,
    val tags: List<String>,
    val visibility: String,
    val category: String?,
    val importance: Int,
    val source: String?,
    val accessCount: Int,
    val createdAt: String,
    val updatedAt: String
)

@Serializable
data class MemorySearchRequest(
    val query: String,
    val type: String? = null,
    val tags: List<String>? = null,
    val category: String? = null,
    val limit: Int = 10,
    val threshold: Float = 0.0f
)

@Serializable
data class MemorySearchResponse(
    val id: String,
    val userId: String,
    val type: String,
    val title: String?,
    val content: String,
    val summary: String?,
    val tags: List<String>,
    val category: String?,
    val importance: Int,
    val score: Float,
    val createdAt: String
)
