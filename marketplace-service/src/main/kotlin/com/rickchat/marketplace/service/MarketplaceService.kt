package com.rickchat.marketplace.service

import com.rickchat.core.error.ForbiddenException
import com.rickchat.core.error.NotFoundException
import com.rickchat.core.model.PaginationMeta
import com.rickchat.core.model.PaginationRequest
import com.rickchat.marketplace.model.*
import org.jetbrains.exposed.sql.transactions.transaction

class MarketplaceService {
    fun createItem(userId: String, request: MarketplaceItemRequest): MarketplaceItemResponse {
        val itemId = "item_${java.util.UUID.randomUUID().toString().take(24)}"
        val title = request.title.replace("'", "''")
        val description = request.description.replace("'", "''")
        val shortDescription = request.shortDescription?.replace("'", "''")

        transaction {
            exec(
                """INSERT INTO marketplace_items (id, creator_id, title, description, short_description,
                   category, subcategory, tags, price, compare_at_price, currency, content_type,
                   content_url, thumbnail_url, is_free, is_exclusive, subscription_required, status, version)
                   VALUES ('$itemId', '$userId', '$title', '$description',
                           ${if (shortDescription != null) "'$shortDescription'" else "NULL"},
                           '${request.category}', ${if (request.subcategory != null) "'${request.subcategory}'" else "NULL"},
                           '{${request.tags.joinToString(",") { "\"$it\"" }}}',
                           ${request.price}, ${request.compareAtPrice ?: "NULL"},
                           '${request.currency}', '${request.contentType}',
                           ${if (request.contentUrl != null) "'${request.contentUrl}'" else "NULL"},
                           ${if (request.thumbnailUrl != null) "'${request.thumbnailUrl}'" else "NULL"},
                           ${request.isFree}, ${request.isExclusive}, ${request.subscriptionRequired},
                           'draft', 1)"""
            )
        }

        return getItem(itemId)
    }

    fun getItem(id: String): MarketplaceItemResponse {
        return transaction {
            exec(
                """SELECT i.*, u.username as creator_name
                   FROM marketplace_items i
                   LEFT JOIN users u ON u.id = i.creator_id
                   WHERE i.id = '$id'"""
            ) {
                if (it.next()) {
                    exec("UPDATE marketplace_items SET view_count = view_count + 1 WHERE id = '$id'")
                    mapToItemResponse(it)
                } else throw NotFoundException("MarketplaceItem", id)
            }
        }
    }

