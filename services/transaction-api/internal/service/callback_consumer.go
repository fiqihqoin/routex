package service

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/truechain/ptms/transaction-api/internal/domain"
	"github.com/truechain/ptms/transaction-api/pkg/security"
)

type callbackConsumer struct {
	conn       *amqp.Connection
	channel    *amqp.Channel
	repo       domain.TransactionRepository
	httpClient *http.Client
}

func NewCallbackConsumer(amqpURL string, repo domain.TransactionRepository) (domain.CallbackConsumer, error) {
	conn, err := amqp.Dial(amqpURL)
	if err != nil {
		return nil, err
	}

	ch, err := conn.Channel()
	if err != nil {
		return nil, err
	}

	// Declare Main Queue
	_, err = ch.QueueDeclare("ptms.callbacks", true, false, false, false, nil)
	if err != nil {
		return nil, err
	}

	// Declare DLQ
	_, err = ch.QueueDeclare("ptms.callbacks.dlq", true, false, false, false, nil)
	if err != nil {
		return nil, err
	}

	// Declare Retry Queue
	_, err = ch.QueueDeclare(
		"ptms.callbacks.retry",
		true,
		false,
		false,
		false,
		amqp.Table{
			"x-dead-letter-exchange":    "",
			"x-dead-letter-routing-key": "ptms.callbacks",
		},
	)
	if err != nil {
		return nil, err
	}

	return &callbackConsumer{
		conn:    conn,
		channel: ch,
		repo:    repo,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}, nil
}

func (c *callbackConsumer) Start(ctx context.Context) {
	msgs, err := c.channel.Consume(
		"ptms.callbacks",
		"",    // consumer
		false, // auto-ack (we use manual ack)
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		log.Fatalf("Failed to start consumer: %v", err)
	}

	log.Println("Callback Consumer started...")

	for {
		select {
		case <-ctx.Done():
			return
		case d, ok := <-msgs:
			if !ok {
				return
			}
			go c.handleDelivery(ctx, d)
		}
	}
}

func (c *callbackConsumer) handleDelivery(ctx context.Context, d amqp.Delivery) {
	var job domain.CallbackJob
	if err := json.Unmarshal(d.Body, &job); err != nil {
		log.Printf("Invalid job body: %v", err)
		d.Ack(false)
		return
	}

	// SSRF Protection: Validate URL at delivery time to prevent DNS rebinding
	if err := security.ValidateCallbackURL(job.CallbackURL); err != nil {
		log.Printf("SSRF validation failed for tx %s: %v", job.TransactionID, err)
		// Move to DLQ immediately as this is a permanent failure or security risk
		c.moveToDLQ(ctx, d, job)
		return
	}

	// 1. Attempt Delivery
	success := c.deliver(job)

	if success {
		// Update DB
		tx, err := c.repo.GetByID(ctx, job.TransactionID)
		if err == nil {
			tx.CallbackDelivered = true
			c.repo.UpdateReadModel(ctx, tx)
		}
		c.repo.StoreEvent(ctx, job.TransactionID, domain.EventCallbackForwarded, job)
		
		// Reset consecutive failure days on success
		if job.MerchantID != "" {
			c.repo.ResetWebhookFailureDays(ctx, job.MerchantID)
		}
		
		d.Ack(false)
		return
	}

	// 2. Retry Logic
	if job.RetryCount < 3 {
		job.RetryCount++
		log.Printf("Retrying callback for tx %s (Attempt %d)", job.TransactionID, job.RetryCount)

		delays := []string{"60000", "120000", "300000"}
		delay := delays[job.RetryCount-1]

		newBody, _ := json.Marshal(job)
		err := c.channel.PublishWithContext(ctx, "", "ptms.callbacks.retry", false, false, amqp.Publishing{
			ContentType: "application/json",
			Body:        newBody,
			Expiration:  delay,
		})

		if err != nil {
			log.Printf("Failed to publish retry for tx %s: %v", job.TransactionID, err)
			d.Nack(false, true)
			return
		}

		d.Ack(false)
		return
	}

	// 3. Move to DLQ
	c.moveToDLQ(ctx, d, job)
}

func (c *callbackConsumer) moveToDLQ(ctx context.Context, d amqp.Delivery, job domain.CallbackJob) {
	log.Printf("Callback for tx %s failed. Moving to DLQ.", job.TransactionID)
	err := c.channel.PublishWithContext(ctx, "", "ptms.callbacks.dlq", false, false, amqp.Publishing{
		ContentType: "application/json",
		Body:        d.Body,
	})

	if err != nil {
		log.Printf("Failed to publish to DLQ for tx %s: %v", job.TransactionID, err)
		d.Nack(false, true)
		return
	}

	c.repo.StoreEvent(ctx, job.TransactionID, domain.EventCallbackDeliveryFail, job)

	// Auto-disable logic for repeated failures
	if job.MerchantID != "" {
		c.checkAutoDisable(ctx, job.MerchantID)
	}

	// Check Alerting Logic (Mock)
	c.checkAlerting(ctx)

	d.Ack(false)
}

func (c *callbackConsumer) deliver(job domain.CallbackJob) bool {
	payload, err := json.Marshal(job.Data)
	if err != nil {
		return false
	}
	
	// Generate HMAC-SHA256 signature
	timestamp := strconv.FormatInt(time.Now().Unix(), 10)
	
	// Stripe-like signing format: t=timestamp,v1=signature
	// Signed string: timestamp + "." + payload
	signedString := timestamp + "." + string(payload)
	
	mac := hmac.New(sha256.New, []byte(job.WebhookSecret))
	mac.Write([]byte(signedString))
	fullSignature := "t=" + timestamp + ",v1=" + hex.EncodeToString(mac.Sum(nil))
	
	req, err := http.NewRequest("POST", job.CallbackURL, bytes.NewBuffer(payload))
	if err != nil {
		return false
	}
	
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Routex-Signature", fullSignature)
	req.Header.Set("X-Routex-Event", "payment." + job.Data.Status)
	req.Header.Set("X-Routex-Delivery-ID", job.TransactionID + "-" + strconv.Itoa(job.RetryCount))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		log.Printf("Delivery failed for tx %s: %v", job.TransactionID, err)
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode >= 200 && resp.StatusCode < 300
}

func (c *callbackConsumer) checkAlerting(ctx context.Context) {
	// 1. Check DLQ Depth
	q, err := c.channel.QueueInspect("ptms.callbacks.dlq")
	if err == nil && q.Messages > 1000 {
		log.Println("ALERT: DLQ depth exceeded 1000 messages!")
	}

	// 2. Check failure rate (In real scenario, use Prometheus metrics)
}

func (c *callbackConsumer) checkAutoDisable(ctx context.Context, merchantID string) {
	// Increment consecutive failure days logic
	err := c.repo.IncrementWebhookFailureDay(ctx, merchantID)
	if err != nil {
		log.Printf("Failed to increment failure day for merchant %s: %v", merchantID, err)
		return
	}
	
	days, err := c.repo.GetWebhookConsecutiveFailureDays(ctx, merchantID)
	if err != nil {
		return
	}
	
	if days >= 3 {
		err = c.repo.DisableMerchantWebhook(ctx, merchantID)
		if err == nil {
			log.Printf("Auto-disabled webhook for merchant %s after %d days of consecutive failures", merchantID, days)
		}
	}
}
