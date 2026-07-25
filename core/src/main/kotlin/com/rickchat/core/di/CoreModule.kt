package com.rickchat.core.di

import com.rickchat.core.config.AppConfig
import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import org.jetbrains.exposed.sql.Database
import org.koin.dsl.module

val coreModule = module {
    single { AppConfig.load() }

    single {
        val config = get<AppConfig>()
        val hikariConfig = HikariConfig().apply {
            jdbcUrl = config.database.url
            driverClassName = config.database.driver
            username = config.database.user
            password = config.database.password
            maximumPoolSize = config.database.maxPoolSize
            isAutoCommit = false
            transactionIsolation = "TRANSACTION_REPEATABLE_READ"
        }
        HikariDataSource(hikariConfig)
    }

    single {
        val ds = get<HikariDataSource>()
        Database.connect(ds)
    }
}
