package com.rickchat.admin.service

import com.rickchat.admin.model.*
import com.rickchat.core.error.NotFoundException
import com.rickchat.core.model.PaginationMeta
import com.rickchat.core.model.PaginationRequest
import org.jetbrains.exposed.sql.transactions.transaction
import java.util.UUID

data class AdminUserResponse(
    val id: String,
    val email: String,
    val username: String,
    val displayName: String?,
    val role: String,
    val isActive: Boolean,
    val emailVerified: Boolean,
    val lastActiveAt: String?,
    val deletedAt: String?,
    val createdAt: String
)

data class AuditLogResponse(
    val id: String,
    val userId: String?,
    val action: String,
    val targetType: String?,
    val targetId: String?,
    val details: String?,
    val createdAt: String
)

class AdminService {

    fun getDashboardStats(): AdminDashboardResponse {
        return transaction {
            val totalUsers = exec("SELECT COUNT(*) FROM users") {
                if (it.next()) it.getLong(1) else 0L
            }

            val activeUsers = exec(
                "SELECT COUNT(*) FROM users WHERE last_active_at >= NOW() - INTERVAL '24 hours'"
            ) {
                if (it.next()) it.getLong(1) else 0L
            }

            val totalChats = exec("SELECT COUNT(*) FROM chats") {
                if (it.next()) it.getLong(1) else 0L
            }

            val totalMessages = exec("SELECT COUNT(*) FROM messages") {
                if (it.next()) it.getLong(1) else 0L
            }

            val totalMemories = exec("SELECT COUNT(*) FROM memory_entries") {
                if (it.next()) it.getLong(1) else 0L
            }

            val totalMarketplaceItems = exec("SELECT COUNT(*) FROM marketplace_items") {
                if (it.next()) it.getLong(1) else 0L
            }

            val totalCourses = exec("SELECT COUNT(*) FROM courses") {
                if (it.next()) it.getLong(1) else 0L
            }

            val totalRevenue = exec("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed'") {
                if (it.next()) it.getDouble(1) else 0.0
            }

            val dailyActiveUsers = exec(
                "SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE created_at >= NOW() - INTERVAL '24 hours'"
            ) {
                if (it.next()) it.getLong(1) else 0L
            }

            val eventsByCategory = exec(
                """SELECT COALESCE(event_category, 'uncategorized') AS category, COUNT(*) AS cnt
                   FROM analytics_events GROUP BY category ORDER BY cnt DESC"""
            ) {
                val map = mutableMapOf<String, Long>()
                while (it.next()) map[it.getString("category")] = it.getLong("cnt")
                map
            }

            val recentEvents = exec(
                """SELECT id, event_name, event_category, user_id, created_at
                   FROM analytics_events ORDER BY created_at DESC LIMIT 20"""
            ) {
                val list = mutableListOf<AdminEventSummary>()
                while (it.next()) {
                    list.add(
                        AdminEventSummary(
                            id = it.getString("id"),
                            eventName = it.getString("event_name"),
                            category = it.getString("event_category"),
                            userId = it.getString("user_id"),
                            createdAt = it.getTimestamp("created_at").toString()
                        )
                    )
                }
                list
            }

            AdminDashboardResponse(
                totalUsers = totalUsers,
                activeUsers = activeUsers,
                totalChats = totalChats,
                totalMessages = totalMessages,
                totalMemories = totalMemories,
                totalMarketplaceItems = totalMarketplaceItems,
                totalCourses = totalCourses,
                totalRevenue = totalRevenue,
                dailyActiveUsers = dailyActiveUsers,
                eventsByCategory = eventsByCategory,
                recentEvents = recentEvents
            )
        }
    }

