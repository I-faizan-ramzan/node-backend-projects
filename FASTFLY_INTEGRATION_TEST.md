# FastFly integration test

This project now includes a credential-free smoke-test client for the FastFly public API. It does not store Shopify, WooCommerce, or FastFly secrets in source code.

For local testing, run the FastFly Next.js application on port `3000`. The Node.js shop project is the test client and runs separately on port `3001`.

## Setup

Copy `.env.example` to `.env.local` and set the staging API key issued for the integration. Use a unique `FASTFLY_ORDER_ID` for each test run unless you intentionally want to verify idempotent retry behavior.

```bash
cp .env.example .env.local
npm run test:fastfly
```

The local target is `http://localhost:3000`. If your FastFly app uses another port, update `FASTFLY_BASE_URL` in `.env.local`.

The test imports one normalized order, repeats the same request with the same idempotency key, verifies that the same AWB is returned, and reads tracking for that AWB.

## Provider selection

For a custom API integration, the test calls `POST /api/v1/shipments` directly:

```env
FASTFLY_PROVIDER=custom_api
```

For Shopify:

```env
FASTFLY_PROVIDER=shopify
```

For WooCommerce:

```env
FASTFLY_PROVIDER=woocommerce
```

The FastFly API key must be scoped to the matching integration and include `shipments:create` and `tracking:read` permissions. The test does not print the key.

## Webhook testing

Provider webhooks are received by FastFly, not by this local shop app. To test them with a real store, the FastFly staging deployment must be publicly reachable and the Shopify/WooCommerce webhook must be configured to use the corresponding FastFly webhook URL. The provider secret and store credentials should be configured in FastFly’s integration settings, never committed here.

If the deployed endpoint uses `PUT /api/v1/integrations/orders`, set `FASTFLY_IMPORT_METHOD=PUT`; the default is `POST`.
