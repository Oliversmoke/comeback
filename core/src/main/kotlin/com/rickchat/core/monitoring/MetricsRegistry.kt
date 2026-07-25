package com.rickchat.core.monitoring

import com.rickchat.core.config.AppConfig
import io.micrometer.prometheus.PrometheusConfig
import io.micrometer.prometheus.PrometheusMeterRegistry

class MetricsRegistry(private val config: AppConfig) {
    val registry = PrometheusMeterRegistry(PrometheusConfig.DEFAULT)

    private val requestCounter = registry.counter("http_requests_total", "service", "rickchat")
    private val activeUsers = registry.gauge("active_users", 0.0) { 0.0 }
    private val aiRequestDuration = registry.timer("ai_request_duration")
    private val dbQueryDuration = registry.timer("db_query_duration")
    private val cacheHitCounter = registry.counter("cache_hits_total")
    private val cacheMissCounter = registry.counter("cache_misses_total")
    private val errorCounter = registry.counter("errors_total")
    private val queueSize = registry.gauge("queue_size", 0.0) { 0.0 }

    fun recordRequest() = requestCounter.increment()
    fun recordCacheHit() = cacheHitCounter.increment()
    fun recordCacheMiss() = cacheMissCounter.increment()
    fun recordError() = errorCounter.increment()

    fun recordAIDuration(millis: Long) {
        aiRequestDuration.record(java.time.Duration.ofMillis(millis))
    }

    fun recordDbQuery(millis: Long) {
        dbQueryDuration.record(java.time.Duration.ofMillis(millis))
    }

    fun scrape(): String = registry.scrape()
}
