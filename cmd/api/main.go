package main

import (
	"Horizon/internal/auth"
	"log"
	"net/http"
	"os"

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

	dsn := os.Getenv("DATABASE_URL")
	db.Connect(dsn)
	defer db.Pool.Close()

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
	}))
	r.Route("/api/v1", func(r chi.Router) {
		r.Post("/api/v1/auth/login", auth.LoginHandler)
		r.Post("/auth/register", auth.RegisterHandler)
		r.Post("/auth/google", auth.GoogleAuthHandler)
	})

	log.Println("Сервер запущений на порті 8080")
	http.ListenAndServe(":8080", r)
}
