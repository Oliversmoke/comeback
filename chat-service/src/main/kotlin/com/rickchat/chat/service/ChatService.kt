package com.rickchat.chat.service

import com.rickchat.chat.model.*
import com.rickchat.core.error.NotFoundException
import com.rickchat.core.model.PaginationMeta
import com.rickchat.core.model.PaginationRequest
import com.rickchat.core.model.SortOrder
import org.jetbrains.exposed.sql.transactions.transaction

class ChatService {
    fun createChat(request: ChatCreateRequest, creatorId: String): ChatResponse {
        val chatId = "chat_${java.util.UUID.randomUUID().toString().take(24)}"

        transaction {
            exec(
                """INSERT INTO chats (id, title, type, creator_id, agent_id, participant_count)
                   VALUES ('$chatId', '${request.title ?: ""}', '${request.type}', '$creatorId',
                           ${if (request.agentId != null) "'${request.agentId}'" else "NULL"},
                           ${request.participantIds.size + 1})"""
            )
            exec("INSERT INTO chat_participants (chat_id, user_id, role) VALUES ('$chatId', '$creatorId', 'owner')")
            request.participantIds.forEach { userId ->
                exec("INSERT INTO chat_participants (chat_id, user_id, role) VALUES ('$chatId', '$userId', 'member')")
            }
        }

        return getChat(chatId, creatorId)
    }

    fun getChat(chatId: String, userId: String): ChatResponse {
        return transaction {
            exec("SELECT c.*, array_agg(json_build_object('user_id', cp.user_id, 'role', cp.role, 'last_read_at', cp.last_read_at)) as participants FROM chats c LEFT JOIN chat_participants cp ON cp.chat_id = c.id WHERE c.id = '$chatId' GROUP BY c.id") {
                if (it.next()) {
                    ChatResponse(
                        id = it.getString("id"),
                        title = it.getString("title"),
                        type = it.getString("type"),
                        creatorId = it.getString("creator_id"),
                        agentId = it.getString("agent_id"),
                        isArchived = it.getBoolean("is_archived"),
                        lastMessageAt = it.getTimestamp("last_message_at")?.toString(),
                        messageCount = it.getInt("message_count"),
                        participantCount = it.getInt("participant_count"),
                        createdAt = it.getTimestamp("created_at").toString()
                    )
                } else throw NotFoundException("Chat", chatId)
            }
        }
    }

    fun listChats(userId: String, pagination: PaginationRequest): Pair<List<ChatResponse>, PaginationMeta> {
        val offset = (pagination.page - 1) * pagination.limit
        val order = pagination.order.name

        return transaction {
            val total = exec("SELECT COUNT(*) FROM chats c JOIN chat_participants cp ON cp.chat_id = c.id WHERE cp.user_id = '$userId' AND c.is_archived = FALSE") {
                if (it.next()) it.getLong(1) else 0L
            }

            val chats = exec("SELECT c.* FROM chats c JOIN chat_participants cp ON cp.chat_id = c.id WHERE cp.user_id = '$userId' AND c.is_archived = FALSE ORDER BY c.last_message_at DESC NULLS LAST LIMIT ${pagination.limit} OFFSET $offset") {
                val list = mutableListOf<ChatResponse>()
                while (it.next()) {
                    list.add(
                        ChatResponse(
                            id = it.getString("id"),
                            title = it.getString("title"),
                            type = it.getString("type"),
                            creatorId = it.getString("creator_id"),
                            agentId = it.getString("agent_id"),
                            isArchived = it.getBoolean("is_archived"),
                            lastMessageAt = it.getTimestamp("last_message_at")?.toString(),
                            messageCount = it.getInt("message_count"),
                            participantCount = it.getInt("participant_count"),
                            createdAt = it.getTimestamp("created_at").toString()
                        )
                    )
                }
                list
            }

            val totalPages = ((total + pagination.limit - 1) / pagination.limit).toInt()
            chats to PaginationMeta(pagination.page, pagination.limit, total, totalPages,
                pagination.page < totalPages, pagination.page > 1)
        }
    }

