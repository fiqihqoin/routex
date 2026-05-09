package domain

type contextKey string

const (
	ContextKeyUserID      contextKey = "userID"
	ContextKeyEnvironment contextKey = "environment"
)
