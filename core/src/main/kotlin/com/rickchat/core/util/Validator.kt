package com.rickchat.core.util

import com.rickchat.core.error.ValidationException
import java.util.regex.Pattern

object Validator {
    private val EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")
    private val USERNAME_PATTERN = Pattern.compile("^[a-zA-Z0-9_]{3,30}$")
    private val PASSWORD_PATTERN = Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@\$!%*?&])[A-Za-z\\d@\$!%*?&]{8,128}$")
    private val URL_PATTERN = Pattern.compile("^https?://[\\w.-]+(:\\d+)?(/[\\w./%-]*)?$")
    private val PHONE_PATTERN = Pattern.compile("^\\+?[1-9]\\d{1,14}$")

    fun email(value: String, field: String = "email") {
        if (value.isBlank() || !EMAIL_PATTERN.matcher(value).matches()) {
            throw ValidationException(mapOf(field to "Invalid email format"))
        }
    }

    fun username(value: String) {
        if (value.isBlank() || !USERNAME_PATTERN.matcher(value).matches()) {
            throw ValidationException(mapOf("username" to "Username must be 3-30 alphanumeric characters"))
        }
    }

    fun password(value: String) {
        val errors = mutableMapOf<String, String>()
        if (value.length < 8) errors["password"] = "Password must be at least 8 characters"
        if (value.length > 128) errors["password"] = "Password must be at most 128 characters"
        if (!value.any { it.isUpperCase() }) errors["password"] = "Password must contain an uppercase letter"
        if (!value.any { it.isLowerCase() }) errors["password"] = "Password must contain a lowercase letter"
        if (!value.any { it.isDigit() }) errors["password"] = "Password must contain a digit"
        if (!value.any { !it.isLetterOrDigit() }) errors["password"] = "Password must contain a special character"
        if (errors.isNotEmpty()) throw ValidationException(errors)
    }

    fun notBlank(value: String, field: String) {
        if (value.isBlank()) {
            throw ValidationException(mapOf(field to "$field must not be blank"))
        }
    }

    fun maxLength(value: String, max: Int, field: String) {
        if (value.length > max) {
            throw ValidationException(mapOf(field to "$field must not exceed $max characters"))
        }
    }

    fun minLength(value: String, min: Int, field: String) {
        if (value.length < min) {
            throw ValidationException(mapOf(field to "$field must be at least $min characters"))
        }
    }

    fun range(value: Int, min: Int, max: Int, field: String) {
        if (value < min || value > max) {
            throw ValidationException(mapOf(field to "$field must be between $min and $max"))
        }
    }

    fun url(value: String, field: String = "url") {
        if (value.isNotBlank() && !URL_PATTERN.matcher(value).matches()) {
            throw ValidationException(mapOf(field to "Invalid URL format"))
        }
    }

    fun phone(value: String) {
        if (value.isNotBlank() && !PHONE_PATTERN.matcher(value).matches()) {
            throw ValidationException(mapOf("phone" to "Invalid phone number format"))
        }
    }

    fun oneOf(value: String, allowed: List<String>, field: String) {
        if (value.isNotBlank() && value !in allowed) {
            throw ValidationException(mapOf(field to "$field must be one of: ${allowed.joinToString(", ")}"))
        }
    }

    fun positiveNumber(value: Number, field: String) {
        if (value.toDouble() <= 0) {
            throw ValidationException(mapOf(field to "$field must be positive"))
        }
    }
}
