package com.rickchat.marketplace.routes

import com.rickchat.core.model.*
import com.rickchat.marketplace.model.*
import com.rickchat.marketplace.service.MarketplaceService
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

class MarketplaceRoutes {
    private val marketplaceService = MarketplaceService()

    fun register(route: Route) {
        route("api/v1/marketplace") {
            get {
                val pagination = PaginationRequest(
                    page = call.request.queryParameters["page"]?.toIntOrNull() ?: 1,
                    limit = call.request.queryParameters["limit"]?.toIntOrNull() ?: 20
                )
                val category = call.request.queryParameters["category"]
                val status = call.request.queryParameters["status"]
                val query = call.request.queryParameters["q"]

                val (items, meta) = if (!query.isNullOrBlank()) {
                    marketplaceService.searchItems(query, pagination)
                } else {
                    marketplaceService.listItems(pagination, category, status)
                }
                call.respond(success(items, meta))
            }

            get("/{id}") {
                val id = call.parameters["id"] ?: return@get call.respond(HttpStatusCode.BadRequest)
                val item = marketplaceService.getItem(id)
                call.respond(success(item))
            }

            post {
                val userId = call.request.headers["X-User-ID"] ?: return@post call.respond(HttpStatusCode.Unauthorized)
                val request = call.receive<MarketplaceItemRequest>()
                val item = marketplaceService.createItem(userId, request)
                call.respond(HttpStatusCode.Created, success(item))
            }

            put("/{id}") {
                val id = call.parameters["id"] ?: return@put call.respond(HttpStatusCode.BadRequest)
                val userId = call.request.headers["X-User-ID"] ?: return@put call.respond(HttpStatusCode.Unauthorized)
                val request = call.receive<MarketplaceItemRequest>()
                val item = marketplaceService.updateItem(id, userId, request)
                call.respond(success(item))
            }

            delete("/{id}") {
                val id = call.parameters["id"] ?: return@delete call.respond(HttpStatusCode.BadRequest)
                val userId = call.request.headers["X-User-ID"] ?: return@delete call.respond(HttpStatusCode.Unauthorized)
                marketplaceService.deleteItem(id, userId)
                call.respond(success(mapOf("message" to "Item deleted")))
            }

            get("/{id}/reviews") {
                val id = call.parameters["id"] ?: return@get call.respond(HttpStatusCode.BadRequest)
                val pagination = PaginationRequest(
                    page = call.request.queryParameters["page"]?.toIntOrNull() ?: 1,
                    limit = call.request.queryParameters["limit"]?.toIntOrNull() ?: 20
                )
                val (reviews, meta) = marketplaceService.getReviews(id, pagination)
                call.respond(success(reviews, meta))
            }

            post("/{id}/reviews") {
                val id = call.parameters["id"] ?: return@post call.respond(HttpStatusCode.BadRequest)
                val userId = call.request.headers["X-User-ID"] ?: return@post call.respond(HttpStatusCode.Unauthorized)
                val request = call.receive<MarketplaceReviewRequest>()
                val review = marketplaceService.createReview(id, userId, request)
                call.respond(HttpStatusCode.Created, success(review))
            }

            get("/{id}/download") {
                val id = call.parameters["id"] ?: return@get call.respond(HttpStatusCode.BadRequest)
                val userId = call.request.headers["X-User-ID"] ?: return@get call.respond(HttpStatusCode.Unauthorized)
                marketplaceService.recordDownload(id, userId)
                call.respond(success(mapOf("message" to "Download recorded")))
            }

            // Collection routes
            post("/collections") {
                val userId = call.request.headers["X-User-ID"] ?: return@post call.respond(HttpStatusCode.Unauthorized)
                val request = call.receive<MarketplaceCollectionRequest>()
                val collection = marketplaceService.createCollection(userId, request)
                call.respond(HttpStatusCode.Created, success(collection))
            }

            get("/collections") {
                val userId = call.request.headers["X-User-ID"] ?: return@get call.respond(HttpStatusCode.Unauthorized)
                val collections = marketplaceService.getCollections(userId)
                call.respond(success(collections))
            }

            post("/collections/{id}/items") {
                val collectionId = call.parameters["id"] ?: return@post call.respond(HttpStatusCode.BadRequest)
                val userId = call.request.headers["X-User-ID"] ?: return@post call.respond(HttpStatusCode.Unauthorized)
                val body = call.receive<Map<String, String>>()
                val itemId = body["itemId"] ?: return@post call.respond(HttpStatusCode.BadRequest, error<String>("missing_itemId", "itemId is required"))
                marketplaceService.addToCollection(collectionId, itemId, userId)
                call.respond(success(mapOf("message" to "Item added to collection")))
            }

            delete("/collections/{id}/items/{itemId}") {
                val collectionId = call.parameters["id"] ?: return@delete call.respond(HttpStatusCode.BadRequest)
                val itemId = call.parameters["itemId"] ?: return@delete call.respond(HttpStatusCode.BadRequest)
                val userId = call.request.headers["X-User-ID"] ?: return@delete call.respond(HttpStatusCode.Unauthorized)
                marketplaceService.removeFromCollection(collectionId, itemId, userId)
                call.respond(success(mapOf("message" to "Item removed from collection")))
            }
        }
    }
}
