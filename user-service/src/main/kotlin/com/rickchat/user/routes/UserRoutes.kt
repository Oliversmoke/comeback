package com.rickchat.user.routes

import com.rickchat.core.model.*
import com.rickchat.user.model.*
import com.rickchat.user.service.UserService
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.auth.principal
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.put
import io.ktor.server.routing.route
import io.ktor.server.auth.jwt.JWTPrincipal

class UserRoutes {
    private val userService = UserService()

    fun register(route: Route) {
        route("api/v1/users") {
            get {
                val principal = call.principal<JWTPrincipal>()
                val userId = principal?.payload?.subject ?: return@get call.respond(HttpStatusCode.Unauthorized)
                val user = userService.getUser(userId)
                call.respond(success(user))
            }

            get("/{id}") {
                val id = call.parameters["id"] ?: return@get call.respond(HttpStatusCode.BadRequest, error<String>("missing_id", "User ID required"))
                val user = userService.getUser(id)
                call.respond(success(user))
            }

            put("/{id}") {
                val id = call.parameters["id"] ?: return@get call.respond(HttpStatusCode.BadRequest, error<String>("missing_id", "User ID required"))
                val request = call.receive<UpdateUserRequest>()
                val user = userService.updateUser(id, request)
                call.respond(success(user))
            }

            delete("/{id}") {
                val id = call.parameters["id"] ?: return@get call.respond(HttpStatusCode.BadRequest, error<String>("missing_id", "User ID required"))
                userService.deleteUser(id)
                call.respond(success(mapOf("message" to "User deleted")))
            }

            // Profile sub-routes
            route("{id}/profile") {
                get {
                    val id = call.parameters["id"] ?: return@get call.respond(HttpStatusCode.BadRequest)
                    val profile = userService.getUserProfile(id)
                    call.respond(success(profile))
                }

                put {
                    val id = call.parameters["id"] ?: return@get call.respond(HttpStatusCode.BadRequest)
                    val request = call.receive<UpdateProfileRequest>()
                    val profile = userService.updateUserProfile(id, request)
                    call.respond(success(profile))
                }
            }

            // Admin: list all users
            get("/list") {
                val request = PaginationRequest()
                val (users, meta) = userService.listUsers(request)
                call.respond(success(users, meta))
            }
        }
    }
}
