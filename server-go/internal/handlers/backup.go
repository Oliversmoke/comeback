package handlers

import (
	"net/http"

	"comeback.ai/server-go/internal/auth"
	"comeback.ai/server-go/internal/db"
	"comeback.ai/server-go/internal/middleware"
	"comeback.ai/server-go/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func requireOwner(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		if !isOwner(ctx, auth.GetUserID(r)) {
			middleware.Error(w, http.StatusForbidden, "Owner access required")
			return
		}
		next(w, r)
	}
}

// RequireOwnerWrapper adapts requireOwner for route registration.
func RequireOwnerWrapper(next http.HandlerFunc) http.HandlerFunc {
	return requireOwner(next)
}

func BackupStatus(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	users, _ := db.Collection("users").CountDocuments(ctx, bson.M{})
	groups, _ := db.Collection("groups").CountDocuments(ctx, bson.M{})
	tasks, _ := db.Collection("tasks").CountDocuments(ctx, bson.M{})
	uptime := timeNow().Unix()
	middleware.Success(w, map[string]interface{}{
		"users": users, "groups": groups, "tasks": tasks, "uptime": uptime,
		"healthy": true,
	})
}

func BackupRun(w http.ResponseWriter, r *http.Request) {
	// No external email/backup transport configured in this Go port; report result.
	middleware.Success(w, map[string]interface{}{"success": false, "message": "Automated backup transport not configured in Go backend"})
}

func BackupLogsSend(w http.ResponseWriter, r *http.Request) {
	middleware.Success(w, map[string]interface{}{"success": false, "message": "Log transport not configured"})
}

func BackupLogs(w http.ResponseWriter, r *http.Request) {
	limit := queryInt(r, "limit", 100)
	middleware.Success(w, map[string]interface{}{"logs": []string{}, "limit": limit})
}

func BackupNotify(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Subject string `json:"subject"`
		Message string `json:"message"`
	}
	_ = decodeBody(r, &body)
	if body.Subject == "" || body.Message == "" {
		middleware.Error(w, http.StatusBadRequest, "Subject and message required")
		return
	}
	middleware.Success(w, map[string]string{"message": "Notification queued (no transport configured)"})
}

func BackupUsers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).
		SetProjection(bson.M{"password": 0, "refreshToken": 0})
	cur, err := db.Collection("users").Find(ctx, bson.M{}, opts)
	if err != nil {
		middleware.Error(w, http.StatusInternalServerError, "Failed to load users")
		return
	}
	var users []models.User
	_ = cur.All(ctx, &users)
	out := make([]map[string]interface{}, 0, len(users))
	for _, u := range users {
		out = append(out, map[string]interface{}{
			"id": u.ID.Hex(), "email": u.Email, "username": u.Username, "displayName": u.DisplayName,
			"xp": u.Xp, "level": u.Level, "streak": u.Streak, "provider": u.Provider,
			"isOnline": u.IsOnline, "createdAt": u.CreatedAt,
		})
	}
	middleware.Success(w, map[string]interface{}{"data": out, "total": len(out)})
}
