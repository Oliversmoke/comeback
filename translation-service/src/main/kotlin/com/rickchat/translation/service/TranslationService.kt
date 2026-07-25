package com.rickchat.translation.service

import com.rickchat.translation.model.*
import org.jetbrains.exposed.sql.transactions.transaction
import java.security.MessageDigest
import java.time.Clock
import java.time.LocalDateTime
import java.util.*

class TranslationService {
    fun translate(request: TranslateRequest, userId: String?): TranslateResponse {
        val textHash = sha256(request.text)

        val cached = transaction {
            exec(
                """SELECT translated_text, source_language, target_language, confidence, provider
                   FROM translations
                   WHERE source_text_hash = ? AND completed_at IS NOT NULL
                   LIMIT 1""",
                listOf(textHash)
            ) { rs ->
                if (rs.next()) {
                    TranslateResponse(
                        translatedText = rs.getString("translated_text"),
                        sourceLanguage = rs.getString("source_language"),
                        targetLanguage = rs.getString("target_language"),
                        confidence = rs.getDouble("confidence"),
                        provider = rs.getString("provider")
                    )
                } else null
            }
        }

        if (cached != null) return cached

        val result = simulateTranslation(request)

        transaction {
            exec(
                """INSERT INTO translations (id, source_text_hash, source_text, translated_text, source_language, target_language, confidence, provider, user_id, created_at, completed_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT (source_text_hash) DO NOTHING""",
                listOf(
                    UUID.randomUUID(),
                    textHash,
                    request.text,
                    result.translatedText,
                    result.sourceLanguage,
                    result.targetLanguage,
                    result.confidence,
                    result.provider,
                    userId,
                    LocalDateTime.now(Clock.systemUTC()),
                    LocalDateTime.now(Clock.systemUTC())
                )
            )
        }

        return result
    }

    fun batchTranslate(request: BatchTranslateRequest, userId: String?): BatchTranslateResponse {
        val results = request.items.map { item ->
            translate(
                TranslateRequest(
                    text = item.text,
                    sourceLanguage = item.sourceLanguage,
                    targetLanguage = item.targetLanguage
                ),
                userId
            )
        }
        return BatchTranslateResponse(results = results)
    }

    fun getSupportedLanguages(): List<LanguageResponse> {
        return listOf(
            LanguageResponse("en", "English", "English", isRtl = false),
            LanguageResponse("es", "Spanish", "Español", isRtl = false),
            LanguageResponse("fr", "French", "Français", isRtl = false),
            LanguageResponse("de", "German", "Deutsch", isRtl = false),
            LanguageResponse("it", "Italian", "Italiano", isRtl = false),
            LanguageResponse("pt", "Portuguese", "Português", isRtl = false),
            LanguageResponse("ru", "Russian", "Русский", isRtl = false),
            LanguageResponse("ja", "Japanese", "日本語", isRtl = false),
            LanguageResponse("ko", "Korean", "한국어", isRtl = false),
            LanguageResponse("zh", "Chinese (Simplified)", "中文", isRtl = false),
            LanguageResponse("zh-TW", "Chinese (Traditional)", "繁體中文", isRtl = false),
            LanguageResponse("ar", "Arabic", "العربية", isRtl = true),
            LanguageResponse("he", "Hebrew", "עברית", isRtl = true),
            LanguageResponse("hi", "Hindi", "हिन्दी", isRtl = false),
            LanguageResponse("th", "Thai", "ไทย", isRtl = false),
            LanguageResponse("vi", "Vietnamese", "Tiếng Việt", isRtl = false),
            LanguageResponse("nl", "Dutch", "Nederlands", isRtl = false),
            LanguageResponse("pl", "Polish", "Polski", isRtl = false),
            LanguageResponse("tr", "Turkish", "Türkçe", isRtl = false),
            LanguageResponse("sv", "Swedish", "Svenska", isRtl = false)
        )
    }

    fun saveLiveCaption(request: LiveCaptionRequest, userId: String?): LiveCaptionResponse {
        val result = simulateTranslation(
            TranslateRequest(request.text, request.sourceLanguage, request.targetLanguage)
        )

        val id = UUID.randomUUID()
        val now = System.currentTimeMillis()

        transaction {
            exec(
                """INSERT INTO live_captions (id, session_id, user_id, original_text, translated_text, source_language, target_language, is_final, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                listOf(
                    id,
                    request.sessionId,
                    userId,
                    request.text,
                    result.translatedText,
                    request.sourceLanguage,
                    request.targetLanguage,
                    false,
                    LocalDateTime.now(Clock.systemUTC())
                )
            )
        }

        return LiveCaptionResponse(
            id = id.toString(),
            sessionId = request.sessionId,
            originalText = request.text,
            translatedText = result.translatedText,
            isFinal = false,
            timestamp = now
        )
    }

    private fun simulateTranslation(request: TranslateRequest): TranslateResponse {
        return TranslateResponse(
            translatedText = "[${request.sourceLanguage}→${request.targetLanguage}] ${request.text}",
            sourceLanguage = request.sourceLanguage,
            targetLanguage = request.targetLanguage,
            confidence = 0.95,
            provider = "ai-gateway"
        )
    }

    private fun sha256(input: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        return digest.digest(input.toByteArray()).joinToString("") { "%02x".format(it) }
    }
}
