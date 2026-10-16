package db

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

var Pool *pgxpool.Pool

func Connect(dsn string) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		log.Fatalf("Помилка створення пулу коннектів: %v\n", err)
	}
	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("База не відповідає: %v\n", err)
	}
	Pool = pool
	log.Println("Успішний коннект к PostgreSql")
}
