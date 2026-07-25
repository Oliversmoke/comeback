package com.rickchat.analytics.model

import kotlinx.serialization.Serializable

@Serializable
data class TrackEventRequest(
    val eventName: String,
    val eventCategory: String? = null,
    val eventAction: String? = null,
    val eventLabel: String? = null,
    val eventValue: Double? = null,
    val properties: Map<String, String>? = null,
    val screen: String? = null,
    val sessionId: String? = null
)

@Serializable
data class DashboardResponse(
    val totalUsers: Long,
    val activeUsers: Long,
    val totalChats: Long,
    val totalMessages: Long,
    val totalMemories: Long,
    val totalMarketplaceItems: Long,
    val totalCourses: Long,
    val totalRevenue: Double,
    val dailyActiveUsers: Long,
    val eventsByCategory: Map<String, Long>,
    val recentEvents: List<EventSummary>
)

@Serializable
data class EventSummary(
    val id: String,
    val eventName: String,
    val category: String?,
    val userId: String?,
    val createdAt: String
)

@Serializable
data class DailyStatsResponse(
    val date: String,
    val metricName: String,
    val metricValue: Double,
    val dimension: String? = null,
    val dimensionValue: String? = null
)
