package com.rickchat.notification.model

import kotlinx.serialization.Serializable

@Serializable
data class NotificationResponse(
    val id: String,
    val userId: String,
    val type: String,
    val channel: String,
    val title: String,
    val body: String,
    val data: Map<String, String>? = null,
    val actionUrl: String? = null,
    val imageUrl: String? = null,
    val isRead: Boolean = false,
    val priority: String = "normal",
    val createdAt: String
)

@Serializable
data class SendNotificationRequest(
    val userIds: List<String>,
    val type: String,
    val channel: String,
    val title: String,
    val body: String,
    val data: Map<String, String>? = null,
    val actionUrl: String? = null,
    val priority: String = "normal"
)

@Serializable
data class DeviceTokenRequest(
    val deviceToken: String,
    val platform: String,
    val appVersion: String? = null,
    val deviceModel: String? = null
)

@Serializable
data class NotificationStatsResponse(
    val total: Long,
    val unread: Long,
    val byChannel: Map<String, Long>
)
