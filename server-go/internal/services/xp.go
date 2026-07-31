package services

import (
	"context"
	"time"

	"comeback.ai/server-go/internal/db"
	"comeback.ai/server-go/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func LevelForXp(xp int) int {
	return (xp / 100) + 1
}

// AwardXp increments a user's XP, records a transaction and recomputes level.
func AwardXp(ctx context.Context, userID primitive.ObjectID, amount int, typ string) (map[string]interface{}, error) {
	users := db.Collection("users")
	update := bson.M{"$inc": bson.M{"xp": amount}}
	res := users.FindOneAndUpdate(ctx, bson.M{"_id": userID}, update, options.FindOneAndUpdate().SetReturnDocument(options.After))
	var user models.User
	if err := res.Decode(&user); err != nil {
		return nil, err
	}
	level := LevelForXp(user.Xp)

	_, err := users.UpdateOne(ctx, bson.M{"_id": userID}, bson.M{"$set": bson.M{"level": level}})
	if err != nil {
		return nil, err
	}

	txn := models.XpTransaction{
		User:   userID,
		Amount: amount,
		Type:   typ,
	}
	_, _ = db.Collection("xptransactions").InsertOne(ctx, txn)

	return map[string]interface{}{
		"xp":    user.Xp,
		"level": level,
		"gained": amount,
	}, nil
}

// UpdateStreak updates the user streak based on their last active date.
func UpdateStreak(ctx context.Context, userID primitive.ObjectID) (int, error) {
	users := db.Collection("users")
	var user models.User
	if err := users.FindOne(ctx, bson.M{"_id": userID}).Decode(&user); err != nil {
		return 0, err
	}

	now := time.Now().UTC().Truncate(24 * time.Hour)
	last := user.LastActiveDate
	streak := user.Streak

	if !last.IsZero() {
		lastDay := last.UTC().Truncate(24 * time.Hour)
		diff := int(now.Sub(lastDay).Hours() / 24)
		switch {
		case diff <= 0:
			// same day, no change
		case diff == 1:
			streak++
		default:
			streak = 1
		}
	} else {
		streak = 1
	}

	longest := user.LongestStreak
	if streak > longest {
		longest = streak
	}

	_, err := users.UpdateOne(ctx, bson.M{"_id": userID}, bson.M{
		"$set": bson.M{
			"streak":        streak,
			"longestStreak": longest,
			"lastActiveDate": time.Now(),
		},
	})
	if err != nil {
		return 0, err
	}
	return streak, nil
}

// RecordActivity logs a user activity entry (best-effort).
func RecordActivity(userID primitive.ObjectID, activityType, description string) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	act := models.UserActivity{
		User:        userID,
		Date:        time.Now(),
		ActivityType: activityType,
		Metadata:    models.UserActivityMetadata{Description: description},
	}
	_, _ = db.Collection("useractivities").InsertOne(ctx, act)
}
