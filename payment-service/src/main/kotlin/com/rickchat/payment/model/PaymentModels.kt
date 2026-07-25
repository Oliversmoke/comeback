package com.rickchat.payment.model

import kotlinx.serialization.Serializable

@Serializable
data class PaymentRequest(
    val amount: Double,
    val currency: String = "USD",
    val paymentMethodId: String? = null,
    val description: String? = null,
    val metadata: Map<String, String>? = null,
    val itemType: String? = null,
    val itemId: String? = null,
    val itemName: String? = null
)

@Serializable
data class PaymentResponse(
    val id: String,
    val userId: String,
    val amount: Double,
    val currency: String,
    val fee: Double,
    val netAmount: Double,
    val status: String,
    val provider: String? = null,
    val description: String? = null,
    val items: List<PaymentItemResponse> = emptyList(),
    val createdAt: String
)

@Serializable
data class PaymentItemResponse(
    val id: String,
    val itemType: String? = null,
    val itemId: String? = null,
    val itemName: String? = null,
    val quantity: Int = 1,
    val unitPrice: Double,
    val totalPrice: Double
)

@Serializable
data class RefundRequest(
    val amount: Double? = null,
    val reason: String? = null
)

@Serializable
data class PaymentMethodRequest(
    val provider: String,
    val providerPaymentMethodId: String,
    val type: String,
    val lastFour: String? = null,
    val expiryMonth: Int? = null,
    val expiryYear: Int? = null,
    val cardholderName: String? = null,
    val isDefault: Boolean = false
)

@Serializable
data class PaymentMethodResponse(
    val id: String,
    val userId: String,
    val provider: String,
    val type: String,
    val lastFour: String? = null,
    val isDefault: Boolean = false,
    val createdAt: String
)

@Serializable
data class RevenueShareResponse(
    val id: String,
    val paymentId: String,
    val creatorId: String,
    val amount: Double,
    val percentage: Double,
    val status: String,
    val paidAt: String? = null
)
