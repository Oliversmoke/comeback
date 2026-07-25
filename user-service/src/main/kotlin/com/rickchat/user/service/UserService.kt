package com.rickchat.user.service

import com.rickchat.core.error.NotFoundException
import com.rickchat.core.error.ValidationException
import com.rickchat.core.model.PaginationMeta
import com.rickchat.core.model.PaginationRequest
import com.rickchat.core.util.Validator
import com.rickchat.user.model.*
import org.jetbrains.exposed.sql.transactions.transaction

class UserService {
    fun getUser(userId: String): UserResponse {
        return transaction {
            exec("SELECT id, email, username, display_name, role, avatar_url, bio, locale, timezone, email_verified, is_active, last_active_at, created_at FROM users WHERE id = '$userId' AND deleted_at IS NULL") {
                if (it.next()) {
                    UserResponse(
                        id = it.getString("id"),
                        email = it.getString("email"),
                        username = it.getString("username"),
                        displayName = it.getString("display_name"),
                        role = it.getString("role"),
                        avatarUrl = it.getString("avatar_url"),
                        bio = it.getString("bio"),
                        locale = it.getString("locale") ?: "en",
                        timezone = it.getString("timezone") ?: "UTC",
                        emailVerified = it.getBoolean("email_verified"),
                        isActive = it.getBoolean("is_active"),
                        lastActiveAt = it.getTimestamp("last_active_at")?.toString(),
                        createdAt = it.getTimestamp("created_at").toString()
                    )
                } else throw NotFoundException("User", userId)
            }
        }
    }

    fun updateUser(userId: String, request: UpdateUserRequest): UserResponse {
        val updates = mutableListOf<String>()
        request.displayName?.let { updates.add("display_name = '$it'") }
        request.bio?.let { updates.add("bio = '${it.replace("'", "''")}'") }
        request.locale?.let { updates.add("locale = '$it'") }
        request.timezone?.let { updates.add("timezone = '$it'") }
        request.avatarUrl?.let { updates.add("avatar_url = '$it'") }

        if (updates.isEmpty()) return getUser(userId)

        transaction {
            exec("UPDATE users SET ${updates.joinToString(", ")}, updated_at = NOW() WHERE id = '$userId'")
        }
        return getUser(userId)
    }

    fun deleteUser(userId: String) {
        transaction {
            exec("UPDATE users SET deleted_at = NOW(), is_active = FALSE WHERE id = '$userId'")
        }
    }

    fun getUserProfile(userId: String): UserProfileResponse {
        return transaction {
            exec("SELECT * FROM user_profiles WHERE user_id = '$userId'") {
                if (it.next()) {
                    UserProfileResponse(
                        userId = it.getString("user_id"),
                        phone = it.getString("phone"),
                        websiteUrl = it.getString("website_url"),
                        company = it.getString("company"),
                        title = it.getString("title"),
                        socialLinks = parseJsonMap(it.getString("social_links") ?: "{}"),
                        preferences = parseJsonMapAny(it.getString("preferences") ?: "{}"),
                        accessibilitySettings = parseJsonMapAny(it.getString("accessibility_settings") ?: "{}"),
                        notificationSettings = parseJsonMapAny(it.getString("notification_settings") ?: "{}"),
                        privacySettings = parseJsonMapAny(it.getString("privacy_settings") ?: "{}"),
                        theme = it.getString("theme") ?: "system"
                    )
                } else throw NotFoundException("Profile", userId)
            }
        }
    }

    fun updateUserProfile(userId: String, request: UpdateProfileRequest): UserProfileResponse {
        val updates = mutableListOf<String>()
        request.phone?.let { Validator.phone(it); updates.add("phone = '$it'") }
        request.websiteUrl?.let { Validator.url(it); updates.add("website_url = '$it'") }
        request.company?.let { updates.add("company = '$it'") }
        request.title?.let { updates.add("title = '$it'") }
        request.theme?.let { updates.add("theme = '$it'") }
        request.socialLinks?.let { updates.add("social_links = '${it.toJsonString()}'") }
        request.preferences?.let { updates.add("preferences = '${it.toJsonString()}'") }
        request.accessibilitySettings?.let { updates.add("accessibility_settings = '${it.toJsonString()}'") }
        request.notificationSettings?.let { updates.add("notification_settings = '${it.toJsonString()}'") }
        request.privacySettings?.let { updates.add("privacy_settings = '${it.toJsonString()}'") }

        if (updates.isNotEmpty()) {
            transaction {
                exec("UPDATE user_profiles SET ${updates.joinToString(", ")}, updated_at = NOW() WHERE user_id = '$userId'")
            }
        }
        return getUserProfile(userId)
    }

    fun listUsers(pagination: PaginationRequest): Pair<List<UserResponse>, PaginationMeta> {
        val offset = (pagination.page - 1) * pagination.limit
        val sortColumn = pagination.sort ?: "created_at"
        val order = pagination.order.name
        val searchClause = if (!pagination.search.isNullOrBlank()) {
            "AND (username ILIKE '%${pagination.search}%' OR email ILIKE '%${pagination.search}%' OR display_name ILIKE '%${pagination.search}%')"
        } else ""

        return transaction {
            val total = exec("SELECT COUNT(*) FROM users WHERE deleted_at IS NULL $searchClause") {
                if (it.next()) it.getLong(1) else 0L
            }

            val users = exec("SELECT id, email, username, display_name, role, avatar_url, bio, locale, timezone, email_verified, is_active, last_active_at, created_at FROM users WHERE deleted_at IS NULL $searchClause ORDER BY $sortColumn $order LIMIT ${pagination.limit} OFFSET $offset") {
                val list = mutableListOf<UserResponse>()
                while (it.next()) {
                    list.add(
                        UserResponse(
                            id = it.getString("id"),
                            email = it.getString("email"),
                            username = it.getString("username"),
                            displayName = it.getString("display_name"),
                            role = it.getString("role"),
                            avatarUrl = it.getString("avatar_url"),
                            bio = it.getString("bio"),
                            locale = it.getString("locale") ?: "en",
                            timezone = it.getString("timezone") ?: "UTC",
                            emailVerified = it.getBoolean("email_verified"),
                            isActive = it.getBoolean("is_active"),
                            lastActiveAt = it.getTimestamp("last_active_at")?.toString(),
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

    @Suppress("UNCHECKED_CAST")
    private fun parseJsonMap(json: String): Map<String, String> {
        return try {
            kotlinx.serialization.json.Json.decodeFromString<Map<String, String>>(json)
        } catch (e: Exception) { emptyMap() }
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseJsonMapAny(json: String): Map<String, Any> {
        return try {
            kotlinx.serialization.json.Json.decodeFromString<Map<String, Any>>(json)
        } catch (e: Exception) { emptyMap() }
    }

    private fun Map<String, Any>.toJsonString(): String {
        return kotlinx.serialization.json.Json.encodeToString(this)
    }

    private fun Map<String, String>.toJsonString(): String {
        return kotlinx.serialization.json.Json.encodeToString(this)
    }
}
