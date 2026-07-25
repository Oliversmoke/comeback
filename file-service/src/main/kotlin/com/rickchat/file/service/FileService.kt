package com.rickchat.file.service

import com.rickchat.core.error.NotFoundException
import com.rickchat.core.model.PaginationMeta
import com.rickchat.core.model.PaginationRequest
import com.rickchat.file.model.FileResponse
import com.rickchat.file.model.FileUpdateRequest
import com.rickchat.file.model.FileUploadResponse
import org.jetbrains.exposed.sql.transactions.transaction
import java.util.UUID

class FileService {
    private val baseStorageUrl = "https://storage.rickchat.ai/"

    fun uploadFile(
        userId: String,
        bytes: ByteArray,
        originalFilename: String,
        mimeType: String
    ): FileUploadResponse {
        val id = "file_${UUID.randomUUID().toString().take(24)}"
        val fileType = detectFileType(mimeType)
        val filePath = "uploads/$userId/$id-${originalFilename.replace("'", "_")}"

        transaction {
            exec(
                """INSERT INTO files (id, user_id, filename, original_filename, mime_type, file_type, size, file_path)
                   VALUES ('$id', '$userId', '$originalFilename', '$originalFilename', '$mimeType', '$fileType',
                           ${bytes.size}, '$filePath')"""
            )
        }

        val url = "$baseStorageUrl$filePath"
        val thumbnailUrl = if (fileType == "image") "${url}_thumb" else null

        transaction {
            exec("SELECT created_at FROM files WHERE id = '$id'") {
                if (it.next()) {
                    return FileUploadResponse(
                        id = id,
                        filename = originalFilename,
                        mimeType = mimeType,
                        fileType = fileType,
                        size = bytes.size.toLong(),
                        url = url,
                        thumbnailUrl = thumbnailUrl,
                        createdAt = it.getTimestamp("created_at").toString()
                    )
                }
                throw NotFoundException("File", id)
            }
        }
    }

    fun getFile(id: String, userId: String): FileResponse {
        return transaction {
            exec(
                """SELECT id, user_id, filename, original_filename, mime_type, file_type, size, file_path,
                          is_public, access_count, created_at
                   FROM files WHERE id = '$id' AND deleted_at IS NULL"""
            ) {
                if (it.next()) {
                    exec("UPDATE files SET access_count = access_count + 1 WHERE id = '$id'")
                    mapToFileResponse(it)
                } else throw NotFoundException("File", id)
            }
        }
    }

    fun listFiles(
        userId: String,
        pagination: PaginationRequest,
        fileType: String? = null
    ): Pair<List<FileResponse>, PaginationMeta> {
        val offset = (pagination.page - 1) * pagination.limit
        val sort = pagination.sort ?: "created_at"
        val order = pagination.order.name
        val typeFilter = if (fileType != null) "AND file_type = '$fileType'" else ""

        return transaction {
            val total = exec(
                "SELECT COUNT(*) FROM files WHERE user_id = '$userId' AND deleted_at IS NULL $typeFilter"
            ) {
                if (it.next()) it.getLong(1) else 0L
            }

            val files = exec(
                """SELECT id, user_id, filename, original_filename, mime_type, file_type, size, file_path,
                          is_public, access_count, created_at
                   FROM files WHERE user_id = '$userId' AND deleted_at IS NULL $typeFilter
                   ORDER BY $sort $order LIMIT ${pagination.limit} OFFSET $offset"""
            ) {
                val list = mutableListOf<FileResponse>()
                while (it.next()) list.add(mapToFileResponse(it))
                list
            }

            val totalPages = ((total + pagination.limit - 1) / pagination.limit).toInt()
            files to PaginationMeta(
                page = pagination.page,
                limit = pagination.limit,
                total = total,
                totalPages = totalPages,
                hasNext = pagination.page < totalPages,
                hasPrevious = pagination.page > 1
            )
        }
    }

    fun updateFile(id: String, userId: String, request: FileUpdateRequest): FileResponse {
        val updates = mutableListOf<String>()
        request.filename?.let { updates.add("filename = '${it.replace("'", "''")}'") }
        request.isPublic?.let { updates.add("is_public = $it") }

        if (updates.isNotEmpty()) {
            transaction {
                exec(
                    """UPDATE files SET ${updates.joinToString(", ")}, updated_at = NOW()
                       WHERE id = '$id' AND user_id = '$userId' AND deleted_at IS NULL"""
                )
            }
        }
        return getFile(id, userId)
    }

    fun deleteFile(id: String, userId: String) {
        transaction {
            exec(
                "UPDATE files SET deleted_at = NOW() WHERE id = '$id' AND user_id = '$userId'"
            )
        }
    }

    fun getFileBytes(id: String): ByteArray? {
        return transaction {
            exec("SELECT file_path FROM files WHERE id = '$id' AND deleted_at IS NULL") {
                if (it.next()) {
                    val filePath = it.getString("file_path")
                    exec("UPDATE files SET access_count = access_count + 1 WHERE id = '$id'")
                    java.io.File(filePath).readBytes()
                } else null
            }
        }
    }

    private fun mapToFileResponse(rs: java.sql.ResultSet): FileResponse {
        val filePath = rs.getString("file_path")
        val fileType = rs.getString("file_type")
        return FileResponse(
            id = rs.getString("id"),
            userId = rs.getString("user_id"),
            filename = rs.getString("filename"),
            originalFilename = rs.getString("original_filename"),
            mimeType = rs.getString("mime_type"),
            fileType = fileType,
            size = rs.getLong("size"),
            url = "$baseStorageUrl$filePath",
            thumbnailUrl = if (fileType == "image") "${baseStorageUrl}${filePath}_thumb" else null,
            isPublic = rs.getBoolean("is_public"),
            accessCount = rs.getInt("access_count"),
            createdAt = rs.getTimestamp("created_at").toString()
        )
    }

    private fun detectFileType(mimeType: String): String {
        return when {
            mimeType.startsWith("image/") -> "image"
            mimeType.startsWith("video/") -> "video"
            mimeType.startsWith("audio/") -> "audio"
            mimeType.contains("pdf") || mimeType.contains("document") || mimeType.contains("sheet") -> "document"
            else -> "other"
        }
    }
}
