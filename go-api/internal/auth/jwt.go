package auth

import (
	"Horizon/go-api/internal/cfg"
	"errors"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func GenerateToken(userID int64, role string) (string, error) {
	secret := cfg.RequiredEnv("JWT_SECRET")
	if strings.TrimSpace(secret) == "" {
		return "", errors.New("JWT_SECRET is required")
	}

	secretKey := []byte(secret)
	now := time.Now()

	claims := jwt.MapClaims{
		"user_id": userID,
		"role":    role,
		"iat":     now.Unix(),
		"exp":     now.Add(72 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(secretKey)
}
