package models

import "time"

type User struct {
	Id       int64   `json:"id"`
	GoogleID string  `json:"google_id,omitempty"`
	Email    string  `json:"email"`
	Status   string  `json:"status"`
	Password string  `json:"-"`
	Name     string  `json:"username"`
	Photo    *string `json:"photo,omitempty"`
	Contact  *string `json:"contact,omitempty"`
}

type Organizations struct {
	UserID      int64    `json:"id" db:"user_id"`
	Name        string   `json:"name" db:"name"`
	Type        string   `json:"type" db:"type"`
	EDRPOU      string   `json:"edrpou" db:"edrpou"`
	Contact     []string `json:"contact" db:"contact"`
	Description string   `json:"description" db:"description"`
	Logo        string   `json:"logo" db:"logo"`
	TrustScore  string   `json:"trust_score" db:"trust_score"`
}
type Volunteers struct {
	UserID  int64 `json:"id" db:"user_id"`
	XP      int64 `json:"xp" db:"xp"`
	Balance int64 `json:"balance" db:"balance"`
	Level   int64 `json:"lvl" db:"lvl"`
}
type Quest struct {
	Id                 int64   `json:"quest_id" db:"quest_id"`
	OrganisationId     int64   `json:"organisation_id" db:"organisation_id"`
	Name               string  `json:"name" db:"name"`
	Description        string  `json:"description" db:"description"`
	Category           string  `json:"category" db:"category"`
	Address            string  `json:"address" db:"address"`
	Lateral            float64 `json:"lat" db:"lat"`
	Long               float64 `json:"lng" db:"lng"`
	MaxVolunteers      int64   `json:"max_volunteers" db:"max_volunteers"`
	AssignedVolunteers string  `json:"assigned_volunteers" db:"assigned_volunteers"`
	RewardXP           string  `json:"reward_xp" db:"reward_xp"`
	RewardCoins        string  `json:"reward_coins" db:"reward_coins"`
	Status             string  `json:"status" db:"status"`
}

type Rewards struct {
	Id          int64  `json:"id" db:"id"`
	Name        string `json:"name" db:"name"`
	PartnerName string `json:"partner_name" db:"partner_name"`
	Cost        string `json:"cost" db:"cost"`
	PromoTemp   string `json:"promo_code_temp" db:"promo_code_temp"`
}

type QuestClaims struct {
	Id          int64   `json:"id" db:"id"`
	QuestID     []int64 `json:"quest_id" db:"quest_id"`
	VolunteerID int64   `json:"volunteer_id" db:"volunteer_id"`
	Status      string  `json:"status" db:"status"`
}

type UserRewards struct {
	Id          int64     `json:"id" db:"id"`
	VolunteerID int64     `json:"volunteer_id" db:"volunteer_id"`
	RewardID    int64     `json:"reward_id" db:"reward_id"`
	Promocode   string    `json:"promo_code" db:"promo_code"`
	ClaimedTime time.Time `json:"claimed_time" db:"claimed_time"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Username string `json:"username"`
	Password string `json:"password"`
	Role     string `json:"role"`
}
