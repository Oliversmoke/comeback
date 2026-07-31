package handlers

import (
	"net/http"

	"comeback.ai/server-go/internal/auth"
	"comeback.ai/server-go/internal/db"
	"comeback.ai/server-go/internal/middleware"
	"comeback.ai/server-go/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func LeaderboardUsers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	page := queryInt(r, "page", 1)
	limit := queryInt(r, "limit", 50)
	opts := options.Find().SetSort(bson.D{{Key: "xp", Value: -1}}).
		SetSkip(int64((page - 1) * limit)).SetLimit(int64(limit)).
		SetProjection(bson.M{"password": 0, "refreshToken": 0, "email": 0})
	cur, err := db.Collection("users").Find(ctx, bson.M{}, opts)
	if err != nil {
		middleware.Error(w, http.StatusInternalServerError, "Failed to load leaderboard")
		return
	}
	var users []models.User
	_ = cur.All(ctx, &users)
	out := make([]map[string]interface{}, 0, len(users))
	for i, u := range users {
		out = append(out, map[string]interface{}{
			"rank": i + 1, "id": u.ID.Hex(), "username": u.Username, "displayName": u.DisplayName,
			"avatar": u.Avatar, "xp": u.Xp, "level": u.Level, "streak": u.Streak,
		})
	}
	middleware.Success(w, out)
}

func LeaderboardGroups(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	page := queryInt(r, "page", 1)
	limit := queryInt(r, "limit", 50)
	opts := options.Find().SetSort(bson.D{{Key: "totalXp", Value: -1}}).
		SetSkip(int64((page - 1) * limit)).SetLimit(int64(limit)).
		SetProjection(bson.M{"members": 0})
	cur, err := db.Collection("groups").Find(ctx, bson.M{}, opts)
	if err != nil {
		middleware.Error(w, http.StatusInternalServerError, "Failed to load leaderboard")
		return
	}
	var groups []models.Group
	_ = cur.All(ctx, &groups)
	out := make([]map[string]interface{}, 0, len(groups))
	for i, g := range groups {
		out = append(out, map[string]interface{}{
			"rank": i + 1, "id": g.ID.Hex(), "name": g.Name, "coverImage": g.CoverImage,
			"memberCount": len(g.Members), "totalXp": g.TotalXp, "streak": g.Streak, "category": g.Category,
		})
	}
	middleware.Success(w, out)
}

func LeaderboardUserRank(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := auth.GetUserID(r)
	var me models.User
	if err := db.Collection("users").FindOne(ctx, bson.M{"_id": uid}).Decode(&me); err != nil {
		middleware.Error(w, http.StatusNotFound, "User not found")
		return
	}
	rank, _ := db.Collection("users").CountDocuments(ctx, bson.M{"xp": bson.M{"$gt": me.Xp}})
	total, _ := db.Collection("users").CountDocuments(ctx, bson.M{})
	middleware.Success(w, map[string]interface{}{
		"rank":     rank + 1,
		"total":    total,
		"xp":       me.Xp,
		"level":    me.Level,
		"streak":   me.Streak,
		"username": me.Username,
	})
}

var _ = primitive.NilObjectID
