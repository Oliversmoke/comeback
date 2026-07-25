package com.rickchat.marketplace.model

import kotlinx.serialization.Serializable

@Serializable
data class MarketplaceItemRequest(
    val title: String,
    val description: String,
    val shortDescription: String? = null,
    val category: String,
    val subcategory: String? = null,
    val tags: List<String> = emptyList(),
    val price: Double = 0.0,
    val compareAtPrice: Double? = null,
    val currency: String = "USD",
    val contentType: String,
    val contentUrl: String? = null,
    val thumbnailUrl: String? = null,
    val isFree: Boolean = false,
    val isExclusive: Boolean = false,
    val subscriptionRequired: Boolean = false
)

@Serializable
data class MarketplaceItemResponse(
    val id: String,
    val creatorId: String,
    val creatorName: String?,
    val title: String,
    val description: String,
    val shortDescription: String?,
    val category: String,
    val subcategory: String?,
    val tags: List<String>,
    val price: Double,
    val compareAtPrice: Double?,
    val currency: String,
    val status: String,
    val version: Int,
    val contentType: String,
    val thumbnailUrl: String?,
    val downloadCount: Int,
    val viewCount: Int,
    val ratingAvg: Double,
    val ratingCount: Int,
    val reviewCount: Int,
    val isFeatured: Boolean,
    val isFree: Boolean,
    val createdAt: String,
    val updatedAt: String
)

@Serializable
data class MarketplaceReviewRequest(
    val rating: Int,
    val title: String? = null,
    val content: String? = null
)

@Serializable
data class MarketplaceReviewResponse(
    val id: String,
    val itemId: String,
    val userId: String,
    val username: String?,
    val rating: Int,
    val title: String?,
    val content: String?,
    val isVerifiedPurchase: Boolean,
    val helpfulCount: Int,
    val createdAt: String
)

@Serializable
data class MarketplaceCollectionRequest(
    val name: String,
    val description: String? = null,
    val isPublic: Boolean = true
)

@Serializable
data class MarketplaceCollectionResponse(
    val id: String,
    val userId: String,
    val name: String,
    val description: String?,
    val isPublic: Boolean,
    val itemCount: Int,
    val createdAt: String
)
