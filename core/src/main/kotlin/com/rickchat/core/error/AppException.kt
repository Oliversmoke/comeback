package com.rickchat.core.error

import io.ktor.http.HttpStatusCode

sealed class AppException(
    val statusCode: HttpStatusCode,
    override val message: String,
    val code: String,
    val details: Map<String, String>? = null
) : RuntimeException(message)

class NotFoundException(entity: String, id: String) :
    AppException(HttpStatusCode.NotFound, "$entity with id $id not found", "not_found")

class DuplicateException(entity: String, field: String, value: String) :
    AppException(HttpStatusCode.Conflict, "$entity with $field '$value' already exists", "duplicate")

class ValidationException(errors: Map<String, String>) :
    AppException(HttpStatusCode.BadRequest, "Validation failed", "validation_error", errors)

class AuthenticationException(message: String = "Authentication failed") :
    AppException(HttpStatusCode.Unauthorized, message, "unauthorized")

class AuthorizationException(message: String = "Insufficient permissions") :
    AppException(HttpStatusCode.Forbidden, message, "forbidden")

class RateLimitException :
    AppException(HttpStatusCode.TooManyRequests, "Rate limit exceeded", "rate_limit_exceeded")

class PaymentRequiredException(message: String) :
    AppException(HttpStatusCode.PaymentRequired, message, "payment_required")

class InternalException(message: String, cause: Throwable? = null) :
    AppException(HttpStatusCode.InternalServerError, message, "internal_error")

class FileTooLargeException(maxSize: Long) :
    AppException(HttpStatusCode.RequestEntityTooLarge, "File exceeds maximum size of $maxSize bytes", "file_too_large")

class UnsupportedMediaTypeException(type: String) :
    AppException(HttpStatusCode.UnsupportedMediaType, "Unsupported media type: $type", "unsupported_media_type")

class ServiceUnavailableException(service: String) :
    AppException(HttpStatusCode.ServiceUnavailable, "$service is temporarily unavailable", "service_unavailable")
