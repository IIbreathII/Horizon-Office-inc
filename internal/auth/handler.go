package auth

import (
	"Horizon/internal/cfg"
	"Horizon/internal/models"
	"Horizon/internal/sqlpool"
	"encoding/json"
	"net/http"

	"golang.org/x/crypto/bcrypt"
	"google.golang.org/api/idtoken"
)

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Неправильний формат JSON", http.StatusBadRequest)
		return
	}

	user, err := sqlpool.User(r.Context(), req.Email)
	if err != nil {
		http.Error(w, "Неправильний email чи пароль", http.StatusUnauthorized)
		return
	}
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		http.Error(w, "Неправильний пароль чи email", http.StatusUnauthorized)
		return
	}
	token, err := GenerateToken(user.Id, user.Status)
	if err != nil {
		http.Error(w, "Помилка генерації токену", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "success",
		"user_id": user.,
		"role":    user.Status,
		"token":   token,
	})
}

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
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
	userID, err := sqlpool.CreateUser(r.Context(), req.Email, req.Username, string(hashedPassword), req.Role)
	if err != nil {
		http.Error(w, "Користувач с таким email чи username вже існує", http.StatusConflict)
		return
	}

	token, _ := GenerateToken(userID, req.Role)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "success",
		"user_id": userID,
		"token":   token,
	})
}

func GoogleAuthHandler(w http.ResponseWriter, r *http.Request) {
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
	email := payload.Claims["email"].(string)
	name := payload.Claims["name"].(string)

	// 3. Ищем в базе: старый юзер или новый?
	user, err := sqlpool.GetUserByGoogleID(r.Context(), googleID)
	var userID int64
	var role string

	if err != nil {
		role = req.Role
		if role != "volunteer" && role != "organization" {
			role = "volunteer" // Дефолт, если фронт забыл прислать
		}

		userID, err = sqlpool.CreateGoogleUser(r.Context(), googleID, email, name, role)
		if err != nil {
			http.Error(w, "Помилка збереження в БД", http.StatusInternalServerError)
			return
		}
	} else {
		userID = user.Id
		role = user.Status
	}

	token, _ := GenerateToken(userID, role)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "success",
		"user_id": userID,
		"role":    role,
		"token":   token,
	})
}
