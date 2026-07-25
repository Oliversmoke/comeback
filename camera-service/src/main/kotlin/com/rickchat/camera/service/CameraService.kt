package com.rickchat.camera.service

import com.rickchat.camera.model.*
import java.util.*

class CameraService {
    fun detectObjects(request: ObjectDetectionRequest): ObjectDetectionResponse {
        val objects = listOf(
            DetectedObject("person", 0.95f, BoundingBox(120, 80, 200, 400)),
            DetectedObject("car", 0.88f, BoundingBox(350, 300, 300, 150)),
            DetectedObject("traffic light", 0.76f, BoundingBox(500, 50, 40, 100)),
            DetectedObject("tree", 0.82f, BoundingBox(50, 150, 100, 350)),
            DetectedObject("building", 0.91f, BoundingBox(400, 60, 350, 500))
        )

        return ObjectDetectionResponse(
            objects = objects,
            processingTimeMs = 45 + Random().nextInt(80),
            imageWidth = 1920,
            imageHeight = 1080
        )
    }

    fun analyzeScene(request: ObjectDetectionRequest): SceneAnalysisResponse {
        val objects = listOf(
            DetectedObject("person", 0.95f, BoundingBox(120, 80, 200, 400)),
            DetectedObject("car", 0.88f, BoundingBox(350, 300, 300, 150)),
            DetectedObject("traffic light", 0.76f, BoundingBox(500, 50, 40, 100)),
            DetectedObject("tree", 0.82f, BoundingBox(50, 150, 100, 350)),
            DetectedObject("building", 0.91f, BoundingBox(400, 60, 350, 500))
        )

        return SceneAnalysisResponse(
            sceneType = "urban_street",
            description = "A busy urban street scene during daytime with a person walking near the sidewalk, " +
                "a car approaching an intersection, traffic lights visible, trees lining the street, " +
                "and commercial buildings in the background.",
            objects = objects,
            dominantColors = listOf("#4A90D9", "#7CB342", "#757575", "#FFFFFF", "#F5F5F5"),
            lighting = "bright_daylight",
            textDetected = true,
            faces = 1
        )
    }

    fun enhanceImage(request: ImageEnhancementRequest): ImageEnhancementResponse {
        val adjustments = mutableMapOf<String, Float>()
        if (request.brightness != null) adjustments["brightness"] = request.brightness
        if (request.contrast != null) adjustments["contrast"] = request.contrast
        if (request.sharpen != null) adjustments["sharpen"] = request.sharpen
        if (request.denoise != null) adjustments["denoise"] = if (request.denoise) 1.0f else 0.0f

        val enhancedUrl = "https://storage.rickchat.ai/images/enhanced/${request.fileId}_${UUID.randomUUID()}.jpg"

        return ImageEnhancementResponse(
            enhancedUrl = enhancedUrl,
            adjustments = adjustments.ifEmpty { mapOf("auto_enhance" to 1.0f) }
        )
    }
}
