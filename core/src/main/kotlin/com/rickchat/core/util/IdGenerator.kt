package com.rickchat.core.util

import com.benasher44.uuid.uuid4
import java.util.concurrent.atomic.AtomicLong

class IdGenerator {
    private val counter = AtomicLong(0)

    fun newId(): String = uuid4().toString()

    fun newShortId(): String {
        val uuid = uuid4().toString().replace("-", "").substring(0, 12)
        return uuid
    }

    fun newNumericId(): Long = counter.incrementAndGet()

    fun newChatId(): String = "chat_${newShortId()}"
    fun newMessageId(): String = "msg_${newShortId()}"
    fun newMemoryId(): String = "mem_${newShortId()}"
    fun newUserId(): String = "usr_${newShortId()}"
    fun newSessionId(): String = "sess_${newShortId()}"

    companion object {
        private const val CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

        fun randomString(length: Int = 32): String {
            return (1..length).map { CHARS.random() }.joinToString("")
        }

        fun generateApiKey(): String {
            val prefix = "rc_"
            return prefix + randomString(48)
        }
    }
}
