package com.rickchat.camera.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ObjectDetectionRequest(
    @SerialName("file_id")
    val fileId: String? = null,
    @SerialName("image_base64")
    val imageBase64: String? = null
)

@Serializable
data class ObjectDetectionResponse(
    val objects: List<DetectedObject>,
    @SerialName("processing_time_ms")
    val processingTimeMs: Long,
    @SerialName("image_width")
    val imageWidth: Int,
    @SerialName("image_height")
    val imageHeight: Int
)

@Serializable
data class DetectedObject(
    val label: String,
    val confidence: Float,
    @SerialName("bounding_box")
    val boundingBox: BoundingBox
)

@Serializable
data class BoundingBox(
    val x: Int,
    val y: Int,
    val width: Int,
    val height: Int
)

@Serializable
data class SceneAnalysisResponse(
    @SerialName("scene_type")
    val sceneType: String,
    val description: String,
    val objects: List<DetectedObject>,
    @SerialName("dominant_colors")
    val dominantColors: List<String>,
    val lighting: String,
    @SerialName("text_detected")
    val textDetected: Boolean = false,
    val faces: Int = 0
)

@Serializable
data class ImageEnhancementRequest(
    @SerialName("file_id")
    val fileId: String,
    val brightness: Float? = null,
    val contrast: Float? = null,
    val sharpen: Float? = null,
    val denoise: Boolean? = null
)

@Serializable
data class ImageEnhancementResponse(
    @SerialName("enhanced_url")
    val enhancedUrl: String,
    val adjustments: Map<String, Float>
)
