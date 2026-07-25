package com.rickchat.file.model

import kotlinx.serialization.Serializable

@Serializable
data class FileUploadResponse(
    val id: String,
    val filename: String,
    val mimeType: String,
    val fileType: String,
    val size: Long,
    val url: String,
    val thumbnailUrl: String?,
    val createdAt: String
)

@Serializable
data class FileResponse(
    val id: String,
    val userId: String,
    val filename: String,
    val originalFilename: String,
    val mimeType: String,
    val fileType: String,
    val size: Long,
    val url: String,
    val thumbnailUrl: String?,
    val isPublic: Boolean,
    val accessCount: Int,
    val createdAt: String
)

@Serializable
data class FileUpdateRequest(
    val filename: String? = null,
    val isPublic: Boolean? = null
)
