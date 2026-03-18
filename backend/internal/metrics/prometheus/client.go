package prometheus

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"path"
	"sort"

	"github.com/FabioTavernini/spendemon/backend/internal/config"
)

type Client struct {
	baseURL    *url.URL
	httpClient *http.Client
}

type queryResponse struct {
	Status    string          `json:"status"`
	Data      queryResultData `json:"data"`
	ErrorType string          `json:"errorType"`
	Error     string          `json:"error"`
}

type queryResultData struct {
	ResultType string        `json:"resultType"`
	Result     []queryResult `json:"result"`
}

type queryResult struct {
	Metric map[string]string `json:"metric"`
}

func NewClient(cfg config.PrometheusConfig) (*Client, error) {
	baseURL, err := url.Parse(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("parse prometheus url: %w", err)
	}

	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.TLSClientConfig = &tls.Config{
		InsecureSkipVerify: cfg.InsecureSkipVerify,
	}

	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout:   cfg.Timeout,
			Transport: transport,
		},
	}, nil
}

func (c *Client) buildURL(p string) string {
	u := *c.baseURL
	u.Path = path.Join(c.baseURL.Path, p)
	return u.String()
}

func (c *Client) NamespaceValues(ctx context.Context) ([]string, error) {
	endpoint, err := url.Parse(c.buildURL("api/v1/query"))
	if err != nil {
		return nil, fmt.Errorf("parse query url: %w", err)
	}

	params := endpoint.Query()
	params.Set("query", "kube_namespace_created")
	endpoint.RawQuery = params.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request prometheus namespaces: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("prometheus returned status %s", resp.Status)
	}

	var payload queryResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("decode prometheus response: %w", err)
	}

	if payload.Status != "success" {
		if payload.Error == "" {
			payload.Error = "unknown prometheus error"
		}
		return nil, fmt.Errorf("prometheus query failed: %s", payload.Error)
	}

	namespaces := make([]string, 0, len(payload.Data.Result))
	seen := make(map[string]struct{}, len(payload.Data.Result))

	for _, result := range payload.Data.Result {
		namespace := result.Metric["exported_namespace"]
		if namespace == "" {
			continue
		}
		if _, ok := seen[namespace]; ok {
			continue
		}

		seen[namespace] = struct{}{}
		namespaces = append(namespaces, namespace)
	}

	sort.Strings(namespaces)

	return namespaces, nil
}
