package metrics

type Provider interface {
	NamespaceValues() ([]string, error)
}
