package handlers

import (
	"crypto/rand"
	"encoding/hex"
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

func populateMessageOut(ctx ContextLike, msg models.Message) models.MessageOut {
	out := msg.ToOut()
	if msg.Sender != primitive.NilObjectID {
		var u models.User
		if err := db.Collection("users").FindOne(ctx, bson.M{"_id": msg.Sender}).Decode(&u); err == nil {
			pu := u.ToPublicUser()
			out.Sender = &pu
		}
	}
	return out
}

func GroupsList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	filter := bson.M{}
	if c := queryString(r, "category"); c != "" {
		filter["category"] = c
	}
	page := queryInt(r, "page", 1)
	limit := queryInt(r, "limit", 20)
	opts := options.Find().SetSort(bson.D{{Key: "totalXp", Value: -1}}).
		SetSkip(int64((page - 1) * limit)).SetLimit(int64(limit)).
		SetProjection(bson.M{"members": 0})
	cur, err := db.Collection("groups").Find(ctx, filter, opts)
	if err != nil {
		middleware.Error(w, http.StatusInternalServerError, "Failed to load groups")
		return
	}
	var groups []models.Group
	_ = cur.All(ctx, &groups)
	_, _ = db.Collection("groups").CountDocuments(ctx, filter)
	middleware.Success(w, groups)
}

func GroupsMy(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	cur, err := db.Collection("groups").Find(ctx, bson.M{"members.user": auth.GetUserID(r)},
		options.Find().SetProjection(bson.M{"name": 1, "coverImage": 1, "memberCount": 1, "totalXp": 1, "streak": 1, "category": 1}))
	if err != nil {
		middleware.Error(w, http.StatusInternalServerError, "Failed to load groups")
		return
	}
	var groups []models.Group
	_ = cur.All(ctx, &groups)
	middleware.Success(w, groups)
}

func GroupGet(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid group id")
		return
	}
	var group models.Group
	if err := db.Collection("groups").FindOne(ctx, bson.M{"_id": id}).Decode(&group); err != nil {
		middleware.Error(w, http.StatusNotFound, "Group not found")
		return
	}
	out := groupDetail(ctx, group)
	middleware.Success(w, out)
}

func groupDetail(ctx ContextLike, group models.Group) map[string]interface{} {
	members := make([]models.GroupMemberOut, 0, len(group.Members))
	for _, m := range group.Members {
		mo := models.GroupMemberOut{Role: m.Role, JoinedAt: m.JoinedAt, XpInGroup: m.XpInGroup}
		if m.User != primitive.NilObjectID {
			var u models.User
			if err := db.Collection("users").FindOne(ctx, bson.M{"_id": m.User}).Decode(&u); err == nil {
				pu := u.ToPublicUser()
				mo.User = &pu
			}
		}
		members = append(members, mo)
	}
	goals := make([]models.Goal, 0)
	if len(group.Goals) > 0 {
		cur, _ := db.Collection("goals").Find(ctx, bson.M{"_id": bson.M{"$in": group.Goals}},
			options.Find().SetProjection(bson.M{"title": 1, "status": 1, "progress": 1, "priority": 1}))
		_ = cur.All(ctx, &goals)
	}
	return map[string]interface{}{
		"_id": group.ID, "name": group.Name, "description": group.Description,
		"coverImage": group.CoverImage, "category": group.Category, "createdBy": group.CreatedBy,
		"isPrivate": group.IsPrivate, "inviteCode": group.InviteCode, "maxMembers": group.MaxMembers,
		"totalXp": group.TotalXp, "streak": group.Streak, "lastActivityDate": group.LastActivityDate,
		"rules": group.Rules, "tags": group.Tags, "members": members, "goals": goals,
		"createdAt": group.CreatedAt, "updatedAt": group.UpdatedAt,
	}
}

func GroupCreate(w http.ResponseWriter, r *http.Request) {
	var body models.Group
	if err := decodeBody(r, &body); err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if body.Name == "" {
		middleware.Error(w, http.StatusBadRequest, "Group name is required")
		return
	}
	ctx := r.Context()
	body.CreatedBy = auth.GetUserID(r)
	body.Members = []models.GroupMember{{User: body.CreatedBy, Role: "admin", JoinedAt: timeNow(), XpInGroup: 0}}
	body.InviteCode = randomHex(6)
	if body.Category == "" {
		body.Category = "other"
	}
	if body.MaxMembers == 0 {
		body.MaxMembers = 50
	}
	body.CreatedAt = timeNow()
	body.UpdatedAt = timeNow()
	res, err := db.Collection("groups").InsertOne(ctx, body)
	if err != nil {
		middleware.Error(w, http.StatusInternalServerError, "Failed to create group")
		return
	}
	groupID := res.InsertedID.(primitive.ObjectID)
	_, _ = db.Collection("users").UpdateOne(ctx, bson.M{"_id": body.CreatedBy}, bson.M{"$push": bson.M{"groups": groupID}})

	var g models.Group
	_ = db.Collection("groups").FindOne(ctx, bson.M{"_id": groupID}).Decode(&g)
	middleware.SuccessWithStatus(w, http.StatusCreated, g)
}

