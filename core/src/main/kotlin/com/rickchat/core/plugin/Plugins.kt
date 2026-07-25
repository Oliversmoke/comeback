package com.rickchat.core.plugin

import com.rickchat.core.config.AppConfig
import com.rickchat.core.security.JwtService
import com.rickchat.core.security.RateLimiter
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.auth.Authentication
import io.ktor.server.auth.jwt.jwt
import io.ktor.server.plugins.callloging.CallLogging
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.plugins.ratelimit.RateLimit
import io.ktor.server.plugins.ratelimit.RateLimitName
import io.ktor.server.plugins.statuspages.StatusPages
import kotlinx.serialization.json.Json

fun Application.configurePlugins(appConfig: AppConfig, jwtService: JwtService, rateLimiter: RateLimiter) {
    install(ContentNegotiation) {
        json(Json {
            prettyPrint = true
            ignoreUnknownKeys = true
            isLenient = true
        })
    }

    install(CallLogging)

    install(Authentication) {
        jwt {
            verifier(jwtService.verifier)
            realm = appConfig.jwt.issuer
            validate { credential ->
                jwtService.validate(credential)
            }
        }
    }

    install(RateLimit) {
        register(RateLimitName("global"), rateLimiter.global())
    }

    install(StatusPages) {
        exception<Throwable> { call, cause ->
            call.respond(HttpStatusCode.InternalServerError, mapOf("error" to cause.message))
        }
    }
}
