package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"comeback.ai/server-go/internal/config"
	"comeback.ai/server-go/internal/db"
	"comeback.ai/server-go/internal/routes"
	"comeback.ai/server-go/internal/services/ai"
	"comeback.ai/server-go/internal/socket"
)

func main() {
	config.Load()

	if err := db.Connect(); err != nil {
		log.Printf("Warning: MongoDB connection failed: %v", err)
		log.Println("Continuing without database — some features will be unavailable.")
	}

	ai.Initialize()

	hub := socket.NewHub()
	router := routes.Register(hub)

	port := config.App.Port
	if port == "" {
		port = "5000"
	}

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	go func() {
		log.Println("\n🚀 comeback.AI API Server (Go)")
		log.Printf("📡 Port: %s", port)
		log.Printf("🌍 Environment: %s", config.App.Env)
		log.Printf("🔗 URL: http://localhost:%s", port)
		log.Println("💬 WebSocket: ws://localhost:" + port + "/ws")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	log.Println("\nShutting down gracefully...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("Forced shutdown: %v", err)
	}
	db.Disconnect()
	log.Println("Server stopped.")
}
