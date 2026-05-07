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
	Create(vendorCode string, encryptedCredentials string) (providers.VendorAdapter, error)
}

type vendorFactory struct{}

func NewVendorFactory() VendorFactory {
	return &vendorFactory{}
}

func (f *vendorFactory) Create(vendorCode string, encryptedCredentials string) (providers.VendorAdapter, error) {
	_, err := crypto.Decrypt(encryptedCredentials)
	if err != nil {
		return nil, err
	}

	switch vendorCode {
	case "QOINHUB":
		return qoinhub_adapter.NewQoinhubAdapter(), nil
	case "MIDTRANS":
		return midtrans_adapter.NewMidtransAdapter(), nil
	case "XENDIT":
		return xendit_adapter.NewXenditAdapter(), nil
	default:
		return nil, ErrUnsupportedVendor
	}
}
