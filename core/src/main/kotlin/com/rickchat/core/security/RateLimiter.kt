package com.rickchat.core.security

import com.rickchat.core.config.AppConfig
import io.ktor.server.plugins.ratelimit.RateLimitConfig

class RateLimiter(private val appConfig: AppConfig) {
    fun global(): RateLimitConfig.() -> Unit = {
        rate = 100
        per = 60_000
    }
}
