package com.rickchat.core.security

import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import strikt.api.expectThat
import strikt.assertions.isEqualTo
import strikt.assertions.isFalse
import strikt.assertions.isNotNull
import strikt.assertions.isTrue

class PasswordServiceTest {
    private lateinit var passwordService: PasswordService

    @BeforeEach
    fun setup() {
        passwordService = PasswordService()
    }

    @Test
    fun `should hash and verify password correctly`() {
        val password = "SecureP@ss123"
        val hash = passwordService.hash(password)

        expectThat(hash).isNotNull()
        expectThat(hash).isEqualTo(hash)
        expectThat(passwordService.verify(password, hash)).isTrue()
    }

    @Test
    fun `should reject wrong password`() {
        val password = "SecureP@ss123"
        val hash = passwordService.hash(password)

        expectThat(passwordService.verify("WrongP@ss456", hash)).isFalse()
    }

    @Test
    fun `should generate secure password of correct length`() {
        val password = passwordService.generateSecurePassword(24)
        expectThat(password.length).isEqualTo(24)
    }

    @Test
    fun `should generate unique passwords each time`() {
        val p1 = passwordService.generateSecurePassword()
        val p2 = passwordService.generateSecurePassword()
        expectThat(p1).isNotEqualTo(p2)
    }
}
