package com.rickchat.accessibility.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class TextToSpeechRequest(
    val text: String,
    val voice: String = "en-US-JennyNeural",
    val speed: Float = 1.0f,
    val pitch: Float = 1.0f,
    val language: String = "en-US"
)

@Serializable
data class TextToSpeechResponse(
    @SerialName("audio_url")
    val audioUrl: String,
    @SerialName("duration_seconds")
    val durationSeconds: Float,
    val voice: String,
    val format: String = "mp3"
)

@Serializable
data class SpeechToTextResponse(
    val text: String,
    val confidence: Float,
    val language: String,
    @SerialName("duration_seconds")
    val durationSeconds: Float
)

@Serializable
data class OcrRequest(
    @SerialName("file_id")
    val fileId: String? = null,
    @SerialName("image_bytes")
    val imageBytes: String? = null,
    val language: String = "eng"
)

@Serializable
data class OcrResponse(
    @SerialName("detected_text")
    val detectedText: String,
    @SerialName("detected_language")
    val detectedLanguage: String,
    val confidence: Float,
    @SerialName("bounding_boxes")
    val boundingBoxes: List<BoundingBox>
)

@Serializable
data class BoundingBox(
    val x: Int,
    val y: Int,
    val width: Int,
    val height: Int,
    val text: String? = null,
    val confidence: Float? = null
)

@Serializable
data class SceneDescriptionRequest(
    @SerialName("file_id")
    val fileId: String? = null,
    @SerialName("image_url")
    val imageUrl: String? = null
)

@Serializable
data class SceneDescriptionResponse(
    val description: String,
    val tags: List<String>,
    val confidence: Float,
    val objects: List<DetectedObject>
)

@Serializable
data class DetectedObject(
    val label: String,
    val confidence: Float,
    @SerialName("bounding_box")
    val boundingBox: BoundingBox? = null
)

@Serializable
data class VoiceNavigationCommand(
    val command: String,
    val context: String? = null,
    @SerialName("is_voice_active")
    val isVoiceActive: Boolean = true
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
    @SerialName("original_text")
    val originalText: String,
    @SerialName("translated_text")
    val translatedText: String,
    @SerialName("is_final")
    val isFinal: Boolean,
    val timestamp: Long
)

@Serializable
data class AccessibilitySettingsResponse(
    val theme: String = "light",
    @SerialName("font_size")
    val fontSize: String = "medium",
    @SerialName("high_contrast")
    val highContrast: Boolean = false,
    @SerialName("screen_reader_enabled")
    val screenReaderEnabled: Boolean = false,
    @SerialName("captions_enabled")
    val captionsEnabled: Boolean = true,
    @SerialName("voice_navigation")
    val voiceNavigation: Boolean = false,
    @SerialName("reduce_motion")
    val reduceMotion: Boolean = false,
    @SerialName("color_blind_mode")
    val colorBlindMode: String? = null
)

@Serializable
data class AccessibilitySettingsUpdateRequest(
    val theme: String? = null,
    @SerialName("font_size")
    val fontSize: String? = null,
    @SerialName("high_contrast")
    val highContrast: Boolean? = null,
    @SerialName("screen_reader_enabled")
    val screenReaderEnabled: Boolean? = null,
    @SerialName("captions_enabled")
    val captionsEnabled: Boolean? = null,
    @SerialName("voice_navigation")
    val voiceNavigation: Boolean? = null,
    @SerialName("reduce_motion")
    val reduceMotion: Boolean? = null,
    @SerialName("color_blind_mode")
    val colorBlindMode: String? = null
)
