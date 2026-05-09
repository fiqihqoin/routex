package domain

type contextKey string

const (
	ContextKeyMerchantID  contextKey = "merchantID"
	ContextKeyEnvironment contextKey = "environment"
	ContextKeyAPIKeyID    contextKey = "apiKeyID"
)
