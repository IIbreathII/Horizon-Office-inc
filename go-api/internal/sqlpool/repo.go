package sqlpool

import (
	"Horizon/go-api/internal/models"
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrDuplicate — email (або google_id) уже зайнятий.
var ErrDuplicate = errors.New("user already exists")

type UserRepository struct {
	pool *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{pool: pool}
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

// password у БД nullable (акаунти з Google і сиду), тому COALESCE.
const selectUser = `SELECT id, email, COALESCE(password, ''), status FROM users`

func (r *UserRepository) scanUser(row pgx.Row) (*models.User, error) {
	user := &models.User{}
	if err := row.Scan(&user.Id, &user.Email, &user.Password, &user.Status); err != nil {
		return nil, err
	}
	return user, nil
}

func (r *UserRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	return r.scanUser(r.pool.QueryRow(ctx, selectUser+` WHERE email = $1`, email))
}

func (r *UserRepository) GetUserByGoogleID(ctx context.Context, googleID string) (*models.User, error) {
	return r.scanUser(r.pool.QueryRow(ctx, selectUser+` WHERE google_id = $1`, googleID))
}

// CreateUser — реєстрація з паролем. Статус active: роль тут не зберігається.
func (r *UserRepository) CreateUser(ctx context.Context, email, username, passwordHash string, contact *string) (int64, error) {
	var id int64
	err := r.pool.QueryRow(ctx, `
		INSERT INTO users (email, username, password, contact, status)
		VALUES ($1, $2, $3, $4, 'active')
		RETURNING id`,
		email, username, passwordHash, contact,
	).Scan(&id)
	if isUniqueViolation(err) {
		return 0, ErrDuplicate
	}
	return id, err
}

// CreateGoogleUser — перший вхід через Google; пароля немає (NULL).
func (r *UserRepository) CreateGoogleUser(ctx context.Context, googleID, email, username string) (int64, error) {
	var id int64
	err := r.pool.QueryRow(ctx, `
		INSERT INTO users (google_id, email, username, status)
		VALUES ($1, $2, NULLIF($3, ''), 'active')
		RETURNING id`,
		googleID, email, username,
	).Scan(&id)
	if isUniqueViolation(err) {
		return 0, ErrDuplicate
	}
	return id, err
}

// LinkGoogleID прив'язує Google до наявного акаунта з тим самим (підтвердженим Google) email.
// pgx.ErrNoRows — такого email немає або до нього вже прив'язано інший Google-акаунт.
func (r *UserRepository) LinkGoogleID(ctx context.Context, email, googleID string) (*models.User, error) {
	return r.scanUser(r.pool.QueryRow(ctx, `
		UPDATE users SET google_id = $2, updated_at = now()
		WHERE email = $1 AND google_id IS NULL
		RETURNING id, email, COALESCE(password, ''), status`,
		email, googleID,
	))
}

// NormalizeLegacyStatus: старі версії цього сервісу писали в status роль (volunteer / organization),
// а express-api пускає лише active. Виправляє такий статус при вході; banned / deleted не чіпає.
func (r *UserRepository) NormalizeLegacyStatus(ctx context.Context, userID int64) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE users SET status = 'active', updated_at = now()
		WHERE id = $1 AND status IN ('volunteer', 'organization')`,
		userID,
	)
	return err
}
