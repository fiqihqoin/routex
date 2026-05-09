package factory

import (
	"errors"

	"github.com/truechain/ptms/transaction-api/internal/providers"
	"github.com/truechain/ptms/transaction-api/internal/providers/midtrans"
	"github.com/truechain/ptms/transaction-api/internal/providers/qoinhub"
	"github.com/truechain/ptms/transaction-api/internal/providers/xendit"
	"github.com/truechain/ptms/transaction-api/pkg/crypto"
)

var ErrUnsupportedVendor = errors.New("ErrUnsupportedVendor: vendor code not recognized")

type VendorFactory interface {
	Create(vendorCode string, encryptedCredentials string, baseURL string) (providers.VendorAdapter, string, error)
	CreateForCallback(vendorCode string) (providers.VendorAdapter, error)
}

type vendorFactory struct{}

func NewVendorFactory() VendorFactory {
	return &vendorFactory{}
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
	default:
		return nil, ErrUnsupportedVendor
	}
}
