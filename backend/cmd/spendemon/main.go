package main

import (
	"log"
	"net/http"
	"os"

	"github.com/FabioTavernini/spendemon/backend/internal/api"
	"github.com/FabioTavernini/spendemon/backend/internal/config"
	"github.com/FabioTavernini/spendemon/backend/internal/metrics"
	prommetrics "github.com/FabioTavernini/spendemon/backend/internal/metrics/prometheus"
)

func main() {
	configPath := os.Getenv("SPENDEMON_CONFIG")
	if configPath == "" {
		configPath = "../../configs/spendemon.yaml"
	}

	cfg, err := config.Load(configPath)
	if err != nil {
		log.Fatal(err)
	}

	providers := make(map[string]metrics.Provider)

	for _, metricCfg := range cfg.Metrics {
		switch metricCfg.Type {
		case "prometheus":
			client, err := prommetrics.NewClient(metricCfg.Prometheus)
			if err != nil {
				log.Printf("metrics provider %q disabled: %v", metricCfg.Name, err)
				continue
			}
			providers[metricCfg.Name] = client
		default:
			log.Printf("metrics provider %q has unsupported type %q", metricCfg.Name, metricCfg.Type)
		}
	}

	router := api.NewRouter(cfg, providers)

	log.Printf("starting spendemon backend on %s", cfg.Server.Address)

	if err := http.ListenAndServe(cfg.Server.Address, router); err != nil {
		log.Fatal(err)
	}
}
