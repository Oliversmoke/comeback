package routes

import (
	"net/http"

	"comeback.ai/server-go/internal/auth"
	"comeback.ai/server-go/internal/config"
	"comeback.ai/server-go/internal/handlers"
	"comeback.ai/server-go/internal/middleware"
	"comeback.ai/server-go/internal/socket"

	"github.com/go-chi/chi/v5"
)

func Register(hub *socket.Hub) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.CORS)

	// Health check
	r.Get("/health", func(w http.ResponseWriter, req *http.Request) {
		middleware.JSON(w, http.StatusOK, true, map[string]interface{}{
			"status":      "healthy",
			"uptime":      0,
			"timestamp":   "",
			"environment": config.App.Env,
		}, "")
	})

	// Static uploads
	fileServer := http.FileServer(http.Dir(config.App.UploadDir))
	r.Handle("/uploads/*", http.StripPrefix("/uploads/", fileServer))

	// WebSocket realtime chat
	r.Get("/ws", func(w http.ResponseWriter, req *http.Request) {
		socket.ServeWS(hub, w, req)
	})

	// Global API rate limit
	r.Route("/api", func(r chi.Router) {
		r.Use(middleware.RateLimit(15*60*1000, 100)) // 100 req / 15min per IP

		// Auth (tighter limit); protected routes wrapped with auth middleware
		r.Route("/auth", func(r chi.Router) {
			r.Use(middleware.AuthRateLimit())
			r.Post("/register", handlers.Register)
			r.Post("/login", handlers.Login)
			r.Post("/google", handlers.Google)
			r.Post("/refresh", handlers.Refresh)
			r.Post("/forgot-password", handlers.ForgotPassword)
			r.Post("/reset-password", handlers.ResetPassword)

			r.With(auth.Middleware).Post("/logout", handlers.Logout)
			r.With(auth.Middleware).Get("/me", handlers.Me)
			r.With(auth.Middleware).Put("/profile", handlers.UpdateProfile)
		})

		// Authenticated resources
		r.Route("/goals", func(r chi.Router) {
			r.Use(auth.Middleware)
			r.Get("/", handlers.GoalsList)
			r.Post("/", handlers.GoalCreate)
			r.Get("/{id}", handlers.GoalGet)
			r.Put("/{id}", handlers.GoalUpdate)
			r.Delete("/{id}", handlers.GoalDelete)
			r.Post("/{id}/milestones", handlers.GoalAddMilestone)
			r.Put("/{id}/milestones/{milestoneId}", handlers.GoalToggleMilestone)
		})

		r.Route("/tasks", func(r chi.Router) {
			r.Use(auth.Middleware)
			r.Get("/", handlers.TasksList)
			r.Get("/today", handlers.TasksToday)
			r.Post("/", handlers.TaskCreate)
			r.Get("/{id}", handlers.TaskGet)
			r.Put("/{id}", handlers.TaskUpdate)
			r.Delete("/{id}", handlers.TaskDelete)
			r.Post("/{id}/complete", handlers.TaskComplete)
			r.Post("/{id}/submit-proof", handlers.TaskSubmitProof)
		})

		r.Route("/groups", func(r chi.Router) {
			r.Use(auth.Middleware)
			r.Get("/", handlers.GroupsList)
			r.Get("/my", handlers.GroupsMy)
			r.Get("/{id}", handlers.GroupGet)
			r.Post("/", handlers.GroupCreate)
			r.Put("/{id}", handlers.GroupUpdate)
			r.Post("/join/{inviteCode}", handlers.GroupJoin)
			r.Post("/{id}/leave", handlers.GroupLeave)
			r.Put("/{id}/members/{userId}/role", handlers.GroupMemberRole)
			r.Get("/{id}/messages", handlers.GroupMessages)
		})

		r.Route("/leaderboard", func(r chi.Router) {
			r.Use(auth.Middleware)
			r.Get("/users", handlers.LeaderboardUsers)
			r.Get("/groups", handlers.LeaderboardGroups)
			r.Get("/user-rank", handlers.LeaderboardUserRank)
		})

		r.Route("/ai", func(r chi.Router) {
			r.Use(auth.Middleware)
			r.Post("/generate-tasks", handlers.AIGenerateTasks)
			r.Post("/insights", handlers.AIInsights)
			r.Post("/chat", handlers.AIChat)
			r.Post("/group-adapt", handlers.AIGroupAdapt)
			r.Post("/recovery-plan", handlers.AIRecoveryPlan)
			r.Get("/reflection-prompt", handlers.AIReflectionPrompt)
			r.Get("/challenge", handlers.AIChallenge)
			r.Post("/track-win", handlers.AITrackWin)
			r.Post("/encouragement", handlers.AIEncouragement)
		})

		r.Route("/conversations", func(r chi.Router) {
			r.Use(auth.Middleware)
			r.Get("/", handlers.ConversationsList)
			r.Post("/", handlers.ConversationCreate)
			r.Get("/{id}", handlers.ConversationGet)
			r.Get("/{id}/messages", handlers.ConversationMessages)
		})

		r.Route("/memory", func(r chi.Router) {
			r.Use(auth.Middleware)
			r.Get("/", handlers.MemoryGet)
			r.Put("/", handlers.MemoryUpdate)
			r.Get("/timeline", handlers.MemoryTimeline)
			r.Get("/trends", handlers.MemoryTrends)
			r.Get("/insights", handlers.MemoryInsights)
			r.Put("/insights/{id}/read", handlers.MemoryInsightRead)
			r.Put("/insights/{id}/dismiss", handlers.MemoryInsightDismiss)
			r.Get("/insights/unread-count", handlers.MemoryInsightsUnreadCount)
			r.Get("/activity/summary", handlers.MemoryActivitySummary)
		})

		r.Route("/analytics", func(r chi.Router) {
			r.Use(auth.Middleware)
			r.Get("/dashboard", handlers.AnalyticsDashboard)
			r.Get("/weekly", handlers.AnalyticsWeekly)
			r.Get("/monthly", handlers.AnalyticsMonthly)
			r.Post("/generate-insights", handlers.AnalyticsGenerateInsights)
			r.Get("/system", handlers.RequireOwnerWrapper(handlers.AnalyticsSystem))
		})

		r.Route("/achievements", func(r chi.Router) {
			r.Use(auth.Middleware)
			r.Get("/", handlers.AchievementsList)
			r.Get("/stats", handlers.AchievementsStats)
			r.Post("/initialize", handlers.AchievementsInitialize)
			r.Post("/check", handlers.AchievementsCheck)
		})

		r.Route("/psychology", func(r chi.Router) {
			r.Use(auth.Middleware)
			r.Get("/principles", handlers.PsychologyPrinciples)
			r.Get("/principle/{name}", handlers.PsychologyPrinciple)
			r.Post("/intention", handlers.PsychologyIntention)
			r.Get("/burnout-check", handlers.PsychologyBurnoutCheck)
			r.Get("/growth-mindset", handlers.PsychologyGrowthMindset)
			r.Get("/consistency-plan", handlers.PsychologyConsistencyPlan)
			r.Post("/reframe", handlers.PsychologyReframe)
			r.Get("/encouragement", handlers.PsychologyEncouragement)
			r.Get("/reflection-prompt", handlers.PsychologyReflectionPrompt)
			r.Get("/recovery-strategy", handlers.PsychologyRecoveryStrategy)
			r.Post("/recovery-plan", handlers.PsychologyRecoveryPlan)
			r.Get("/challenge", handlers.PsychologyChallenge)
			r.Get("/analysis", handlers.PsychologyAnalysis)
			r.Post("/learning-cycle", handlers.PsychologyLearningCycle)
			r.Post("/adaptive-insights", handlers.PsychologyAdaptiveInsights)
		})

		// Branding: GET public, mutations authenticated
		r.Get("/branding", handlers.BrandingGet)
		r.Route("/branding", func(r chi.Router) {
			r.Use(auth.Middleware)
			r.Post("/logo", handlers.BrandingLogo)
			r.Post("/background", handlers.BrandingBackground)
			r.Delete("/logo", handlers.BrandingLogoDelete)
			r.Delete("/background", handlers.BrandingBackgroundDelete)
		})

		// Uploads
		r.Route("/upload", func(r chi.Router) {
			r.Use(auth.Middleware)
			r.Post("/avatar", handlers.UploadAvatar)
			r.Post("/proof/{taskId}", handlers.UploadProof)
			r.Post("/attachment/{conversationId}", handlers.UploadAttachment)
			r.Post("/group-cover/{groupId}", handlers.UploadGroupCover)
		})

		// Backup (owner only)
		r.Route("/backup", func(r chi.Router) {
			r.Use(auth.Middleware)
			r.Get("/status", handlers.RequireOwnerWrapper(handlers.BackupStatus))
			r.Post("/run", handlers.RequireOwnerWrapper(handlers.BackupRun))
			r.Post("/logs", handlers.RequireOwnerWrapper(handlers.BackupLogsSend))
			r.Get("/logs", handlers.RequireOwnerWrapper(handlers.BackupLogs))
			r.Post("/notify", handlers.RequireOwnerWrapper(handlers.BackupNotify))
			r.Get("/users", handlers.RequireOwnerWrapper(handlers.BackupUsers))
		})
	})

	// 404
	r.NotFound(func(w http.ResponseWriter, req *http.Request) {
		middleware.Error(w, http.StatusNotFound, "Route not found")
	})

	return r
}
