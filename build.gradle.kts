plugins {
    alias(libs.plugins.kotlin.jvm) apply false
    alias(libs.plugins.kotlin.serialization) apply false
    alias(libs.plugins.ktor.plugin) apply false
    alias(libs.plugins.shadow) apply false
}

group = "com.rickchat"
version = "1.0.0"
