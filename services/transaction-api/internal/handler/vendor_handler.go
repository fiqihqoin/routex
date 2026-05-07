package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/redis/go-redis/v9"
	"github.com/truechain/ptms/transaction-api/internal/domain"
	"github.com/truechain/ptms/transaction-api/internal/factory"
)

type VendorHandler struct {
	cb      domain.CircuitBreaker
	rdb     *redis.Client
	factory factory.VendorFactory
}

func NewVendorHandler(cb domain.CircuitBreaker, rdb *redis.Client, factory factory.VendorFactory) *VendorHandler {
	return &VendorHandler{
		cb:      cb,
		rdb:     rdb,
		factory: factory,
	}
}

func (h *VendorHandler) GetVendorHealth(w http.ResponseWriter, r *http.Request) {
	vendorID := chi.URLParam(r, "id")
	if vendorID == "" {
		h.respondWithError(w, http.StatusBadRequest, "missing vendor id")
		return
	}

	state, err := h.cb.GetState(r.Context(), vendorID)
	if err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "failed to get circuit breaker state")
		return
	}

	counterKey := fmt.Sprintf("cb:vendor:%s:stats", vendorID)
	failures, _ := h.rdb.ZCard(r.Context(), counterKey+":failure").Result()
	successes, _ := h.rdb.ZCard(r.Context(), counterKey+":success").Result()
	
	errorRate := 0.0
	if failures+successes > 0 {
		errorRate = float64(failures) / float64(failures+successes)
	}

	health := domain.VendorHealth{
		VendorID:   vendorID,
		State:      state,
		ErrorRate:  errorRate,
		LastUpdate: time.Now(),
	}

	h.respondWithJSON(w, http.StatusOK, health)
}

func (h *VendorHandler) ValidateCredentials(w http.ResponseWriter, r *http.Request) {
	vendorCode := chi.URLParam(r, "code")
	
	body, err := io.ReadAll(r.Body)
	if err != nil {
		h.respondWithError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var req struct {
		Credentials string `json:"credentials"`
	}
	if err := json.Unmarshal(body, &req); err != nil {
		h.respondWithError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	adapter, err := h.factory.Create(vendorCode, req.Credentials)
	if err != nil {
		h.respondWithError(w, http.StatusBadRequest, fmt.Sprintf("unsupported vendor or invalid creds: %v", err))
		return
	}

	if err := adapter.Validate(r.Context(), req.Credentials); err != nil {
		h.respondWithError(w, http.StatusUnauthorized, err.Error())
		return
	}

	h.respondWithJSON(w, http.StatusOK, map[string]string{"status": "valid", "message": "Credentials valid, vendor aktif"})
}

func (h *VendorHandler) respondWithError(w http.ResponseWriter, code int, message string) {
	h.respondWithJSON(w, code, map[string]string{"error": message})
}

func (h *VendorHandler) respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	response, _ := json.Marshal(payload)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(response)
}
