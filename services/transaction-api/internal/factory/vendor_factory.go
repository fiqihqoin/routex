package factory

import (
	"errors"

	"github.com/redis/go-redis/v9"
	"github.com/truechain/ptms/transaction-api/internal/providers"
	"github.com/truechain/ptms/transaction-api/internal/providers/midtrans"
	"github.com/truechain/ptms/transaction-api/internal/providers/pakailink"
	"github.com/truechain/ptms/transaction-api/internal/providers/paydia"
	"github.com/truechain/ptms/transaction-api/internal/providers/qoinhub"
	"github.com/truechain/ptms/transaction-api/internal/providers/xendit"
	"github.com/truechain/ptms/transaction-api/pkg/crypto"
)

var ErrUnsupportedVendor = errors.New("ErrUnsupportedVendor: vendor code not recognized")

type VendorFactory interface {
	Create(vendorCode string, encryptedCredentials string, baseURL string) (providers.VendorAdapter, string, error)
	CreateForCallback(vendorCode string) (providers.VendorAdapter, error)
}

type vendorFactory struct {
	rdb *redis.Client
}

func NewVendorFactory(rdb *redis.Client) VendorFactory {
	return &vendorFactory{rdb: rdb}
}

func (f *vendorFactory) Create(vendorCode string, encryptedCredentials string, baseURL string) (providers.VendorAdapter, string, error) {
	decrypted, err := crypto.DecryptRaw(encryptedCredentials)
	if err != nil {
		return nil, "", err
	}

	var adapter providers.VendorAdapter
	switch vendorCode {
	case "QOINHUB":
		adapter = qoinhub_adapter.NewQoinhubAdapter(baseURL)
	case "MIDTRANS":
		adapter = midtrans_adapter.NewMidtransAdapter(baseURL)
	case "XENDIT":
		adapter = xendit_adapter.NewXenditAdapter(baseURL)
	case "PAYDIA":
		adapter = paydia.NewPaydiaAdapter(baseURL, f.rdb)
	case "PAKAILINK":
		adapter = pakailink.NewPakailinkAdapter(baseURL, f.rdb)
	default:
		return nil, "", ErrUnsupportedVendor
	}

	return adapter, decrypted, nil
}

func (f *vendorFactory) CreateForCallback(vendorCode string) (providers.VendorAdapter, error) {
	// For callback validation, we don't usually need the baseURL for outbound calls,
	// but the constructor requires it now.
	dummyBaseURL := ""

	switch vendorCode {
	case "QOINHUB":
		return qoinhub_adapter.NewQoinhubAdapter(dummyBaseURL), nil
	case "MIDTRANS":
		return midtrans_adapter.NewMidtransAdapter(dummyBaseURL), nil
	case "XENDIT":
		return xendit_adapter.NewXenditAdapter(dummyBaseURL), nil
	case "PAYDIA":
		return paydia.NewPaydiaAdapter(dummyBaseURL, f.rdb), nil
	case "PAKAILINK":
		return pakailink.NewPakailinkAdapter(dummyBaseURL, f.rdb), nil
	default:
		return nil, ErrUnsupportedVendor
	}
}
