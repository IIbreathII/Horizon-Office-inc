-- CreateEnum
CREATE TYPE "QuestStatus" AS ENUM ('open', 'in_progress', 'completed', 'cancelled', 'archived');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('pending', 'approved', 'rejected', 'completed', 'withdrawn');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "google_id" TEXT,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "password" TEXT,
    "username" TEXT,
    "photo" TEXT,
    "contact" TEXT,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "cur_level" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "user_id" INTEGER NOT NULL,
    "organization_name" TEXT NOT NULL,
    "types" TEXT,
    "edrpou" TEXT,
    "contact" TEXT[],
    "description" TEXT,
    "logo" TEXT,
    "trust_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "quests" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "quest_name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "max_volunteers" INTEGER NOT NULL,
    "assigned_volunteers" INTEGER NOT NULL DEFAULT 0,
    "reward_xp" INTEGER NOT NULL DEFAULT 0,
    "reward_coins" INTEGER NOT NULL DEFAULT 0,
    "status" "QuestStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quest_claims" (
    "id" SERIAL NOT NULL,
    "quest_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quest_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rewards" (
    "id" SERIAL NOT NULL,
    "rewards_name" TEXT NOT NULL,
    "partner_name" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "promocode_temp" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_rewards" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "reward_id" INTEGER NOT NULL,
    "promocode" TEXT NOT NULL,
    "claimed_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_edrpou_key" ON "organizations"("edrpou");

-- CreateIndex
CREATE INDEX "quests_status_id_idx" ON "quests"("status", "id");

-- CreateIndex
CREATE INDEX "quests_organization_id_id_idx" ON "quests"("organization_id", "id");

-- CreateIndex
CREATE INDEX "quests_category_status_idx" ON "quests"("category", "status");

-- CreateIndex
CREATE INDEX "quest_claims_quest_id_status_idx" ON "quest_claims"("quest_id", "status");

-- CreateIndex
CREATE INDEX "quest_claims_user_id_idx" ON "quest_claims"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "quest_claims_quest_id_user_id_key" ON "quest_claims"("quest_id", "user_id");

-- CreateIndex
CREATE INDEX "user_rewards_user_id_claimed_time_idx" ON "user_rewards"("user_id", "claimed_time");

-- CreateIndex
CREATE INDEX "user_rewards_reward_id_idx" ON "user_rewards"("reward_id");

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quests" ADD CONSTRAINT "quests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_claims" ADD CONSTRAINT "quest_claims_quest_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_claims" ADD CONSTRAINT "quest_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_rewards" ADD CONSTRAINT "user_rewards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_rewards" ADD CONSTRAINT "user_rewards_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "rewards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
