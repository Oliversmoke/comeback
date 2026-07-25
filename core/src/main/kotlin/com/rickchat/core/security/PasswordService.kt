package com.rickchat.core.security

import at.favre.lib.crypto.bcrypt.BCrypt

class PasswordService {
    private val hasher = BCrypt.withDefaults()

    fun hash(password: String): String {
        return hasher.hashToString(12, password.toCharArray())
    }

    fun verify(password: String, hash: String): Boolean {
        return BCrypt.verifyer().verify(password.toCharArray(), hash).verified
    }

    fun generateSecurePassword(length: Int = 24): String {
        val chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()"
        return (1..length)
            .map { chars.random() }
            .joinToString("")
    }
}
