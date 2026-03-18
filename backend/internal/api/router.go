package api

import (
	"log"
	"net/http"

	"github.com/FabioTavernini/spendemon/backend/internal/config"
)

func NewRouter(cfg config.Config) http.Handler {
	mux := http.NewServeMux()
	namespaces := make(map[string]NamespaceReader)

	for _, metric := range cfg.Metrics {
		if metric.Type != "prometheus" {
			continue
		}

		client, err := NewPrometheusClient(metric.Prometheus)
		if err != nil {
			log.Printf("prometheus client %q disabled: %v", metric.Name, err)
		} else {
			namespaces[metric.Name] = client
		}
	}

	handler := NewHandler(cfg, namespaces)

	mux.HandleFunc("/healthz", handler.HealthHandler)
	mux.HandleFunc("/api/v1/summary", handler.SummaryHandler)
	mux.HandleFunc("/api/v1/namespaces", handler.NamespacesHandler)

	return mux
}
