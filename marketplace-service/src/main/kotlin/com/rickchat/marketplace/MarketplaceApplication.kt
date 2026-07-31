package com.rickchat.marketplace

import com.rickchat.core.config.AppConfig
import com.rickchat.core.di.coreModule
import com.rickchat.core.plugin.configurePlugins
import com.rickchat.core.security.JwtService
import com.rickchat.core.security.RateLimiter
import com.rickchat.marketplace.routes.MarketplaceRoutes
import io.ktor.server.application.Application
import io.ktor.server.engine.embeddedServer
import io.ktor.server.netty.Netty
import io.ktor.server.routing.routing
import org.koin.core.context.startKoin
import org.koin.ktor.plugin.Koin

fun main() {
    val appConfig = AppConfig.load()
    startKoin { modules(coreModule) }
    embeddedServer(Netty, port = 8086, host = appConfig.app.host) {
        module(appConfig)
    }.start(wait = true)
}

fun Application.module(appConfig: AppConfig) {
    install(Koin) { modules(coreModule) }
    val jwtService = JwtService(appConfig)
    val rateLimiter = RateLimiter(appConfig)
    configurePlugins(appConfig, jwtService, rateLimiter)
    routing { MarketplaceRoutes().register(this) }
}
