package handlers

import (
	"context"
	"net/http"
	"strconv"
	"strings"
	"time"

	"comeback.ai/server-go/internal/db"
	"comeback.ai/server-go/internal/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// ContextLike is an alias so handler helpers accept the standard context.
type ContextLike = context.Context

func parseDate(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t, nil
	}
	return time.Parse("2006-01-02", s)
}

func startOfDay(t time.Time) time.Time {
	y, m, d := t.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, t.Location())
}

func endOfDay(t time.Time) time.Time {
	y, m, d := t.Date()
	return time.Date(y, m, d, 23, 59, 59, int(time.Second-time.Nanosecond), t.Location())
}

func mongoOptsAfter() *options.FindOneAndUpdateOptions {
	return options.FindOneAndUpdate().SetReturnDocument(options.After)
}

func queryInt(r *http.Request, key string, def int) int {
	v := r.URL.Query().Get(key)
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return def
	}
	return n
}

func queryString(r *http.Request, key string) string {
	return r.URL.Query().Get(key)
}

// initializeAchievements seeds a baseline set of achievements for a new user.
func initializeAchievements(ctx context.Context, userID primitive.ObjectID) {
	base := []models.Achievement{
		{User: userID, AchievementID: "first_task", Title: "First Step", Description: "Complete your first task", Icon: "check", Category: "volume", Tier: "bronze", Progress: models.AchievementProgress{Target: 1}},
		{User: userID, AchievementID: "streak_7", Title: "Week Warrior", Description: "Maintain a 7-day streak", Icon: "flame", Category: "streak", Tier: "silver", Progress: models.AchievementProgress{Target: 7}},
		{User: userID, AchievementID: "tasks_50", Title: "Getting Things Done", Description: "Complete 50 tasks", Icon: "list", Category: "volume", Tier: "gold", Progress: models.AchievementProgress{Target: 50}},
		{User: userID, AchievementID: "goal_complete", Title: "Goal Getter", Description: "Complete your first goal", Icon: "target", Category: "milestone", Tier: "silver", Progress: models.AchievementProgress{Target: 1}},
	}
	docs := make([]interface{}, 0, len(base))
	for _, a := range base {
		docs = append(docs, a)
	}
	_, _ = db.Collection("achievements").InsertMany(ctx, docs)
}

// checkAchievements is a lightweight hook; progress is derived on read.
func checkAchievements(ctx context.Context, userID primitive.ObjectID) {
	_ = userID
}

var _ = mongo.ErrNoDocuments
var _ = http.StatusOK
