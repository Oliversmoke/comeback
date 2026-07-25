package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Env            string
	Port           string
	FrontendURL    string
	MongoURI       string
	JWTSecret      string
	JWTAccessExp   int // seconds
	JWTRefreshExp  int // seconds
	AIProvider     string
	OpenAIAPIKey   string
	OpenAIBaseURL  string
	GeminiAPIKey   string
	AnthropicKey   string
	UploadDir      string
	BackupDir      string
	OwnerEmail     string
	CORSOrigins    []string
}

var App Config

func Load() {
	_ = godotenv.Load()

	app := Config{
		Env:           getEnv("NODE_ENV", "development"),
		Port:          getEnv("PORT", "5000"),
		FrontendURL:   getEnv("FRONTEND_URL", "http://localhost:3000"),
		MongoURI:      getEnv("MONGODB_URI", "mongodb://localhost:27017/comeback"),
		JWTSecret:     getEnv("JWT_SECRET", "local-dev-secret-change-me"),
		AIProvider:    getEnv("AI_PROVIDER", "openai"),
		OpenAIAPIKey:  getEnv("OPENAI_API_KEY", ""),
		OpenAIBaseURL: getEnv("OPENAI_BASE_URL", ""),
		GeminiAPIKey:  getEnv("GEMINI_API_KEY", ""),
		AnthropicKey:  getEnv("ANTHROPIC_API_KEY", ""),
		UploadDir:     getEnv("UPLOAD_DIR", "./uploads"),
		BackupDir:     getEnv("BACKUP_DIR", "./backups"),
		OwnerEmail:    getEnv("OWNER_EMAIL", ""),
	}

	if v := getEnv("JWT_ACCESS_EXPIRY", "900"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			app.JWTAccessExp = n
		}
	}
	if v := getEnv("JWT_REFRESH_EXPIRY", "2592000"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			app.JWTRefreshExp = n
		}
	}

	app.CORSOrigins = []string{
		app.FrontendURL,
		"http://localhost:3000",
		"http://localhost:3001",
	}

	App = app
}

func getEnv(key, def string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return def
}
