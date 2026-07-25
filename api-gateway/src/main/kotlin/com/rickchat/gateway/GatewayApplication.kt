package com.rickchat.gateway

import com.rickchat.core.config.AppConfig
import com.rickchat.core.security.JwtService
import com.rickchat.gateway.routes.GatewayRoutes
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.auth.Authentication
import io.ktor.server.auth.jwt.jwt
import io.ktor.server.engine.embeddedServer
import io.ktor.server.netty.Netty
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.routing.routing
import kotlinx.serialization.json.Json

fun main() {
    val appConfig = AppConfig.load()
    embeddedServer(Netty, port = appConfig.app.port, host = appConfig.app.host) {
        module()
    }.start(wait = true)
}

fun Application.module() {
    val appConfig = AppConfig.load()
    val jwtService = JwtService(appConfig)

    install(ContentNegotiation) {
        json(Json {
            prettyPrint = true
            ignoreUnknownKeys = true
            isLenient = true
        })
    }

    install(Authentication) {
        jwt {
            verifier(jwtService.verifier)
            realm = appConfig.jwt.issuer
            validate { credential -> jwtService.validate(credential) }
        }
    }

    routing {
        GatewayRoutes().register(this)
    }
}
