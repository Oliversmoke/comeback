package com.rickchat.core.model

import kotlinx.serialization.Serializable

@Serializable
data class UserId(
    val value: String
) {
    companion object {
        fun generate(): UserId = UserId(com.benasher44.uuid.uuid4().toString())
        fun fromString(id: String): UserId = UserId(id)
    }
}