    fun sendMessage(chatId: String, senderId: String, request: SendMessageRequest): MessageResponse {
        val msgId = "msg_${java.util.UUID.randomUUID().toString().take(24)}"

        transaction {
            val content = request.content.replace("'", "''")
            exec(
                """INSERT INTO messages (id, chat_id, sender_id, content, content_type,
                   reply_to_id, ai_model, ai_provider)
                   VALUES ('$msgId', '$chatId', '$senderId', '$content', '${request.contentType}',
                           ${if (request.replyToId != null) "'${request.replyToId}'" else "NULL"},
                           ${if (request.aiModel != null) "'${request.aiModel}'" else "NULL"},
                           ${if (request.aiProvider != null) "'${request.aiProvider}'" else "NULL"})"""
            )
            exec("UPDATE chats SET last_message_at = NOW(), message_count = message_count + 1 WHERE id = '$chatId'")
        }

        return getMessage(msgId)
    }

    fun getMessage(msgId: String): MessageResponse {
        return transaction {
            exec("SELECT m.*, u.username FROM messages m LEFT JOIN users u ON u.id = m.sender_id WHERE m.id = '$msgId'") {
                if (it.next()) {
                    MessageResponse(
                        id = it.getString("id"),
                        chatId = it.getString("chat_id"),
                        senderId = it.getString("sender_id"),
                        senderName = it.getString("username"),
                        content = it.getString("content"),
                        contentType = it.getString("content_type"),
                        replyToId = it.getString("reply_to_id"),
                        aiModel = it.getString("ai_model"),
                        aiProvider = it.getString("ai_provider"),
                        tokensUsed = it.getInt("tokens_used"),
                        isEdited = it.getBoolean("is_edited"),
                        isDeleted = it.getBoolean("is_deleted"),
                        createdAt = it.getTimestamp("created_at").toString()
                    )
                } else throw NotFoundException("Message", msgId)
            }
        }
    }

    fun getMessages(chatId: String, userId: String, pagination: PaginationRequest): Pair<List<MessageResponse>, PaginationMeta> {
        val offset = (pagination.page - 1) * pagination.limit
        val sort = pagination.sort ?: "created_at"
        val order = pagination.order.name

        transaction {
            exec("UPDATE chat_participants SET last_read_at = NOW() WHERE chat_id = '$chatId' AND user_id = '$userId'")
        }

        return transaction {
            val total = exec("SELECT COUNT(*) FROM messages WHERE chat_id = '$chatId' AND is_deleted = FALSE") {
                if (it.next()) it.getLong(1) else 0L
            }

            val messages = exec(
                """SELECT m.*, u.username FROM messages m
                   LEFT JOIN users u ON u.id = m.sender_id
                   WHERE m.chat_id = '$chatId' AND m.is_deleted = FALSE
                   ORDER BY m.$sort $order LIMIT ${pagination.limit} OFFSET $offset"""
            ) {
                val list = mutableListOf<MessageResponse>()
                while (it.next()) {
                    list.add(
                        MessageResponse(
                            id = it.getString("id"),
                            chatId = it.getString("chat_id"),
                            senderId = it.getString("sender_id"),
                            senderName = it.getString("username"),
                            content = it.getString("content"),
                            contentType = it.getString("content_type"),
                            replyToId = it.getString("reply_to_id"),
                            aiModel = it.getString("ai_model"),
                            aiProvider = it.getString("ai_provider"),
                            tokensUsed = it.getInt("tokens_used"),
                            isEdited = it.getBoolean("is_edited"),
                            isDeleted = it.getBoolean("is_deleted"),
                            createdAt = it.getTimestamp("created_at").toString()
                        )
                    )
                }
                list
            }

            val totalPages = ((total + pagination.limit - 1) / pagination.limit).toInt()
            messages to PaginationMeta(pagination.page, pagination.limit, total, totalPages,
                pagination.page < totalPages, pagination.page > 1)
        }
    }

    fun deleteMessage(chatId: String, messageId: String, userId: String) {
        transaction {
            exec("UPDATE messages SET is_deleted = TRUE WHERE id = '$messageId' AND chat_id = '$chatId' AND sender_id = '$userId'")
        }
    }

    fun archiveChat(chatId: String, userId: String) {
        transaction {
            exec("UPDATE chats SET is_archived = TRUE WHERE id = '$chatId' AND creator_id = '$userId'")
        }
    }

    fun addReaction(chatId: String, messageId: String, userId: String, reaction: String) {
        transaction {
            exec("""INSERT INTO message_reactions (message_id, user_id, reaction)
                    VALUES ('$messageId', '$userId', '$reaction')
                    ON CONFLICT (message_id, user_id, reaction) DO NOTHING""")
        }
    }

    fun removeReaction(chatId: String, messageId: String, userId: String, reaction: String) {
        transaction {
            exec("DELETE FROM message_reactions WHERE message_id = '$messageId' AND user_id = '$userId' AND reaction = '$reaction'")
        }
    }
}
