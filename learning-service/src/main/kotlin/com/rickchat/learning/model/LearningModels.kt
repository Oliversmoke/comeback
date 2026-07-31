package com.rickchat.learning.model

import kotlinx.serialization.Serializable

@Serializable
data class CourseCreateRequest(
    val title: String,
    val description: String,
    val shortDescription: String? = null,
    val category: String,
    val level: String,
    val language: String = "en",
    val price: Double = 0.0,
    val thumbnailUrl: String? = null,
    val isCertificateAvailable: Boolean = false,
    val passingScore: Int? = null,
    val prerequisites: List<String>? = null,
    val learningObjectives: List<String>? = null
)

@Serializable
data class CourseResponse(
    val id: String,
    val creatorId: String,
    val title: String,
    val description: String,
    val shortDescription: String?,
    val category: String,
    val level: String,
    val language: String,
    val thumbnailUrl: String?,
    val price: Double,
    val durationHours: Double?,
    val lessonCount: Int,
    val quizCount: Int,
    val status: String,
    val ratingAvg: Double,
    val ratingCount: Int,
    val enrollmentCount: Int,
    val tags: List<String>,
    val createdAt: String,
    val updatedAt: String
)

@Serializable
data class LessonCreateRequest(
    val title: String,
    val content: String? = null,
    val contentType: String = "text",
    val videoUrl: String? = null,
    val videoDurationSeconds: Int? = null,
    val orderIndex: Int,
    val isFreePreview: Boolean = false,
    val durationMinutes: Int? = null
)

@Serializable
data class LessonResponse(
    val id: String,
    val courseId: String,
    val title: String,
    val content: String?,
    val contentType: String,
    val videoUrl: String?,
    val orderIndex: Int,
    val isFreePreview: Boolean,
    val durationMinutes: Int?,
    val createdAt: String
)

@Serializable
data class QuizCreateRequest(
    val question: String,
    val type: String = "multiple_choice",
    val options: List<String>? = null,
    val correctAnswer: String,
    val explanation: String? = null,
    val points: Int = 1,
    val orderIndex: Int? = null
)

@Serializable
data class QuizResponse(
    val id: String,
    val lessonId: String,
    val question: String,
    val type: String,
    val options: List<String>?,
    val points: Int,
    val orderIndex: Int?,
    val createdAt: String
)

@Serializable
data class QuizAnswer(
    val quizId: String,
    val answer: String
)

@Serializable
data class QuizSubmitRequest(
    val answers: List<QuizAnswer>
)

@Serializable
data class QuizResultResponse(
    val score: Int,
    val total: Int,
    val percentage: Double,
    val passed: Boolean,
    val answers: List<QuizAnswerResult>
)

@Serializable
data class QuizAnswerResult(
    val quizId: String,
    val question: String,
    val correctAnswer: String,
    val yourAnswer: String,
    val isCorrect: Boolean,
    val points: Int,
    val explanation: String?
)

@Serializable
data class EnrollmentResponse(
    val id: String,
    val userId: String,
    val courseId: String,
    val progress: Double,
    val completedLessons: Int,
    val totalLessons: Int,
    val isCompleted: Boolean,
    val completedAt: String?,
    val enrolledAt: String
)

@Serializable
data class ProgressResponse(
    val lessonId: String,
    val isCompleted: Boolean,
    val quizScore: Double?,
    val timeSpentSeconds: Int,
    val completedAt: String?
)

@Serializable
data class BookmarkCreateRequest(
    val resourceType: String,
    val resourceId: String,
    val label: String? = null,
    val tags: List<String>? = null
)

@Serializable
data class BookmarkResponse(
    val id: String,
    val resourceType: String,
    val resourceId: String,
    val label: String?,
    val tags: List<String>?,
    val createdAt: String
)

@Serializable
data class FlashcardCreateRequest(
    val deckName: String,
    val front: String,
    val back: String,
    val hints: List<String>? = null,
    val tags: List<String>? = null
)

@Serializable
data class FlashcardUpdateRequest(
    val deckName: String? = null,
    val front: String? = null,
    val back: String? = null,
    val hints: List<String>? = null,
    val tags: List<String>? = null,
    val difficulty: String? = null
)

@Serializable
data class FlashcardResponse(
    val id: String,
    val userId: String,
    val deckName: String,
    val front: String,
    val back: String,
    val hints: List<String>?,
    val tags: List<String>?,
    val difficulty: String,
    val reviewCount: Int,
    val lastReviewedAt: String?,
    val createdAt: String
)