func GroupUpdate(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid group id")
		return
	}
	var body map[string]interface{}
	if err := decodeBody(r, &body); err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	allowed := []string{"name", "description", "coverImage", "category", "isPrivate", "rules", "tags"}
	updates := bson.M{}
	for _, k := range allowed {
		if v, ok := body[k]; ok {
			updates[k] = v
		}
	}
	res := db.Collection("groups").FindOneAndUpdate(ctx,
		bson.M{"_id": id, "members.user": auth.GetUserID(r), "members.role": "admin"},
		bson.M{"$set": updates}, mongoOptsAfter())
	var g models.Group
	if err := res.Decode(&g); err != nil {
		middleware.Error(w, http.StatusNotFound, "Group not found or not authorized")
		return
	}
	middleware.Success(w, g)
}

func GroupJoin(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	code := chi.URLParam(r, "inviteCode")
	var group models.Group
	if err := db.Collection("groups").FindOne(ctx, bson.M{"inviteCode": code}).Decode(&group); err != nil {
		middleware.Error(w, http.StatusNotFound, "Invalid invite code")
		return
	}
	uid := auth.GetUserID(r)
	for _, m := range group.Members {
		if m.User == uid {
			middleware.Error(w, http.StatusConflict, "Already a member")
			return
		}
	}
	if len(group.Members) >= group.MaxMembers {
		middleware.Error(w, http.StatusBadRequest, "Group is full")
		return
	}
	_, err := db.Collection("groups").UpdateOne(ctx, bson.M{"_id": group.ID},
		bson.M{"$push": bson.M{"members": models.GroupMember{User: uid, Role: "member", JoinedAt: timeNow()}}})
	if err != nil {
		middleware.Error(w, http.StatusInternalServerError, "Failed to join group")
		return
	}
	_, _ = db.Collection("users").UpdateOne(ctx, bson.M{"_id": uid}, bson.M{"$push": bson.M{"groups": group.ID}})
	middleware.Success(w, group)
}

func GroupLeave(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid group id")
		return
	}
	uid := auth.GetUserID(r)
	_, err = db.Collection("groups").UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$pull": bson.M{"members": bson.M{"user": uid}}})
	if err != nil {
		middleware.Error(w, http.StatusInternalServerError, "Failed to leave group")
		return
	}
	_, _ = db.Collection("users").UpdateOne(ctx, bson.M{"_id": uid}, bson.M{"$pull": bson.M{"groups": id}})
	middleware.Success(w, map[string]string{"message": "Left group"})
}

func GroupMemberRole(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid group id")
		return
	}
	uid, err := primitive.ObjectIDFromHex(chi.URLParam(r, "userId"))
	if err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid user id")
		return
	}
	var body struct {
		Role string `json:"role"`
	}
	_ = decodeBody(r, &body)
	if !inSlice(body.Role, []string{"admin", "moderator", "member"}) {
		middleware.Error(w, http.StatusBadRequest, "Invalid role")
		return
	}
	res := db.Collection("groups").FindOneAndUpdate(ctx,
		bson.M{"_id": id, "members.user": uid, "members": bson.M{"$elemMatch": bson.M{"user": auth.GetUserID(r), "role": "admin"}}},
		bson.M{"$set": bson.M{"members.$.role": body.Role}}, mongoOptsAfter())
	var g models.Group
	if err := res.Decode(&g); err != nil {
		middleware.Error(w, http.StatusForbidden, "Not authorized")
		return
	}
	middleware.Success(w, g)
}

func GroupMessages(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid group id")
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
	// Reverse to chronological order (client expects oldest-first).
	for i, j := 0, len(out)-1; i < j; i, j = i+1, j-1 {
		out[i], out[j] = out[j], out[i]
	}
	middleware.Success(w, out)
}

func inSlice(v string, list []string) bool {
	for _, x := range list {
		if x == v {
			return true
		}
	}
	return false
}

func randomHex(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
