package com.rickchat.core.database.redis

import com.rickchat.core.config.RedisConfig
import redis.clients.jedis.JedisPool
import redis.clients.jedis.JedisPoolConfig
import redis.clients.jedis.params.SetParams

class RedisClient(private val config: RedisConfig) {
    private val poolConfig = JedisPoolConfig().apply {
        maxTotal = config.poolSize
        maxIdle = config.poolSize / 2
        minIdle = 2
        isTestOnBorrow = true
        isTestOnReturn = true
        isTestWhileIdle = true
        timeBetweenEvictionRunsMillis = 30000
        minEvictableIdleTimeMillis = 60000
    }

    private val pool = if (config.password.isNotBlank()) {
        JedisPool(poolConfig, config.host, config.port, 2000, config.password, config.database)
    } else {
        JedisPool(poolConfig, config.host, config.port, 2000, config.database)
    }

    fun <T> use(block: (redis.clients.jedis.Jedis) -> T): T {
        pool.resource.use { jedis -> return block(jedis) }
    }

    fun set(key: String, value: String, ttlSeconds: Long = 3600): String {
        return use { it.setex(key, ttlSeconds, value) }
    }

    fun setIfNotExists(key: String, value: String, ttlSeconds: Long = 3600): Boolean {
        return use {
            val params = SetParams().nx().ex(ttlSeconds)
            it.set(key, value, params) != null
        }
    }

    fun get(key: String): String? {
        return use { it.get(key) }
    }

    fun del(key: String): Long {
        return use { it.del(key) }
    }

    fun exists(key: String): Boolean {
        return use { it.exists(key) }
    }

    fun expire(key: String, ttlSeconds: Long): Long {
        return use { it.expire(key, ttlSeconds) }
    }

    fun lpush(key: String, vararg values: String): Long {
        return use { it.lpush(key, *values) }
    }

    fun rpop(key: String): String? {
        return use { it.rpop(key) }
    }

    fun lrange(key: String, start: Long, stop: Long): List<String> {
        return use { it.lrange(key, start, stop) }
    }

    fun incr(key: String): Long {
        return use { it.incr(key) }
    }

    fun incrBy(key: String, amount: Long): Long {
        return use { it.incrBy(key, amount) }
    }

    fun sadd(key: String, vararg members: String): Long {
        return use { it.sadd(key, *members) }
    }

    fun smembers(key: String): Set<String> {
        return use { it.smembers(key) }
    }

    fun srem(key: String, vararg members: String): Long {
        return use { it.srem(key, *members) }
    }

    fun hset(key: String, field: String, value: String): Long {
        return use { it.hset(key, field, value) }
    }

    fun hget(key: String, field: String): String? {
        return use { it.hget(key, field) }
    }

    fun hgetAll(key: String): Map<String, String> {
        return use { it.hgetAll(key) }
    }

    fun close() {
        pool.close()
    }
}
