package com.rickchat.chat.model

import kotlinx.serialization.Serializable

@Serializable
data class ChatCreateRequest(
    val title: String? = null,
    val type: String = "direct",
    val participantIds: List<String> = emptyList(),
    val agentId: String? = null
)

@Serializable
data class ChatResponse(
    val id: String,
    val title: String?,
    val type: String,
    val creatorId: String,
    val agentId: String?,
    val isArchived: Boolean,
    val lastMessageAt: String?,
    val messageCount: Int,
    val participantCount: Int,
    val participants: List<ParticipantResponse>? = null,
    val createdAt: String
)

@Serializable
data class ParticipantResponse(
    val userId: String,
    val username: String,
    val displayName: String?,
    val avatarUrl: String?,
    val role: String,
    val lastReadAt: String?,
    val isOnline: Boolean = false
)

@Serializable
data class SendMessageRequest(
    val content: String,
    val contentType: String = "text",
    val replyToId: String? = null,
    val aiModel: String? = null,
    val aiProvider: String? = null
)

@Serializable
data class MessageResponse(
    val id: String,
    val chatId: String,
    val senderId: String?,
    val senderName: String?,
    val content: String,
    val contentType: String,
    val replyToId: String?,
    val aiModel: String?,
    val aiProvider: String?,
    val tokensUsed: Int?,
    val isEdited: Boolean,
    val isDeleted: Boolean,
    val attachments: List<AttachmentResponse> = emptyList(),
    val reactions: List<ReactionResponse> = emptyList(),
    val createdAt: String
)

@Serializable
data class AttachmentResponse(
    val id: String,
    val fileName: String,
    val fileType: String,
    val fileSize: Long,
    val fileUrl: String,
    val thumbnailUrl: String?
)

@Serializable
data class ReactionResponse(
    val reaction: String,
    val userId: String,
    val username: String
)

@Serializable
data class TypingIndicator(
    val chatId: String,
    val userId: String,
    val username: String,
    val isTyping: Boolean
)

@Serializable
data class ReadReceipt(
    val chatId: String,
    val userId: String,
    val lastReadAt: String
)

@Serializable
data class WebSocketMessage(
    val type: String,
    val payload: String
)
