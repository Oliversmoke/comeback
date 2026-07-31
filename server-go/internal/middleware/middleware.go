package middleware

import (
	"net/http"
	"sync"
	"time"
)

// CORS reflects the request Origin (dev/test friendly for cross-origin access).
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// visitor tracks request counts for in-memory rate limiting.
type visitor struct {
	count     int
	resetAt   time.Time
}

// RateLimit implements a simple fixed-window limiter: max requests per window.
func RateLimit(window time.Duration, max int) func(http.Handler) http.Handler {
	var mu sync.Mutex
	visitors := map[string]*visitor{}

	go func() {
		ticker := time.NewTicker(time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			mu.Lock()
			for ip, v := range visitors {
				if time.Now().After(v.resetAt) {
					delete(visitors, ip)
				}
			}
			mu.Unlock()
		}
	}()

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := r.RemoteAddr
			mu.Lock()
			v, ok := visitors[ip]
			now := time.Now()
			if !ok || now.After(v.resetAt) {
				v = &visitor{count: 0, resetAt: now.Add(window)}
				visitors[ip] = v
			}
			v.count++
			count := v.count
			mu.Unlock()

			if count > max {
				Error(w, http.StatusTooManyRequests, "Too many requests, please try again later.")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// AuthRateLimit is a tighter limiter for auth endpoints.
func AuthRateLimit() func(http.Handler) http.Handler {
	return RateLimit(15*time.Minute, 20)
}
