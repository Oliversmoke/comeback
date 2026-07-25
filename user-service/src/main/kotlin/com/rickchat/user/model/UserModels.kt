package com.rickchat.user.model

import kotlinx.serialization.Serializable

@Serializable
data class UserResponse(
    val id: String,
    val email: String,
    val username: String,
    val displayName: String?,
    val role: String,
    val avatarUrl: String?,
    val bio: String?,
    val locale: String,
    val timezone: String,
    val emailVerified: Boolean,
    val isActive: Boolean,
    val lastActiveAt: String?,
    val createdAt: String
)

@Serializable
data class UserProfileResponse(
    val userId: String,
    val phone: String?,
    val websiteUrl: String?,
    val company: String?,
    val title: String?,
    val socialLinks: Map<String, String>?,
    val preferences: Map<String, Any>?,
    val accessibilitySettings: Map<String, Any>?,
    val notificationSettings: Map<String, Any>?,
    val privacySettings: Map<String, Any>?,
    val theme: String
)

@Serializable
data class UpdateUserRequest(
    val displayName: String? = null,
    val bio: String? = null,
    val locale: String? = null,
    val timezone: String? = null,
    val avatarUrl: String? = null
)

@Serializable
data class UpdateProfileRequest(
    val phone: String? = null,
    val websiteUrl: String? = null,
    val company: String? = null,
    val title: String? = null,
    val socialLinks: Map<String, String>? = null,
    val theme: String? = null,
    val preferences: Map<String, Any>? = null,
    val accessibilitySettings: Map<String, Any>? = null,
    val notificationSettings: Map<String, Any>? = null,
    val privacySettings: Map<String, Any>? = null
)
