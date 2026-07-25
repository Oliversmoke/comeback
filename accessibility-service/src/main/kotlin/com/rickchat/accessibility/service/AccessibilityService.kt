package com.rickchat.accessibility.service

import com.rickchat.accessibility.model.*
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.encodeToJsonElement
import kotlinx.serialization.json.jsonObject
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.Clock
import java.time.LocalDateTime
import java.util.*

class AccessibilityService {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    fun textToSpeech(request: TextToSpeechRequest): TextToSpeechResponse {
        val wordCount = request.text.split("\\s+".toRegex()).size
        val durationSeconds = wordCount * 0.45f * (1.0f / request.speed)
        val audioUrl = "https://storage.rickchat.ai/audio/tts/${UUID.randomUUID()}.${request.voice.replace("/", "_")}.mp3"

        return TextToSpeechResponse(
            audioUrl = audioUrl,
            durationSeconds = durationSeconds.coerceAtLeast(0.5f),
            voice = request.voice,
            format = "mp3"
        )
    }

    fun speechToText(audioBytes: ByteArray, language: String): SpeechToTextResponse {
        val simulatedText = "This is a simulated transcription of the audio input in $language."
        val confidence = 0.89f + Random().nextFloat() * 0.1f
        val durationSeconds = audioBytes.size.toFloat() / 32000.0f

        return SpeechToTextResponse(
            text = simulatedText,
            confidence = confidence.coerceAtMost(0.99f),
            language = language,
            durationSeconds = durationSeconds.coerceAtLeast(0.5f)
        )
    }

    fun ocr(request: OcrRequest): OcrResponse {
        val simulatedText = "Hello World\n123 Main Street\nNew York, NY 10001"
        val boundingBoxes = listOf(
            BoundingBox(10, 10, 200, 40, "Hello World", 0.98f),
            BoundingBox(10, 60, 300, 30, "123 Main Street", 0.95f),
            BoundingBox(10, 100, 350, 30, "New York, NY 10001", 0.92f)
        )

        return OcrResponse(
            detectedText = simulatedText,
            detectedLanguage = "eng",
            confidence = 0.95f,
            boundingBoxes = boundingBoxes
        )
    }

    fun describeScene(request: SceneDescriptionRequest): SceneDescriptionResponse {
        val tags = listOf("outdoor", "urban", "daytime", "building", "sky")
        val objects = listOf(
            DetectedObject("building", 0.95f, BoundingBox(50, 30, 400, 300)),
            DetectedObject("tree", 0.87f, BoundingBox(30, 100, 80, 250)),
            DetectedObject("person", 0.82f, BoundingBox(200, 150, 60, 180)),
            DetectedObject("car", 0.79f, BoundingBox(350, 220, 120, 60))
        )

        return SceneDescriptionResponse(
            description = "An urban street scene with a tall building on the right side, a tree on the left, " +
                "a person walking on the sidewalk, and a car parked on the street. The sky is clear and blue.",
            tags = tags,
            confidence = 0.91f,
            objects = objects
        )
    }

    fun processVoiceCommand(userId: String, command: VoiceNavigationCommand): Map<String, Any> {
        val normalized = command.command.lowercase().trim()
        val response = when {
            normalized.contains("go back") || normalized.contains("back") ->
                mapOf("action" to "navigate", "destination" to "previous", "message" to "Navigating back")
            normalized.contains("home") || normalized.contains("main") ->
                mapOf("action" to "navigate", "destination" to "home", "message" to "Going to home screen")
            normalized.contains("search") || normalized.contains("find") ->
                mapOf("action" to "search", "query" to (command.context ?: ""), "message" to "Opening search")
            normalized.contains("scroll down") || normalized.contains("down") ->
                mapOf("action" to "scroll", "direction" to "down", "message" to "Scrolling down")
            normalized.contains("scroll up") || normalized.contains("up") ->
                mapOf("action" to "scroll", "direction" to "up", "message" to "Scrolling up")
            normalized.contains("open") ->
                mapOf("action" to "open", "target" to (command.context ?: "menu"), "message" to "Opening ${command.context ?: "menu"}")
            normalized.contains("close") || normalized.contains("exit") ->
                mapOf("action" to "close", "message" to "Closing current view")
            normalized.contains("click") || normalized.contains("tap") || normalized.contains("select") ->
                mapOf("action" to "click", "target" to (command.context ?: "focused"), "message" to "Clicked ${command.context ?: "focused element"}")
            else -> mapOf("action" to "unknown", "command" to normalized, "message" to "Command not recognized")
        }
        return response + mapOf("voice_active" to command.isVoiceActive)
    }

    fun saveLiveCaption(request: LiveCaptionRequest): LiveCaptionResponse {
        val id = UUID.randomUUID()
        val now = System.currentTimeMillis()
        val translatedText = "[${request.sourceLanguage}->${request.targetLanguage}] ${request.text}"

        transaction {
            exec(
                """INSERT INTO live_captions (id, session_id, user_id, original_text, translated_text, source_language, target_language, is_final, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                listOf(
                    id,
                    request.sessionId,
                    null,
                    request.text,
                    translatedText,
                    request.sourceLanguage,
                    request.targetLanguage,
                    false,
                    LocalDateTime.now(Clock.systemUTC())
                )
            )
        }

        return LiveCaptionResponse(
            id = id.toString(),
            originalText = request.text,
            translatedText = translatedText,
            isFinal = false,
            timestamp = now
        )
    }

    fun getSettings(userId: String): AccessibilitySettingsResponse {
        return transaction {
            exec(
                """SELECT accessibility_settings FROM user_profiles WHERE user_id = ?""",
                listOf(userId)
            ) { rs ->
                if (rs.next()) {
                    val settingsJson = rs.getString("accessibility_settings")
                    if (settingsJson != null) {
                        try {
                            json.decodeFromString<AccessibilitySettingsResponse>(settingsJson)
                        } catch (e: Exception) {
                            AccessibilitySettingsResponse()
                        }
                    } else AccessibilitySettingsResponse()
                } else AccessibilitySettingsResponse()
            }
        } ?: AccessibilitySettingsResponse()
    }

    fun updateSettings(userId: String, request: AccessibilitySettingsUpdateRequest): AccessibilitySettingsResponse {
        val current = getSettings(userId)
        val updated = AccessibilitySettingsResponse(
            theme = request.theme ?: current.theme,
            fontSize = request.fontSize ?: current.fontSize,
            highContrast = request.highContrast ?: current.highContrast,
            screenReaderEnabled = request.screenReaderEnabled ?: current.screenReaderEnabled,
            captionsEnabled = request.captionsEnabled ?: current.captionsEnabled,
            voiceNavigation = request.voiceNavigation ?: current.voiceNavigation,
            reduceMotion = request.reduceMotion ?: current.reduceMotion,
            colorBlindMode = request.colorBlindMode ?: current.colorBlindMode
        )

        transaction {
            exec(
                """INSERT INTO user_profiles (user_id, accessibility_settings)
                   VALUES (?, ?::jsonb)
                   ON CONFLICT (user_id) DO UPDATE SET accessibility_settings = ?::jsonb, updated_at = ?""",
                listOf(
                    userId,
                    json.encodeToJsonElement(updated).jsonObject.toString(),
                    json.encodeToJsonElement(updated).jsonObject.toString(),
                    LocalDateTime.now(Clock.systemUTC())
                )
            )
        }

        return updated
    }
}
