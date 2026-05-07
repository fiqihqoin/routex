package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/truechain/ptms/transaction-api/internal/domain"
)

type TransactionHandler struct {
	service domain.TransactionService
}

type ErrorResponse struct {
	Error struct {
		Code       string `json:"code"`
		Message    string `json:"message"`
		RetryAfter int    `json:"retry_after,omitempty"`
		TraceID    string `json:"trace_id"`
	} `json:"error"`
}

func NewTransactionHandler(service domain.TransactionService) *TransactionHandler {
	return &TransactionHandler{service: service}
}

func (h *TransactionHandler) GenerateQRIS(w http.ResponseWriter, r *http.Request) {
	apiKey := r.Header.Get("X-API-Key")
	idempotencyKey := r.Header.Get("X-Idempotency-Key")

	if apiKey == "" {
		h.respondWithError(w, r, http.StatusUnauthorized, domain.ErrMissingAPIKey)
		return
	}

	rawBody, err := io.ReadAll(r.Body)
	if err != nil {
		h.respondWithError(w, r, http.StatusBadRequest, errors.New("INVALID_REQUEST_BODY"))
		return
	}

	var req domain.CreateTransactionRequest
	if err := json.Unmarshal(rawBody, &req); err != nil {
		h.respondWithError(w, r, http.StatusBadRequest, errors.New("INVALID_JSON"))
		return
	}

	tx, err := h.service.GenerateQRIS(r.Context(), apiKey, idempotencyKey, req, rawBody)
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, domain.ErrCurrencyNotSupported) {
			status = http.StatusBadRequest
		} else if errors.Is(err, domain.ErrRateLimited) {
			status = http.StatusTooManyRequests
		} else if errors.Is(err, domain.ErrNoEligibleVendor) || errors.Is(err, domain.ErrVendorError) {
			status = http.StatusServiceUnavailable
		} else if errors.Is(err, domain.ErrInvalidAPIKey) {
			status = http.StatusUnauthorized
		} else if errors.Is(err, domain.ErrIdempotencyConflict) {
			status = http.StatusConflict
		}
		
		h.respondWithError(w, r, status, err)
		return
	}

	h.respondWithJSON(w, http.StatusCreated, tx)
}

func (h *TransactionHandler) GetStatus(w http.ResponseWriter, r *http.Request) {
	transactionID := chi.URLParam(r, "id")
	if transactionID == "" {
		h.respondWithError(w, r, http.StatusBadRequest, errors.New("MISSING_TRANSACTION_ID"))
		return
	}

	tx, err := h.service.GetStatus(r.Context(), transactionID)
	if err != nil {
		h.respondWithError(w, r, http.StatusNotFound, errors.New("TRANSACTION_NOT_FOUND"))
		return
	}

	h.respondWithJSON(w, http.StatusOK, tx)
}

func (h *TransactionHandler) respondWithError(w http.ResponseWriter, r *http.Request, status int, err error) {
	traceID := r.Header.Get("X-Trace-ID")
	if traceID == "" {
		traceID = uuid.New().String()
	}

	resp := ErrorResponse{}
	resp.Error.Code = err.Error()
	resp.Error.Message = err.Error() // In real app, might want more descriptive message
	resp.Error.TraceID = traceID

	if status == http.StatusTooManyRequests {
		resp.Error.RetryAfter = 1
		w.Header().Set("Retry-After", "1")
	}

	h.respondWithJSON(w, status, resp)
}

func (h *TransactionHandler) respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	response, _ := json.Marshal(payload)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(response)
}
