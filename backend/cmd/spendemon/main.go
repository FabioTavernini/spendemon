package main

import (
	"log"
	"net/http"
	"os"

	"github.com/FabioTavernini/spendemon/backend/internal/api"
	"github.com/FabioTavernini/spendemon/backend/internal/config"
)

func main() {
	configPath := os.Getenv("SPENDEMON_CONFIG")
	if configPath == "" {
		configPath = "../../internal/config/spendemon.yaml"
	}

	cfg, err := config.Load(configPath)
	if err != nil {
		log.Fatal(err)
	}

	router := api.NewRouter(cfg)

	log.Printf("starting spendemon backend on %s", cfg.Server.Address)

	if err := http.ListenAndServe(cfg.Server.Address, router); err != nil {
		log.Fatal(err)
	}
}
