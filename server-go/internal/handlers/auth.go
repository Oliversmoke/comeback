package handlers

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"regexp"
	"strings"
	"time"

	"comeback.ai/server-go/internal/auth"
	"comeback.ai/server-go/internal/db"
	"comeback.ai/server-go/internal/middleware"
	"comeback.ai/server-go/internal/models"
	"comeback.ai/server-go/internal/services"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func decodeBody(r *http.Request, v interface{}) error {
	return json.NewDecoder(r.Body).Decode(v)
}

func findUserByID(ctx context.Context, id primitive.ObjectID) (*models.User, error) {
	var u models.User
	err := db.Collection("users").FindOne(ctx, bson.M{"_id": id}).Decode(&u)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// Register ---------------------------------------------------------------
func Register(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email       string `json:"email"`
		Username    string `json:"username"`
		Password    string `json:"password"`
		DisplayName string `json:"displayName"`
	}
	if err := decodeBody(r, &body); err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	body.Email = strings.ToLower(strings.TrimSpace(body.Email))
	body.Username = strings.TrimSpace(body.Username)

	if body.Email == "" || body.Username == "" || body.Password == "" {
		middleware.Error(w, http.StatusBadRequest, "Email, username and password are required")
		return
	}
	if len(body.Password) < 8 {
		middleware.Error(w, http.StatusBadRequest, "Password must be at least 8 characters")
		return
	}
	if !regexp.MustCompile(`^[a-z0-9_]{3,30}$`).MatchString(body.Username) {
		middleware.Error(w, http.StatusBadRequest, "Username must be 3-30 chars (letters, numbers, underscore)")
		return
	}

	ctx := r.Context()
	existing := db.Collection("users").FindOne(ctx, bson.M{"$or": []bson.M{{"email": body.Email}, {"username": body.Username}}})
	if existing.Err() == nil {
		var u models.User
		_ = existing.Decode(&u)
		if u.Email == body.Email {
			middleware.Error(w, http.StatusConflict, "Email already registered")
		} else {
			middleware.Error(w, http.StatusConflict, "Username taken")
		}
		return
	}

	hash, err := auth.HashPassword(body.Password)
	if err != nil {
		middleware.Error(w, http.StatusInternalServerError, "Failed to create user")
		return
	}

	user := models.User{
		Email:       body.Email,
		Username:    body.Username,
		Password:    hash,
		DisplayName: orDefault(body.DisplayName, body.Username),
		Provider:    "local",
		Avatar:      "https://ui-avatars.com/api/?background=6366f1&color=fff&name=" + body.Username,
		CreatedAt:   timeNow(),
		UpdatedAt:   timeNow(),
	}
	res, err := db.Collection("users").InsertOne(ctx, user)
	if err != nil {
		middleware.Error(w, http.StatusInternalServerError, "Failed to create user")
		return
	}
	user.ID = res.InsertedID.(primitive.ObjectID)

	access, _ := auth.GenerateAccessToken(user.ID)
	refresh, _ := auth.GenerateRefreshToken(user.ID)
	user.RefreshToken = refresh
	_, _ = db.Collection("users").UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{"$set": bson.M{"refreshToken": refresh}})

	services.RecordActivity(user.ID, "login", "User registered")
	initializeAchievements(ctx, user.ID)

	middleware.SuccessWithStatus(w, http.StatusCreated, map[string]interface{}{
		"user":        user.ToPublic(),
		"accessToken": access,
		"refreshToken": refresh,
	})
}