    fun updateItem(id: String, userId: String, request: MarketplaceItemRequest): MarketplaceItemResponse {
        val item = transaction {
            exec("SELECT creator_id FROM marketplace_items WHERE id = '$id'") {
                if (it.next()) it.getString("creator_id") else throw NotFoundException("MarketplaceItem", id)
            }
        }
        if (item != userId) throw ForbiddenException("You do not own this item")

        val updates = mutableListOf<String>()
        updates.add("title = '${request.title.replace("'", "''")}'")
        updates.add("description = '${request.description.replace("'", "''")}'")
        if (request.shortDescription != null) updates.add("short_description = '${request.shortDescription.replace("'", "''")}'")
        updates.add("category = '${request.category}'")
        if (request.subcategory != null) updates.add("subcategory = '${request.subcategory}'")
        updates.add("tags = '{${request.tags.joinToString(",") { "\"$it\"" }}}'")
        updates.add("price = ${request.price}")
        if (request.compareAtPrice != null) updates.add("compare_at_price = ${request.compareAtPrice}")
        updates.add("currency = '${request.currency}'")
        updates.add("content_type = '${request.contentType}'")
        if (request.contentUrl != null) updates.add("content_url = '${request.contentUrl}'")
        if (request.thumbnailUrl != null) updates.add("thumbnail_url = '${request.thumbnailUrl}'")
        updates.add("is_free = ${request.isFree}")
        updates.add("is_exclusive = ${request.isExclusive}")
        updates.add("subscription_required = ${request.subscriptionRequired}")
        updates.add("version = version + 1")

        transaction {
            exec("UPDATE marketplace_items SET ${updates.joinToString(", ")}, updated_at = NOW() WHERE id = '$id'")
        }
        return getItem(id)
    }

    fun deleteItem(id: String, userId: String) {
        val item = transaction {
            exec("SELECT creator_id FROM marketplace_items WHERE id = '$id'") {
                if (it.next()) it.getString("creator_id") else throw NotFoundException("MarketplaceItem", id)
            }
        }
        if (item != userId) throw ForbiddenException("You do not own this item")
        transaction { exec("DELETE FROM marketplace_items WHERE id = '$id'") }
    }

    fun listItems(
        pagination: PaginationRequest,
        category: String? = null,
        status: String? = null
    ): Pair<List<MarketplaceItemResponse>, PaginationMeta> {
        val offset = (pagination.page - 1) * pagination.limit
        val sort = pagination.sort ?: "created_at"
        val order = pagination.order.name

        val filters = mutableListOf<String>()
        if (category != null) filters.add("i.category = '$category'")
        if (status != null) filters.add("i.status = '$status'")
        else filters.add("i.status = 'published'")
        val whereClause = if (filters.isNotEmpty()) "WHERE ${filters.joinToString(" AND ")}" else ""

        return transaction {
            val total = exec("SELECT COUNT(*) FROM marketplace_items i $whereClause") {
                if (it.next()) it.getLong(1) else 0L
            }

            val items = exec(
                """SELECT i.*, u.username as creator_name
                   FROM marketplace_items i
                   LEFT JOIN users u ON u.id = i.creator_id
                   $whereClause
                   ORDER BY i.is_featured DESC, i.$sort $order
                   LIMIT ${pagination.limit} OFFSET $offset"""
            ) {
                val list = mutableListOf<MarketplaceItemResponse>()
                while (it.next()) list.add(mapToItemResponse(it))
                list
            }

            val totalPages = ((total + pagination.limit - 1) / pagination.limit).toInt()
            items to PaginationMeta(
                page = pagination.page,
                limit = pagination.limit,
                total = total,
                totalPages = totalPages,
                hasNext = pagination.page < totalPages,
                hasPrevious = pagination.page > 1
            )
        }
    }

    fun searchItems(
        query: String,
        pagination: PaginationRequest
    ): Pair<List<MarketplaceItemResponse>, PaginationMeta> {
        val offset = (pagination.page - 1) * pagination.limit
        val sort = pagination.sort ?: "created_at"
        val order = pagination.order.name
        val searchTerm = query.replace("'", "''")

        return transaction {
            val total = exec(
                """SELECT COUNT(*) FROM marketplace_items i
                   WHERE i.status = 'published'
                   AND (i.title ILIKE '%$searchTerm%'
                        OR i.description ILIKE '%$searchTerm%'
                        OR i.short_description ILIKE '%$searchTerm%'
                        OR i.category ILIKE '%$searchTerm%'
                        OR i.subcategory ILIKE '%$searchTerm%')"""
            ) {
                if (it.next()) it.getLong(1) else 0L
            }

            val items = exec(
                """SELECT i.*, u.username as creator_name
                   FROM marketplace_items i
                   LEFT JOIN users u ON u.id = i.creator_id
                   WHERE i.status = 'published'
                   AND (i.title ILIKE '%$searchTerm%'
                        OR i.description ILIKE '%$searchTerm%'
                        OR i.short_description ILIKE '%$searchTerm%'
                        OR i.category ILIKE '%$searchTerm%'
                        OR i.subcategory ILIKE '%$searchTerm%')
                   ORDER BY i.is_featured DESC, i.$sort $order
                   LIMIT ${pagination.limit} OFFSET $offset"""
            ) {
                val list = mutableListOf<MarketplaceItemResponse>()
                while (it.next()) list.add(mapToItemResponse(it))
                list
            }

            val totalPages = ((total + pagination.limit - 1) / pagination.limit).toInt()
            items to PaginationMeta(
                page = pagination.page,
                limit = pagination.limit,
                total = total,
                totalPages = totalPages,
                hasNext = pagination.page < totalPages,
                hasPrevious = pagination.page > 1
            )
        }
    }

    fun createReview(itemId: String, userId: String, request: MarketplaceReviewRequest): MarketplaceReviewResponse {
        val reviewId = "rev_${java.util.UUID.randomUUID().toString().take(24)}"

        transaction {
            exec(
                """INSERT INTO marketplace_reviews (id, item_id, user_id, rating, title, content)
                   VALUES ('$reviewId', '$itemId', '$userId', ${request.rating},
                           ${if (request.title != null) "'${request.title.replace("'", "''")}'" else "NULL"},
                           ${if (request.content != null) "'${request.content.replace("'", "''")}'" else "NULL"})"""
            )
            exec(
                """UPDATE marketplace_items SET
                   rating_count = (SELECT COUNT(*) FROM marketplace_reviews WHERE item_id = '$itemId'),
                   review_count = (SELECT COUNT(*) FROM marketplace_reviews WHERE item_id = '$itemId'),
                   rating_avg = (SELECT COALESCE(AVG(rating), 0) FROM marketplace_reviews WHERE item_id = '$itemId')
                   WHERE id = '$itemId'"""
            )
        }

        return getReview(reviewId)
    }

    private fun getReview(reviewId: String): MarketplaceReviewResponse {
        return transaction {
            exec(
                """SELECT r.*, u.username
                   FROM marketplace_reviews r
                   LEFT JOIN users u ON u.id = r.user_id
                   WHERE r.id = '$reviewId'"""
            ) {
                if (it.next()) {
                    MarketplaceReviewResponse(
                        id = it.getString("id"),
                        itemId = it.getString("item_id"),
                        userId = it.getString("user_id"),
                        username = it.getString("username"),
                        rating = it.getInt("rating"),
                        title = it.getString("title"),
                        content = it.getString("content"),
                        isVerifiedPurchase = it.getBoolean("is_verified_purchase"),
                        helpfulCount = it.getInt("helpful_count"),
                        createdAt = it.getTimestamp("created_at").toString()
                    )
                } else throw NotFoundException("MarketplaceReview", reviewId)
            }
        }
    }

    fun getReviews(itemId: String, pagination: PaginationRequest): Pair<List<MarketplaceReviewResponse>, PaginationMeta> {
        val offset = (pagination.page - 1) * pagination.limit

        return transaction {
            val total = exec("SELECT COUNT(*) FROM marketplace_reviews WHERE item_id = '$itemId'") {
                if (it.next()) it.getLong(1) else 0L
            }

            val reviews = exec(
                """SELECT r.*, u.username
                   FROM marketplace_reviews r
                   LEFT JOIN users u ON u.id = r.user_id
                   WHERE r.item_id = '$itemId'
                   ORDER BY r.created_at DESC
                   LIMIT ${pagination.limit} OFFSET $offset"""
            ) {
                val list = mutableListOf<MarketplaceReviewResponse>()
                while (it.next()) {
                    list.add(
                        MarketplaceReviewResponse(
                            id = it.getString("id"),
                            itemId = it.getString("item_id"),
                            userId = it.getString("user_id"),
                            username = it.getString("username"),
                            rating = it.getInt("rating"),
                            title = it.getString("title"),
                            content = it.getString("content"),
                            isVerifiedPurchase = it.getBoolean("is_verified_purchase"),
                            helpfulCount = it.getInt("helpful_count"),
                            createdAt = it.getTimestamp("created_at").toString()
                        )
                    )
                }
                list
            }

            val totalPages = ((total + pagination.limit - 1) / pagination.limit).toInt()
            reviews to PaginationMeta(
                page = pagination.page,
                limit = pagination.limit,
                total = total,
                totalPages = totalPages,
                hasNext = pagination.page < totalPages,
                hasPrevious = pagination.page > 1
            )
        }
    }

    fun createCollection(userId: String, request: MarketplaceCollectionRequest): MarketplaceCollectionResponse {
        val collectionId = "col_${java.util.UUID.randomUUID().toString().take(24)}"

        transaction {
            exec(
                """INSERT INTO marketplace_collections (id, user_id, name, description, is_public)
                   VALUES ('$collectionId', '$userId', '${request.name.replace("'", "''")}',
                           ${if (request.description != null) "'${request.description.replace("'", "''")}'" else "NULL"},
                           ${request.isPublic})"""
            )
        }

        return getCollection(collectionId)
    }

    private fun getCollection(collectionId: String): MarketplaceCollectionResponse {
        return transaction {
            exec(
                """SELECT c.*,
                   (SELECT COUNT(*) FROM marketplace_collection_items ci WHERE ci.collection_id = c.id) as item_count
                   FROM marketplace_collections c WHERE c.id = '$collectionId'"""
            ) {
                if (it.next()) {
                    MarketplaceCollectionResponse(
                        id = it.getString("id"),
                        userId = it.getString("user_id"),
                        name = it.getString("name"),
                        description = it.getString("description"),
                        isPublic = it.getBoolean("is_public"),
                        itemCount = it.getInt("item_count"),
                        createdAt = it.getTimestamp("created_at").toString()
                    )
                } else throw NotFoundException("MarketplaceCollection", collectionId)
            }
        }
    }

    fun getCollections(userId: String): List<MarketplaceCollectionResponse> {
        return transaction {
            exec(
                """SELECT c.*,
                   (SELECT COUNT(*) FROM marketplace_collection_items ci WHERE ci.collection_id = c.id) as item_count
                   FROM marketplace_collections c
                   WHERE c.user_id = '$userId' OR c.is_public = TRUE
                   ORDER BY c.created_at DESC"""
            ) {
                val list = mutableListOf<MarketplaceCollectionResponse>()
                while (it.next()) {
                    list.add(
                        MarketplaceCollectionResponse(
                            id = it.getString("id"),
                            userId = it.getString("user_id"),
                            name = it.getString("name"),
                            description = it.getString("description"),
                            isPublic = it.getBoolean("is_public"),
                            itemCount = it.getInt("item_count"),
                            createdAt = it.getTimestamp("created_at").toString()
                        )
                    )
                }
                list
            }
        }
    }

    fun addToCollection(collectionId: String, itemId: String, userId: String) {
        val owner = transaction {
            exec("SELECT user_id FROM marketplace_collections WHERE id = '$collectionId'") {
                if (it.next()) it.getString("user_id") else throw NotFoundException("MarketplaceCollection", collectionId)
            }
        }
        if (owner != userId) throw ForbiddenException("You do not own this collection")
        transaction {
            exec("INSERT INTO marketplace_collection_items (collection_id, item_id) VALUES ('$collectionId', '$itemId') ON CONFLICT DO NOTHING")
        }
    }

    fun removeFromCollection(collectionId: String, itemId: String, userId: String) {
        val owner = transaction {
            exec("SELECT user_id FROM marketplace_collections WHERE id = '$collectionId'") {
                if (it.next()) it.getString("user_id") else throw NotFoundException("MarketplaceCollection", collectionId)
            }
        }
        if (owner != userId) throw ForbiddenException("You do not own this collection")
        transaction {
            exec("DELETE FROM marketplace_collection_items WHERE collection_id = '$collectionId' AND item_id = '$itemId'")
        }
    }

    fun recordDownload(itemId: String, userId: String) {
        transaction {
            exec("UPDATE marketplace_items SET download_count = download_count + 1 WHERE id = '$itemId'")
        }
    }

    private fun mapToItemResponse(rs: java.sql.ResultSet): MarketplaceItemResponse {
        return MarketplaceItemResponse(
            id = rs.getString("id"),
            creatorId = rs.getString("creator_id"),
            creatorName = rs.getString("creator_name"),
            title = rs.getString("title"),
            description = rs.getString("description"),
            shortDescription = rs.getString("short_description"),
            category = rs.getString("category"),
            subcategory = rs.getString("subcategory"),
            tags = parseTags(rs.getString("tags") ?: "{}"),
            price = rs.getDouble("price"),
            compareAtPrice = rs.getObject("compare_at_price") as? Double,
            currency = rs.getString("currency"),
            status = rs.getString("status"),
            version = rs.getInt("version"),
            contentType = rs.getString("content_type"),
            thumbnailUrl = rs.getString("thumbnail_url"),
            downloadCount = rs.getInt("download_count"),
            viewCount = rs.getInt("view_count"),
            ratingAvg = rs.getDouble("rating_avg"),
            ratingCount = rs.getInt("rating_count"),
            reviewCount = rs.getInt("review_count"),
            isFeatured = rs.getBoolean("is_featured"),
            isFree = rs.getBoolean("is_free"),
            createdAt = rs.getTimestamp("created_at").toString(),
            updatedAt = rs.getTimestamp("updated_at").toString()
        )
    }

    private fun parseTags(tagsStr: String): List<String> {
        return try {
            tagsStr.removeSurrounding("{", "}").split(",").map { it.trim().removeSurrounding("\"") }.filter { it.isNotBlank() }
        } catch (e: Exception) { emptyList() }
    }
}
