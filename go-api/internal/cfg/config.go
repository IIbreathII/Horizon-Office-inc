package cfg

import (
	"errors"
	"os"
	"strings"
)

// Config — налаштування auth-API. Значення JWT_* мають збігатися з express-api/.env:
// express-api перевіряє підпис, issuer і audience токенів, які видає цей сервіс.
type Config struct {
	Port           string
	DatabaseURL    string
	JWTSecret      string
	JWTIssuer      string
	JWTAudience    string
	GoogleClientID string   // порожній — вхід через Google вимкнено
	CORSOrigins    []string // звідки браузер може ходити напряму (без проксі Next)
}

func env(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func Load() (Config, error) {
	c := Config{
		Port:           env("PORT", "8080"),
		DatabaseURL:    env("DATABASE_URL", ""),
		JWTSecret:      env("JWT_SECRET", ""),
		JWTIssuer:      env("JWT_ISSUER", "auth-api"),
		JWTAudience:    env("JWT_AUDIENCE", "volunteer-api"),
		GoogleClientID: env("CLIENT_ID", ""),
	}
	for _, origin := range strings.Split(env("CORS_ORIGINS", "http://localhost:3001"), ",") {
		if origin = strings.TrimSpace(origin); origin != "" {
			c.CORSOrigins = append(c.CORSOrigins, origin)
		}
	}

	if c.DatabaseURL == "" {
		return c, errors.New("DATABASE_URL не заданий")
	}
	// як і в express-api: коротший секрет там не пройде валідацію
	if len(c.JWTSecret) < 32 {
		return c, errors.New("JWT_SECRET має бути не коротшим за 32 символи і збігатися з express-api")
	}
	return c, nil
}
