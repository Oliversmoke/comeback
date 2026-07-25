package com.rickchat.core.security

import com.rickchat.core.config.AppConfig
import io.ktor.server.plugins.ratelimit.RateLimitProviderConfig
import kotlin.time.Duration.Companion.minutes

class RateLimiter(private val appConfig: AppConfig) {
    fun global(): RateLimitProviderConfig.() -> Unit = {
        rateLimiter(limit = 100, refillPeriod = 1.minutes)
    }
}
