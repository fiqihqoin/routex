package service

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/truechain/caishenengine/transaction-api/internal/domain"
)

type asyncEventProcessor struct {
	repo domain.TransactionRepository
}

func NewEventProcessor(repo domain.TransactionRepository) domain.EventProcessor {
	return &asyncEventProcessor{repo: repo}
}

func (p *asyncEventProcessor) Start(ctx context.Context) {
	log.Println("Starting Async Event Processor...")
	
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			p.processBatch(ctx)
		}
	}
}

func (p *asyncEventProcessor) processBatch(ctx context.Context) {
	events, err := p.repo.GetUnprocessedEvents(ctx, 50)
	if err != nil {
		log.Printf("Error fetching events: %v", err)
		return
	}

	for _, event := range events {
		if err := p.handleEvent(ctx, event); err != nil {
			log.Printf("Error handling event %s: %v", event.ID, err)
			continue
		}
		p.repo.MarkEventProcessed(ctx, event.ID)
	}
}

func (p *asyncEventProcessor) handleEvent(ctx context.Context, event domain.TransactionEvent) error {
	tx, err := p.repo.GetByID(ctx, event.TransactionID)
	if err != nil {
		return err
	}

	switch event.EventType {
	case domain.EventQRGenerated:
		tx.Status = domain.StatusPendingPayment
	case domain.EventCallbackReceived:
		// Logic to parse callback and update status
		var payload map[string]interface{}
		json.Unmarshal(event.Payload, &payload)
		if status, ok := payload["status"].(string); ok {
			tx.Status = domain.TransactionStatus(status)
		}
	case domain.EventStatusUpdated:
		// Direct status update
	case domain.EventExpiredStale:
		tx.Status = domain.StatusExpiredStale
	}

	return p.repo.UpdateReadModel(ctx, tx)
}
