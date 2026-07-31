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

func getOrCreateBranding(ctx ContextLike) models.AppBranding {
	var b models.AppBranding
	err := db.Collection("appbrandings").FindOne(ctx, bson.M{"key": "branding"}).Decode(&b)
	if err != nil {
		b = models.AppBranding{Key: "branding"}
		res, ins := db.Collection("appbrandings").InsertOne(ctx, b)
		if ins == nil {
			b.ID = res.InsertedID.(primitive.ObjectID)
		}
	}
	return b
}

func BrandingGet(w http.ResponseWriter, r *http.Request) {
	middleware.Success(w, getOrCreateBranding(r.Context()))
}

func BrandingLogo(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	url, err := saveUpload(r, "image")
	if err != nil {
		middleware.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	b := getOrCreateBranding(ctx)
	b.LogoURL = url
	b.UpdatedBy = auth.GetUserID(r)
	_, _ = db.Collection("appbrandings").UpdateOne(ctx, bson.M{"key": "branding"},
		bson.M{"$set": bson.M{"logo_url": url, "updatedBy": b.UpdatedBy}}, options.Update().SetUpsert(true))
	middleware.Success(w, map[string]interface{}{"url": url})
}

func BrandingBackground(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	url, err := saveUpload(r, "image")
	if err != nil {
		middleware.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	b := getOrCreateBranding(ctx)
	b.BackgroundURL = url
	b.UpdatedBy = auth.GetUserID(r)
	_, _ = db.Collection("appbrandings").UpdateOne(ctx, bson.M{"key": "branding"},
		bson.M{"$set": bson.M{"background_url": url, "updatedBy": b.UpdatedBy}}, options.Update().SetUpsert(true))
	middleware.Success(w, map[string]interface{}{"url": url})
}

func BrandingLogoDelete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	_, _ = db.Collection("appbrandings").UpdateOne(ctx, bson.M{"key": "branding"},
		bson.M{"$set": bson.M{"logo_url": ""}})
	middleware.Success(w, map[string]string{"message": "Logo reset to default"})
}

func BrandingBackgroundDelete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	_, _ = db.Collection("appbrandings").UpdateOne(ctx, bson.M{"key": "branding"},
		bson.M{"$set": bson.M{"background_url": ""}})
	middleware.Success(w, map[string]string{"message": "Background reset to default"})
}

func UploadAvatar(w http.ResponseWriter, r *http.Request) {
	url, err := saveUpload(r, "image")
	if err != nil {
		middleware.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	ctx := r.Context()
	_, _ = db.Collection("users").UpdateOne(ctx, bson.M{"_id": auth.GetUserID(r)}, bson.M{"$set": bson.M{"avatar": url}})
	middleware.Success(w, map[string]interface{}{"url": url})
}

func UploadProof(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "taskId"))
	if err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid task id")
		return
	}
	url, err := saveUpload(r, "image")
	if err != nil {
		middleware.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	ctx := r.Context()
	_, _ = db.Collection("tasks").UpdateOne(ctx, bson.M{"_id": id, "user": auth.GetUserID(r)},
		bson.M{"$set": bson.M{"proof": models.Proof{Image: url, SubmittedAt: timeNow()}}})
	middleware.Success(w, map[string]interface{}{"url": url})
}

func UploadAttachment(w http.ResponseWriter, r *http.Request) {
	url, err := saveUpload(r, "image")
	if err != nil {
		middleware.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	ctx := r.Context()
	cid, _ := primitive.ObjectIDFromHex(chi.URLParam(r, "conversationId"))
	msg := models.Message{Group: cid, Sender: auth.GetUserID(r), Content: "", MessageType: "image", Attachments: []models.Attachment{{URL: url, Type: "image"}}}
	res, insErr := db.Collection("messages").InsertOne(ctx, msg)
	if insErr == nil {
		msg.ID = res.InsertedID.(primitive.ObjectID)
	}
	middleware.Success(w, map[string]interface{}{"url": url, "messageId": msg.ID.Hex()})
}

func UploadGroupCover(w http.ResponseWriter, r *http.Request) {
	gid, err := primitive.ObjectIDFromHex(chi.URLParam(r, "groupId"))
	if err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid group id")
		return
	}
	url, err := saveUpload(r, "image")
	if err != nil {
		middleware.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	ctx := r.Context()
	res := db.Collection("groups").FindOneAndUpdate(ctx,
		bson.M{"_id": gid, "members.user": auth.GetUserID(r)},
		bson.M{"$set": bson.M{"coverImage": url}}, mongoOptsAfter())
	var g models.Group
	if err := res.Decode(&g); err != nil {
		middleware.Error(w, http.StatusNotFound, "Group not found or access denied")
		return
	}
	middleware.Success(w, map[string]interface{}{"url": url})
}
