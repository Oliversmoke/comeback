package com.rickchat.core.database.qdrant

import com.rickchat.core.config.QdrantConfig

data class VectorPoint(
    val id: String,
    val vector: List<Float>,
    val payload: Map<String, String> = emptyMap(),
    val score: Float = 0f
)

data class SearchResult(
    val points: List<VectorPoint>,
    val totalTime: Long
)

/**
 * Minimal Qdrant manager.
 *
 * NOTE: the vector-search operations are intentionally left as no-ops for now.
 * The api-gateway does not use vector search directly (it proxies to the
 * memory-service), so this keeps the module compiling and the gateway
 * deployable without pulling the full Qdrant gRPC surface into the startup path.
 */
class QdrantManager(private val config: QdrantConfig) {

    val endpoint: String get() = "${config.host}:${config.grpcPort} (tls=${config.useTls})"

    @Suppress("UNUSED_PARAMETER")
    suspend fun upsertPoint(collection: String, point: VectorPoint) {
        // TODO: implement against io.qdrant:client when vector search is wired up
    }

    @Suppress("UNUSED_PARAMETER")
    suspend fun search(
        collection: String,
        queryVector: List<Float>,
        limit: Int = 10,
        scoreThreshold: Float = 0.0f
    ): SearchResult = SearchResult(points = emptyList(), totalTime = 0L)

    @Suppress("UNUSED_PARAMETER")
    suspend fun deletePoint(collection: String, pointId: String) {
        // TODO: implement against io.qdrant:client
    }

    @Suppress("UNUSED_PARAMETER")
    suspend fun createCollection(name: String, vectorSize: Int = 1536) {
        // TODO: implement against io.qdrant:client
    }

    @Suppress("UNUSED_PARAMETER")
    suspend fun collectionExists(name: String): Boolean = false

    @Suppress("UNUSED_PARAMETER")
    suspend fun getCollectionInfo(name: String): Map<String, Any> = mapOf("name" to name)
}
