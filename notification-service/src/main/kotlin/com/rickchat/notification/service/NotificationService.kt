package com.rickchat.notification.service

import com.rickchat.core.error.NotFoundException
import com.rickchat.core.model.PaginationMeta
import com.rickchat.notification.model.*
import org.jetbrains.exposed.sql.transactions.transaction
import java.util.UUID

class NotificationService {

    fun getNotifications(
        userId: String,
        page: Int,
        limit: Int,
        unreadOnly: Boolean?
    ): Pair<List<NotificationResponse>, PaginationMeta> {
        val offset = (page - 1) * limit
        val unreadClause = if (unreadOnly == true) "AND is_read = FALSE" else ""

        return transaction {
            val total = exec("SELECT COUNT(*) FROM notifications WHERE user_id = '$userId' $unreadClause") {
                if (it.next()) it.getLong(1) else 0L
            }

            val notifications = exec(
                """SELECT id, user_id, type, channel, title, body, data, action_url, image_url,
                   is_read, priority, created_at
                   FROM notifications
                   WHERE user_id = '$userId' $unreadClause
                   ORDER BY created_at DESC
                   LIMIT $limit OFFSET $offset"""
            ) {
                val list = mutableListOf<NotificationResponse>()
                while (it.next()) {
                    list.add(
                        NotificationResponse(
                            id = it.getString("id"),
                            userId = it.getString("user_id"),
                            type = it.getString("type"),
                            channel = it.getString("channel"),
                            title = it.getString("title"),
                            body = it.getString("body"),
                            data = parseNullableJsonMap(it.getString("data")),
                            actionUrl = it.getString("action_url"),
                            imageUrl = it.getString("image_url"),
                            isRead = it.getBoolean("is_read"),
                            priority = it.getString("priority") ?: "normal",
                            createdAt = it.getTimestamp("created_at").toString()
                        )
                    )
                }
                list
            }

            val totalPages = ((total + limit - 1) / limit).toInt()
            notifications to PaginationMeta(
                page = page,
                limit = limit,
                total = total,
                totalPages = totalPages,
                hasNext = page < totalPages,
                hasPrevious = page > 1
            )
        }
    }

    fun markAsRead(userId: String, notificationId: String) {
        transaction {
            val updated = exec("UPDATE notifications SET is_read = TRUE WHERE id = '$notificationId' AND user_id = '$userId'")
            if (updated == 0) throw NotFoundException("Notification", notificationId)
        }
    }

    fun markAllAsRead(userId: String) {
        transaction {
            exec("UPDATE notifications SET is_read = TRUE WHERE user_id = '$userId' AND is_read = FALSE")
        }
    }

    fun sendNotification(request: SendNotificationRequest) {
        transaction {
            for (userId in request.userIds) {
                val id = UUID.randomUUID().toString()
                val dataJson = request.data?.let { serializeJsonMap(it) }
                exec(
                    """INSERT INTO notifications (id, user_id, type, channel, title, body, data, action_url, priority, created_at)
                       VALUES ('$id', '$userId', '${request.type}', '${request.channel}',
                               '${escapeSql(request.title)}', '${escapeSql(request.body)}',
                               ${if (dataJson != null) "'$dataJson'" else "NULL"},
                               ${if (request.actionUrl != null) "'${escapeSql(request.actionUrl)}'" else "NULL"},
                               '${request.priority}', NOW())"""
                )
            }
        }
    }

    fun registerDevice(userId: String, request: DeviceTokenRequest) {
        transaction {
            exec(
                """INSERT INTO notification_devices (user_id, device_token, platform, app_version, device_model, created_at)
                   VALUES ('$userId', '${escapeSql(request.deviceToken)}', '${escapeSql(request.platform)}',
                           ${if (request.appVersion != null) "'${escapeSql(request.appVersion)}'" else "NULL"},
                           ${if (request.deviceModel != null) "'${escapeSql(request.deviceModel)}'" else "NULL"},
                           NOW())
                   ON CONFLICT (device_token) DO UPDATE SET
                       platform = EXCLUDED.platform,
                       app_version = EXCLUDED.app_version,
                       device_model = EXCLUDED.device_model,
                       updated_at = NOW()"""
            )
        }
    }

    fun getStats(userId: String): NotificationStatsResponse {
        return transaction {
            val total = exec("SELECT COUNT(*) FROM notifications WHERE user_id = '$userId'") {
                if (it.next()) it.getLong(1) else 0L
            }

            val unread = exec("SELECT COUNT(*) FROM notifications WHERE user_id = '$userId' AND is_read = FALSE") {
                if (it.next()) it.getLong(1) else 0L
            }

            val byChannel = exec(
                "SELECT channel, COUNT(*) as cnt FROM notifications WHERE user_id = '$userId' GROUP BY channel"
            ) {
                val map = mutableMapOf<String, Long>()
                while (it.next()) {
                    map[it.getString("channel")] = it.getLong("cnt")
                }
                map
            }

            NotificationStatsResponse(total = total, unread = unread, byChannel = byChannel)
        }
    }

    fun deleteNotification(userId: String, notificationId: String) {
        transaction {
            val deleted = exec("DELETE FROM notifications WHERE id = '$notificationId' AND user_id = '$userId'")
            if (deleted == 0) throw NotFoundException("Notification", notificationId)
        }
    }

    private fun parseNullableJsonMap(json: String?): Map<String, String>? {
        if (json.isNullOrBlank()) return null
        return try {
            kotlinx.serialization.json.Json.decodeFromString<Map<String, String>>(json)
        } catch (e: Exception) { null }
    }

    private fun serializeJsonMap(map: Map<String, String>): String {
        return kotlinx.serialization.json.Json.encodeToString(map)
    }

    private fun escapeSql(value: String): String {
        return value.replace("'", "''")
    }
}
