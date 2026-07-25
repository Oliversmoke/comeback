plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
}

dependencies {
    // Kotlin
    implementation(libs.kotlin.stdlib)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.kotlinx.coroutines.core)

    // Ktor
    implementation(libs.ktor.server.core)
    implementation(libs.ktor.server.auth)
    implementation(libs.ktor.server.auth.jwt)
    implementation(libs.ktor.server.call.logging)
    implementation(libs.ktor.server.status.pages)
    implementation(libs.ktor.server.rate.limit)
    implementation(libs.ktor.serialization.kotlinx.json)

    // Koin
    implementation(libs.koin.core)
    implementation(libs.koin.logger)

    // Database
    implementation(libs.exposed.core)
    implementation(libs.exposed.dao)
    implementation(libs.exposed.jdbc)
    implementation(libs.exposed.json)
    implementation(libs.exposed.migration)
    implementation(libs.postgresql)
    implementation(libs.hikari)
    implementation(libs.flyway.core)
    implementation(libs.flyway.database.postgresql)

    // Redis
    implementation(libs.jedis)

    // Vector DB
    implementation(libs.qdrant.client)

    // Firebase
    implementation(libs.firebase.admin)
    implementation(libs.google.cloud.firestore)

    // Google Cloud
    implementation(libs.google.cloud.storage)
    implementation(libs.google.cloud.logging)
    implementation(libs.google.cloud.secretmanager)
    implementation(libs.google.cloud.pubsub)

    // Serialization
    implementation(libs.jackson.core)
    implementation(libs.jackson.databind)
    implementation(libs.jackson.kotlin)
    implementation(libs.jackson.yaml)

    // Logging
    implementation(libs.logback.classic)

    // Monitoring
    implementation(libs.micrometer.registry.prometheus)
    implementation(libs.opentelemetry.api)
    implementation(libs.opentelemetry.sdk)
    implementation(libs.opentelemetry.exporter.otlp)

    // Security
    implementation(libs.bcrypt)

    // UUID
    implementation(libs.uuid.generator)

    // Config
    implementation(libs.hocon)

    // Testing
    testImplementation(libs.junit.jupiter)
    testImplementation(libs.strikt.core)
    testImplementation(libs.mockk)
    testImplementation(libs.kotlinx.coroutines.test)
}
