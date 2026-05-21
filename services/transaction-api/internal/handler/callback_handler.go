package handler

import (
	"io"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/truechain/caishenengine/transaction-api/internal/domain"
)

type CallbackHandler struct {
	service domain.TransactionService
}

func NewCallbackHandler(service domain.TransactionService) *CallbackHandler {
	return &CallbackHandler{service: service}
}

func (h *CallbackHandler) HandleVendorCallback(w http.ResponseWriter, r *http.Request) {
	vendorID := chi.URLParam(r, "vendor_id")
	signature := r.Header.Get("X-Vendor-Signature")

	payload, err := io.ReadAll(r.Body)
	if err != nil {
		h.respondWithError(w, http.StatusBadRequest, "failed to read body")
		return
	}

	err = h.service.HandleVendorCallback(r.Context(), vendorID, payload, signature)
	if err != nil {
		h.respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Vendor usually expects 200 OK
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"received"}`))
}

func (h *CallbackHandler) respondWithError(w http.ResponseWriter, code int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write([]byte(`{"error":"` + message + `"}`))
}
