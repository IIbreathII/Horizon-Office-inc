package main

import (
	"log"
	"net/http"
)

// Локальна сторінка test.html для ручної перевірки кнопки Google: `go run ./cmd/testpage` з go-api/,
// потім http://localhost:5500/test.html (додайте цей origin у Google Console).
// Окремий пакет: другий func main поруч із cmd/api/main.go не давав зібрати ./cmd/api.
func main() {
	log.Println("Test page on http://localhost:5500/test.html")
	log.Fatal(http.ListenAndServe(":5500", http.FileServer(http.Dir("."))))
}
