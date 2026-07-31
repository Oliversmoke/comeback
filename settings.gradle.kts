pluginManagement {
    repositories {
        google()
        gradlePluginPortal()
        mavenCentral()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS)
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://jitpack.io") }
        maven { url = uri("https://kotlin.bintray.com/ktor") }
    }
}

rootProject.name = "rickchat"

include(
    ":core",
    ":api-gateway",
    ":auth-service",
    ":user-service",
    ":chat-service",
    ":ai-gateway",
    ":memory-service",
    ":marketplace-service",
    ":learning-service",
    ":translation-service",
    ":accessibility-service",
    ":camera-service",
    ":voice-service",
    ":notification-service",
    ":payment-service",
    ":subscription-service",
    ":file-service",
    ":analytics-service",
    ":admin-service"
)
