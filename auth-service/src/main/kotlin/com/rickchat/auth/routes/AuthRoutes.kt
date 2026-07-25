package com.rickchat.auth.routes

import com.rickchat.auth.model.*
import com.rickchat.auth.service.AuthService
import com.rickchat.core.config.AppConfig
import com.rickchat.core.error.AuthenticationException
import com.rickchat.core.model.success
import com.rickchat.core.security.JwtService
import com.rickchat.core.security.PasswordService
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.auth.authenticate
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.post
import io.ktor.server.routing.route

class AuthRoutes(
    private val jwtService: JwtService,
    private val appConfig: AppConfig
) {
    private val authService = AuthService(jwtService, PasswordService(), appConfig)

    fun register(route: Route) {
        route("api/v1/auth") {
            post("/register") {
                val request = call.receive<RegisterRequest>()
                val response = authService.register(request)
                call.respond(HttpStatusCode.Created, success(response))
            }

            post("/login") {
                val request = call.receive<LoginRequest>()
                val response = authService.login(request)
                call.respond(success(response))
            }

            post("/refresh") {
                val request = call.receive<RefreshTokenRequest>()
                val response = authService.refreshToken(request)
                call.respond(success(response))
            }

            post("/oauth/{provider}") {
                val provider = call.parameters["provider"] ?: throw AuthenticationException("Provider required")
                val request = call.receive<OAuthRequest>()
                val oauthRequest = request.copy(provider = provider)
                val response = authService.oauthLogin(oauthRequest)
                call.respond(success(response))
            }

            post("/reset-password") {
                val request = call.receive<PasswordResetRequest>()
                authService.requestPasswordReset(request.email)
                call.respond(success(mapOf("message" to "If the email exists, a reset link has been sent")))
            }

            post("/reset-password/confirm") {
                val request = call.receive<PasswordResetConfirmRequest>()
                authService.confirmPasswordReset(request.token, request.newPassword)
                call.respond(success(mapOf("message" to "Password has been reset successfully")))
            }

            post("/verify-email") {
                val request = call.receive<VerifyEmailRequest>()
                val payload = jwtService.validateToken(request.token)
                    .getOrElse { throw AuthenticationException("Invalid or expired verification token") }
                org.jetbrains.exposed.sql.transactions.transaction {
                    org.jetbrains.exposed.sql.exec("UPDATE users SET email_verified = TRUE WHERE id = '${payload.userId}'")
                }
                call.respond(success(mapOf("message" to "Email verified successfully")))
            }

            post("/change-password") {
                val request = call.receive<ChangePasswordRequest>()
                val userId = call.request.headers["X-User-ID"] ?: throw AuthenticationException()
                authService.changePassword(userId, request)
                call.respond(success(mapOf("message" to "Password changed successfully")))
            }
        }
    }
}
