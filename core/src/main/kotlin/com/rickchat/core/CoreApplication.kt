package com.rickchat.core

import com.rickchat.core.config.AppConfig
import com.rickchat.core.database.postgres.DatabaseFactory
import com.rickchat.core.database.redis.RedisClient
import com.rickchat.core.database.qdrant.QdrantManager
import com.rickchat.core.logging.Logger
import com.rickchat.core.plugin.configurePlugins
import com.rickchat.core.security.JwtService
import com.rickchat.core.security.RateLimiter
import io.ktor.server.application.Application
import io.ktor.server.engine.ApplicationEngine
import io.ktor.server.engine.embeddedServer
import io.ktor.server.netty.Netty
import org.slf4j.LoggerFactory

class CoreApplication {
    private val logger = LoggerFactory.getLogger(CoreApplication::class.java)

    fun start(): ApplicationEngine {
        val appConfig = AppConfig.load()
        val jwtService = JwtService(appConfig)
        val rateLimiter = RateLimiter(appConfig)

        val databaseFactory = DatabaseFactory(appConfig)
        databaseFactory.connect()

        val redisClient = RedisClient(appConfig.redis)
        val qdrantManager = QdrantManager(appConfig.qdrant)

        logger.info("RickChat Core initializing...")
        logger.info("Environment: ${appConfig.app.environment}")
        logger.info("Database: ${appConfig.database.url}")
        logger.info("Redis: ${appConfig.redis.host}:${appConfig.redis.port}")
        logger.info("Qdrant: ${appConfig.qdrant.host}:${appConfig.qdrant.port}")

        return embeddedServer(Netty, port = appConfig.app.port, host = appConfig.app.host) {
            configurePlugins(appConfig, jwtService, rateLimiter)
            configureRoutes()
        }.start(wait = true)
    }

    private fun Application.configureRoutes() {
        // Routes are registered by individual service modules
    }
}

fun main() {
    CoreApplication().start()
}
