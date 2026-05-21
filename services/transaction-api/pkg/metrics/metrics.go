package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	RoutingDuration = promauto.NewHistogram(prometheus.HistogramOpts{
		Name:    "caishenengine_routing_duration_seconds",
		Help:    "Latency of routing decisions",
		Buckets: prometheus.DefBuckets,
	})

	QRISGenerationDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name:    "caishenengine_qris_generation_duration_seconds",
		Help:    "Latency of QRIS generation including vendor call",
		Buckets: prometheus.DefBuckets,
	}, []string{"vendor_id"})

	QRISGenerationTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "caishenengine_qris_generation_total",
		Help: "Total QRIS generation requests",
	}, []string{"vendor_id", "status"})

	CallbackForwardDuration = promauto.NewHistogram(prometheus.HistogramOpts{
		Name:    "caishenengine_callback_forward_duration_seconds",
		Help:    "Latency of forwarding callback to user",
		Buckets: prometheus.DefBuckets,
	})

	RateLimitRejections = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "caishenengine_rate_limit_rejections_total",
		Help: "Total requests rejected by rate limiter",
	}, []string{"entity_type", "entity_id", "reason"})

	CircuitBreakerState = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Name: "caishenengine_circuit_breaker_state",
		Help: "Current state of vendor circuit breaker (0=Closed, 1=Open, 2=Half-Open)",
	}, []string{"vendor_id"})

	PenaltyScore = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Name: "caishenengine_penalty_score",
		Help: "Current effective penalty score per vendor/account",
	}, []string{"vendor_id", "account_id"})
)

func SetCBState(vendorID string, state string) {
	val := 0.0
	switch state {
	case "OPEN":
		val = 1.0
	case "HALF_OPEN":
		val = 2.0
	}
	CircuitBreakerState.WithLabelValues(vendorID).Set(val)
}
