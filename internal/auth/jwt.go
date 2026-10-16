package auth

import (
	"Horizon/internal/cfg"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func GenerateToken(userID int64, role string) (string, error) {
	secretKey := []byte(cfg.RequiredEnv("JWT_SECRET"))
	if secretKey == nil {
		return "", errors.New("secret key required")
	}
	claims := jwt.MapClaims{
		"user_id": userID,
		"role":    role,
		"exp":     time.Now().Add(time.Hour * 72).Unix(),
		"iat":     time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	return token.SignedString(secretKey)

}
