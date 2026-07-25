package com.rickchat.subscription.model

import kotlinx.serialization.Serializable

@Serializable
data class PlanResponse(
    val id: String,
    val name: String,
    val description: String? = null,
    val price: Double,
    val currency: String = "USD",
    val interval: String = "month",
    val features: List<String> = emptyList(),
    val limits: Map<String, Int>? = null,
    val isActive: Boolean = true,
    val sortOrder: Int = 0
)

@Serializable
data class SubscribeRequest(
    val planId: String,
    val provider: String? = null,
    val providerSubscriptionId: String? = null
)

@Serializable
data class SubscriptionResponse(
    val id: String,
    val userId: String,
    val planId: String,
    val planName: String? = null,
    val status: String,
    val currentPeriodStart: String? = null,
    val currentPeriodEnd: String? = null,
    val trialEnd: String? = null,
    val cancelAtPeriodEnd: Boolean = false,
    val createdAt: String
)

@Serializable
data class UpdateSubscriptionRequest(
    val status: String? = null,
    val cancelAtPeriodEnd: Boolean? = null
)
