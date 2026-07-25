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
	"go.mongodb.org/mongo-driver/mongo/options"
)

func ConversationsList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	cur, err := db.Collection("conversations").Find(ctx, bson.M{"participants": auth.GetUserID(r)},
		options.Find().SetSort(bson.D{{Key: "lastActivityAt", Value: -1}}))
	if err != nil {
		middleware.Error(w, http.StatusInternalServerError, "Failed to load conversations")
		return
	}
	var convs []models.Conversation
	_ = cur.All(ctx, &convs)
	out := make([]map[string]interface{}, 0, len(convs))
	for _, c := range convs {
		parts := make([]models.PublicUser, 0)
		for _, p := range c.Participants {
			var u models.User
			if err := db.Collection("users").FindOne(ctx, bson.M{"_id": p}).Decode(&u); err == nil {
				pu := u.ToPublicUser()
				parts = append(parts, pu)
			}
		}
		out = append(out, map[string]interface{}{
			"_id": c.ID, "participants": parts, "lastMessage": c.LastMessage, "lastActivityAt": c.LastActivityAt,
		})
	}
	middleware.Success(w, out)
}

func ConversationGet(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid conversation id")
		return
	}
	var c models.Conversation
	if err := db.Collection("conversations").FindOne(ctx, bson.M{"_id": id, "participants": auth.GetUserID(r)}).Decode(&c); err != nil {
		middleware.Error(w, http.StatusNotFound, "Conversation not found")
		return
	}
	middleware.Success(w, c)
}

func ConversationCreate(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ParticipantID string `json:"participantId"`
	}
	if err := decodeBody(r, &body); err != nil || body.ParticipantID == "" {
		middleware.Error(w, http.StatusBadRequest, "participantId is required")
		return
	}
	ctx := r.Context()
	uid := auth.GetUserID(r)
	pid, err := primitive.ObjectIDFromHex(body.ParticipantID)
	if err != nil || pid == uid {
		middleware.Error(w, http.StatusBadRequest, "Invalid participant")
		return
	}
	var other models.User
	if err := db.Collection("users").FindOne(ctx, bson.M{"_id": pid}).Decode(&other); err != nil {
		middleware.Error(w, http.StatusNotFound, "User not found")
		return
	}
	var existing models.Conversation
	err = db.Collection("conversations").FindOne(ctx, bson.M{"participants": bson.M{"$all": []primitive.ObjectID{uid, pid}, "$size": 2}}).Decode(&existing)
	if err == nil {
		middleware.Success(w, existing)
		return
	}
	conv := models.Conversation{Participants: []primitive.ObjectID{uid, pid}, LastActivityAt: timeNow(), CreatedAt: timeNow(), UpdatedAt: timeNow()}
	res, err := db.Collection("conversations").InsertOne(ctx, conv)
	if err != nil {
		middleware.Error(w, http.StatusInternalServerError, "Failed to create conversation")
		return
	}
	conv.ID = res.InsertedID.(primitive.ObjectID)
	middleware.SuccessWithStatus(w, http.StatusCreated, conv)
}

func ConversationMessages(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid conversation id")
		return
	}
	var c models.Conversation
	if err := db.Collection("conversations").FindOne(ctx, bson.M{"_id": id, "participants": auth.GetUserID(r)}).Decode(&c); err != nil {
		middleware.Error(w, http.StatusNotFound, "Conversation not found")
		return
	}
	page := queryInt(r, "page", 1)
	limit := queryInt(r, "limit", 50)
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).
		SetSkip(int64((page - 1) * limit)).SetLimit(int64(limit))
	cur, err := db.Collection("messages").Find(ctx, bson.M{"group": id, "isDeleted": false}, opts)
	if err != nil {
		middleware.Error(w, http.StatusInternalServerError, "Failed to load messages")
		return
	}
	var messages []models.Message
	_ = cur.All(ctx, &messages)
	out := make([]models.MessageOut, 0, len(messages))
	for _, m := range messages {
		out = append(out, populateMessageOut(ctx, m))
	}
	for i, j := 0, len(out)-1; i < j; i, j = i+1, j-1 {
		out[i], out[j] = out[j], out[i]
	}
	middleware.Success(w, out)
}
