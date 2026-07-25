package com.rickchat.translation.db

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.datetime

object TranslationsTable : Table("translations") {
    val id = uuid("id").autoGenerate()
    val sourceTextHash = varchar("source_text_hash", 64).uniqueIndex()
    val sourceText = text("source_text")
    val translatedText = text("translated_text")
    val sourceLanguage = varchar("source_language", 10)
    val targetLanguage = varchar("target_language", 10)
    val confidence = double("confidence").default(0.0)
    val provider = varchar("provider", 64).default("system")
    val userId = varchar("user_id", 128).nullable()
    val createdAt = datetime("created_at")
    val completedAt = datetime("completed_at").nullable()

    override val primaryKey = PrimaryKey(id)
}

object LiveCaptionsTable : Table("live_captions") {
    val id = uuid("id").autoGenerate()
    val sessionId = varchar("session_id", 128)
    val userId = varchar("user_id", 128).nullable()
    val originalText = text("original_text")
    val translatedText = text("translated_text")
    val sourceLanguage = varchar("source_language", 10)
    val targetLanguage = varchar("target_language", 10)
    val isFinal = bool("is_final").default(false)
    val createdAt = datetime("created_at")

    override val primaryKey = PrimaryKey(id)
}
