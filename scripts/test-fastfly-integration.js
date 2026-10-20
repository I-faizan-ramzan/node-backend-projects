#!/usr/bin/env node

/**
 * FastFly staging integration smoke test.
 *
 * This script intentionally uses only environment variables for credentials.
 * It exercises the normalized Shopify/WooCommerce order-import API and then
 * verifies that a retry is idempotent and that the returned shipment can be
 * read through the tracking API.
 */

const fs = require("node:fs");
const path = require("node:path");

function loadOptionalEnvFile(filename) {
  const filePath = path.resolve(process.cwd(), filename);
  if (!fs.existsSync(filePath)) return;

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) process.env[key] = value;
  }
}

loadOptionalEnvFile(".env.local");
loadOptionalEnvFile(".env");

const baseUrl = (process.env.FASTFLY_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const apiKey = process.env.FASTFLY_API_KEY;
const provider = (process.env.FASTFLY_PROVIDER || "shopify").toLowerCase().replace(/[\s-]+/g, "_");
const orderId = process.env.FASTFLY_ORDER_ID || `node-test-${Date.now()}`;
const importMethod = (process.env.FASTFLY_IMPORT_METHOD || "POST").toUpperCase();

function required(name, value) {
  if (!value) throw new Error(`${name} is required. Set it in .env.local or your shell.`);
}

function requestHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    ...extra,
  };
}

async function request(label, endpoint, options = {}) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: requestHeaders(options.headers),
  });

  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok || body?.success === false) {
    const detail = typeof body === "string" ? body : JSON.stringify(body);
    throw new Error(`${label} failed (${response.status}): ${detail}`);
  }

  console.log(`✓ ${label} (${response.status})`);
  return body;
}

function getShipment(body) {
  return body?.data?.shipment || body?.data || body?.shipment || {};
}

function getAwb(body) {
  const shipment = getShipment(body);
  return shipment.awb || shipment.awbNumber || shipment.trackingNumber || body?.data?.awb;
}

function buildOrder() {
  if (provider === "shopify") {
    return {
      id: orderId,
      email: "fastfly.integration.test@example.com",
      total_price: process.env.FASTFLY_TEST_COD_AMOUNT || "2500.00",
      total_weight: 1.5,
      shipping_address: {
        name: "FastFly Integration Test",
        phone: process.env.FASTFLY_TEST_PHONE || "03001234567",
        address1: "House 12, Street 4",
        city: process.env.FASTFLY_TEST_CITY || "Lahore",
        zip: "54000",
      },
      line_items: [{ title: "Integration Test Item", quantity: 1 }],
    };
  }

  if (provider === "woocommerce") {
    return {
      id: orderId,
      number: orderId,
      total: process.env.FASTFLY_TEST_COD_AMOUNT || "2500.00",
      billing: {
        first_name: "FastFly",
        last_name: "Integration Test",
        phone: process.env.FASTFLY_TEST_PHONE || "03001234567",
        address_1: "House 12, Street 4",
        city: process.env.FASTFLY_TEST_CITY || "Lahore",
        postcode: "54000",
      },
      shipping: {
        first_name: "FastFly",
        last_name: "Integration Test",
        address_1: "House 12, Street 4",
        city: process.env.FASTFLY_TEST_CITY || "Lahore",
        postcode: "54000",
      },
      line_items: [{ name: "Integration Test Item", quantity: 1, total: "2500.00", weight: 1.5 }],
    };
  }

  throw new Error(`Unsupported FASTFLY_PROVIDER: ${provider}. Use custom_api, shopify, or woocommerce.`);
}

function buildCustomShipment() {
  return {
    orderId,
    customerName: "FastFly Custom API Test",
    customerPhone: process.env.FASTFLY_TEST_PHONE || "03001234567",
    deliveryAddress: "House 12, Street 4",
    city: process.env.FASTFLY_TEST_CITY || "Lahore",
    codAmount: Number(process.env.FASTFLY_TEST_COD_AMOUNT || 2500),
    weight: 1.5,
    pieces: 1,
  };
}

async function main() {
  required("FASTFLY_API_KEY", apiKey);
  if (!/^ff_(test|live)_/.test(apiKey)) {
    throw new Error("FASTFLY_API_KEY must use the ff_test_ or ff_live_ prefix.");
  }
  if (!/^https?:\/\//.test(baseUrl)) throw new Error("FASTFLY_BASE_URL must be an http(s) URL.");
  if (!['POST', 'PUT'].includes(importMethod)) throw new Error("FASTFLY_IMPORT_METHOD must be POST or PUT.");

  console.log(`FastFly integration smoke test: ${provider} order ${orderId}`);
  console.log(`Target: ${baseUrl}`);

  const isCustomApi = provider === "custom_api";
  const endpoint = isCustomApi ? "/api/v1/shipments" : "/api/v1/integrations/orders";
  const payload = isCustomApi ? buildCustomShipment() : { provider, order: buildOrder() };
  const first = await request("order import", endpoint, {
    method: importMethod,
    headers: { "Idempotency-Key": `${provider}-${orderId}` },
    body: JSON.stringify(payload),
  });

  const awb = getAwb(first);
  if (!awb) throw new Error("Order import succeeded, but no AWB was found in the response.");
  console.log(`  AWB: ${awb}`);

  const retry = await request("idempotent retry", endpoint, {
    method: importMethod,
    headers: { "Idempotency-Key": `${provider}-${orderId}` },
    body: JSON.stringify(payload),
  });
  const retryAwb = getAwb(retry);
  if (retryAwb !== awb) throw new Error(`Retry returned a different AWB (${retryAwb}); expected ${awb}.`);
  console.log("✓ retry reused the same shipment");

  await request("tracking lookup", `/api/v1/tracking/${encodeURIComponent(awb)}`, { method: "GET" });
  console.log("\nFastFly integration smoke test passed.");
}

main().catch((error) => {
  console.error(`\nFastFly integration smoke test failed: ${error.message}`);
  process.exitCode = 1;
});
