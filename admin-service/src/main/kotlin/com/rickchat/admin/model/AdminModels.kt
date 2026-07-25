package com.rickchat.admin.model

import kotlinx.serialization.Serializable

@Serializable
data class AdminActionRequest(
    val action: String,
    val targetType: String,
    val targetId: String,
    val reason: String,
    val durationHours: Int? = null,
    val details: Map<String, String>? = null
)

@Serializable
data class AdminActionResponse(
    val id: String,
    val adminId: String,
    val action: String,
    val targetType: String,
    val targetId: String,
    val reason: String,
    val createdAt: String
)

@Serializable
data class ReportResponse(
    val id: String,
    val reporterId: String,
    val reportedType: String,
    val reportedId: String,
    val reason: String,
    val description: String?,
    val status: String,
    val reviewedBy: String?,
    val reviewNote: String?,
    val createdAt: String
)

@Serializable
data class ReportReviewRequest(
    val status: String,
    val reviewNote: String? = null
)

@Serializable
data class SystemConfigResponse(
    val key: String,
    val value: String,
    val description: String?,
    val isPublic: Boolean,
    val updatedAt: String
)

@Serializable
data class SystemConfigUpdateRequest(
    val value: String,
    val description: String? = null,
    val isPublic: Boolean? = null
)

@Serializable
data class AdminDashboardResponse(
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
    val recentEvents: List<AdminEventSummary>
)

@Serializable
data class AdminEventSummary(
    val id: String,
    val eventName: String,
    val category: String?,
    val userId: String?,
    val createdAt: String
)
