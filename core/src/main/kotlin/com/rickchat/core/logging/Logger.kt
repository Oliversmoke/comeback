package com.rickchat.core.logging

import com.rickchat.core.config.AppConfig
import org.slf4j.LoggerFactory
import org.slf4j.MDC

enum class LogLevel {
    TRACE, DEBUG, INFO, WARN, ERROR
}

data class LogEvent(
    val level: LogLevel,
    val message: String,
    val correlationId: String? = null,
    val userId: String? = null,
    val action: String? = null,
    val resource: String? = null,
    val duration: Long? = null,
    val error: Throwable? = null,
    val metadata: Map<String, Any>? = null
)

class Logger(private val config: AppConfig) {
    private val delegate = LoggerFactory.getLogger("RickChat")

    fun trace(message: String, vararg args: Any?) = log(LogLevel.TRACE, message, args)
    fun debug(message: String, vararg args: Any?) = log(LogLevel.DEBUG, message, args)
    fun info(message: String, vararg args: Any?) = log(LogLevel.INFO, message, args)
    fun warn(message: String, vararg args: Any?) = log(LogLevel.WARN, message, args)
    fun error(message: String, vararg args: Any?) = log(LogLevel.ERROR, message, args)

    private fun log(level: LogLevel, message: String, args: Array<out Any?>) {
        val formatted = if (args.isNotEmpty()) message.format(args) else message
        when (level) {
            LogLevel.TRACE -> if (config.app.debug) delegate.trace(formatted)
            LogLevel.DEBUG -> if (config.app.debug) delegate.debug(formatted)
            LogLevel.INFO -> delegate.info(formatted)
            LogLevel.WARN -> delegate.warn(formatted)
            LogLevel.ERROR -> delegate.error(formatted)
        }
    }

    fun withCorrelationId(correlationId: String): Logger {
        MDC.put("correlationId", correlationId)
        return this
    }

    fun withUserId(userId: String): Logger {
        MDC.put("userId", userId)
        return this
    }

    fun logEvent(event: LogEvent) {
        MDC.putCloseable("correlationId", event.correlationId ?: "")
        MDC.putCloseable("userId", event.userId ?: "")
        MDC.putCloseable("action", event.action ?: "")
        MDC.putCloseable("resource", event.resource ?: "")
        event.duration?.let { MDC.putCloseable("duration", it.toString()) }

        when (event.level) {
            LogLevel.ERROR -> if (event.error != null) delegate.error(event.message, event.error) else delegate.error(event.message)
            LogLevel.WARN -> delegate.warn(event.message)
            LogLevel.INFO -> delegate.info(event.message)
            LogLevel.DEBUG -> delegate.debug(event.message)
            LogLevel.TRACE -> delegate.trace(event.message)
        }
    }
}
