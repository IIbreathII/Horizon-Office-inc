package main

import (
	"Horizon/internal/auth"
	"Horizon/internal/cfg"
	"Horizon/internal/sqlpool"
	"context"
	"errors"
	"log"
	"net/http"
	"time"

	"Horizon/internal/db"

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
		log.Println("Підключення не знайдено", err)
	}
	defer pool.Close()

	users := sqlpool.NewUserRepository(db.Pool)
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
	}))
	r.Route("/api/v1/auth", func(r chi.Router) {
		r.Post("/login", auth.LoginHandler)
		r.Post("/register", auth.RegisterHandler)
		r.Post("/google", auth.GoogleAuthHandler)
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
