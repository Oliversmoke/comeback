package handlers

import (
	"net/http"

	"comeback.ai/server-go/internal/auth"
	"comeback.ai/server-go/internal/config"
	"comeback.ai/server-go/internal/db"
	"comeback.ai/server-go/internal/middleware"
	"comeback.ai/server-go/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func isOwner(ctx ContextLike, uid primitive.ObjectID) bool {
	var user models.User
	if err := db.Collection("users").FindOne(ctx, bson.M{"_id": uid}).Decode(&user); err != nil {
		return false
	}
	return user.Email == config.App.OwnerEmail
}

func AnalyticsDashboard(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := auth.GetUserID(r)
	var user models.User
	_ = db.Collection("users").FindOne(ctx, bson.M{"_id": uid}).Decode(&user)

	totalTasks, _ := db.Collection("tasks").CountDocuments(ctx, bson.M{"user": uid})
	completedTasks, _ := db.Collection("tasks").CountDocuments(ctx, bson.M{"user": uid, "status": "completed"})
	activeGoals, _ := db.Collection("goals").CountDocuments(ctx, bson.M{"user": uid, "status": "active"})

	rate := 0
	if totalTasks > 0 {
		rate = percent(int(completedTasks), int(totalTasks))
	}

	middleware.Success(w, map[string]interface{}{
		"xp":             user.Xp,
		"level":          user.Level,
		"streak":         user.Streak,
		"totalTasks":     totalTasks,
		"completedTasks": completedTasks,
		"activeGoals":    activeGoals,
		"completionRate": rate,
	})
}

func AnalyticsWeekly(w http.ResponseWriter, r *http.Request) {
	middleware.Success(w, reportForRange(r, 7))
}

func AnalyticsMonthly(w http.ResponseWriter, r *http.Request) {
	middleware.Success(w, reportForRange(r, 30))
}

func reportForRange(r *http.Request, days int) map[string]interface{} {
	ctx := r.Context()
	uid := auth.GetUserID(r)
	since := timeNow().AddDate(0, 0, -days)
	completed, _ := db.Collection("tasks").CountDocuments(ctx, bson.M{"user": uid, "status": "completed", "completedAt": bson.M{"$gte": since}})
	created, _ := db.Collection("tasks").CountDocuments(ctx, bson.M{"user": uid, "createdAt": bson.M{"$gte": since}})
	return map[string]interface{}{
		"period":          days,
		"completed":       completed,
		"created":         created,
		"avgPerDay":       float64(completed) / float64(days),
	}
}

func AnalyticsGenerateInsights(w http.ResponseWriter, r *http.Request) {
	middleware.Success(w, map[string]interface{}{"insights": []interface{}{}, "note": "Insights generated on demand via /api/ai/insights"})
}

func AnalyticsSystem(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	if !isOwner(ctx, auth.GetUserID(r)) {
		middleware.Error(w, http.StatusForbidden, "Owner access required")
		return
	}
	users, _ := db.Collection("users").CountDocuments(ctx, bson.M{})
	groups, _ := db.Collection("groups").CountDocuments(ctx, bson.M{})
	tasks, _ := db.Collection("tasks").CountDocuments(ctx, bson.M{})
	middleware.Success(w, map[string]interface{}{"users": users, "groups": groups, "tasks": tasks})
}
