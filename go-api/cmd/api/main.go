package main

import (
	"Horizon/go-api/internal/auth"
	"Horizon/go-api/internal/cfg"
	"Horizon/go-api/internal/db"
	"Horizon/go-api/internal/sqlpool"
	"context"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"
)

// auth-API: реєстрація, вхід (пароль або Google) і видача JWT для express-api.
func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("Файл .env не знайдений, беремо змінні з системи")
	}

	conf, err := cfg.Load()
	if err != nil {
		log.Fatalf("Конфігурація: %v", err)
	}

	pool, err := db.Connect(context.Background(), conf.DatabaseURL)
	if err != nil {
		log.Fatalf("Підключення не встановлено: %v", err)
	}
	defer pool.Close()

	authHandler := auth.NewAuthHandler(
		sqlpool.NewUserRepository(pool),
		auth.NewTokenIssuer(conf.JWTSecret, conf.JWTIssuer, conf.JWTAudience),
		conf.GoogleClientID,
	)
	if conf.GoogleClientID == "" {
		log.Println("CLIENT_ID не заданий: вхід через Google вимкнено")
	}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	// фронт зазвичай ходить через проксі Next (/auth → сюди), тоді CORS не потрібен;
	// CORS_ORIGINS — для прямих запитів із браузера
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: conf.CORSOrigins,
		AllowedMethods: []string{"POST", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Content-Type"},
	}))

	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"ok":true}`))
	})
	r.Route("/api/auth", func(r chi.Router) {
		r.Post("/login", authHandler.LoginHandler)
		r.Post("/register", authHandler.RegisterHandler)
		r.Post("/google", authHandler.GoogleAuthHandler)
	})

	server := &http.Server{
		Addr:              ":" + conf.Port,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("Server listening on %s", server.Addr)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("HTTP server failed: %v", err)
	}
}
