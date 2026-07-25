package com.rickchat.translation.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class TranslateRequest(
    val text: String,
    @SerialName("source_language")
    val sourceLanguage: String,
    @SerialName("target_language")
    val targetLanguage: String
)

@Serializable
data class TranslateResponse(
    @SerialName("translated_text")
    val translatedText: String,
    @SerialName("source_language")
    val sourceLanguage: String,
    @SerialName("target_language")
    val targetLanguage: String,
    val confidence: Double,
    val provider: String
)

@Serializable
data class TranslateItem(
    val text: String,
    @SerialName("source_language")
    val sourceLanguage: String,
    @SerialName("target_language")
    val targetLanguage: String
)

@Serializable
data class BatchTranslateRequest(
    val items: List<TranslateItem>
)

@Serializable
data class BatchTranslateResponse(
    val results: List<TranslateResponse>
)

@Serializable
data class LanguageResponse(
    val code: String,
    val name: String,
    @SerialName("native_name")
    val nativeName: String,
    @SerialName("is_rtl")
    val isRtl: Boolean
)

@Serializable
data class LiveCaptionRequest(
    @SerialName("session_id")
    val sessionId: String,
    val text: String,
    @SerialName("source_language")
    val sourceLanguage: String,
    @SerialName("target_language")
    val targetLanguage: String
)

@Serializable
data class LiveCaptionResponse(
    val id: String,
    @SerialName("session_id")
    val sessionId: String,
    @SerialName("original_text")
    val originalText: String,
    @SerialName("translated_text")
    val translatedText: String,
    @SerialName("is_final")
    val isFinal: Boolean,
    val timestamp: Long
)
