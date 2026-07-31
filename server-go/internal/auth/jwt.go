package auth

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"comeback.ai/server-go/internal/config"
)

type ctxKey string

const userIDKey ctxKey = "userID"

type Claims struct {
	ID   string `json:"id"`
	Type string `json:"type"`
	jwt.RegisteredClaims
}

func GenerateAccessToken(userID primitive.ObjectID) (string, error) {
	return generateToken(userID, "access", time.Duration(config.App.JWTAccessExp)*time.Second)
}

func GenerateRefreshToken(userID primitive.ObjectID) (string, error) {
	return generateToken(userID, "refresh", time.Duration(config.App.JWTRefreshExp)*time.Second)
}

func generateToken(userID primitive.ObjectID, tokenType string, ttl time.Duration) (string, error) {
	now := time.Now()
	claims := Claims{
		ID:   userID.Hex(),
		Type: tokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
			Subject:   userID.Hex(),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.App.JWTSecret))
}

func ParseToken(tokenStr string) (*Claims, error) {
	claims := &Claims{}
	_, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
		return []byte(config.App.JWTSecret), nil
	})
	if err != nil {
		return nil, err
	}
	return claims, nil
}

// Middleware authenticates requests via the Bearer token.
func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			writeUnauthorized(w)
			return
		}
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		claims, err := ParseToken(tokenStr)
		if err != nil || claims.Type != "access" {
			writeUnauthorized(w)
			return
		}
		id, err := primitive.ObjectIDFromHex(claims.ID)
		if err != nil {
			writeUnauthorized(w)
			return
		}
		ctx := context.WithValue(r.Context(), userIDKey, id)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func GetUserID(r *http.Request) primitive.ObjectID {
	if v, ok := r.Context().Value(userIDKey).(primitive.ObjectID); ok {
		return v
	}
	return primitive.NilObjectID
}

func writeUnauthorized(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	_, _ = w.Write([]byte(`{"success":false,"message":"Authentication required"}`))
}
