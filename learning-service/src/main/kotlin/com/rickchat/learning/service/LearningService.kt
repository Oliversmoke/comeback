package com.rickchat.learning.service

import com.rickchat.core.error.ForbiddenException
import com.rickchat.core.error.NotFoundException
import com.rickchat.core.model.PaginationMeta
import com.rickchat.core.model.PaginationRequest
import com.rickchat.learning.model.*
import org.jetbrains.exposed.sql.transactions.transaction

class LearningService {

    fun createCourse(userId: String, request: CourseCreateRequest): CourseResponse {
        val courseId = "course_${java.util.UUID.randomUUID().toString().take(24)}"
        val title = request.title.replace("'", "''")
        val description = request.description.replace("'", "''")
        val shortDescription = request.shortDescription?.replace("'", "''")
        val tags = request.prerequisites ?: emptyList()
        val objectives = request.learningObjectives ?: emptyList()

        transaction {
            exec(
                """INSERT INTO courses (id, creator_id, title, description, short_description,
                   category, level, language, thumbnail_url, price, is_certificate_available,
                   passing_score, prerequisites, learning_objectives, status)
                   VALUES ('$courseId', '$userId', '$title', '$description',
                           ${if (shortDescription != null) "'$shortDescription'" else "NULL"},
                           '${request.category}', '${request.level}', '${request.language}',
                           ${if (request.thumbnailUrl != null) "'${request.thumbnailUrl}'" else "NULL"},
                           ${request.price}, ${request.isCertificateAvailable},
                           ${request.passingScore ?: "NULL"},
                           '{${tags.joinToString(",") { "\"$it\"" }}}',
                           '{${objectives.joinToString(",") { "\"$it\"" }}}',
                           'draft')"""
            )
        }

        return getCourse(courseId)
    }

    fun getCourse(id: String): CourseResponse {
        return transaction {
            exec("SELECT * FROM courses WHERE id = '$id'") {
                if (it.next()) mapToCourseResponse(it) else throw NotFoundException("Course", id)
            }
        }
    }

    fun updateCourse(id: String, userId: String, request: CourseCreateRequest): CourseResponse {
        val course = transaction {
            exec("SELECT creator_id FROM courses WHERE id = '$id'") {
                if (it.next()) it.getString("creator_id") else throw NotFoundException("Course", id)
            }
        }
        if (course != userId) throw ForbiddenException("You do not own this course")

        val updates = mutableListOf<String>()
        updates.add("title = '${request.title.replace("'", "''")}'")
        updates.add("description = '${request.description.replace("'", "''")}'")
        if (request.shortDescription != null) updates.add("short_description = '${request.shortDescription.replace("'", "''")}'")
        updates.add("category = '${request.category}'")
        updates.add("level = '${request.level}'")
        updates.add("language = '${request.language}'")
        updates.add("price = ${request.price}")
        updates.add("is_certificate_available = ${request.isCertificateAvailable}")
        if (request.passingScore != null) updates.add("passing_score = ${request.passingScore}")
        if (request.thumbnailUrl != null) updates.add("thumbnail_url = '${request.thumbnailUrl}'")
        val tags = request.prerequisites ?: emptyList()
        updates.add("prerequisites = '{${tags.joinToString(",") { "\"$it\"" }}}'")
        val objectives = request.learningObjectives ?: emptyList()
        updates.add("learning_objectives = '{${objectives.joinToString(",") { "\"$it\"" }}}'")

