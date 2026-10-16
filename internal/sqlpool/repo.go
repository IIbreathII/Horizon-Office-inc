package sqlpool

import (
	"Horizon/internal/models"
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

var Pool *pgxpool.Pool

func GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `SELECT id, email, password, status FROM users WHERE email = $1`

	user := &models.User{}
	err := Pool.QueryRow(ctx, query, email).Scan(
		&user.Id, &user.Email, &user.Password, &user.Status,
	)

	if err != nil {
		return nil, err
	}
	return user, nil
}

func CreateUser(ctx context.Context, email, username, passwordHash, role string) (int64, error) {
	query := `
		INSERT INTO users (google_id, email, username, password, status)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
		`

	var newID int64
	err := Pool.QueryRow(ctx, query, "none", email, username, passwordHash, role).Scan(&newID)
	if err != nil {
		return 0, err
	}
	return newID, nil
}

func GetUserByGoogleID(ctx context.Context, googleID string) (*models.User, error) {
	query := `SELECT id, email, status, username FROM users WHERE google_id = $1`

	user := &models.User{}
	err := Pool.QueryRow(ctx, query, googleID).Scan(
		&user.Id, &user.Email, &user.Status, &user.Name,
	)
	return user, err
}

func CreateGoogleUser(ctx context.Context, googleID, email, username, role string) (int64, error) {
	query := `
        INSERT INTO users (google_id, email, username, password, status)
        VALUES ($1, $2, $3, '', $4)
        RETURNING id
    `
	var newID int64
	err := Pool.QueryRow(ctx, query, googleID, email, username, role).Scan(&newID)
	return newID, err
}
