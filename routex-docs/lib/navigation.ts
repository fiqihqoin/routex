export type NavItem = {
  title: { id: string; en: string }
  slug: string
  badge?: 'new' | 'beta' | 'deprecated'
  items?: NavItem[]
}

export type NavSection = {
  title: { id: string; en: string }
  icon: string   // lucide icon name
  items: NavItem[]
}

export const navigation: NavSection[] = [
  {
    title: { id: 'Mulai', en: 'Get Started' },
    icon: 'rocket',
    items: [
      {
        title: { 
          id: 'Pengenalan', 
          en: 'Introduction' 
        },
        slug: 'getting-started/introduction',
      },
      {
        title: { 
          id: 'Quick Start', 
          en: 'Quick Start' 
        },
        slug: 'getting-started/quickstart',
      },
      {
        title: { 
          id: 'Autentikasi', 
          en: 'Authentication' 
        },
        slug: 'getting-started/authentication',
      },
      {
        title: { 
          id: 'Environments', 
          en: 'Environments' 
        },
        slug: 'getting-started/environments',
      },
      {
        title: { 
          id: 'Error Handling', 
          en: 'Error Handling' 
        },
        slug: 'getting-started/errors',
      },
      {
        title: { 
          id: 'Idempotency', 
          en: 'Idempotency' 
        },
        slug: 'getting-started/idempotency',
      },
    ]
  },
  {
    title: { id: 'API Reference', en: 'API Reference' },
    icon: 'code-2',
    items: [
      {
        title: { 
          id: 'Generate QRIS', 
          en: 'Generate QRIS' 
        },
        slug: 'api-reference/generate-qris',
        badge: 'new',
      },
      {
        title: { 
          id: 'Cek Status Transaksi', 
          en: 'Get Transaction Status' 
        },
        slug: 'api-reference/transaction-status',
      },
      {
        title: { 
          id: 'List Transaksi', 
          en: 'List Transactions' 
        },
        slug: 'api-reference/list-transactions',
      },
    ]
  },
  {
    title: { id: 'Webhook', en: 'Webhooks' },
    icon: 'webhook',
    items: [
      {
        title: { 
          id: 'Pengenalan Webhook', 
          en: 'Webhook Overview' 
        },
        slug: 'webhooks/overview',
      },
      {
        title: { 
          id: 'Setup Endpoint', 
          en: 'Setup Endpoint' 
        },
        slug: 'webhooks/setup',
      },
      {
        title: { 
          id: 'Verifikasi Signature', 
          en: 'Verify Signature' 
        },
        slug: 'webhooks/signature-verification',
      },
      {
        title: { 
          id: 'Format Payload', 
          en: 'Payload Format' 
        },
        slug: 'webhooks/payload-format',
      },
      {
        title: { 
          id: 'Retry & DLQ', 
          en: 'Retry & DLQ' 
        },
        slug: 'webhooks/retry',
      },
    ]
  },
  {
    title: { id: 'Panduan Integrasi', en: 'Guides' },
    icon: 'book-open',
    items: [
      {
        title: { 
          id: 'Integrasi Node.js', 
          en: 'Node.js Integration' 
        },
        slug: 'guides/nodejs',
      },
      {
        title: { 
          id: 'Integrasi PHP / Laravel', 
          en: 'PHP / Laravel Integration' 
        },
        slug: 'guides/php-laravel',
      },
      {
        title: { 
          id: 'Integrasi Python', 
          en: 'Python Integration' 
        },
        slug: 'guides/python',
      },
      {
        title: { 
          id: 'Integrasi Go', 
          en: 'Go Integration' 
        },
        slug: 'guides/go',
      },
      {
        title: { 
          id: 'Testing di Sandbox', 
          en: 'Testing in Sandbox' 
        },
        slug: 'guides/sandbox-testing',
      },
      {
        title: { 
          id: 'Go Live ke Production', 
          en: 'Going Live' 
        },
        slug: 'guides/going-live',
      },
      {
        title: { 
          id: 'Best Practices', 
          en: 'Best Practices' 
        },
        slug: 'guides/best-practices',
      },
    ]
  },
  {
    title: { id: 'Referensi', en: 'Reference' },
    icon: 'layers',
    items: [
      {
        title: { 
          id: 'Error Codes', 
          en: 'Error Codes' 
        },
        slug: 'reference/error-codes',
      },
      {
        title: { 
          id: 'Status Transaksi', 
          en: 'Transaction Status' 
        },
        slug: 'reference/transaction-status',
      },
      {
        title: { 
          id: 'Vendor yang Didukung', 
          en: 'Supported Vendors' 
        },
        slug: 'reference/vendors',
      },
      {
        title: { 
          id: 'Rate Limits', 
          en: 'Rate Limits' 
        },
        slug: 'reference/rate-limits',
      },
      {
        title: { 
          id: 'Idempotency Keys', 
          en: 'Idempotency Keys' 
        },
        slug: 'reference/idempotency',
      },
    ]
  },
  {
    title: { id: 'Changelog', en: 'Changelog' },
    icon: 'history',
    items: [
      {
        title: { id: 'v1.0.0', en: 'v1.0.0' },
        slug: 'changelog/v1-0-0',
        badge: 'new',
      },
    ]
  },
]
