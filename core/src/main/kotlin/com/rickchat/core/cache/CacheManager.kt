package com.rickchat.core.cache

import com.rickchat.core.config.CacheConfig
import com.rickchat.core.database.redis.RedisClient
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

interface CacheManager {
    suspend fun <T : Any> get(key: String, clazz: kotlin.reflect.KClass<T>): T?
    suspend fun <T : Any> set(key: String, value: T, ttlSeconds: Long? = null)
    suspend fun delete(key: String)
    suspend fun exists(key: String): Boolean
    suspend fun invalidatePattern(pattern: String)
    fun <T : Any> getSync(key: String, clazz: kotlin.reflect.KClass<T>): T?
    fun <T : Any> setSync(key: String, value: T, ttlSeconds: Long? = null)
}

class RedisCacheManager(
    private val redis: RedisClient,
    private val config: CacheConfig
) : CacheManager {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    override suspend fun <T : Any> get(key: String, clazz: kotlin.reflect.KClass<T>): T? {
        return getSync(key, clazz)
    }

    override suspend fun <T : Any> set(key: String, value: T, ttlSeconds: Long?) {
        setSync(key, value, ttlSeconds)
    }

    override suspend fun delete(key: String) {
        redis.del(key)
    }

    override suspend fun exists(key: String): Boolean {
        return redis.exists(key)
    }

    override suspend fun invalidatePattern(pattern: String) {
        val keys = redis.use { it.keys(pattern) }
        keys.forEach { redis.del(it) }
    }

    override fun <T : Any> getSync(key: String, clazz: kotlin.reflect.KClass<T>): T? {
        val cached = redis.get(key) ?: return null
        return try {
            @Suppress("UNCHECKED_CAST")
            json.decodeFromString(clazz as kotlinx.serialization.KSerializer<T>, cached) as T
        } catch (e: Exception) {
            null
        }
    }

    override fun <T : Any> setSync(key: String, value: T, ttlSeconds: Long?) {
        val serialized = json.encodeToString(value)
        redis.set(key, serialized, ttlSeconds ?: config.defaultTtlSeconds)
    }
}
