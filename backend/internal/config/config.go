package config

import "os"

type Config struct {
	Address string
}

func Load() Config {
	addr := os.Getenv("SPENDEMON_ADDRESS")
	if addr == "" {
		addr = ":8080"
	}

	return Config{
		Address: addr,
	}
}
