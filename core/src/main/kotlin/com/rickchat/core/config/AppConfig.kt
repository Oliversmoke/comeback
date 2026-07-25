package com.rickchat.core.config

data class AppConfig(
    val app: AppSettings,
    val database: DatabaseSettings,
    val jwt: JwtSettings,
    val redis: RedisSettings
) {
    data class AppSettings(
        val host: String = "0.0.0.0",
        val port: Int = 8088,
        val name: String = "translation-service",
        val environment: String = "development"
    )

    data class DatabaseSettings(
        val url: String = "jdbc:postgresql://localhost:5432/rickchat",
        val driver: String = "org.postgresql.Driver",
        val user: String = "postgres",
        val password: String = "postgres",
        val maxPoolSize: Int = 10
    )

    data class JwtSettings(
        val secret: String = "default-secret-change-in-production",
        val issuer: String = "rickchat",
        val audience: String = "rickchat-services",
        val accessTokenExpiryMinutes: Long = 15,
        val refreshTokenExpiryDays: Long = 7
    )

    data class RedisSettings(
        val host: String = "localhost",
        val port: Int = 6379,
        val password: String? = null
    )

    companion object {
        fun load(): AppConfig {
            return AppConfig(
                app = AppSettings(),
                database = DatabaseSettings(),
                jwt = JwtSettings(),
                redis = RedisSettings()
            )
        }
    }
}