// Login ------------------------------------------------------------------
func Login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := decodeBody(r, &body); err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	ctx := r.Context()
	var user models.User
	err := db.Collection("users").FindOne(ctx, bson.M{"email": strings.ToLower(body.Email)}).Decode(&user)
	if err != nil {
		middleware.Error(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}
	if user.Provider != "local" {
		middleware.Error(w, http.StatusUnauthorized, "Use Google login")
		return
	}
	if !auth.CheckPassword(user.Password, body.Password) {
		middleware.Error(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	access, _ := auth.GenerateAccessToken(user.ID)
	refresh, _ := auth.GenerateRefreshToken(user.ID)
	_, _ = db.Collection("users").UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{
		"$set": bson.M{"refreshToken": refresh, "isOnline": true, "lastSeen": time.Now()},
	})

	services.RecordActivity(user.ID, "login", "User logged in")

	middleware.Success(w, map[string]interface{}{
		"user":         user.ToPublic(),
		"accessToken":  access,
		"refreshToken": refresh,
	})
}

// Google -----------------------------------------------------------------
func Google(w http.ResponseWriter, r *http.Request) {
	var body struct {
		IdToken string `json:"idToken"`
	}
	if err := decodeBody(r, &body); err != nil || body.IdToken == "" {
		middleware.Error(w, http.StatusBadRequest, "Google ID token required")
		return
	}
	payload, err := decodeGoogleToken(body.IdToken)
	if err != nil || payload == nil || payload.Email == "" {
		middleware.Error(w, http.StatusUnauthorized, "Invalid Google token")
		return
	}

	ctx := r.Context()
	var user models.User
	err = db.Collection("users").FindOne(ctx, bson.M{"$or": []bson.M{
		{"providerId": payload.Sub},
		{"email": payload.Email},
	}}).Decode(&user)

	if err == mongo.ErrNoDocuments {
		user = models.User{
			Email:       strings.ToLower(payload.Email),
			Username:    slugUsername(payload.GivenName, payload.Sub),
			DisplayName: payload.Name,
			Avatar:      payload.Picture,
			Provider:    "google",
			ProviderID:  payload.Sub,
		}
		res, insErr := db.Collection("users").InsertOne(ctx, user)
		if insErr != nil {
			middleware.Error(w, http.StatusInternalServerError, "Failed to create user")
			return
		}
		user.ID = res.InsertedID.(primitive.ObjectID)
	} else if err != nil {
		middleware.Error(w, http.StatusInternalServerError, "Database error")
		return
	} else if user.Provider == "local" {
		_, _ = db.Collection("users").UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{"$set": bson.M{"provider": "google", "providerId": payload.Sub}})
	}

	access, _ := auth.GenerateAccessToken(user.ID)
	refresh, _ := auth.GenerateRefreshToken(user.ID)
	_, _ = db.Collection("users").UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{"$set": bson.M{"refreshToken": refresh}})

	middleware.Success(w, map[string]interface{}{
		"user":         user.ToPublic(),
		"accessToken":  access,
		"refreshToken": refresh,
	})
}

// Refresh ----------------------------------------------------------------
func Refresh(w http.ResponseWriter, r *http.Request) {
	var body struct {
		RefreshToken string `json:"refreshToken"`
	}
	if err := decodeBody(r, &body); err != nil || body.RefreshToken == "" {
		middleware.Error(w, http.StatusBadRequest, "Refresh token required")
		return
	}
	claims, err := auth.ParseToken(body.RefreshToken)
	if err != nil || claims.Type != "refresh" {
		middleware.Error(w, http.StatusUnauthorized, "Invalid refresh token")
		return
	}
	id, err := primitive.ObjectIDFromHex(claims.ID)
	if err != nil {
		middleware.Error(w, http.StatusUnauthorized, "Invalid refresh token")
		return
	}
	ctx := r.Context()
	var user models.User
	if err := db.Collection("users").FindOne(ctx, bson.M{"_id": id}).Decode(&user); err != nil || user.RefreshToken != body.RefreshToken {
		middleware.Error(w, http.StatusUnauthorized, "Invalid refresh token")
		return
	}

	access, _ := auth.GenerateAccessToken(user.ID)
	refresh, _ := auth.GenerateRefreshToken(user.ID)
	_, _ = db.Collection("users").UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{"$set": bson.M{"refreshToken": refresh}})

	middleware.Success(w, map[string]interface{}{"accessToken": access, "refreshToken": refresh})
}

// Logout -----------------------------------------------------------------
func Logout(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := auth.GetUserID(r)
	_, _ = db.Collection("users").UpdateOne(ctx, bson.M{"_id": id}, bson.M{
		"$set": bson.M{"refreshToken": "", "isOnline": false, "lastSeen": time.Now()},
	})
	middleware.Success(w, map[string]string{"message": "Logged out"})
}

// Me ---------------------------------------------------------------------
func Me(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := auth.GetUserID(r)
	var user models.User
	err := db.Collection("users").FindOne(ctx, bson.M{"_id": id}).Decode(&user)
	if err != nil {
		middleware.Error(w, http.StatusNotFound, "User not found")
		return
	}
	middleware.Success(w, user.ToPublic())
}

