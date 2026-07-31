package com.rickchat.auth.service

import com.rickchat.auth.model.*
import com.rickchat.core.config.AppConfig
import com.rickchat.core.error.*
import com.rickchat.core.model.Role
import com.rickchat.core.model.UserId
import com.rickchat.core.security.JwtService
import com.rickchat.core.security.PasswordService
import com.rickchat.core.util.Validator
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction

class AuthService(
    private val jwtService: JwtService,
    private val passwordService: PasswordService,
    private val appConfig: AppConfig
) {
    private val json = kotlinx.serialization.json.Json { ignoreUnknownKeys = true }

    suspend fun register(request: RegisterRequest): AuthResponse {
        Validator.email(request.email)
        Validator.username(request.username)
        Validator.password(request.password)

        val userId = UserId.generate()
        val passwordHash = passwordService.hash(request.password)

        transaction {
            exec(
                """INSERT INTO users (id, email, username, display_name, password_hash, role, locale)
                   VALUES ('${userId.value}', '${request.email}', '${request.username}',
                           '${request.displayName ?: request.username}', '$passwordHash',
                           '${Role.USER.name}', '${request.locale}')"""
            )
        }

        val tokenPair = jwtService.generateTokenPair(userId, request.email, Role.USER)

        transaction {
            exec(
                """INSERT INTO user_profiles (user_id) VALUES ('${userId.value}')"""
            )
        }

        return AuthResponse(
            userId = userId.value,
            email = request.email,
            username = request.username,
            displayName = request.displayName ?: request.username,
            role = Role.USER.name,
            accessToken = tokenPair.accessToken,
            refreshToken = tokenPair.refreshToken,
            expiresIn = tokenPair.expiresIn
        )
    }

    suspend fun login(request: LoginRequest): AuthResponse {
        Validator.email(request.email)

        val row = transaction {
            exec("SELECT id, email, username, display_name, password_hash, role FROM users WHERE email = '${request.email}' AND deleted_at IS NULL") {
                if (it.next()) {
                    UserRow(
                        id = it.getString("id"),
                        email = it.getString("email"),
                        username = it.getString("username"),
                        displayName = it.getString("display_name"),
                        passwordHash = it.getString("password_hash") ?: "",
                        role = it.getString("role")
                    )
                } else null
            }
        } ?: throw AuthenticationException("Invalid email or password")

        if (!passwordService.verify(request.password, row.passwordHash)) {
            throw AuthenticationException("Invalid email or password")
        }

        val role = try { Role.valueOf(row.role.uppercase()) } catch (e: Exception) { Role.USER }
        val userId = UserId.fromString(row.id)
        val tokenPair = jwtService.generateTokenPair(userId, row.email, role)

        transaction {
            exec("UPDATE users SET last_login_at = NOW() WHERE id = '${row.id}'")
        }

        return AuthResponse(
            userId = row.id,
            email = row.email,
            username = row.username,
            displayName = row.displayName,
            role = row.role,
            accessToken = tokenPair.accessToken,
            refreshToken = tokenPair.refreshToken,
            expiresIn = tokenPair.expiresIn
        )
    }

    suspend fun refreshToken(request: RefreshTokenRequest): AuthResponse {
        val payload = jwtService.validateToken(request.refreshToken)
            .getOrElse { throw AuthenticationException("Invalid or expired refresh token") }

        val row = transaction {
            exec("SELECT id, email, username, display_name, role FROM users WHERE id = '${payload.userId}' AND deleted_at IS NULL") {
                if (it.next()) {
                    UserRow(
                        id = it.getString("id"),
                        email = it.getString("email"),
                        username = it.getString("username"),
                        displayName = it.getString("display_name"),
                        passwordHash = "",
                        role = it.getString("role")
                    )
                } else null
            }
        } ?: throw AuthenticationException("User not found")

        val role = try { Role.valueOf(row.role.uppercase()) } catch (e: Exception) { Role.USER }
        val userId = UserId.fromString(row.id)
        val tokenPair = jwtService.generateTokenPair(userId, row.email, role)

        return AuthResponse(
            userId = row.id,
            email = row.email,
            username = row.username,
            displayName = row.displayName,
            role = row.role,
            accessToken = tokenPair.accessToken,
            refreshToken = tokenPair.refreshToken,
            expiresIn = tokenPair.expiresIn
        )
    }

    suspend fun oauthLogin(request: OAuthRequest): AuthResponse {
        val userId = UserId.generate()
        val role = Role.USER

        val existingUser = transaction {
            exec("SELECT id, email, username, display_name, role FROM users WHERE firebase_uid = '${request.idToken}'") {
                if (it.next()) {
                    UserRow(
                        id = it.getString("id"),
                        email = it.getString("email"),
                        username = it.getString("username"),
                        displayName = it.getString("display_name"),
                        passwordHash = "",
                        role = it.getString("role")
                    )
                } else null
            }
        }

        if (existingUser != null) {
            val existingRole = try { Role.valueOf(existingUser.role.uppercase()) } catch (e: Exception) { Role.USER }
            val tokenPair = jwtService.generateTokenPair(UserId.fromString(existingUser.id), existingUser.email, existingRole)
            return AuthResponse(
                userId = existingUser.id,
                email = existingUser.email,
                username = existingUser.username,
                displayName = existingUser.displayName,
                role = existingUser.role,
                accessToken = tokenPair.accessToken,
                refreshToken = tokenPair.refreshToken,
                expiresIn = tokenPair.expiresIn
            )
        }

        val username = "user_${UserId.generate().value.take(8)}"
        val email = request.email ?: "$username@rickchat.auth"

        transaction {
            exec(
                """INSERT INTO users (id, email, username, display_name, firebase_uid, role)
                   VALUES ('${userId.value}', '$email', '$username',
                           '${request.displayName ?: username}', '${request.idToken}', '${role.name}')"""
            )
            exec("INSERT INTO user_profiles (user_id) VALUES ('${userId.value}')")
        }

        val tokenPair = jwtService.generateTokenPair(userId, email, role)
        return AuthResponse(
            userId = userId.value,
            email = email,
            username = username,
            displayName = request.displayName ?: username,
            role = role.name,
            accessToken = tokenPair.accessToken,
            refreshToken = tokenPair.refreshToken,
            expiresIn = tokenPair.expiresIn
        )
    }

    suspend fun requestPasswordReset(email: String) {
        Validator.email(email)
        // In production: send email with reset token
    }

    suspend fun confirmPasswordReset(token: String, newPassword: String) {
        Validator.password(newPassword)
        val payload = jwtService.validateToken(token)
            .getOrElse { throw AuthenticationException("Invalid or expired reset token") }
        val passwordHash = passwordService.hash(newPassword)
        transaction {
            exec("UPDATE users SET password_hash = '$passwordHash' WHERE id = '${payload.userId}'")
        }
    }

    suspend fun changePassword(userId: String, request: ChangePasswordRequest) {
        Validator.password(request.newPassword)
        val row = transaction {
            exec("SELECT password_hash FROM users WHERE id = '$userId'") {
                if (it.next()) it.getString("password_hash") ?: "" else throw NotFoundException("User", userId)
            }
        }
        if (!passwordService.verify(request.currentPassword, row)) {
            throw AuthenticationException("Current password is incorrect")
        }
        val passwordHash = passwordService.hash(request.newPassword)
        transaction {
            exec("UPDATE users SET password_hash = '$passwordHash' WHERE id = '$userId'")
        }
    }

    private data class UserRow(
        val id: String, val email: String, val username: String,
        val displayName: String?, val passwordHash: String, val role: String
    )
}