    fun listUsers(
        pagination: PaginationRequest,
        search: String? = null
    ): Pair<List<AdminUserResponse>, PaginationMeta> {
        val offset = (pagination.page - 1) * pagination.limit
        val sort = pagination.sort ?: "created_at"
        val order = pagination.order.name
        val searchClause = if (!search.isNullOrBlank()) {
            """AND (username ILIKE '%${search.replace("'", "''")}%'
                   OR email ILIKE '%${search.replace("'", "''")}%'
                   OR display_name ILIKE '%${search.replace("'", "''")}%')"""
        } else ""

        return transaction {
            val total = exec("SELECT COUNT(*) FROM users WHERE 1=1 $searchClause") {
                if (it.next()) it.getLong(1) else 0L
            }

            val users = exec(
                """SELECT id, email, username, display_name, role, is_active, email_verified,
                          last_active_at, deleted_at, created_at
                   FROM users WHERE 1=1 $searchClause
                   ORDER BY $sort $order LIMIT ${pagination.limit} OFFSET $offset"""
            ) {
                val list = mutableListOf<AdminUserResponse>()
                while (it.next()) {
                    list.add(
                        AdminUserResponse(
                            id = it.getString("id"),
                            email = it.getString("email"),
                            username = it.getString("username"),
                            displayName = it.getString("display_name"),
                            role = it.getString("role"),
                            isActive = it.getBoolean("is_active"),
                            emailVerified = it.getBoolean("email_verified"),
                            lastActiveAt = it.getTimestamp("last_active_at")?.toString(),
                            deletedAt = it.getTimestamp("deleted_at")?.toString(),
                            createdAt = it.getTimestamp("created_at").toString()
                        )
                    )
                }
                list
            }

            val totalPages = ((total + pagination.limit - 1) / pagination.limit).toInt()
            users to PaginationMeta(
                page = pagination.page,
                limit = pagination.limit,
                total = total,
                totalPages = totalPages,
                hasNext = pagination.page < totalPages,
                hasPrevious = pagination.page > 1
            )
        }
    }

    fun takeAction(adminId: String, request: AdminActionRequest): AdminActionResponse {
        val id = "act_${UUID.randomUUID().toString().take(24)}"
        val details = request.details?.let {
            kotlinx.serialization.json.Json.encodeToString(it)
        }

        transaction {
            exec(
                """INSERT INTO admin_actions (id, admin_id, action, target_type, target_id, reason, duration_hours, details)
                   VALUES ('$id', '$adminId', '${request.action}', '${request.targetType}', '${request.targetId}',
                           '${request.reason.replace("'", "''")}',
                           ${request.durationHours ?: "NULL"},
                           ${if (details != null) "'$details'" else "NULL"})"""
            )

            when (request.action) {
                "ban" -> exec("UPDATE users SET is_active = FALSE WHERE id = '${request.targetId}'")
                "unban" -> exec("UPDATE users SET is_active = TRUE WHERE id = '${request.targetId}'")
                "delete" -> exec("UPDATE users SET deleted_at = NOW(), is_active = FALSE WHERE id = '${request.targetId}'")
                "suspend" -> {
                    val interval = request.durationHours?.let { "INTERVAL '$it hours'" } ?: "INTERVAL '24 hours'"
                    exec("UPDATE users SET is_active = FALSE, deleted_at = NOW() + $interval WHERE id = '${request.targetId}'")
                }
            }
        }

        return transaction {
            exec("SELECT id, admin_id, action, target_type, target_id, reason, created_at FROM admin_actions WHERE id = '$id'") {
                if (it.next()) {
                    AdminActionResponse(
                        id = it.getString("id"),
                        adminId = it.getString("admin_id"),
                        action = it.getString("action"),
                        targetType = it.getString("target_type"),
                        targetId = it.getString("target_id"),
                        reason = it.getString("reason"),
                        createdAt = it.getTimestamp("created_at").toString()
                    )
                } else throw NotFoundException("AdminAction", id)
            }
        }
    }

    fun getReports(
        pagination: PaginationRequest,
        status: String? = null
    ): Pair<List<ReportResponse>, PaginationMeta> {
        val offset = (pagination.page - 1) * pagination.limit
        val sort = pagination.sort ?: "created_at"
        val order = pagination.order.name
        val statusFilter = if (status != null) "AND status = '$status'" else ""

        return transaction {
            val total = exec("SELECT COUNT(*) FROM reports WHERE 1=1 $statusFilter") {
                if (it.next()) it.getLong(1) else 0L
            }

            val reports = exec(
                """SELECT id, reporter_id, reported_type, reported_id, reason, description,
                          status, reviewed_by, review_note, created_at
                   FROM reports WHERE 1=1 $statusFilter
                   ORDER BY $sort $order LIMIT ${pagination.limit} OFFSET $offset"""
            ) {
                val list = mutableListOf<ReportResponse>()
                while (it.next()) {
                    list.add(
                        ReportResponse(
                            id = it.getString("id"),
                            reporterId = it.getString("reporter_id"),
                            reportedType = it.getString("reported_type"),
                            reportedId = it.getString("reported_id"),
                            reason = it.getString("reason"),
                            description = it.getString("description"),
                            status = it.getString("status"),
                            reviewedBy = it.getString("reviewed_by"),
                            reviewNote = it.getString("review_note"),
                            createdAt = it.getTimestamp("created_at").toString()
                        )
                    )
                }
                list
            }

            val totalPages = ((total + pagination.limit - 1) / pagination.limit).toInt()
            reports to PaginationMeta(
                page = pagination.page,
                limit = pagination.limit,
                total = total,
                totalPages = totalPages,
                hasNext = pagination.page < totalPages,
                hasPrevious = pagination.page > 1
            )
        }
    }

