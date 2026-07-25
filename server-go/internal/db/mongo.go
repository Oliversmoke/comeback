package db

import (
	"context"
	"log"
	"time"

	"comeback.ai/server-go/internal/config"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var Client *mongo.Client
var Database *mongo.Database

func Connect() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.Client().
		ApplyURI(config.App.MongoURI).
		SetMaxPoolSize(10).
		SetServerSelectionTimeout(5 * time.Second)

	client, err := mongo.Connect(ctx, opts)
	if err != nil {
		return err
	}

	if err := client.Ping(ctx, nil); err != nil {
		return err
	}

	Client = client
	Database = client.Database(dbName(config.App.MongoURI))
	log.Printf("MongoDB connected: %s", config.App.MongoURI)
	return nil
}

func dbName(uri string) string {
	db := "comeback"
	for i := len(uri) - 1; i >= 0; i-- {
		if uri[i] == '/' {
			suffix := uri[i+1:]
			if q := indexByte(suffix, '?'); q >= 0 {
				suffix = suffix[:q]
			}
			if suffix != "" {
				db = suffix
			}
			break
		}
	}
	return db
}

func indexByte(s string, b byte) int {
	for i := 0; i < len(s); i++ {
		if s[i] == b {
			return i
		}
	}
	return -1
}

func Disconnect() {
	if Client != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = Client.Disconnect(ctx)
	}
}

func Collection(name string) *mongo.Collection {
	return Database.Collection(name)
}
