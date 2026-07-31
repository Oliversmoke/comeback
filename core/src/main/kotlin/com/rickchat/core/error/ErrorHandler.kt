package com.rickchat.core.error

import com.rickchat.core.model.error
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.plugins.statuspages.StatusPages
import io.ktor.server.response.respond
import io.ktor.server.response.respondTextWriter
import org.slf4j.LoggerFactory

fun Application.configureErrorHandling() {
    val logger = LoggerFactory.getLogger("ErrorHandler")

    install(StatusPages) {
        exception<AppException> { call, cause ->
            logger.warn("App exception: ${cause.code} - ${cause.message}")
            call.respond(cause.statusCode, error<String>(cause.code, cause.message))
        }

        exception<AuthenticationException> { call, cause ->
            call.respond(HttpStatusCode.Unauthorized, error<String>("unauthorized", cause.message))
        }

        exception<AuthorizationException> { call, cause ->
            call.respond(HttpStatusCode.Forbidden, error<String>("forbidden", cause.message))
        }

        exception<ValidationException> { call, cause ->
            call.respond(
                HttpStatusCode.BadRequest,
                error<String>(cause.code, cause.message)
            )
        }

        exception<io.ktor.server.auth.jwt.InvalidJWTTokenException> { call, _ ->
            call.respond(HttpStatusCode.Unauthorized, error<String>("invalid_token", "Invalid or expired token"))
        }

        exception<kotlinx.serialization.json.JsonDecodingException> { call, cause ->
            call.respond(
                HttpStatusCode.BadRequest,
                error<String>("invalid_json", "Invalid JSON in request body: ${cause.message}")
            )
        }

        exception<Throwable> { call, cause ->
            logger.error("Unhandled exception", cause)
            call.respond(
                HttpStatusCode.InternalServerError,
                error<String>("internal_error", "An unexpected error occurred")
            )
        }
    }
}
