CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    google_id VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(20) CHECK (status IN ('volunteer', 'organization')),
    password VARCHAR(100),
    username VARCHAR(50) NOT NULL UNIQUE,
    photo TEXT,
    contact TEXT
);

CREATE TABLE IF NOT EXISTS organizations (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    organization_name VARCHAR(100) NOT NULL,
    types TEXT NOT NULL,
    edrpou VARCHAR(8) NOT NULL UNIQUE,
    contact TEXT[] NOT NULL,
    description TEXT NOT NULL,
    logo TEXT,
    trust_score NUMERIC(12,2) NOT NULL DEFAULT 50.00
);

CREATE TABLE IF NOT EXISTS volunteers (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    xp INTEGER NOT NULL DEFAULT 0,
    balance INTEGER NOT NULL DEFAULT 0,
    cur_level INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS quests (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(user_id) ON DELETE CASCADE,
    quest_name VARCHAR(30) NOT NULL,
    description VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    max_volunteers INTEGER NOT NULL DEFAULT 10,
    assigned_volunteers INTEGER NOT NULL DEFAULT 0,
    reward_xp INTEGER NOT NULL,
    reward_coins INTEGER NOT NULL,
    status VARCHAR(40) NOT NULL
);

CREATE TABLE IF NOT EXISTS rewards (
    id BIGSERIAL PRIMARY KEY,
    rewards_name VARCHAR(50) NOT NULL,
    partner_name TEXT NOT NULL,
    cost INTEGER NOT NULL,
    promocode_temp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quest_claims (
    id BIGSERIAL PRIMARY KEY,
    quest_id BIGINT REFERENCES quests(id) ON DELETE CASCADE,
    volunteer_id BIGINT REFERENCES volunteers(user_id) ON DELETE CASCADE,
    status VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS user_rewards (
    id BIGSERIAL PRIMARY KEY,
    volunteer_id BIGINT REFERENCES volunteers(user_id) ON DELETE CASCADE,
    reward_id BIGINT REFERENCES rewards(id) ON DELETE CASCADE,
    promocode TEXT,
    claimed_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);