package config

import "time"

type Config struct {
	Server   ServerConfig         `yaml:"server"`
	Metrics  []MetricsSourceConfig `yaml:"metrics"`
	Pricing  PricingConfig        `yaml:"pricing"`
	Features FeaturesConfig       `yaml:"features"`
}

type ServerConfig struct {
	Address  string `yaml:"address"`
	LogLevel string `yaml:"logLevel"`
}

type MetricsSourceConfig struct {
	Name       string           `yaml:"name"`
	Type       string           `yaml:"type"`
	Prometheus PrometheusConfig `yaml:"prometheus"`
}

type PrometheusConfig struct {
	URL                string        `yaml:"url"`
	Timeout            time.Duration `yaml:"timeout"`
	InsecureSkipVerify bool          `yaml:"insecureSkipVerify"`
}

type PricingConfig struct {
	Currency                  string  `yaml:"currency"`
	DefaultCPUHourlyCost      float64 `yaml:"defaultCPUHourlyCost"`
	DefaultMemoryGBHourlyCost float64 `yaml:"defaultMemoryGBHourlyCost"`
}

type FeaturesConfig struct {
	EnableIdleCost bool `yaml:"enableIdleCost"`
	EnablePVCost   bool `yaml:"enablePVCost"`
}
