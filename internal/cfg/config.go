package cfg

import (
	"os"
	"strings"
)

func RequiredEnv(key string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return ""
	}
	return value
}
