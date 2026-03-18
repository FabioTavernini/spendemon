package metrics

import "context"

type Provider interface {
	NamespaceValues(ctx context.Context) ([]string, error)
}