        transaction {
            exec("UPDATE courses SET ${updates.joinToString(", ")}, updated_at = NOW() WHERE id = '$id'")
        }
        return getCourse(id)
    }

    fun deleteCourse(id: String, userId: String) {
        val course = transaction {
            exec("SELECT creator_id FROM courses WHERE id = '$id'") {
                if (it.next()) it.getString("creator_id") else throw NotFoundException("Course", id)
            }
        }
        if (course != userId) throw ForbiddenException("You do not own this course")
        transaction { exec("DELETE FROM courses WHERE id = '$id'") }
    }

    fun listCourses(
        pagination: PaginationRequest,
        category: String? = null,
        level: String? = null,
        status: String? = null
    ): Pair<List<CourseResponse>, PaginationMeta> {
        val offset = (pagination.page - 1) * pagination.limit
        val sort = pagination.sort ?: "created_at"
        val order = pagination.order.name

        val filters = mutableListOf<String>()
        if (category != null) filters.add("category = '$category'")
        if (level != null) filters.add("level = '$level'")
        if (status != null) filters.add("status = '$status'")
        else filters.add("status = 'published'")
        val whereClause = "WHERE ${filters.joinToString(" AND ")}"

        return transaction {
            val total = exec("SELECT COUNT(*) FROM courses $whereClause") {
                if (it.next()) it.getLong(1) else 0L
            }

            val courses = exec(
                """SELECT * FROM courses $whereClause
                   ORDER BY $sort $order LIMIT ${pagination.limit} OFFSET $offset"""
            ) {
                val list = mutableListOf<CourseResponse>()
                while (it.next()) list.add(mapToCourseResponse(it))
                list
            }

            val totalPages = ((total + pagination.limit - 1) / pagination.limit).toInt()
            courses to PaginationMeta(
                page = pagination.page, limit = pagination.limit, total = total,
                totalPages = totalPages, hasNext = pagination.page < totalPages,
                hasPrevious = pagination.page > 1
            )
        }
    }

    fun addLesson(courseId: String, request: LessonCreateRequest): LessonResponse {
        val lessonId = "lesson_${java.util.UUID.randomUUID().toString().take(24)}"
        val title = request.title.replace("'", "''")
        val content = request.content?.replace("'", "''")

        transaction {
            exec(
                """INSERT INTO lessons (id, course_id, title, content, content_type, video_url,
                   video_duration_seconds, order_index, is_free_preview, duration_minutes)
                   VALUES ('$lessonId', '$courseId', '$title',
                           ${if (content != null) "'$content'" else "NULL"},
                           '${request.contentType}',
                           ${if (request.videoUrl != null) "'${request.videoUrl}'" else "NULL"},
                           ${request.videoDurationSeconds ?: "NULL"},
                           ${request.orderIndex}, ${request.isFreePreview},
                           ${request.durationMinutes ?: "NULL"})"""
            )
            exec("UPDATE courses SET lesson_count = (SELECT COUNT(*) FROM lessons WHERE course_id = '$courseId') WHERE id = '$courseId'")
        }

        return getLesson(lessonId)
    }

    private fun getLesson(lessonId: String): LessonResponse {
        return transaction {
            exec("SELECT * FROM lessons WHERE id = '$lessonId'") {
                if (it.next()) mapToLessonResponse(it) else throw NotFoundException("Lesson", lessonId)
            }
        }
    }

    fun getLessons(courseId: String): List<LessonResponse> {
        return transaction {
            exec(
                "SELECT * FROM lessons WHERE course_id = '$courseId' ORDER BY order_index ASC"
            ) {
                val list = mutableListOf<LessonResponse>()
                while (it.next()) list.add(mapToLessonResponse(it))
                list
            }
        }
    }

    fun addQuiz(lessonId: String, courseId: String, request: QuizCreateRequest): QuizResponse {
        val quizId = "quiz_${java.util.UUID.randomUUID().toString().take(24)}"
        val question = request.question.replace("'", "''")
        val correctAnswer = request.correctAnswer.replace("'", "''")
        val explanation = request.explanation?.replace("'", "''")
        val options = request.options ?: emptyList()

        transaction {
            exec(
                """INSERT INTO quizzes (id, lesson_id, question, type, options, correct_answer, explanation, points, order_index)
                   VALUES ('$quizId', '$lessonId', '$question', '${request.type}',
                           '{${options.joinToString(",") { "\"$it\"" }}}',
                           '$correctAnswer',
                           ${if (explanation != null) "'$explanation'" else "NULL"},
                           ${request.points}, ${request.orderIndex ?: "NULL"})"""
            )
            exec("UPDATE courses SET quiz_count = (SELECT COUNT(*) FROM quizzes q JOIN lessons l ON l.id = q.lesson_id WHERE l.course_id = '$courseId') WHERE id = '$courseId'")
        }

        return getQuiz(quizId)
    }

    private fun getQuiz(quizId: String): QuizResponse {
        return transaction {
            exec("SELECT * FROM quizzes WHERE id = '$quizId'") {
                if (it.next()) mapToQuizResponse(it) else throw NotFoundException("Quiz", quizId)
            }
        }
    }

    fun getQuizzes(lessonId: String): List<QuizResponse> {
        return transaction {
            exec(
                "SELECT * FROM quizzes WHERE lesson_id = '$lessonId' ORDER BY order_index ASC"
            ) {
                val list = mutableListOf<QuizResponse>()
                while (it.next()) list.add(mapToQuizResponse(it))
                list
            }
        }
    }

    fun submitQuiz(userId: String, lessonId: String, courseId: String, request: QuizSubmitRequest): QuizResultResponse {
        val quizzes = transaction {
            exec("SELECT * FROM quizzes WHERE lesson_id = '$lessonId' ORDER BY order_index ASC") {
                val list = mutableListOf<QuizResponse>()
                while (it.next()) list.add(mapToQuizResponse(it))
                list
            }
        }

        val quizMap = quizzes.associateBy { it.id }
        var score = 0
        val total = quizzes.sumOf { it.points }
        val results = mutableListOf<QuizAnswerResult>()

        for (answer in request.answers) {
            val quiz = quizMap[answer.quizId]
            if (quiz != null) {
                val isCorrect = quiz.options?.let { opts ->
                    val correctIdx = quiz.correctAnswer.toIntOrNull()
                    if (correctIdx != null && correctIdx >= 0 && correctIdx < opts.size) {
                        opts[correctIdx] == answer.answer
                    } else {
                        quiz.correctAnswer == answer.answer
                    }
                } ?: (quiz.correctAnswer == answer.answer)

                if (isCorrect) score += quiz.points
                results.add(
                    QuizAnswerResult(
                        quizId = quiz.id,
                        question = quiz.question,
                        correctAnswer = quiz.correctAnswer,
                        yourAnswer = answer.answer,
                        isCorrect = isCorrect,
                        points = if (isCorrect) quiz.points else 0,
                        explanation = null
                    )
                )
            }
        }

        val percentage = if (total > 0) (score.toDouble() / total) * 100.0 else 0.0
        val course = transaction {
            exec("SELECT passing_score FROM courses WHERE id = '$courseId'") {
                if (it.next()) it.getObject("passing_score") as? Int else null
            }
        }
        val passed = course?.let { percentage >= it } ?: (percentage >= 60.0)

        transaction {
            exec(
                """INSERT INTO lesson_progress (id, user_id, lesson_id, course_id, is_completed, quiz_score, time_spent_seconds, completed_at)
                   VALUES ('lp_${java.util.UUID.randomUUID().toString().take(24)}', '$userId', '$lessonId', '$courseId',
                           $passed, $percentage, 0, NOW())
                   ON CONFLICT (user_id, lesson_id)
                   DO UPDATE SET is_completed = $passed, quiz_score = $percentage, completed_at = NOW()"""
            )
        }

        transaction {
            exec(
                """UPDATE enrollments SET
                   completed_lessons = (SELECT COUNT(*) FROM lesson_progress WHERE user_id = '$userId' AND course_id = '$courseId' AND is_completed = TRUE),
                   total_lessons = (SELECT COUNT(*) FROM lessons WHERE course_id = '$courseId'),
                   progress = CASE WHEN (SELECT COUNT(*) FROM lessons WHERE course_id = '$courseId') > 0
                       THEN (SELECT COUNT(*) FROM lesson_progress WHERE user_id = '$userId' AND course_id = '$courseId' AND is_completed = TRUE)::float /
                            (SELECT COUNT(*) FROM lessons WHERE course_id = '$courseId')::float * 100.0
                       ELSE 0 END,
                   is_completed = ((SELECT COUNT(*) FROM lesson_progress WHERE user_id = '$userId' AND course_id = '$courseId' AND is_completed = TRUE) =
                                   (SELECT COUNT(*) FROM lessons WHERE course_id = '$courseId')),
                   completed_at = CASE WHEN ((SELECT COUNT(*) FROM lesson_progress WHERE user_id = '$userId' AND course_id = '$courseId' AND is_completed = TRUE) =
                                              (SELECT COUNT(*) FROM lessons WHERE course_id = '$courseId'))
                                       THEN NOW() ELSE NULL END
                   WHERE user_id = '$userId' AND course_id = '$courseId'"""
            )
        }

        return QuizResultResponse(
            score = score,
            total = total,
            percentage = percentage,
            passed = passed,
            answers = results
        )
    }

    fun enrollUser(userId: String, courseId: String): EnrollmentResponse {
        val enrollmentId = "enr_${java.util.UUID.randomUUID().toString().take(24)}"

        transaction {
            exec(
                """INSERT INTO enrollments (id, user_id, course_id, total_lessons)
                   VALUES ('$enrollmentId', '$userId', '$courseId',
                           (SELECT COUNT(*) FROM lessons WHERE course_id = '$courseId'))
                   ON CONFLICT (user_id, course_id) DO NOTHING"""
            )
            exec("UPDATE courses SET enrollment_count = (SELECT COUNT(*) FROM enrollments WHERE course_id = '$courseId') WHERE id = '$courseId'")
        }

        return getEnrollment(enrollmentId)
    }

    private fun getEnrollment(enrollmentId: String): EnrollmentResponse {
        return transaction {
            exec("SELECT * FROM enrollments WHERE id = '$enrollmentId'") {
                if (it.next()) mapToEnrollmentResponse(it) else throw NotFoundException("Enrollment", enrollmentId)
            }
        }
    }

    fun getEnrollments(userId: String, pagination: PaginationRequest): Pair<List<EnrollmentResponse>, PaginationMeta> {
        val offset = (pagination.page - 1) * pagination.limit
        val sort = pagination.sort ?: "enrolled_at"
        val order = pagination.order.name

        return transaction {
            val total = exec("SELECT COUNT(*) FROM enrollments WHERE user_id = '$userId'") {
                if (it.next()) it.getLong(1) else 0L
            }

            val enrollments = exec(
                """SELECT e.*, c.title as course_title, c.thumbnail_url
                   FROM enrollments e
                   LEFT JOIN courses c ON c.id = e.course_id
                   WHERE e.user_id = '$userId'
                   ORDER BY e.$sort $order LIMIT ${pagination.limit} OFFSET $offset"""
            ) {
                val list = mutableListOf<EnrollmentResponse>()
                while (it.next()) list.add(mapToEnrollmentResponse(it))
                list
            }

            val totalPages = ((total + pagination.limit - 1) / pagination.limit).toInt()
            enrollments to PaginationMeta(
                page = pagination.page, limit = pagination.limit, total = total,
                totalPages = totalPages, hasNext = pagination.page < totalPages,
                hasPrevious = pagination.page > 1
            )
        }
    }

    fun getProgress(userId: String, courseId: String): List<ProgressResponse> {
        return transaction {
            exec(
                """SELECT lp.* FROM lesson_progress lp
                   JOIN lessons l ON l.id = lp.lesson_id
                   WHERE lp.user_id = '$userId' AND lp.course_id = '$courseId'
                   ORDER BY l.order_index ASC"""
            ) {
                val list = mutableListOf<ProgressResponse>()
                while (it.next()) {
                    list.add(
                        ProgressResponse(
                            lessonId = it.getString("lesson_id"),
                            isCompleted = it.getBoolean("is_completed"),
                            quizScore = it.getObject("quiz_score") as? Double,
                            timeSpentSeconds = it.getInt("time_spent_seconds"),
                            completedAt = it.getTimestamp("completed_at")?.toString()
                        )
                    )
                }
                list
            }
        }
    }

    fun createBookmark(userId: String, request: BookmarkCreateRequest): BookmarkResponse {
        val bookmarkId = "bmk_${java.util.UUID.randomUUID().toString().take(24)}"
        val label = request.label?.replace("'", "''")
        val tags = request.tags ?: emptyList()

        transaction {
            exec(
                """INSERT INTO bookmarks (id, user_id, resource_type, resource_id, label, tags)
                   VALUES ('$bookmarkId', '$userId', '${request.resourceType}', '${request.resourceId}',
                           ${if (label != null) "'$label'" else "NULL"},
                           '{${tags.joinToString(",") { "\"$it\"" }}}')"""
            )
        }

        return getBookmark(bookmarkId)
    }

    private fun getBookmark(bookmarkId: String): BookmarkResponse {
        return transaction {
            exec("SELECT * FROM bookmarks WHERE id = '$bookmarkId'") {
                if (it.next()) mapToBookmarkResponse(it) else throw NotFoundException("Bookmark", bookmarkId)
            }
        }
    }

    fun getBookmarks(userId: String): List<BookmarkResponse> {
        return transaction {
            exec(
                "SELECT * FROM bookmarks WHERE user_id = '$userId' ORDER BY created_at DESC"
            ) {
                val list = mutableListOf<BookmarkResponse>()
                while (it.next()) list.add(mapToBookmarkResponse(it))
                list
            }
        }
    }

    fun deleteBookmark(id: String, userId: String) {
        transaction { exec("DELETE FROM bookmarks WHERE id = '$id' AND user_id = '$userId'") }
    }

    fun createFlashcard(userId: String, request: FlashcardCreateRequest): FlashcardResponse {
        val flashcardId = "fc_${java.util.UUID.randomUUID().toString().take(24)}"
        val front = request.front.replace("'", "''")
        val back = request.back.replace("'", "''")
        val hints = request.hints ?: emptyList()
        val tags = request.tags ?: emptyList()

        transaction {
            exec(
                """INSERT INTO flashcards (id, user_id, deck_name, front, back, hints, tags)
                   VALUES ('$flashcardId', '$userId', '${request.deckName.replace("'", "''")}',
                           '$front', '$back',
                           '{${hints.joinToString(",") { "\"$it\"" }}}',
                           '{${tags.joinToString(",") { "\"$it\"" }}}')"""
            )
        }

        return getFlashcard(flashcardId)
    }

    private fun getFlashcard(flashcardId: String): FlashcardResponse {
        return transaction {
            exec("SELECT * FROM flashcards WHERE id = '$flashcardId'") {
                if (it.next()) mapToFlashcardResponse(it) else throw NotFoundException("Flashcard", flashcardId)
            }
        }
    }

    fun getFlashcards(userId: String, deckName: String? = null): List<FlashcardResponse> {
        val deckFilter = if (deckName != null) "AND deck_name = '${deckName.replace("'", "''")}'" else ""
        return transaction {
            exec(
                "SELECT * FROM flashcards WHERE user_id = '$userId' $deckFilter ORDER BY created_at DESC"
            ) {
                val list = mutableListOf<FlashcardResponse>()
                while (it.next()) list.add(mapToFlashcardResponse(it))
                list
            }
        }
    }

    fun updateFlashcard(id: String, userId: String, request: FlashcardUpdateRequest): FlashcardResponse {
        val updates = mutableListOf<String>()
        request.deckName?.let { updates.add("deck_name = '${it.replace("'", "''")}'") }
        request.front?.let { updates.add("front = '${it.replace("'", "''")}'") }
        request.back?.let { updates.add("back = '${it.replace("'", "''")}'") }
        request.hints?.let { updates.add("hints = '{${it.joinToString(",") { "\"$it\"" }}}'") }
        request.tags?.let { updates.add("tags = '{${it.joinToString(",") { "\"$it\"" }}}'") }
        request.difficulty?.let { updates.add("difficulty = '$it'") }
        updates.add("review_count = review_count + 1")
        updates.add("last_reviewed_at = NOW()")

        if (updates.isNotEmpty()) {
            transaction {
                exec("UPDATE flashcards SET ${updates.joinToString(", ")}, updated_at = NOW() WHERE id = '$id' AND user_id = '$userId'")
            }
        }
        return getFlashcard(id)
    }

    private fun mapToCourseResponse(rs: java.sql.ResultSet): CourseResponse {
        return CourseResponse(
            id = rs.getString("id"),
            creatorId = rs.getString("creator_id"),
            title = rs.getString("title"),
            description = rs.getString("description"),
            shortDescription = rs.getString("short_description"),
            category = rs.getString("category"),
            level = rs.getString("level"),
            language = rs.getString("language"),
            thumbnailUrl = rs.getString("thumbnail_url"),
            price = rs.getDouble("price"),
            durationHours = rs.getObject("duration_hours") as? Double,
            lessonCount = rs.getInt("lesson_count"),
            quizCount = rs.getInt("quiz_count"),
            status = rs.getString("status"),
            ratingAvg = rs.getDouble("rating_avg"),
            ratingCount = rs.getInt("rating_count"),
            enrollmentCount = rs.getInt("enrollment_count"),
            tags = parseArray(rs.getString("tags")),
            createdAt = rs.getTimestamp("created_at").toString(),
            updatedAt = rs.getTimestamp("updated_at").toString()
        )
    }

    private fun mapToLessonResponse(rs: java.sql.ResultSet): LessonResponse {
        return LessonResponse(
            id = rs.getString("id"),
            courseId = rs.getString("course_id"),
            title = rs.getString("title"),
            content = rs.getString("content"),
            contentType = rs.getString("content_type"),
            videoUrl = rs.getString("video_url"),
            orderIndex = rs.getInt("order_index"),
            isFreePreview = rs.getBoolean("is_free_preview"),
            durationMinutes = rs.getObject("duration_minutes") as? Int,
            createdAt = rs.getTimestamp("created_at").toString()
        )
    }

    private fun mapToQuizResponse(rs: java.sql.ResultSet): QuizResponse {
        return QuizResponse(
            id = rs.getString("id"),
            lessonId = rs.getString("lesson_id"),
            question = rs.getString("question"),
            type = rs.getString("type"),
            options = parseArray(rs.getString("options")),
            points = rs.getInt("points"),
            orderIndex = rs.getObject("order_index") as? Int,
            createdAt = rs.getTimestamp("created_at").toString()
        )
    }

    private fun mapToEnrollmentResponse(rs: java.sql.ResultSet): EnrollmentResponse {
        return EnrollmentResponse(
            id = rs.getString("id"),
            userId = rs.getString("user_id"),
            courseId = rs.getString("course_id"),
            progress = rs.getDouble("progress"),
            completedLessons = rs.getInt("completed_lessons"),
            totalLessons = rs.getInt("total_lessons"),
            isCompleted = rs.getBoolean("is_completed"),
            completedAt = rs.getTimestamp("completed_at")?.toString(),
            enrolledAt = rs.getTimestamp("enrolled_at").toString()
        )
    }

    private fun mapToBookmarkResponse(rs: java.sql.ResultSet): BookmarkResponse {
        return BookmarkResponse(
            id = rs.getString("id"),
            resourceType = rs.getString("resource_type"),
            resourceId = rs.getString("resource_id"),
            label = rs.getString("label"),
            tags = parseArray(rs.getString("tags")),
            createdAt = rs.getTimestamp("created_at").toString()
        )
    }

    private fun mapToFlashcardResponse(rs: java.sql.ResultSet): FlashcardResponse {
        return FlashcardResponse(
            id = rs.getString("id"),
            userId = rs.getString("user_id"),
            deckName = rs.getString("deck_name"),
            front = rs.getString("front"),
            back = rs.getString("back"),
            hints = parseArray(rs.getString("hints")),
            tags = parseArray(rs.getString("tags")),
            difficulty = rs.getString("difficulty"),
            reviewCount = rs.getInt("review_count"),
            lastReviewedAt = rs.getTimestamp("last_reviewed_at")?.toString(),
            createdAt = rs.getTimestamp("created_at").toString()
        )
    }

    private fun parseArray(arrStr: String?): List<String> {
        if (arrStr == null) return emptyList()
        return try {
            arrStr.removeSurrounding("{", "}").split(",").map { it.trim().removeSurrounding("\"") }.filter { it.isNotBlank() }
        } catch (e: Exception) { emptyList() }
    }
}
