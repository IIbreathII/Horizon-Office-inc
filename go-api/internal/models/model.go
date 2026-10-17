package models

// Облікові поля таблиці users — єдине, з чим працює auth-API.
// Структурою таблиці володіє express-api (prisma/schema.prisma), ігрові поля (xp, balance…) пише лише він.
type User struct {
	Id       int64
	Email    string
	Password string // bcrypt-хеш; порожній — акаунт створено через Google
	Status   string // active | banned | deleted
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RegisterRequest struct {
	Email    string  `json:"email"`
	Username string  `json:"username"`
	Password string  `json:"password"`
	Contact  *string `json:"contact,omitempty"`
}

type GoogleAuthRequest struct {
	Token string `json:"token"` // ID-токен від Google Identity Services
}
