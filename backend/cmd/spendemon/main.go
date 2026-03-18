package main

import (
	"log"
	"net/http"

	"github.com/FabioTavernini/spendemon/backend/internal/api"
	"github.com/FabioTavernini/spendemon/backend/internal/config"
)

func main() {
	cfg := config.Load()

	router := api.NewRouter()

	log.Printf("starting spendemon backend on %s", cfg.Address)

	if err := http.ListenAndServe(cfg.Address, router); err != nil {
		log.Fatal(err)
	}
}
