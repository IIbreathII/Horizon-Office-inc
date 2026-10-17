package auth

import (
	"Horizon/go-api/internal/cfg"
	"Horizon/go-api/internal/models"
	"Horizon/go-api/internal/sqlpool"
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/api/idtoken"
)

type AuthHandler struct {
	repo *sqlpool.UserRepository
}

func NewAuthHandler(repo *sqlpool.UserRepository) *AuthHandler {
	return &AuthHandler{repo: repo}
}

func (h *AuthHandler) LoginHandler(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Неправильний формат JSON", http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" {
		http.Error(w, "Вкажіть email і пароль", http.StatusBadRequest)
		return
	}

	user, err := h.repo.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "Неправильний email чи пароль", http.StatusUnauthorized)
		} else {
			log.Printf("Get user by email failed: %v", err)
			http.Error(w, "Внутрішня помилка сервера", http.StatusInternalServerError)
		}
		return
	}

	if user.Password == "" {
		http.Error(w, "Цей акаунт створено через Google. Використовуйте вхід через Google.", http.StatusForbidden)
		return
	}

	if err := bcrypt.CompareHashAndPassword(
		[]byte(user.Password),
		[]byte(req.Password),
	); err != nil {
		http.Error(w, "Неправильний email чи пароль", http.StatusUnauthorized)
		return
	}

	token, err := GenerateToken(user.Id, user.Status)
	if err != nil {
		log.Printf("Generate token failed: %v", err)
		http.Error(w, "Помилка генерації токену", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "success",
		"user_id": user.Id,
		"role":    user.Status,
		"token":   token,
	})
}
func (h *AuthHandler) RegisterHandler(w http.ResponseWriter, r *http.Request) {
	var req models.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Неправильний формат JSON", http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" || req.Username == "" {
		http.Error(w, "Заповніть всі поля", http.StatusBadRequest)
		return
	}

	if req.Role != "volunteer" && req.Role != "organization" {
		http.Error(w, "Неправильна роль", http.StatusBadRequest)
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Помилка сервера при обробці пароля", http.StatusInternalServerError)
		return
	}
	userID, err := h.repo.CreateUser(r.Context(), req.Email, req.Username, string(hashedPassword), req.Role)
	if err != nil {
		log.Printf("Помилка бази при створенні: %v", err)
		http.Error(w, "Користувач с таким email чи username вже існує", http.StatusConflict)
		return
	}

	token, err := GenerateToken(userID, req.Role)
	if err != nil {
		log.Printf("Generate token failed: %v", err)
		http.Error(w, "Генерація токену не пройшла успешно", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "success",
		"user_id": userID,
		"token":   token,
	})
}

func (h *AuthHandler) GoogleAuthHandler(w http.ResponseWriter, r *http.Request) {
	var req models.GoogleAuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Неправильний формат JSON", http.StatusBadRequest)
		return
	}

	clientID := cfg.RequiredEnv("CLIENT_ID")
	if clientID == "" {
		http.Error(w, "Помилка конфігурації сервера", http.StatusInternalServerError)
		return
	}

	payload, err := idtoken.Validate(r.Context(), req.Token, clientID)
	if err != nil {
		http.Error(w, "Невалідний токен Google", http.StatusUnauthorized)
		return
	}

	googleID := payload.Subject

	email, ok := payload.Claims["email"].(string)
	if !ok || email == "" {
		http.Error(w, "Google token does not contain email", http.StatusUnauthorized)
		return
	}

	emailVerified, ok := payload.Claims["email_verified"].(bool)
	if !ok || !emailVerified {
		http.Error(w, "Google email is not verified", http.StatusUnauthorized)
		return
	}

	name, _ := payload.Claims["name"].(string)

	user, err := h.repo.GetUserByGoogleID(r.Context(), googleID)

	var userID int64
	var role string

	if err == nil {
		userID = user.Id
		role = user.Status
	} else if errors.Is(err, pgx.ErrNoRows) {
		role = req.Role
		if role != "volunteer" && role != "organization" {
			role = "volunteer"
		}

		userID, err = h.repo.CreateGoogleUser(
			r.Context(), googleID, email, name, role,
		)
		if err != nil {
			log.Printf("Create Google user failed: %v", err)
			http.Error(w, "Помилка збереження в БД", http.StatusInternalServerError)
			return
		}
	} else {
		log.Printf("Get Google user failed: %v", err)
		http.Error(w, "Внутрішня помилка сервера", http.StatusInternalServerError)
		return
	}

	token, err := GenerateToken(userID, role)
	if err != nil {
		log.Printf("Generate token failed: %v", err)
		http.Error(w, "Помилка генерації токену", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "success",
		"user_id": userID,
		"role":    role,
		"token":   token,
	})
}