// UpdateProfile ----------------------------------------------------------
func UpdateProfile(w http.ResponseWriter, r *http.Request) {
	var body struct {
		DisplayName string `json:"displayName"`
		Bio         string `json:"bio"`
		Avatar      string `json:"avatar"`
	}
	if err := decodeBody(r, &body); err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	updates := bson.M{}
	if body.DisplayName != "" {
		updates["displayName"] = body.DisplayName
	}
	if body.Bio != "" {
		updates["bio"] = body.Bio
	}
	if body.Avatar != "" {
		updates["avatar"] = body.Avatar
	}
	ctx := r.Context()
	res := db.Collection("users").FindOneAndUpdate(ctx, bson.M{"_id": auth.GetUserID(r)}, bson.M{"$set": updates}, mongoOptsAfter())
	var user models.User
	if err := res.Decode(&user); err != nil {
		middleware.Error(w, http.StatusNotFound, "User not found")
		return
	}
	middleware.Success(w, user.ToPublic())
}

// ForgotPassword ---------------------------------------------------------
func ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email"`
	}
	_ = decodeBody(r, &body)
	if body.Email == "" {
		middleware.Error(w, http.StatusBadRequest, "Email is required")
		return
	}
	ctx := r.Context()
	var user models.User
	err := db.Collection("users").FindOne(ctx, bson.M{"email": strings.ToLower(body.Email), "provider": "local"}).Decode(&user)
	if err != nil {
		middleware.Success(w, map[string]string{"message": "If that email exists, a reset link has been sent."})
		return
	}
	token := randomToken()
	hash := sha256.Sum256([]byte(token))
	_, _ = db.Collection("users").UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{
		"$set": bson.M{
			"resetPasswordToken":  hex.EncodeToString(hash[:]),
			"resetPasswordExpires": time.Now().Add(time.Hour),
		},
	})
	services.RecordActivity(user.ID, "login", "Password reset requested")
	middleware.Success(w, map[string]string{"message": "If that email exists, a reset link has been sent."})
}

// ResetPassword ----------------------------------------------------------
func ResetPassword(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}
	if err := decodeBody(r, &body); err != nil || body.Token == "" || body.Password == "" {
		middleware.Error(w, http.StatusBadRequest, "Token and password are required")
		return
	}
	if len(body.Password) < 8 {
		middleware.Error(w, http.StatusBadRequest, "Password must be at least 8 characters")
		return
	}
	hash := sha256.Sum256([]byte(body.Token))
	ctx := r.Context()
	var user models.User
	err := db.Collection("users").FindOne(ctx, bson.M{
		"resetPasswordToken":  hex.EncodeToString(hash[:]),
		"resetPasswordExpires": bson.M{"$gt": time.Now()},
		"provider":            "local",
	}).Decode(&user)
	if err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid or expired reset token")
		return
	}
	hp, _ := auth.HashPassword(body.Password)
	_, _ = db.Collection("users").UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{
		"$set": bson.M{"password": hp, "refreshToken": "", "resetPasswordToken": "", "resetPasswordExpires": time.Time{}},
	})
	services.RecordActivity(user.ID, "login", "Password reset completed")
	middleware.Success(w, map[string]string{"message": "Password has been reset. You can now log in."})
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func orDefault(v, def string) string {
	if v == "" {
		return def
	}
	return v
}

func randomToken() string {
	b := make([]byte, 32)
	_, _ = rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

type googlePayload struct {
	Sub        string `json:"sub"`
	Email      string `json:"email"`
	Name       string `json:"name"`
	GivenName  string `json:"given_name"`
	Picture    string `json:"picture"`
}

// decodeGoogleToken parses the JWT payload without signature verification
// (matching the Node dev fallback). Production should verify with Google.
func decodeGoogleToken(idToken string) (*googlePayload, error) {
	parts := strings.Split(idToken, ".")
	if len(parts) < 2 {
		return nil, errInvalidToken
	}
	payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, err
	}
	var p googlePayload
	if err := json.Unmarshal(payloadBytes, &p); err != nil {
		return nil, err
	}
	return &p, nil
}

var errInvalidToken = &googleErr{}

type googleErr struct{}

func (e *googleErr) Error() string { return "invalid token" }

func slugUsername(given, sub string) string {
	base := regexp.MustCompile(`[^a-z0-9_]`).ReplaceAllString(strings.ToLower(given), "")
	if base == "" {
		base = "user"
	}
	return base + "_" + sub[len(sub)-6:]
}
