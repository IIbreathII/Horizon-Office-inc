package auth

import (
	"Horizon/go-api/internal/models"
	"Horizon/go-api/internal/sqlpool"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/api/idtoken"
)

// AuthHandler — зона відповідальності auth-API: облікові дані користувача і видача токена.
// Ролі, профілі, квести й нагороди — у express-api.
type AuthHandler struct {
	repo           *sqlpool.UserRepository
	tokens         *TokenIssuer
	googleClientID string
}

func NewAuthHandler(repo *sqlpool.UserRepository, tokens *TokenIssuer, googleClientID string) *AuthHandler {
	return &AuthHandler{repo: repo, tokens: tokens, googleClientID: googleClientID}
}

// writeError — тіло помилки як в express-api: { "error": { "code", "message" } }.
func writeError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{"error": map[string]string{"code": code, "message": message}})
}

func internalError(w http.ResponseWriter, what string, err error) {
	log.Printf("%s: %v", what, err)
	writeError(w, http.StatusInternalServerError, "INTERNAL", "Внутрішня помилка сервера")
}

func decode(w http.ResponseWriter, r *http.Request, v any) bool {
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "Неправильний формат JSON")
		return false
	}
	return true
}

// blocked — заблоковані й видалені акаунти токен не отримують (express-api їх теж не пустить).
func blocked(status string) bool {
	return status == "banned" || status == "deleted"
}

// signIn видає токен наявному користувачу: перевіряє блокування і виправляє старий статус-роль.
func (h *AuthHandler) signIn(w http.ResponseWriter, r *http.Request, user *models.User, httpStatus int) {
	if blocked(user.Status) {
		writeError(w, http.StatusForbidden, "FORBIDDEN", "Акаунт заблоковано")
		return
	}
	if err := h.repo.NormalizeLegacyStatus(r.Context(), user.Id); err != nil {
		internalError(w, "Normalize status failed", err)
		return
	}
	h.respondWithToken(w, user.Id, httpStatus)
}

func (h *AuthHandler) respondWithToken(w http.ResponseWriter, userID int64, httpStatus int) {
	token, err := h.tokens.Issue(userID)
	if err != nil {
		internalError(w, "Generate token failed", err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(httpStatus)
	_ = json.NewEncoder(w).Encode(map[string]any{"status": "success", "user_id": userID, "token": token})
}

func (h *AuthHandler) LoginHandler(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if !decode(w, r, &req) {
		return
	}
	req.Email = strings.TrimSpace(req.Email)
	if req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "Вкажіть email і пароль")
		return
	}

	user, err := h.repo.GetUserByEmail(r.Context(), req.Email)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Неправильний email чи пароль")
		return
	}
	if err != nil {
		internalError(w, "Get user by email failed", err)
		return
	}
	if user.Password == "" {
		writeError(w, http.StatusForbidden, "FORBIDDEN", "Цей акаунт створено через Google. Використовуйте вхід через Google.")
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)) != nil {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Неправильний email чи пароль")
		return
	}

	h.signIn(w, r, user, http.StatusOK)
}

func (h *AuthHandler) RegisterHandler(w http.ResponseWriter, r *http.Request) {
	var req models.RegisterRequest
	if !decode(w, r, &req) {
		return
	}
	req.Email = strings.TrimSpace(req.Email)
	req.Username = strings.TrimSpace(req.Username)
	if req.Email == "" || req.Password == "" || req.Username == "" {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "Заповніть всі поля")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		internalError(w, "Hash password failed", err)
		return
	}
	userID, err := h.repo.CreateUser(r.Context(), req.Email, req.Username, string(hash), req.Contact)
	if errors.Is(err, sqlpool.ErrDuplicate) {
		writeError(w, http.StatusConflict, "CONFLICT", "Користувач з таким email уже існує")
		return
	}
	if err != nil {
		internalError(w, "Create user failed", err)
		return
	}

	h.respondWithToken(w, userID, http.StatusCreated)
}

// GoogleAuthHandler: ID-токен від Google Identity Services → наш JWT.
// Перший вхід створює користувача; якщо такий email уже зареєстровано паролем — прив'язує до нього Google.
func (h *AuthHandler) GoogleAuthHandler(w http.ResponseWriter, r *http.Request) {
	if h.googleClientID == "" {
		writeError(w, http.StatusServiceUnavailable, "UNAVAILABLE", "Вхід через Google не налаштовано (CLIENT_ID)")
		return
	}
	var req models.GoogleAuthRequest
	if !decode(w, r, &req) {
		return
	}

	payload, err := idtoken.Validate(r.Context(), req.Token, h.googleClientID)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Невалідний токен Google")
		return
	}
	googleID := payload.Subject
	email, _ := payload.Claims["email"].(string)
	if email == "" {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Google не передав email")
		return
	}
	if verified, _ := payload.Claims["email_verified"].(bool); !verified {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Email у Google не підтверджено")
		return
	}
	name, _ := payload.Claims["name"].(string)

	user, err := h.repo.GetUserByGoogleID(r.Context(), googleID)
	if err == nil {
		h.signIn(w, r, user, http.StatusOK)
		return
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		internalError(w, "Get user by Google ID failed", err)
		return
	}

	user, err = h.repo.LinkGoogleID(r.Context(), email, googleID)
	if err == nil {
		h.signIn(w, r, user, http.StatusOK)
		return
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		internalError(w, "Link Google ID failed", err)
		return
	}

	userID, err := h.repo.CreateGoogleUser(r.Context(), googleID, email, name)
	if errors.Is(err, sqlpool.ErrDuplicate) {
		// email зайнятий акаунтом, до якого вже прив'язано інший Google
		writeError(w, http.StatusConflict, "CONFLICT", "Цей email уже прив'язано до іншого Google-акаунта")
		return
	}
	if err != nil {
		internalError(w, "Create Google user failed", err)
		return
	}
	h.respondWithToken(w, userID, http.StatusCreated)
}
