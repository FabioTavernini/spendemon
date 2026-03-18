package api

import "net/http"

func NewRouter() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/healthz", HealthHandler)
	mux.HandleFunc("/api/v1/summary", SummaryHandler)

	return mux
}
