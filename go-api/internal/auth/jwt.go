package auth

import (
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const tokenTTL = 72 * time.Hour

// TokenIssuer видає JWT у форматі, який перевіряє express-api (src/common/middleware/auth.ts):
// HS256, sub — id користувача рядком, iss і aud — як JWT_ISSUER / JWT_AUDIENCE там.
// Ролі в токені немає: організацію express-api визначає за наявністю її профілю.
type TokenIssuer struct {
	secret   []byte
	issuer   string
	audience string
}

func NewTokenIssuer(secret, issuer, audience string) *TokenIssuer {
	return &TokenIssuer{secret: []byte(secret), issuer: issuer, audience: audience}
}

func (t *TokenIssuer) Issue(userID int64) (string, error) {
	now := time.Now()
	claims := jwt.RegisteredClaims{
		Subject:   strconv.FormatInt(userID, 10),
		Issuer:    t.issuer,
		Audience:  jwt.ClaimStrings{t.audience},
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(tokenTTL)),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(t.secret)
}
