package com.rickchat.gateway

import com.rickchat.core.CoreApplication
import com.rickchat.core.config.AppConfig
import com.rickchat.core.di.coreModule
import com.rickchat.core.security.JwtService
import com.rickchat.gateway.routes.GatewayRoutes
import io.ktor.server.application.Application
import io.ktor.server.engine.embeddedServer
import io.ktor.server.netty.Netty
import io.ktor.server.routing.routing
import org.koin.core.context.startKoin
import org.koin.ktor.plugin.Koin

fun main() {
    val appConfig = AppConfig.load()
    startKoin {
        modules(coreModule)
    }
    embeddedServer(Netty, port = appConfig.app.port, host = appConfig.app.host) {
        module()
    }.start(wait = true)
}

fun Application.module() {
    install(Koin) {
        modules(coreModule)
    }
    routing {
        GatewayRoutes().register(this)
    }
}
