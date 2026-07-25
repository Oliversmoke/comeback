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

class QdrantManager(private val config: QdrantConfig) {
    private val client by lazy {
        io.qdrant.client.QdrantClient(
            io.qdrant.client.grpc.QdrantGrpcClient
                .newTarget(config.host, config.grpcPort, config.useTls)
        )
    }

    suspend fun upsertPoint(collection: String, point: VectorPoint) {
        val points = listOf(
            io.qdrant.client.PointIdFactory.id(point.id),
            io.qdrant.client.VectorsFactory.vector(point.vector),
            io.qdrant.client.ValueFactory.value(point.payload)
        )
        client.upsertAsync(collection, points).await()
    }

    suspend fun search(
        collection: String,
        queryVector: List<Float>,
        limit: Int = 10,
        scoreThreshold: Float = 0.0f
    ): SearchResult {
        val response = client.searchAsync(
            io.qdrant.client.SearchConditionsFactory
                .search(collection, queryVector, limit, scoreThreshold)
        ).await()

        val points = response.map { result ->
            VectorPoint(
                id = result.id.id.toString(),
                vector = result.vector.toList(),
                payload = result.payload.mapValues { it.value.toString() },
                score = result.score
            )
        }

        return SearchResult(points = points, totalTime = 0L)
    }

    suspend fun deletePoint(collection: String, pointId: String) {
        client.deleteAsync(
            collection,
            listOf(io.qdrant.client.PointIdFactory.id(pointId)),
            io.qdrant.client.grpc.Points.DeletePoints().apply {}
        ).await()
    }

    suspend fun createCollection(name: String, vectorSize: Int = 1536) {
        client.createCollectionAsync(
            io.qdrant.client.CollectionFactory.createCollection(name, vectorSize)
        ).await()
    }

    suspend fun collectionExists(name: String): Boolean {
        return client.collectionExistsAsync(name).await()
    }

    suspend fun getCollectionInfo(name: String): Map<String, Any> {
        val info = client.getCollectionInfoAsync(name).await()
        return mapOf(
            "name" to name,
            "vectorsCount" to info.pointsCount,
            "indexedVectors" to info.indexedVectorsCount
        )
    }
}
