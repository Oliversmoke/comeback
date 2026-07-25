package com.rickchat.core.model

import kotlinx.serialization.Serializable

@Serializable
data class ApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val error: ApiError? = null,
    val meta: PaginationMeta? = null
)

@Serializable
data class ApiError(
    val code: String,
    val message: String,
    val details: Map<String, String>? = null
)

@Serializable
data class PaginationMeta(
    val page: Int,
    val limit: Int,
    val total: Long,
    val totalPages: Int,
    val hasNext: Boolean,
    val hasPrevious: Boolean
)

@Serializable
data class PaginationRequest(
    val page: Int = 1,
    val limit: Int = 20,
    val sort: String? = null,
    val order: SortOrder = SortOrder.DESC,
    val search: String? = null
)

@Serializable
enum class SortOrder {
    ASC, DESC
}

fun <T> success(data: T): ApiResponse<T> = ApiResponse(success = true, data = data)

fun <T> success(data: T, meta: PaginationMeta): ApiResponse<T> = ApiResponse(
    success = true, data = data, meta = meta
)

fun <T> error(code: String, message: String): ApiResponse<T> = ApiResponse(
    success = false, error = ApiError(code, message)
)

fun <T> error(code: String, message: String, details: Map<String, String>): ApiResponse<T> = ApiResponse(
    success = false, error = ApiError(code, message, details)
)
