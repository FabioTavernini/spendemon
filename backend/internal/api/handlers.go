package api

import (
	"net/http"
	"sort"

	"github.com/FabioTavernini/spendemon/backend/internal/config"
	"github.com/FabioTavernini/spendemon/backend/internal/models"
)

type NamespaceReader interface {
	NamespaceValues() ([]string, error)
}

type Handler struct {
	cfg        config.Config
	namespaces map[string]NamespaceReader
}

func NewHandler(cfg config.Config, namespaces map[string]NamespaceReader) Handler {
	return Handler{
		cfg:        cfg,
		namespaces: namespaces,
	}
}

func (h Handler) HealthHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("ok"))
}

func (h Handler) SummaryHandler(w http.ResponseWriter, r *http.Request) {
	response := models.ClusterSummary{
		ClusterName:      "dev-cluster",
		TotalMonthlyCost: 1234.56,
		Currency:         h.cfg.Pricing.Currency,
	}

	writeJSON(w, http.StatusOK, response)
}

func (h Handler) NamespacesHandler(w http.ResponseWriter, r *http.Request) {
	if len(h.namespaces) == 0 {
		http.Error(w, "prometheus client not configured", http.StatusServiceUnavailable)
		return
	}

	response := make(map[string]models.NamespaceSourceResult, len(h.namespaces))
	names := make([]string, 0, len(h.namespaces))

	for name := range h.namespaces {
		names = append(names, name)
	}

	sort.Strings(names)

	for _, name := range names {
		namespaces, err := h.namespaces[name].NamespaceValues()
		if err != nil {
			response[name] = models.NamespaceSourceResult{Error: err.Error()}
			continue
		}

		response[name] = models.NamespaceSourceResult{Namespaces: namespaces}
	}

	writeJSON(w, http.StatusOK, response)
}
