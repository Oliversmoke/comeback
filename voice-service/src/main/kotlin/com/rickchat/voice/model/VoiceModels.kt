package com.rickchat.voice.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class VoiceSynthesisRequest(
    val text: String,
    val voice: String = "en-US-JennyNeural",
    val speed: Float = 1.0f,
    val pitch: Float = 1.0f,
    val language: String = "en-US",
    val format: String = "mp3"
)

@Serializable
data class VoiceSynthesisResponse(
    @SerialName("audio_url")
    val audioUrl: String,
    @SerialName("duration_seconds")
    val durationSeconds: Float,
    val format: String,
    val voice: String
)

@Serializable
data class VoiceRecognitionRequest(
    @SerialName("audio_base64")
    val audioBase64: String? = null,
    @SerialName("audio_url")
    val audioUrl: String? = null,
    val language: String = "en-US",
    val model: String = "default"
)

@Serializable
data class VoiceRecognitionResponse(
    val text: String,
    val confidence: Float,
    val language: String,
    val words: List<WordTiming>,
    @SerialName("duration_seconds")
    val durationSeconds: Float
)

@Serializable
data class WordTiming(
    val word: String,
    @SerialName("start_time")
    val startTime: Float,
    @SerialName("end_time")
    val endTime: Float,
    val confidence: Float
)

@Serializable
data class VoiceProfile(
    @SerialName("user_id")
    val userId: String,
    @SerialName("voice_id")
    val voiceId: String,
    val name: String,
    val language: String,
    @SerialName("is_default")
    val isDefault: Boolean = false
)

@Serializable
data class VoiceCloningRequest(
    val name: String,
    @SerialName("audio_samples")
    val audioSamples: List<String>
)

@Serializable
data class VoiceCloningResponse(
    @SerialName("voice_id")
    val voiceId: String,
    val name: String,
    val status: String,
    @SerialName("estimated_completion_time")
    val estimatedCompletionTime: Long
)
