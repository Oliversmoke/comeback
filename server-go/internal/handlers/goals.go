package handlers

import (
	"net/http"
	"time"

	"comeback.ai/server-go/internal/auth"
	"comeback.ai/server-go/internal/db"
	"comeback.ai/server-go/internal/middleware"
	"comeback.ai/server-go/internal/models"
	"comeback.ai/server-go/internal/services"

	"github.com/go-chi/chi/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func GoalsList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	filter := bson.M{"user": auth.GetUserID(r)}
	if s := queryString(r, "status"); s != "" {
		filter["status"] = s
	}
	if c := queryString(r, "category"); c != "" {
		filter["category"] = c
	}
	page := queryInt(r, "page", 1)
	limit := queryInt(r, "limit", 20)
	if limit > 100 {
		limit = 100
	}

	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetSkip(int64((page - 1) * limit)).SetLimit(int64(limit))
	cur, err := db.Collection("goals").Find(ctx, filter, opts)
	if err != nil {
		middleware.Error(w, http.StatusInternalServerError, "Failed to load goals")
		return
	}
	var goals []models.Goal
	_ = cur.All(ctx, &goals)

	_, _ = db.Collection("goals").CountDocuments(ctx, filter)

	middleware.Success(w, goals)
}

func GoalGet(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid goal id")
		return
	}
	var goal models.Goal
	err = db.Collection("goals").FindOne(ctx, bson.M{"_id": id, "user": auth.GetUserID(r)}).Decode(&goal)
	if err != nil {
		middleware.Error(w, http.StatusNotFound, "Goal not found")
		return
	}
	middleware.Success(w, goal)
}

func GoalCreate(w http.ResponseWriter, r *http.Request) {
	var body models.Goal
	if err := decodeBody(r, &body); err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	ctx := r.Context()
	body.User = auth.GetUserID(r)
	body.Status = orDefault(body.Status, "active")
	body.Category = orDefault(body.Category, "other")
	body.CreatedAt = timeNow()
	body.UpdatedAt = timeNow()
	res, err := db.Collection("goals").InsertOne(ctx, body)
	if err != nil {
		middleware.Error(w, http.StatusInternalServerError, "Failed to create goal")
		return
	}
	goalID := res.InsertedID.(primitive.ObjectID)
	_, _ = db.Collection("users").UpdateOne(ctx, bson.M{"_id": body.User}, bson.M{"$push": bson.M{"goals": goalID}})

	var goal models.Goal
	_ = db.Collection("goals").FindOne(ctx, bson.M{"_id": goalID}).Decode(&goal)
	middleware.SuccessWithStatus(w, http.StatusCreated, goal)
}

func GoalUpdate(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid goal id")
		return
	}
	var body map[string]interface{}
	if err := decodeBody(r, &body); err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	allowed := []string{"title", "description", "category", "priority", "status", "targetDate", "tags", "milestones", "progress"}
	updates := bson.M{}
	for _, k := range allowed {
		if v, ok := body[k]; ok {
			updates[k] = v
		}
	}
	if updates["status"] == "completed" {
		updates["completedDate"] = nowTime()
	}

	res := db.Collection("goals").FindOneAndUpdate(ctx, bson.M{"_id": id, "user": auth.GetUserID(r)},
		bson.M{"$set": updates}, mongoOptsAfter())
	var goal models.Goal
	if err := res.Decode(&goal); err != nil {
		middleware.Error(w, http.StatusNotFound, "Goal not found")
		return
	}

	if updates["status"] == "completed" {
		xp := 25
		switch goal.Priority {
		case "critical":
			xp = 100
		case "high":
			xp = 75
		case "medium":
			xp = 50
		}
		_, _ = services.AwardXp(ctx, goal.User, xp, "goal_completed")
	}

	middleware.Success(w, goal)
}

func GoalDelete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid goal id")
		return
	}
	res, err := db.Collection("goals").DeleteOne(ctx, bson.M{"_id": id, "user": auth.GetUserID(r)})
	if err != nil || res.DeletedCount == 0 {
		middleware.Error(w, http.StatusNotFound, "Goal not found")
		return
	}
	_, _ = db.Collection("users").UpdateOne(ctx, bson.M{"_id": auth.GetUserID(r)}, bson.M{"$pull": bson.M{"goals": id}})
	middleware.Success(w, map[string]string{"message": "Goal deleted"})
}

func GoalAddMilestone(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid goal id")
		return
	}
	var body struct {
		Title string `json:"title"`
	}
	_ = decodeBody(r, &body)
	if body.Title == "" {
		middleware.Error(w, http.StatusBadRequest, "Milestone title required")
		return
	}
	res := db.Collection("goals").FindOneAndUpdate(ctx, bson.M{"_id": id, "user": auth.GetUserID(r)},
		bson.M{"$push": bson.M{"milestones": bson.M{"title": body.Title, "isCompleted": false}}}, mongoOptsAfter())
	var goal models.Goal
	if err := res.Decode(&goal); err != nil {
		middleware.Error(w, http.StatusNotFound, "Goal not found")
		return
	}
	middleware.Success(w, goal)
}

func GoalToggleMilestone(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid goal id")
		return
	}
	mid, err := primitive.ObjectIDFromHex(chi.URLParam(r, "milestoneId"))
	if err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid milestone id")
		return
	}

	var goal models.Goal
	if err := db.Collection("goals").FindOne(ctx, bson.M{"_id": id, "user": auth.GetUserID(r)}).Decode(&goal); err != nil {
		middleware.Error(w, http.StatusNotFound, "Goal not found")
		return
	}
	var ms *models.Milestone
	for i := range goal.Milestones {
		if goal.Milestones[i].ID == mid {
			ms = &goal.Milestones[i]
			break
		}
	}
	if ms == nil {
		middleware.Error(w, http.StatusNotFound, "Milestone not found")
		return
	}
	ms.IsCompleted = !ms.IsCompleted
	if ms.IsCompleted {
		ms.CompletedAt = nowTime()
	} else {
		ms.CompletedAt = time.Time{}
	}
	_, err = db.Collection("goals").UpdateOne(ctx, bson.M{"_id": id, "user": auth.GetUserID(r)}, bson.M{"$set": bson.M{"milestones": goal.Milestones}})
	if err != nil {
		middleware.Error(w, http.StatusInternalServerError, "Failed to update milestone")
		return
	}
	if ms.IsCompleted {
		_, _ = services.AwardXp(ctx, goal.User, 15, "milestone")
	}
	middleware.Success(w, goal)
}

func timeNow() time.Time { return time.Now() }

func nowTime() time.Time {
	return time.Now()
}
