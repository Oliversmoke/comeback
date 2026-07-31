package handlers

import (
	"net/http"

	"comeback.ai/server-go/internal/auth"
	"comeback.ai/server-go/internal/db"
	"comeback.ai/server-go/internal/middleware"
	"comeback.ai/server-go/internal/models"
	"comeback.ai/server-go/internal/services"

	"go.mongodb.org/mongo-driver/bson"
)

func AchievementsList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	cur, err := db.Collection("achievements").Find(ctx, bson.M{"user": auth.GetUserID(r)})
	if err != nil {
		middleware.Error(w, http.StatusInternalServerError, "Failed to load achievements")
		return
	}
	var ach []models.Achievement
	_ = cur.All(ctx, &ach)
	middleware.Success(w, ach)
}

func AchievementsStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := auth.GetUserID(r)
	var user models.User
	_ = db.Collection("users").FindOne(ctx, bson.M{"_id": uid}).Decode(&user)
	total, _ := db.Collection("achievements").CountDocuments(ctx, bson.M{"user": uid})
	unlocked, _ := db.Collection("achievements").CountDocuments(ctx, bson.M{"user": uid, "unlockedAt": bson.M{"$exists": true, "$ne": nil}})
	middleware.Success(w, map[string]interface{}{
		"total":      total,
		"unlocked":   unlocked,
		"locked":     total - unlocked,
		"completion": percent(int(unlocked), int(total)),
	})
}

func AchievementsInitialize(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	initializeAchievements(ctx, auth.GetUserID(r))
	middleware.Success(w, map[string]string{"message": "Achievements initialized"})
}

func AchievementsCheck(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := auth.GetUserID(r)
	var user models.User
	_ = db.Collection("users").FindOne(ctx, bson.M{"_id": uid}).Decode(&user)
	var tasks []models.Task
	cur, _ := db.Collection("tasks").Find(ctx, bson.M{"user": uid, "status": "completed"})
	_ = cur.All(ctx, &tasks)
	completed := len(tasks)

	var ach []models.Achievement
	cur2, _ := db.Collection("achievements").Find(ctx, bson.M{"user": uid})
	_ = cur2.All(ctx, &ach)

	newlyUnlocked := []models.Achievement{}
	for i := range ach {
		switch ach[i].AchievementID {
		case "first_task":
			ach[i].Progress.Current = minInt(completed, 1)
		case "tasks_50":
			ach[i].Progress.Current = minInt(completed, 50)
		case "streak_7":
			ach[i].Progress.Current = minInt(user.Streak, 7)
		case "goal_complete":
			c, _ := db.Collection("goals").CountDocuments(ctx, bson.M{"user": uid, "status": "completed"})
			ach[i].Progress.Current = int(c)
		}
		if ach[i].Progress.Current >= ach[i].Progress.Target && ach[i].UnlockedAt.IsZero() {
			ach[i].UnlockedAt = timeNow()
			newlyUnlocked = append(newlyUnlocked, ach[i])
			if ach[i].XpReward > 0 {
				_, _ = services.AwardXp(ctx, uid, ach[i].XpReward, "achievement")
			}
		}
		_, _ = db.Collection("achievements").UpdateOne(ctx, bson.M{"_id": ach[i].ID}, bson.M{
			"$set": bson.M{"progress.current": ach[i].Progress.Current, "unlockedAt": ach[i].UnlockedAt},
		})
	}
	middleware.Success(w, map[string]interface{}{"newlyUnlocked": newlyUnlocked, "count": len(newlyUnlocked)})
}

func percent(a, b int) int {
	if b == 0 {
		return 0
	}
	return int(float64(a) / float64(b) * 100)
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}