    fun reviewReport(reportId: String, reviewerId: String, request: ReportReviewRequest) {
        transaction {
            exec(
                """UPDATE reports SET status = '${request.status}',
                   reviewed_by = '$reviewerId',
                   review_note = ${request.reviewNote?.let { "'${it.replace("'", "''")}'" } ?: "NULL"},
                   updated_at = NOW()
                   WHERE id = '$reportId'"""
            )
        }
    }

    fun getSystemConfig(): List<SystemConfigResponse> {
        return transaction {
            exec(
                """SELECT key, value, description, is_public, updated_at
                   FROM system_config ORDER BY key"""
            ) {
                val list = mutableListOf<SystemConfigResponse>()
                while (it.next()) {
                    list.add(
                        SystemConfigResponse(
                            key = it.getString("key"),
                            value = it.getString("value"),
                            description = it.getString("description"),
                            isPublic = it.getBoolean("is_public"),
                            updatedAt = it.getTimestamp("updated_at").toString()
                        )
                    )
                }
                list
            }
        }
    }

    fun updateSystemConfig(key: String, request: SystemConfigUpdateRequest, adminId: String) {
        val updates = mutableListOf<String>()
        updates.add("value = '${request.value.replace("'", "''")}'")
        request.description?.let { updates.add("description = '${it.replace("'", "''")}'") }
        request.isPublic?.let { updates.add("is_public = $it") }
        updates.add("updated_at = NOW()")

        transaction {
            exec(
                """INSERT INTO system_config (key, value, description, is_public, updated_at)
                   VALUES ('$key', '${request.value.replace("'", "''")}',
                           ${request.description?.let { "'${it.replace("'", "''")}'" } ?: "NULL"},
                           ${request.isPublic ?: false}, NOW())
                   ON CONFLICT (key) DO UPDATE SET ${updates.joinToString(", ")}"""
            )
        }
    }

    fun getAuditLogs(
        pagination: PaginationRequest,
        userId: String? = null,
        action: String? = null
    ): Pair<List<AuditLogResponse>, PaginationMeta> {
        val offset = (pagination.page - 1) * pagination.limit
        val sort = pagination.sort ?: "created_at"
        val order = pagination.order.name
        val userIdFilter = if (userId != null) "AND user_id = '$userId'" else ""
        val actionFilter = if (action != null) "AND action = '$action'" else ""

        return transaction {
            val total = exec(
                "SELECT COUNT(*) FROM audit_logs WHERE 1=1 $userIdFilter $actionFilter"
            ) {
                if (it.next()) it.getLong(1) else 0L
            }

            val logs = exec(
                """SELECT id, user_id, action, target_type, target_id, details, created_at
                   FROM audit_logs WHERE 1=1 $userIdFilter $actionFilter
                   ORDER BY $sort $order LIMIT ${pagination.limit} OFFSET $offset"""
            ) {
                val list = mutableListOf<AuditLogResponse>()
                while (it.next()) {
                    list.add(
                        AuditLogResponse(
                            id = it.getString("id"),
                            userId = it.getString("user_id"),
                            action = it.getString("action"),
                            targetType = it.getString("target_type"),
                            targetId = it.getString("target_id"),
                            details = it.getString("details"),
                            createdAt = it.getTimestamp("created_at").toString()
                        )
                    )
                }
                list
            }

            val totalPages = ((total + pagination.limit - 1) / pagination.limit).toInt()
            logs to PaginationMeta(
                page = pagination.page,
                limit = pagination.limit,
                total = total,
                totalPages = totalPages,
                hasNext = pagination.page < totalPages,
                hasPrevious = pagination.page > 1
            )
        }
    }
}
