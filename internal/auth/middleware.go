package auth

import (
	"Horizon/internal/cfg"
	"context"
	"math"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserIDKey contextKey = "user_id"
const RoleKey contextKey = "role"

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Токена авторізації нема", http.StatusUnauthorized)
			return
		}
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, "Неправильний формат заголовку авторизації", http.StatusUnauthorized)
			return
		}
		secret := cfg.RequiredEnv("JWT_SECRET")
		if secret == "" {
			return
		}
		secretKey := []byte(secret)

		tokenString := parts[1]
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return secretKey, nil
		})
		if err != nil || !token.Valid {
			http.Error(w, "Недійсний або прострочений токен", http.StatusUnauthorized)
			return
		}
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			http.Error(w, "Помилка прочитування даних токену", http.StatusUnauthorized)
			return
		}

		rawUserID, ok := claims["user_id"].(float64)
		if !ok || rawUserID <= 0 || rawUserID != math.Trunc(rawUserID) {
			http.Error(w, "Invalid user ID", http.StatusUnauthorized)
			return
		}

		role, ok := claims["role"].(string)
		if !ok || (role != "volunteer" && role != "organization") {
			http.Error(w, "Invalid role", http.StatusUnauthorized)
			return
		}

		userID := int64(rawUserID)

		ctx := context.WithValue(r.Context(), UserIDKey, userID)
		ctx = context.WithValue(ctx, RoleKey, role)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
