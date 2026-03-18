package prometheus

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"path"
	"sort"

	"github.com/FabioTavernini/spendemon/backend/internal/config"
)

type PrometheusClient struct {
	baseURL    *url.URL
	httpClient *http.Client
}

type prometheusLabelValuesResponse struct {
	Status string   `json:"status"`
	Data   []string `json:"data"`
	Error  string   `json:"error"`
}

func NewPrometheusClient(cfg config.PrometheusConfig) (*PrometheusClient, error) {
	baseURL, err := url.Parse(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("parse prometheus url: %w", err)
	}

	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.TLSClientConfig = &tls.Config{
		InsecureSkipVerify: cfg.InsecureSkipVerify,
	}

	return &PrometheusClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout:   cfg.Timeout,
			Transport: transport,
		},
	}, nil
}

func (c *PrometheusClient) NamespaceValues() ([]string, error) {
	endpoint := *c.baseURL
	endpoint.Path = path.Join(c.baseURL.Path, "/api/v1/label/namespace/values")

	resp, err := c.httpClient.Get(endpoint.String())
	if err != nil {
		return nil, fmt.Errorf("request prometheus namespaces: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("prometheus returned status %s", resp.Status)
	}

	var payload prometheusLabelValuesResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("decode prometheus response: %w", err)
	}

	if payload.Status != "success" {
		if payload.Error == "" {
			payload.Error = "unknown prometheus error"
		}

		return nil, fmt.Errorf("prometheus query failed: %s", payload.Error)
	}

	namespaces := append([]string(nil), payload.Data...)
	sort.Strings(namespaces)

	return namespaces, nil
}
