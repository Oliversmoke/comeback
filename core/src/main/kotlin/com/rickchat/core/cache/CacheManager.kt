package com.rickchat.core.cache

import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.rickchat.core.config.CacheConfig
import com.rickchat.core.database.redis.RedisClient
import kotlin.reflect.KClass

interface CacheManager {
    suspend fun <T : Any> get(key: String, clazz: KClass<T>): T?
    suspend fun <T : Any> set(key: String, value: T, ttlSeconds: Long? = null)
    suspend fun delete(key: String)
    suspend fun exists(key: String): Boolean
    suspend fun invalidatePattern(pattern: String)
    fun <T : Any> getSync(key: String, clazz: KClass<T>): T?
    fun <T : Any> setSync(key: String, value: T, ttlSeconds: Long? = null)
}

class RedisCacheManager(
    private val redis: RedisClient,
    private val config: CacheConfig
) : CacheManager {
    private val mapper = jacksonObjectMapper()
        .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)

    override suspend fun <T : Any> get(key: String, clazz: KClass<T>): T? = getSync(key, clazz)

    override suspend fun <T : Any> set(key: String, value: T, ttlSeconds: Long?) =
        setSync(key, value, ttlSeconds)

    override suspend fun delete(key: String) {
        redis.del(key)
    }

    override suspend fun exists(key: String): Boolean = redis.exists(key)

    override suspend fun invalidatePattern(pattern: String) {
        val keys = redis.use { it.keys(pattern) }
        keys.forEach { redis.del(it) }
    }

    override fun <T : Any> getSync(key: String, clazz: KClass<T>): T? {
        val cached = redis.get(key) ?: return null
        return try {
            mapper.readValue(cached, clazz.java)
        } catch (e: Exception) {
            null
        }
    }

    override fun <T : Any> setSync(key: String, value: T, ttlSeconds: Long?) {
        val serialized = mapper.writeValueAsString(value)
        redis.set(key, serialized, ttlSeconds ?: config.defaultTtlSeconds)
    }
}
