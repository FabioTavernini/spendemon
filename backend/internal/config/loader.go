package config

import (
	"errors"
	"fmt"
	"os"
	"time"

	"gopkg.in/yaml.v3"
)

func Load(path string) (Config, error) {
	cfg := Config{
		Server: ServerConfig{
			Address:  ":8080",
			LogLevel: "info",
		},
		Pricing: PricingConfig{
			Currency:                  "CHF",
			DefaultCPUHourlyCost:      0.042,
			DefaultMemoryGBHourlyCost: 0.006,
		},
		Features: FeaturesConfig{
			EnableIdleCost: true,
			EnablePVCost:   false,
		},
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return cfg, err
	}

	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return cfg, err
	}

	// Optional: Add validation for required fields
	if cfg.Server.Address == "" {
		return cfg, errors.New("server.address is required in config")
	}

	for i := range cfg.Metrics {
		metric := &cfg.Metrics[i]
		if metric.Name == "" {
			return cfg, fmt.Errorf("metrics[%d].name is required in config", i)
		}

		if metric.Type == "" {
			return cfg, fmt.Errorf("metrics[%s].type is required in config", metric.Name)
		}

		if metric.Type != "prometheus" {
			return cfg, fmt.Errorf("metrics[%s].type %q is not supported", metric.Name, metric.Type)
		}

		if metric.Prometheus.URL == "" {
			return cfg, fmt.Errorf("metrics[%s].prometheus.url is required in config", metric.Name)
		}

		if metric.Prometheus.Timeout == 0 {
			metric.Prometheus.Timeout = 30 * time.Second
		}
	}

	return cfg, nil
}
