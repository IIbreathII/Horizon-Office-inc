package sqlpool

import (
	"context"

	"Horizon/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type UserRepository struct {
	pool *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{pool: pool}
}

func (r *UserRepository) GetUserByEmail(
	ctx context.Context,
	email string,
) (*models.User, error) {
	const query = `
		SELECT id, email, password, status
		FROM users
		WHERE email = $1
	`

	user := &models.User{}
	err := r.pool.QueryRow(ctx, query, email).Scan(
		&user.Id,
		&user.Email,
		&user.Password,
		&user.Status,
	)
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (r *UserRepository) CreateUser(
	ctx context.Context,
	email, username, passwordHash, role string,
) (int64, error) {
	const query = `
		INSERT INTO users
			(google_id, email, username, password, status)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`

	var id int64
	err := r.pool.QueryRow(
		ctx, query, nil, email, username, passwordHash, role,
	).Scan(&id)

	return id, err
}

func (r *UserRepository) GetUserByGoogleID(
	ctx context.Context,
	googleID string,
) (*models.User, error) {
	const query = `
		SELECT id, email, status, username
		FROM users
		WHERE google_id = $1
	`

	user := &models.User{}
	err := r.pool.QueryRow(ctx, query, googleID).Scan(
		&user.Id,
		&user.Email,
		&user.Status,
		&user.Name,
	)
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (r *UserRepository) CreateGoogleUser(
	ctx context.Context,
	googleID, email, username, role string,
) (int64, error) {
	const query = `
		INSERT INTO users
			(google_id, email, username, password, status)
		VALUES ($1, $2, $3, '', $4)
		RETURNING id
	`

	var id int64
	err := r.pool.QueryRow(
		ctx, query, googleID, email, username, role,
	).Scan(&id)

	return id, err
}
