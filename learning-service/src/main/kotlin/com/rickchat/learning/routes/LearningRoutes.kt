package com.rickchat.learning.routes

import com.rickchat.core.model.*
import com.rickchat.learning.model.*
import com.rickchat.learning.service.LearningService
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

class LearningRoutes {
    private val learningService = LearningService()

    fun register(route: Route) {
        route("api/v1/learning") {

            // Courses
            get("/courses") {
                val pagination = PaginationRequest(
                    page = call.request.queryParameters["page"]?.toIntOrNull() ?: 1,
                    limit = call.request.queryParameters["limit"]?.toIntOrNull() ?: 20
                )
                val category = call.request.queryParameters["category"]
                val level = call.request.queryParameters["level"]
                val status = call.request.queryParameters["status"]
                val (courses, meta) = learningService.listCourses(pagination, category, level, status)
                call.respond(success(courses, meta))
            }

            get("/courses/{id}") {
                val id = call.parameters["id"] ?: return@get call.respond(HttpStatusCode.BadRequest)
                val course = learningService.getCourse(id)
                call.respond(success(course))
            }

            post("/courses") {
                val userId = call.request.headers["X-User-ID"] ?: return@post call.respond(HttpStatusCode.Unauthorized)
                val request = call.receive<CourseCreateRequest>()
                val course = learningService.createCourse(userId, request)
                call.respond(HttpStatusCode.Created, success(course))
            }

            put("/courses/{id}") {
                val id = call.parameters["id"] ?: return@put call.respond(HttpStatusCode.BadRequest)
                val userId = call.request.headers["X-User-ID"] ?: return@put call.respond(HttpStatusCode.Unauthorized)
                val request = call.receive<CourseCreateRequest>()
                val course = learningService.updateCourse(id, userId, request)
                call.respond(success(course))
            }

            delete("/courses/{id}") {
                val id = call.parameters["id"] ?: return@delete call.respond(HttpStatusCode.BadRequest)
                val userId = call.request.headers["X-User-ID"] ?: return@delete call.respond(HttpStatusCode.Unauthorized)
                learningService.deleteCourse(id, userId)
                call.respond(success(mapOf("message" to "Course deleted")))
            }

            // Lessons
            get("/courses/{id}/lessons") {
                val courseId = call.parameters["id"] ?: return@get call.respond(HttpStatusCode.BadRequest)
                val lessons = learningService.getLessons(courseId)
                call.respond(success(lessons))
            }

            post("/courses/{id}/lessons") {
                val courseId = call.parameters["id"] ?: return@post call.respond(HttpStatusCode.BadRequest)
                val userId = call.request.headers["X-User-ID"] ?: return@post call.respond(HttpStatusCode.Unauthorized)
                val request = call.receive<LessonCreateRequest>()
                val lesson = learningService.addLesson(courseId, request)
                call.respond(HttpStatusCode.Created, success(lesson))
            }

            // Quizzes
            get("/lessons/{lessonId}/quizzes") {
                val lessonId = call.parameters["lessonId"] ?: return@get call.respond(HttpStatusCode.BadRequest)
                val quizzes = learningService.getQuizzes(lessonId)
                call.respond(success(quizzes))
            }

            post("/lessons/{lessonId}/quizzes") {
                val lessonId = call.parameters["lessonId"] ?: return@post call.respond(HttpStatusCode.BadRequest)
                val userId = call.request.headers["X-User-ID"] ?: return@post call.respond(HttpStatusCode.Unauthorized)
                val request = call.receive<QuizCreateRequest>()
                val courseId = call.request.queryParameters["courseId"] ?: return@post call.respond(HttpStatusCode.BadRequest, error<String>("missing_courseId", "courseId query parameter is required"))
                val quiz = learningService.addQuiz(lessonId, courseId, request)
                call.respond(HttpStatusCode.Created, success(quiz))
            }

            post("/lessons/{lessonId}/submit") {
                val lessonId = call.parameters["lessonId"] ?: return@post call.respond(HttpStatusCode.BadRequest)
                val userId = call.request.headers["X-User-ID"] ?: return@post call.respond(HttpStatusCode.Unauthorized)
                val request = call.receive<QuizSubmitRequest>()
                val courseId = call.request.queryParameters["courseId"] ?: return@post call.respond(HttpStatusCode.BadRequest, error<String>("missing_courseId", "courseId query parameter is required"))
                val result = learningService.submitQuiz(userId, lessonId, courseId, request)
                call.respond(success(result))
            }

            // Enrollments
            post("/enrollments") {
                val userId = call.request.headers["X-User-ID"] ?: return@post call.respond(HttpStatusCode.Unauthorized)
                val body = call.receive<Map<String, String>>()
                val courseId = body["courseId"] ?: return@post call.respond(HttpStatusCode.BadRequest, error<String>("missing_courseId", "courseId is required"))
                val enrollment = learningService.enrollUser(userId, courseId)
                call.respond(HttpStatusCode.Created, success(enrollment))
            }

            get("/enrollments") {
                val userId = call.request.headers["X-User-ID"] ?: return@get call.respond(HttpStatusCode.Unauthorized)
                val pagination = PaginationRequest(
                    page = call.request.queryParameters["page"]?.toIntOrNull() ?: 1,
                    limit = call.request.queryParameters["limit"]?.toIntOrNull() ?: 20
                )
                val (enrollments, meta) = learningService.getEnrollments(userId, pagination)
                call.respond(success(enrollments, meta))
            }

            // Progress
            get("/progress") {
                val userId = call.request.headers["X-User-ID"] ?: return@get call.respond(HttpStatusCode.Unauthorized)
                val courseId = call.request.queryParameters["courseId"] ?: return@get call.respond(HttpStatusCode.BadRequest, error<String>("missing_courseId", "courseId query parameter is required"))
                val progress = learningService.getProgress(userId, courseId)
                call.respond(success(progress))
            }

            // Bookmarks
            post("/bookmarks") {
                val userId = call.request.headers["X-User-ID"] ?: return@post call.respond(HttpStatusCode.Unauthorized)
                val request = call.receive<BookmarkCreateRequest>()
                val bookmark = learningService.createBookmark(userId, request)
                call.respond(HttpStatusCode.Created, success(bookmark))
            }

            get("/bookmarks") {
                val userId = call.request.headers["X-User-ID"] ?: return@get call.respond(HttpStatusCode.Unauthorized)
                val bookmarks = learningService.getBookmarks(userId)
                call.respond(success(bookmarks))
            }

            delete("/bookmarks/{id}") {
                val id = call.parameters["id"] ?: return@delete call.respond(HttpStatusCode.BadRequest)
                val userId = call.request.headers["X-User-ID"] ?: return@delete call.respond(HttpStatusCode.Unauthorized)
                learningService.deleteBookmark(id, userId)
                call.respond(success(mapOf("message" to "Bookmark deleted")))
            }

            // Flashcards
            post("/flashcards") {
                val userId = call.request.headers["X-User-ID"] ?: return@post call.respond(HttpStatusCode.Unauthorized)
                val request = call.receive<FlashcardCreateRequest>()
                val flashcard = learningService.createFlashcard(userId, request)
                call.respond(HttpStatusCode.Created, success(flashcard))
            }

            get("/flashcards") {
                val userId = call.request.headers["X-User-ID"] ?: return@get call.respond(HttpStatusCode.Unauthorized)
                val deckName = call.request.queryParameters["deckName"]
                val flashcards = learningService.getFlashcards(userId, deckName)
                call.respond(success(flashcards))
            }

            put("/flashcards/{id}") {
                val id = call.parameters["id"] ?: return@put call.respond(HttpStatusCode.BadRequest)
                val userId = call.request.headers["X-User-ID"] ?: return@put call.respond(HttpStatusCode.Unauthorized)
                val request = call.receive<FlashcardUpdateRequest>()
                val flashcard = learningService.updateFlashcard(id, userId, request)
                call.respond(success(flashcard))
            }
        }
    }
}
