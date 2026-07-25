package com.rickchat.analytics.service

import com.rickchat.analytics.model.*
import org.jetbrains.exposed.sql.transactions.transaction
import java.util.UUID

class AnalyticsService {

    fun trackEvent(userId: String, request: TrackEventRequest) {
        val id = "evt_${UUID.randomUUID().toString().take(24)}"
        val properties = request.properties?.let {
            kotlinx.serialization.json.Json.encodeToString(it)
        }

        transaction {
            exec(
                """INSERT INTO analytics_events (id, user_id, event_name, event_category, event_action,
                   event_label, event_value, properties, screen, session_id)
                   VALUES ('$id', '$userId', '${request.eventName.replace("'", "''")}',
                           ${request.eventCategory?.let { "'${it.replace("'", "''")}'" } ?: "NULL"},
                           ${request.eventAction?.let { "'${it.replace("'", "''")}'" } ?: "NULL"},
                           ${request.eventLabel?.let { "'${it.replace("'", "''")}'" } ?: "NULL"},
                           ${request.eventValue?.toString() ?: "NULL"},
                           ${if (properties != null) "'$properties'" else "NULL"},
                           ${request.screen?.let { "'${it.replace("'", "''")}'" } ?: "NULL"},
                           ${request.sessionId?.let { "'$it'" } ?: "NULL"})"""
            )
        }
    }

    fun getDashboard(): DashboardResponse {
        return transaction {
            val totalUsers = exec("SELECT COUNT(*) FROM users WHERE deleted_at IS NULL") {
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

            val totalMemories = exec("SELECT COUNT(*) FROM memory_entries WHERE deleted_at IS NULL") {
                if (it.next()) it.getLong(1) else 0L
            }

            val totalMarketplaceItems = exec("SELECT COUNT(*) FROM marketplace_items WHERE deleted_at IS NULL") {
                if (it.next()) it.getLong(1) else 0L
            }

            val totalCourses = exec("SELECT COUNT(*) FROM courses WHERE deleted_at IS NULL") {
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
                val list = mutableListOf<EventSummary>()
                while (it.next()) {
                    list.add(
                        EventSummary(
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

            DashboardResponse(
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

    fun getDailyStats(
        metricName: String,
        fromDate: String,
        toDate: String
    ): List<DailyStatsResponse> {
        return transaction {
            exec(
                """SELECT DATE(created_at) AS date, event_name AS metric_name, COUNT(*) AS metric_value,
                          event_category AS dimension, event_category AS dimension_value
                   FROM analytics_events
                   WHERE created_at >= '$fromDate' AND created_at < '$toDate' + INTERVAL '1 day'
                   GROUP BY DATE(created_at), event_name, event_category
                   ORDER BY date"""
            ) {
                val list = mutableListOf<DailyStatsResponse>()
                while (it.next()) {
                    list.add(
                        DailyStatsResponse(
                            date = it.getDate("date").toString(),
                            metricName = it.getString("metric_name"),
                            metricValue = it.getDouble("metric_value"),
                            dimension = it.getString("dimension"),
                            dimensionValue = it.getString("dimension_value")
                        )
                    )
                }
                list
            }
        }
    }

    fun trackPageView(
        userId: String,
        path: String,
        title: String?,
        referrer: String?,
        duration: Long?,
        sessionId: String?
    ) {
        val id = "pv_${UUID.randomUUID().toString().take(24)}"

        transaction {
            exec(
                """INSERT INTO analytics_page_views (id, user_id, path, title, referrer, duration, session_id)
                   VALUES ('$id', '$userId', '${path.replace("'", "''")}',
                           ${title?.let { "'${it.replace("'", "''")}'" } ?: "NULL"},
                           ${referrer?.let { "'${it.replace("'", "''")}'" } ?: "NULL"},
                           ${duration ?: "NULL"},
                           ${sessionId?.let { "'$it'" } ?: "NULL"})"""
            )
        }
    }
}
