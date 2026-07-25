package com.rickchat.core.config

/**
 * Standalone configuration types used by the individual managers.
 * Kept as top-level data classes so they can be constructed independently
 * (e.g. by DI modules or tests) as well as via [AppConfig].
 */
data class RedisConfig(
    val host: String = "localhost",
    val port: Int = 6379,
    val password: String = "",
    val database: Int = 0,
    val poolSize: Int = 10
)

data class QdrantConfig(
    val host: String = "localhost",
    val port: Int = 6333,
    val grpcPort: Int = 6334,
    val useTls: Boolean = false
)

data class CacheConfig(
    val defaultTtlSeconds: Long = 3600
)

data class QueueConfig(
    val projectId: String = "",
    val topicId: String = ""
)

data class StorageConfig(
    val bucketName: String = ""
)

data class AppConfig(
    val app: AppSettings,
    val database: DatabaseSettings,
    val jwt: JwtSettings,
    val redis: RedisConfig,
    val qdrant: QdrantConfig
) {
    data class AppSettings(
        val host: String = "0.0.0.0",
        val port: Int = 8080,
        val name: String = "api-gateway",
        val environment: String = "development",
        val debug: Boolean = false
    )

    data class DatabaseSettings(
        val url: String = "jdbc:postgresql://localhost:5432/rickchat",
        val driver: String = "org.postgresql.Driver",
        val user: String = "postgres",
        val password: String = "postgres",
        val maxPoolSize: Int = 10,
        val poolSize: Int = 10,
        val maxLifetime: Long = 1_800_000,
        val connectionTimeout: Long = 30_000,
        val idleTimeout: Long = 600_000
    )

    data class JwtSettings(
        val secret: String = "default-secret-change-in-production",
        val issuer: String = "rickchat",
        val audience: String = "rickchat-services",
        val accessTokenExpiryMinutes: Long = 15,
        val refreshTokenExpiryDays: Long = 7
    )

    companion object {
        private fun env(vararg keys: String): String? =
            keys.asSequence().mapNotNull { System.getenv(it)?.takeIf(String::isNotBlank) }.firstOrNull()

        fun load(): AppConfig {
            val environment = env("ENVIRONMENT", "NODE_ENV") ?: "development"
            return AppConfig(
                app = AppSettings(
                    host = env("HOST") ?: "0.0.0.0",
                    port = env("PORT")?.toIntOrNull() ?: 8080,
                    name = env("SERVICE_NAME") ?: "api-gateway",
                    environment = environment,
                    debug = (env("DEBUG")?.toBoolean() ?: (environment != "production"))
                ),
                database = DatabaseSettings(
                    url = env("DATABASE_URL", "JDBC_DATABASE_URL")
                        ?: "jdbc:postgresql://localhost:5432/rickchat",
                    user = env("DATABASE_USER", "POSTGRES_USER") ?: "postgres",
                    password = env("DATABASE_PASSWORD", "POSTGRES_PASSWORD") ?: "postgres"
                ),
                jwt = JwtSettings(
                    secret = env("JWT_SECRET") ?: "default-secret-change-in-production",
                    issuer = env("JWT_ISSUER") ?: "rickchat",
                    audience = env("JWT_AUDIENCE") ?: "rickchat-services"
                ),
                redis = RedisConfig(
                    host = env("REDIS_HOST") ?: "localhost",
                    port = env("REDIS_PORT")?.toIntOrNull() ?: 6379,
                    password = env("REDIS_PASSWORD") ?: "",
                    database = env("REDIS_DATABASE")?.toIntOrNull() ?: 0
                ),
                qdrant = QdrantConfig(
                    host = env("QDRANT_HOST") ?: "localhost",
                    port = env("QDRANT_PORT")?.toIntOrNull() ?: 6333,
                    grpcPort = env("QDRANT_GRPC_PORT")?.toIntOrNull() ?: 6334,
                    useTls = env("QDRANT_USE_TLS")?.toBoolean() ?: false
                )
            )
        }
    }
}
