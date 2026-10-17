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

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("Файл .env не знайдений, беремо змінні з системи")
	}

	dsn := cfg.RequiredEnv("DATABASE_URL")
	pool, err := db.Connect(context.Background(), dsn)
	if err != nil {
		log.Fatalf("Підключення не встановлено: %v", err)
	}
	defer pool.Close()

	repo := sqlpool.NewUserRepository(pool)
	authHandler := auth.NewAuthHandler(repo)
	jwtSecret := cfg.RequiredEnv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("Критична помилка: JWT_SECRET не заданий")
	}
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
	}))
	r.Route("/api/auth", func(r chi.Router) {
		r.Post("/login", authHandler.LoginHandler)
		r.Post("/register", authHandler.RegisterHandler)
		r.Post("/google", authHandler.GoogleAuthHandler)
	})

	server := &http.Server{
		Addr:              ":8080",
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("Server listening on %s", server.Addr)

	if err := server.ListenAndServe(); err != nil &&
		!errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("HTTP server failed: %v", err)
	}
}
