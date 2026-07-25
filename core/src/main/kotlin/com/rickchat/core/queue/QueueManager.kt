package com.rickchat.core.queue

import com.rickchat.core.config.QueueConfig
import com.google.cloud.pubsub.v1.Publisher
import com.google.cloud.pubsub.v1.Subscriber
import com.google.pubsub.v1.ProjectTopicName
import com.google.pubsub.v1.PubsubMessage
import com.google.protobuf.ByteString
import kotlinx.coroutines.runBlocking
import java.util.concurrent.ConcurrentHashMap

data class QueueMessage(
    val id: String,
    val type: String,
    val payload: String,
    val timestamp: Long = System.currentTimeMillis(),
    val retryCount: Int = 0
)

data class QueueHandler(
    val type: String,
    val handler: suspend (QueueMessage) -> Unit
)

interface QueueManager {
    suspend fun publish(type: String, payload: String)
    suspend fun publishDelayed(type: String, payload: String, delaySeconds: Long)
    suspend fun subscribe(handler: QueueHandler)
    suspend fun start()
    suspend fun stop()
}

class PubSubQueueManager(private val config: QueueConfig) : QueueManager {
    private val handlers = ConcurrentHashMap<String, suspend (QueueMessage) -> Unit>()
    private var publisher: Publisher? = null
    private var subscriber: Subscriber? = null

    override suspend fun publish(type: String, payload: String) {
        val topicName = ProjectTopicName.of(config.projectId, config.topicId)
        val localPublisher = Publisher.newBuilder(topicName).build()
        val data = ByteString.copyFromUtf8(payload)
        val message = PubsubMessage.newBuilder()
            .setData(data)
            .putAttributes("type", type)
            .build()
        localPublisher.publish(message).get()
        localPublisher.shutdown()
    }

    override suspend fun publishDelayed(type: String, payload: String, delaySeconds: Long) {
        Thread.sleep(delaySeconds * 1000)
        publish(type, payload)
    }

    override suspend fun subscribe(handler: QueueHandler) {
        handlers[handler.type] = handler.handler
    }

    override suspend fun start() {
        // PubSub subscriber initialization
    }

    override suspend fun stop() {
        publisher?.shutdown()
        subscriber?.stopAsync()
    }
}

class InMemoryQueueManager : QueueManager {
    private val handlers = ConcurrentHashMap<String, suspend (QueueMessage) -> Unit>()
    private val messages = ConcurrentHashMap.newKeySet<QueueMessage>()

    override suspend fun publish(type: String, payload: String) {
        val message = QueueMessage(
            id = java.util.UUID.randomUUID().toString(),
            type = type,
            payload = payload
        )
        messages.add(message)
        handlers[type]?.let { handler ->
            try {
                handler(message)
            } catch (e: Exception) {
                println("Handler failed for $type: ${e.message}")
            }
        }
    }

    override suspend fun publishDelayed(type: String, payload: String, delaySeconds: Long) {
        kotlinx.coroutines.delay(delaySeconds * 1000)
        publish(type, payload)
    }

    override suspend fun subscribe(handler: QueueHandler) {
        handlers[handler.type] = handler.handler
    }

    override suspend fun start() {}
    override suspend fun stop() {}
}
