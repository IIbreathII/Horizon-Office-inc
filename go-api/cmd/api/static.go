package main

import "net/http"

func main() {
	panic(http.ListenAndServe(":3000", http.FileServer(http.Dir("."))))
}
