package handlers

import (
	"net/http"

	"comeback.ai/server-go/internal/auth"
	"comeback.ai/server-go/internal/db"
	"comeback.ai/server-go/internal/middleware"
	"comeback.ai/server-go/internal/models"

	"github.com/go-chi/chi/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func getOrCreateMemory(ctx ContextLike, uid primitive.ObjectID) models.UserMemory {
	var mem models.UserMemory
	err := db.Collection("usermemory").FindOne(ctx, bson.M{"user": uid}).Decode(&mem)
	if err != nil {
		mem = models.UserMemory{User: uid, ChallengePreference: "moderate"}
		res, ins := db.Collection("usermemory").InsertOne(ctx, mem)
		if ins == nil {
			mem.ID = res.InsertedID.(primitive.ObjectID)
		}
	}
	return mem
}

func MemoryGet(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	mem := getOrCreateMemory(ctx, auth.GetUserID(r))
	middleware.Success(w, mem)
}

func MemoryUpdate(w http.ResponseWriter, r *http.Request) {
	var body struct {
		CoachingStyle struct {
			ChallengePreference string `json:"challengePreference"`
		} `json:"coachingStyle"`
		Preferences struct {
			NotificationTime      string `json:"notificationTime"`
			WeeklyReviewDay       int    `json:"weeklyReviewDay"`
			WantsAccountability   bool   `json:"wantsAccountability"`
			WantsGroupChallenges  bool   `json:"wantsGroupChallenges"`
			ReflectionPromptTime  string `json:"reflectionPromptTime"`
			PreferredGoalCategories []string `json:"preferredGoalCategories"`
		} `json:"preferences"`
	}
	_ = decodeBody(r, &body)
	ctx := r.Context()
	uid := auth.GetUserID(r)
	set := bson.M{}
	if body.CoachingStyle.ChallengePreference != "" {
		set["challengePreference"] = body.CoachingStyle.ChallengePreference
	}
	if body.Preferences.NotificationTime != "" {
		set["preferences.notificationTime"] = body.Preferences.NotificationTime
	}
	if body.Preferences.WeeklyReviewDay != 0 {
		set["preferences.weeklyReviewDay"] = body.Preferences.WeeklyReviewDay
	}
	set["preferences.wantsAccountability"] = body.Preferences.WantsAccountability
	set["preferences.wantsGroupChallenges"] = body.Preferences.WantsGroupChallenges
	if body.Preferences.ReflectionPromptTime != "" {
		set["preferences.reflectionPromptTime"] = body.Preferences.ReflectionPromptTime
	}
	if body.Preferences.PreferredGoalCategories != nil {
		set["preferences.preferredGoalCategories"] = body.Preferences.PreferredGoalCategories
	}
	set["lastModelUpdate"] = timeNow()
	_, _ = db.Collection("usermemory").UpdateOne(ctx, bson.M{"user": uid}, bson.M{"$set": set}, options.Update().SetUpsert(true))
	middleware.Success(w, getOrCreateMemory(ctx, uid))
}

func MemoryTimeline(w http.ResponseWriter, r *http.Request) {
	days := queryInt(r, "days", 7)
	middleware.Success(w, map[string]interface{}{"days": days, "note": "Timeline aggregation available via activity summary."})
}

func MemoryTrends(w http.ResponseWriter, r *http.Request) {
	days := queryInt(r, "days", 30)
	middleware.Success(w, map[string]interface{}{"days": days, "trends": []interface{}{}, "peakHours": []interface{}{}})
}

func MemoryInsights(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	filter := bson.M{"user": auth.GetUserID(r), "isDismissed": false}
	if t := queryString(r, "type"); t != "" {
		filter["type"] = t
	}
	opts := options.Find().SetSort(bson.D{{Key: "relevanceScore", Value: -1}, {Key: "createdAt", Value: -1}}).SetLimit(int64(queryInt(r, "limit", 20)))
	cur, err := db.Collection("userinsights").Find(ctx, filter, opts)
	if err != nil {
		middleware.Error(w, http.StatusInternalServerError, "Failed to load insights")
		return
	}
	var insights []models.UserInsight
	_ = cur.All(ctx, &insights)
	middleware.Success(w, insights)
}

func MemoryInsightRead(w http.ResponseWriter, r *http.Request) {
	updateInsightFlag(w, r, "isRead", true)
}

func MemoryInsightDismiss(w http.ResponseWriter, r *http.Request) {
	updateInsightFlag(w, r, "isDismissed", true)
}

func updateInsightFlag(w http.ResponseWriter, r *http.Request, field string, value bool) {
	ctx := r.Context()
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid insight id")
		return
	}
	res := db.Collection("userinsights").FindOneAndUpdate(ctx,
		bson.M{"_id": id, "user": auth.GetUserID(r)},
		bson.M{"$set": bson.M{field: value}}, mongoOptsAfter())
	var ins models.UserInsight
	if err := res.Decode(&ins); err != nil {
		middleware.Error(w, http.StatusNotFound, "Insight not found")
		return
	}
	middleware.Success(w, ins)
}

func MemoryInsightsUnreadCount(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	count, _ := db.Collection("userinsights").CountDocuments(ctx, bson.M{"user": auth.GetUserID(r), "isRead": false, "isDismissed": false})
	middleware.Success(w, map[string]interface{}{"count": count})
}

func MemoryActivitySummary(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	days := queryInt(r, "days", 7)
	since := timeNow().AddDate(0, 0, -days)
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"user": auth.GetUserID(r), "date": bson.M{"$gte": since}}}},
		{{Key: "$group", Value: bson.M{
			"_id":     "$activityType",
			"count":   bson.M{"$sum": 1},
			"totalXp": bson.M{"$sum": "$impact.xpEarned"},
		}}},
		{{Key: "$sort", Value: bson.D{{Key: "count", Value: -1}}}},
	}
	cur, err := db.Collection("useractivities").Aggregate(ctx, pipeline)
	if err != nil {
		middleware.Error(w, http.StatusInternalServerError, "Failed to aggregate")
		return
	}
	var results []map[string]interface{}
	_ = cur.All(ctx, &results)
	middleware.Success(w, results)
}
