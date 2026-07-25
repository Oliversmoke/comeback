package com.rickchat.core.security

import com.rickchat.core.config.AppConfig
import com.rickchat.core.config.JwtConfig
import com.rickchat.core.model.Role
import com.rickchat.core.model.UserId
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import strikt.api.expectThat
import strikt.assertions.isEqualTo
import strikt.assertions.isNotNull
import strikt.assertions.isTrue

class JwtServiceTest {
    private lateinit var jwtService: JwtService
    private lateinit var appConfig: AppConfig

    @BeforeEach
    fun setup() {
        val config = java.util.Properties()
        config.setProperty("app.name", "RickChat")
        config.setProperty("app.version", "1.0.0")
        config.setProperty("app.environment", "test")
        config.setProperty("app.host", "0.0.0.0")
        config.setProperty("app.port", "8080")
        config.setProperty("app.debug", "true")
        config.setProperty("jwt.secret", "test-secret-key-that-is-at-least-32-characters-long-for-testing")
        config.setProperty("jwt.issuer", "rickchat-test")
        config.setProperty("jwt.audience", "rickchat-test-api")
        config.setProperty("jwt.accessTokenExpiry", "900")
        config.setProperty("jwt.refreshTokenExpiry", "2592000")
        config.setProperty("database.url", "jdbc:postgresql://localhost:5432/rickchat_test")
        config.setProperty("database.driver", "org.postgresql.Driver")
        config.setProperty("database.user", "test")
        config.setProperty("database.password", "test")
        config.setProperty("database.poolSize", "5")
        config.setProperty("redis.host", "localhost")
        config.setProperty("redis.port", "6379")
        config.setProperty("redis.password", "")
        config.setProperty("redis.database", "0")
        config.setProperty("redis.poolSize", "5")
        config.setProperty("qdrant.host", "localhost")
        config.setProperty("qdrant.port", "6333")
        config.setProperty("qdrant.apiKey", "")
        config.setProperty("qdrant.grpcPort", "6334")
        config.setProperty("qdrant.useTls", "false")
        config.setProperty("firebase.projectId", "test")
        config.setProperty("firebase.credentialsPath", "/tmp/test.json")
        config.setProperty("firebase.databaseUrl", "")
        config.setProperty("firebase.storageBucket", "test.appspot.com")
        config.setProperty("googleCloud.projectId", "test")
        config.setProperty("googleCloud.region", "us-central1")
        config.setProperty("googleCloud.credentialsPath", "/tmp/gcp.json")
        config.setProperty("ai.openaiApiKey", "")
        config.setProperty("ai.openaiEndpoint", "https://api.openai.com/v1")
        config.setProperty("ai.geminiApiKey", "")
        config.setProperty("ai.geminiEndpoint", "https://generativelanguage.googleapis.com/v1")
        config.setProperty("ai.anthropicApiKey", "")
        config.setProperty("ai.anthropicEndpoint", "https://api.anthropic.com/v1")
        config.setProperty("ai.defaultModel", "gpt-4")
        config.setProperty("ai.maxRetries", "3")
        config.setProperty("ai.timeoutSeconds", "60")
        config.setProperty("storage.bucketName", "test")
        config.setProperty("storage.maxFileSize", "104857600")
        config.setProperty("storage.allowedTypes", "[]")
        config.setProperty("queue.type", "in_memory")
        config.setProperty("queue.projectId", "test")
        config.setProperty("queue.subscriptionId", "test")
        config.setProperty("queue.topicId", "test")
        config.setProperty("queue.maxMessages", "10")
        config.setProperty("cache.defaultTtlSeconds", "3600")
        config.setProperty("cache.maxEntries", "100")
        config.setProperty("monitoring.metricsEnabled", "false")
        config.setProperty("monitoring.tracingEnabled", "false")
        config.setProperty("monitoring.loggingEnabled", "false")
        config.setProperty("rateLimit.globalRequestsPerSecond", "100")
        config.setProperty("rateLimit.authRequestsPerSecond", "10")
        config.setProperty("rateLimit.aiRequestsPerMinute", "60")
        config.setProperty("cors.allowedOrigins", "[]")
        config.setProperty("cors.allowedMethods", "[]")
        config.setProperty("cors.allowedHeaders", "[]")

        val mockConfig = com.typesafe.config.ConfigFactory.parseProperties(config)
        appConfig = AppConfig.load() // Will use defaults in test mode
        jwtService = JwtService(appConfig)
    }

    @Test
    fun `should generate valid JWT token pair`() {
        val userId = UserId.generate()
        val tokenPair = jwtService.generateTokenPair(userId, "test@rickchat.ai", Role.USER)

        expectThat(tokenPair.accessToken).isNotNull()
        expectThat(tokenPair.refreshToken).isNotNull()
        expectThat(tokenPair.expiresIn).isEqualTo(900)
    }

    @Test
    fun `should validate and extract claims from valid token`() {
        val userId = UserId.generate()
        val email = "test@rickchat.ai"
        val tokenPair = jwtService.generateTokenPair(userId, email, Role.ADMIN)

        val result = jwtService.validateToken(tokenPair.accessToken)
        expectThat(result.isSuccess).isTrue()

        val payload = result.getOrNull()
        expectThat(payload).isNotNull()
        expectThat(payload?.userId).isEqualTo(userId.value)
        expectThat(payload?.email).isEqualTo(email)
        expectThat(payload?.role).isEqualTo("ADMIN")
    }

    @Test
    fun `should create password reset token`() {
        val userId = UserId.generate()
        val token = jwtService.createResetToken(userId)

        expectThat(token).isNotNull()

        val result = jwtService.validateToken(token)
        expectThat(result.isSuccess).isTrue()
    }
}
