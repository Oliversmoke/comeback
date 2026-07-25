package com.rickchat.core.model

import kotlinx.serialization.Serializable

@Serializable
enum class Role(val permissions: Set<Permission>) {
    SUPER_ADMIN(Permission.entries.toSet()),
    ADMIN(
        setOf(
            Permission.READ_USER, Permission.UPDATE_USER, Permission.DELETE_USER,
            Permission.READ_CHAT, Permission.DELETE_CHAT,
            Permission.READ_MEMORY, Permission.DELETE_MEMORY,
            Permission.READ_MARKETPLACE, Permission.UPDATE_MARKETPLACE, Permission.DELETE_MARKETPLACE,
            Permission.READ_ANALYTICS,
            Permission.MANAGE_CONTENT, Permission.MANAGE_MODERATION,
            Permission.READ_LOGS, Permission.READ_METRICS
        )
    ),
    MODERATOR(
        setOf(
            Permission.READ_USER,
            Permission.READ_CHAT,
            Permission.READ_MARKETPLACE,
            Permission.MANAGE_MODERATION,
            Permission.MANAGE_CONTENT
        )
    ),
    CREATOR(
        setOf(
            Permission.CREATE_CONTENT, Permission.UPDATE_CONTENT, Permission.DELETE_CONTENT,
            Permission.READ_MARKETPLACE, Permission.CREATE_MARKETPLACE,
            Permission.READ_ANALYTICS
        )
    ),
    USER(
        setOf(
            Permission.READ_CHAT, Permission.CREATE_CHAT,
            Permission.READ_MEMORY, Permission.CREATE_MEMORY,
            Permission.READ_MARKETPLACE
        )
    ),
    ANONYMOUS(emptySet())
}

@Serializable
enum class Permission {
    // User management
    CREATE_USER, READ_USER, UPDATE_USER, DELETE_USER,
    // Chat
    CREATE_CHAT, READ_CHAT, UPDATE_CHAT, DELETE_CHAT,
    // Memory
    CREATE_MEMORY, READ_MEMORY, UPDATE_MEMORY, DELETE_MEMORY,
    // Marketplace
    CREATE_MARKETPLACE, READ_MARKETPLACE, UPDATE_MARKETPLACE, DELETE_MARKETPLACE,
    // Content
    CREATE_CONTENT, READ_CONTENT, UPDATE_CONTENT, DELETE_CONTENT,
    MANAGE_CONTENT, MANAGE_MODERATION,
    // Analytics
    READ_ANALYTICS,
    // Admin
    MANAGE_USERS, MANAGE_SYSTEM, READ_LOGS, READ_METRICS,
    // Payments
    READ_PAYMENTS, MANAGE_PAYMENTS,
    // Subscription
    READ_SUBSCRIPTION, MANAGE_SUBSCRIPTION
}
