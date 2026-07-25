package com.rickchat.core.security

import com.rickchat.core.config.AppConfig
import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import io.ktor.server.auth.jwt.JWTCredential
import io.ktor.server.auth.jwt.JWTPrincipal

class JwtService(private val appConfig: AppConfig) {
    val verifier = JWT.require(Algorithm.HMAC256(appConfig.jwt.secret))
        .withIssuer(appConfig.jwt.issuer)
        .withAudience(appConfig.jwt.audience)
        .build()

    fun validate(credential: JWTCredential): JWTPrincipal? {
        return try {
            val payload = verifier.verify(credential.token)
            JWTPrincipal(payload)
        } catch (e: Exception) {
            null
        }
    }
}
