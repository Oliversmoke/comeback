package com.rickchat.memory.service

import com.rickchat.core.config.AppConfig
import com.rickchat.core.database.qdrant.QdrantManager
import com.rickchat.core.database.qdrant.VectorPoint
import com.rickchat.core.error.NotFoundException
import com.rickchat.core.model.PaginationMeta
import com.rickchat.core.model.PaginationRequest
import com.rickchat.memory.model.*
import kotlinx.coroutines.runBlocking
import org.jetbrains.exposed.sql.transactions.transaction

class MemoryService(private val appConfig: AppConfig) {
    private val qdrantManager = QdrantManager(appConfig.qdrant)

    fun createMemory(userId: String, request: MemoryCreateRequest): MemoryResponse {
        val memId = "mem_${java.util.UUID.randomUUID().toString().take(24)}"
        val content = request.content.replace("'", "''")
        val title = request.title?.replace("'", "''")
        val summary = request.summary?.replace("'", "''") ?: request.content.take(200)

        val expiresClause = if (request.expiresInDays != null) {
            "expires_at = NOW() + INTERVAL '${request.expiresInDays} days'"
        } else ""

        transaction {
            exec(
                """INSERT INTO memory_entries (id, user_id, type, title, content, summary,
                   tags, visibility, category, importance, source ${if (expiresClause.isNotEmpty()) ", expires_at" else ""})
                   VALUES ('$memId', '$userId', '${request.type}', ${if (title != null) "'$title'" else "NULL"},
                           '$content', '$summary',
                           '{${request.tags.joinToString(",") { "\"$it\"" }}}',
                           '${request.visibility}', ${if (request.category != null) "'${request.category}'" else "NULL"},
                           ${request.importance}, ${if (request.source != null) "'${request.source}'" else "NULL"}
                           ${if (expiresClause.isNotEmpty()) ", NOW() + INTERVAL '${request.expiresInDays} days'" else ""})"""
            )
        }

        return getMemory(memId)
    }

    fun getMemory(memId: String): MemoryResponse {
        return transaction {
            exec("SELECT * FROM memory_entries WHERE id = '$memId'") {
                if (it.next()) {
                    exec("UPDATE memory_entries SET access_count = access_count + 1, last_accessed_at = NOW() WHERE id = '$memId'")
                    mapToMemoryResponse(it)
                } else throw NotFoundException("Memory", memId)
            }
        }
    }

    fun updateMemory(memId: String, userId: String, request: MemoryUpdateRequest): MemoryResponse {
        val updates = mutableListOf<String>()
        request.title?.let { updates.add("title = '${it.replace("'", "''")}'") }
        request.content?.let { updates.add("content = '${it.replace("'", "''")}'") }
        request.summary?.let { updates.add("summary = '${it.replace("'", "''")}'") }
        request.tags?.let { updates.add("tags = '{${it.joinToString(",") { "\"$it\"" }}}'") }
        request.visibility?.let { updates.add("visibility = '$it'") }
        request.category?.let { updates.add("category = '$it'") }
        request.importance?.let { updates.add("importance = $it") }

        if (updates.isNotEmpty()) {
            transaction {
                exec("UPDATE memory_entries SET ${updates.joinToString(", ")}, updated_at = NOW() WHERE id = '$memId' AND user_id = '$userId'")
            }
        }
        return getMemory(memId)
    }

    fun deleteMemory(memId: String, userId: String) {
        transaction { exec("DELETE FROM memory_entries WHERE id = '$memId' AND user_id = '$userId'") }
    }

    fun listMemories(userId: String, pagination: PaginationRequest, type: String? = null): Pair<List<MemoryResponse>, PaginationMeta> {
        val offset = (pagination.page - 1) * pagination.limit
        val sort = pagination.sort ?: "created_at"
        val order = pagination.order.name
        val typeFilter = if (type != null) "AND type = '$type'" else ""

        return transaction {
            val total = exec("SELECT COUNT(*) FROM memory_entries WHERE user_id = '$userId' $typeFilter") {
                if (it.next()) it.getLong(1) else 0L
            }

            val memories = exec(
                """SELECT * FROM memory_entries WHERE user_id = '$userId' $typeFilter
                   ORDER BY importance DESC, $sort $order LIMIT ${pagination.limit} OFFSET $offset"""
            ) {
                val list = mutableListOf<MemoryResponse>()
                while (it.next()) list.add(mapToMemoryResponse(it))
                list
            }

            val totalPages = ((total + pagination.limit - 1) / pagination.limit).toInt()
            memories to PaginationMeta(pagination.page, pagination.limit, total, totalPages,
                pagination.page < totalPages, pagination.page > 1)
        }
    }

    fun searchMemories(userId: String, request: MemorySearchRequest): List<MemorySearchResponse> {
        val typeFilter = if (request.type != null) "AND type = '${request.type}'" else ""
        val tagFilter = if (!request.tags.isNullOrEmpty()) {
            "AND tags && '{${request.tags.joinToString(",") { "\"$it\"" }}}'"
        } else ""
        val categoryFilter = if (request.category != null) "AND category = '${request.category}'" else ""

        return transaction {
            exec(
                """SELECT id, user_id, type, title, content, summary, tags, category, importance, created_at
                   FROM memory_entries WHERE user_id = '$userId' $typeFilter $tagFilter $categoryFilter
                   AND (content ILIKE '%${request.query.replace("'", "''")}%'
                        OR title ILIKE '%${request.query.replace("'", "''")}%'
                        OR summary ILIKE '%${request.query.replace("'", "''")}%')
                   ORDER BY importance DESC, created_at DESC LIMIT ${request.limit}"""
            ) {
                val list = mutableListOf<MemorySearchResponse>()
                while (it.next()) {
                    list.add(
                        MemorySearchResponse(
                            id = it.getString("id"),
                            userId = it.getString("user_id"),
                            type = it.getString("type"),
                            title = it.getString("title"),
                            content = it.getString("content"),
                            summary = it.getString("summary"),
                            tags = parseTags(it.getString("tags") ?: "{}"),
                            category = it.getString("category"),
                            importance = it.getInt("importance"),
                            score = 1.0f,
                            createdAt = it.getTimestamp("created_at").toString()
                        )
                    )
                }
                list
            }
        }
    }

    private fun mapToMemoryResponse(rs: java.sql.ResultSet): MemoryResponse {
        return MemoryResponse(
            id = rs.getString("id"),
            userId = rs.getString("user_id"),
            type = rs.getString("type"),
            title = rs.getString("title"),
            content = rs.getString("content"),
            summary = rs.getString("summary"),
            tags = parseTags(rs.getString("tags") ?: "{}"),
            visibility = rs.getString("visibility"),
            category = rs.getString("category"),
            importance = rs.getInt("importance"),
            source = rs.getString("source"),
            accessCount = rs.getInt("access_count"),
            createdAt = rs.getTimestamp("created_at").toString(),
            updatedAt = rs.getTimestamp("updated_at").toString()
        )
    }

    private fun parseTags(tagsStr: String): List<String> {
        return try {
            tagsStr.removeSurrounding("{", "}").split(",").map { it.trim().removeSurrounding("\"") }.filter { it.isNotBlank() }
        } catch (e: Exception) { emptyList() }
    }
}
