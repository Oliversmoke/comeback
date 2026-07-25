package com.rickchat.auth.model

import kotlinx.serialization.Serializable

@Serializable
data class RegisterRequest(
    val email: String,
    val username: String,
    val password: String,
    val displayName: String? = null,
    val locale: String = "en"
)

@Serializable
data class LoginRequest(
    val email: String,
    val password: String,
    val rememberMe: Boolean = false
)

@Serializable
data class RefreshTokenRequest(
    val refreshToken: String
)

@Serializable
data class AuthResponse(
    val userId: String,
    val email: String,
    val username: String,
    val displayName: String?,
    val role: String,
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Long
)

@Serializable
data class OAuthRequest(
    val provider: String,
    val idToken: String,
    val email: String? = null,
    val displayName: String? = null
)

@Serializable
data class PasswordResetRequest(
    val email: String
)

@Serializable
data class PasswordResetConfirmRequest(
    val token: String,
    val newPassword: String
)

@Serializable
data class VerifyEmailRequest(
    val token: String
)

@Serializable
data class ChangePasswordRequest(
    val currentPassword: String,
    val newPassword: String
)
