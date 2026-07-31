package com.rickchat.core.database.postgres

import com.rickchat.core.config.AppConfig
import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import org.flywaydb.core.Flyway
import org.jetbrains.exposed.sql.Database
import javax.sql.DataSource

class DatabaseFactory(private val config: AppConfig) {
    private var dataSource: HikariDataSource? = null

    fun connect(): Database {
        val ds = createDataSource()
        dataSource = ds
        runMigrations(ds)
        return Database.connect(ds)
    }

    private fun createDataSource(): HikariDataSource {
        val hikariConfig = HikariConfig().apply {
            jdbcUrl = config.database.url
            username = config.database.user
            password = config.database.password
            driverClassName = config.database.driver
            maximumPoolSize = config.database.poolSize
            maxLifetime = config.database.maxLifetime
            connectionTimeout = config.database.connectionTimeout
            idleTimeout = config.database.idleTimeout
            isAutoCommit = false
            transactionIsolation = "TRANSACTION_REPEATABLE_READ"
            validate()
            addDataSourceProperty("cachePrepStmts", "true")
            addDataSourceProperty("prepStmtCacheSize", "250")
            addDataSourceProperty("prepStmtCacheSqlLimit", "2048")
            addDataSourceProperty("useServerPrepStmts", "true")
            addDataSourceProperty("useLocalSessionState", "true")
            addDataSourceProperty("rewriteBatchedStatements", "true")
            addDataSourceProperty("cacheResultSetMetadata", "true")
            addDataSourceProperty("elideSetAutoCommits", "true")
            addDataSourceProperty("maintainTimeStats", "false")
        }
        return HikariDataSource(hikariConfig)
    }

    private fun runMigrations(dataSource: DataSource) {
        Flyway.configure()
            .dataSource(dataSource)
            .locations("classpath:db/migration")
            .baselineOnMigrate(true)
            .outOfOrder(false)
            .cleanDisabled(config.app.environment == "production")
            .load()
            .migrate()
    }

    fun close() {
        dataSource?.close()
    }
}
