"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppSelector } from "@/redux/store";
import { API_BASE_URL } from "@/config/api";
import ClientGuard from "@/components/ClientGuard";
import {
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

const BASE = `${API_BASE_URL}/api/v1`;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded text-[10px] bg-gray-200 dark:bg-navy-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-navy-500 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <><CheckIcon className="h-3 w-3 text-green-500" /> Copied</>
      ) : (
        <><ClipboardDocumentIcon className="h-3 w-3" /> Copy</>
      )}
    </button>
  );
}

interface Section {
  id: string;
  title: string;
  content: string;
}

function buildSections(): Section[] {
  return [
    {
      id: "quickstart",
      title: "Quick Start",
      content: `## Integration in 5 Steps

**Base URL:** \`${BASE}\`

Every request requires your API key in the **X-API-Key** header.

### Step 1: Register a Customer

When a user signs up in your system, register them with the engine. They start at T0 (provisional) with zero transaction limits.

\`\`\`bash
curl -X POST ${BASE}/customers \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "external_id": "USR-001",
    "entity_type": "INDIVIDUAL",
    "name": "Kwame Asante",
    "email": "kwame@example.com",
    "phone": "0201234567"
  }'
\`\`\`

### Step 2: Evaluate Events

Before processing a transaction, login, or any risky action, ask the engine for a decision.

\`\`\`bash
curl -X POST ${BASE}/decisions/evaluate \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "event_type": "TRANSACTION",
    "external_id": "USR-001",
    "amount": 500,
    "currency": "GHS"
  }'
\`\`\`

### Step 3: Act on the Decision

| Action | What your system should do |
|--------|---------------------------|
| **ALLOW** | Process the transaction normally |
| **BLOCK** | Deny the transaction, show error |
| **REVIEW** | Queue for manual compliance review |
| **UPGRADE_REQUIRED** | Customer needs higher KYC tier — see Step 4 |
| **STEP_UP** | Request additional auth (OTP, biometric) |
| **FREEZE** | Lock the account, alert compliance |

### Step 4: Handle UPGRADE_REQUIRED

When the response includes \`action: "UPGRADE_REQUIRED"\`, check the \`workflow\` and \`target_tier\` fields. Run verification in **your** system, then report the result.

\`\`\`bash
curl -X POST ${BASE}/customers/USR-001/verification-complete \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "verification_type": "W2",
    "result": "passed"
  }'
\`\`\`

Customer upgrades to the next tier with higher limits.

### Step 5: Check Limits Anytime

\`\`\`bash
curl "${BASE}/customers/USR-001/tier" \\
  -H "X-API-Key: YOUR_API_KEY"
\`\`\``,
    },
    {
      id: "tiers",
      title: "Tier System",
      content: `## KYC Tiers (Individuals)

Customers progress through tiers as they complete verification:

| Tier | Name | Daily Limit | Monthly Limit | Per-Txn | Verification |
|------|------|-------------|---------------|---------|-------------|
| **T0** | Provisional | GHS 0 | GHS 0 | GHS 0 | Phone + OTP only |
| **T1** | Basic | GHS 1,000 | GHS 5,000 | GHS 500 | Name + DOB + AML screen |
| **T2** | Standard | GHS 10,000 | GHS 100,000 | GHS 5,000 | ID doc + selfie + liveness |
| **T3** | Enhanced | Unlimited | Unlimited | GHS 50,000 | Video KYC + address + source of funds |

**Upgrade path:** T0 → T1 (W1) → T2 (W2) → T3 (W4). Sequential only, no skipping.

## KYB Tiers (Businesses)

| Tier | Name | Daily Limit | Monthly Limit | Verification |
|------|------|-------------|---------------|-------------|
| **B0** | Provisional | GHS 0 | GHS 0 | Basic registration only |
| **B1** | Basic | GHS 5,000 | GHS 50,000 | Director ID + company docs |
| **B2** | Standard | GHS 50,000 | GHS 500,000 | UBO verification + address |
| **B3** | Enhanced | Unlimited | Unlimited | Full EDD + video + site visit |

**Upgrade path:** B0 → B1 (BW1) → B2 (BW2) → B3 (BW3).

## Checking Transaction Limits

Before processing a payment, use the lightweight limit check:

\`\`\`bash
curl -X POST ${BASE}/customers/USR-001/check-transaction \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 500
  }'
\`\`\``,
    },
    {
      id: "sdks",
      title: "SDKs",
      content: `## Official SDKs

We provide official SDKs for Python and JavaScript/Node.js.

### Python SDK

\`\`\`bash
pip install autheo
\`\`\`

\`\`\`python
from autheo import AutheoClient

client = AutheoClient(
    api_key="YOUR_API_KEY",
    base_url="${API_BASE_URL}",
)

# Register a customer
customer = client.register_customer(
    external_id="USR-001",
    name="Kwame Asante",
    phone="+233201234567",
)

# Evaluate a transaction
decision = client.evaluate(
    external_id="USR-001",
    event_type="TRANSACTION",
    amount=500,
    currency="GHS",
)

if decision["action"] == "ALLOW":
    process_transaction()
elif decision["action"] == "UPGRADE_REQUIRED":
    run_verification(decision["workflow"])
    client.verification_complete(
        external_id="USR-001",
        verification_type=decision["workflow"],
        result="passed",
    )
elif decision["action"] == "BLOCK":
    deny_transaction(decision["reason"])

# Bulk register (up to 1000)
results = client.bulk_register([
    {"external_id": "USR-001", "name": "Kwame Asante"},
    {"external_id": "USR-002", "name": "Ama Serwaa", "entity_type": "BUSINESS"},
])
\`\`\`

### JavaScript / Node.js SDK

\`\`\`bash
npm install autheo-sdk
\`\`\`

\`\`\`javascript
const { AutheoClient } = require('autheo-sdk');

const client = new AutheoClient({
  apiKey: 'YOUR_API_KEY',
  baseUrl: '${API_BASE_URL}',
});

// Register a customer
const customer = await client.registerCustomer({
  externalId: 'USR-001',
  name: 'Kwame Asante',
});

// Evaluate a transaction
const decision = await client.evaluate({
  externalId: 'USR-001',
  eventType: 'TRANSACTION',
  amount: 500,
});

// Bulk register
const results = await client.bulkRegister([
  { externalId: 'USR-001', name: 'Kwame Asante' },
  { externalId: 'USR-002', name: 'Ama Serwaa', entityType: 'BUSINESS' },
]);
\`\`\`

### Error Handling

Both SDKs throw typed exceptions:

| Exception | HTTP Status | When |
|-----------|------------|------|
| \`AutheoAuthError\` | 401/403 | Invalid or missing API key |
| \`AutheoNotFoundError\` | 404 | Customer or resource not found |
| \`AutheoValidationError\` | 422 | Invalid request body |
| \`AutheoRateLimitError\` | 429 | Rate limit exceeded (includes \`retry_after\`) |
| \`AutheoError\` | Other | General API errors |

Both SDKs include automatic retry with exponential backoff on 429 and 5xx errors.`,
    },
    {
      id: "webhooks",
      title: "Webhooks",
      content: `## Webhook Events

Register a webhook URL to receive real-time notifications. All payloads are signed with HMAC-SHA256.

| Event | When It Fires |
|-------|--------------|
| \`decision.made\` | Every decision evaluated |
| \`tier.changed\` | Customer tier upgraded |
| \`alert.high_risk\` | Risk score >= 80 |
| \`customer.flagged\` | Customer flagged for review |

## Creating a Webhook

\`\`\`bash
curl -X POST ${BASE}/webhooks \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://your-backend.com/webhooks/kyc",
    "events": ["decision.made", "tier.changed"],
    "description": "Production webhook"
  }'
\`\`\`

The response includes a \`secret\` — **save it securely**, it is shown only once and cannot be retrieved later.

## Verifying Signatures

All webhook deliveries include an \`X-Webhook-Signature\` header.

**Python:**
\`\`\`python
import hmac, hashlib

def verify_webhook(payload_bytes, signature, secret):
    expected = "sha256=" + hmac.new(
        secret.encode(), payload_bytes, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
\`\`\`

**Node.js:**
\`\`\`javascript
const crypto = require("crypto");

function verifyWebhook(payload, signature, secret) {
  const expected = "sha256=" + crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expected), Buffer.from(signature)
  );
}
\`\`\``,
    },
    {
      id: "api-reference",
      title: "API Reference",
      content: `## Core Endpoints

### Customers

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | \`/customers\` | Register new customer (T0/B0) |
| POST | \`/customers/bulk\` | Bulk register (up to 1000) |
| GET | \`/customers/{id}/tier\` | Get tier, limits, usage |
| POST | \`/customers/{id}/check-transaction\` | Check if amount is within limits |
| POST | \`/customers/{id}/verification-complete\` | Report verification result |

### Decisions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | \`/decisions/evaluate\` | Evaluate event against rules |
| GET | \`/decisions\` | Decision history (paginated) |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | \`/webhooks\` | Create webhook (returns signing secret) |
| GET | \`/webhooks\` | List webhooks |
| POST | \`/webhooks/{id}/test\` | Test webhook delivery |
| PATCH | \`/webhooks/{id}\` | Update webhook |
| DELETE | \`/webhooks/{id}\` | Delete webhook |

### Client Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | \`/clients/me\` | Get your client profile |
| POST | \`/clients/me/rotate-key\` | Rotate API key (0-72h grace period) |
| GET | \`/clients/me/integration-status\` | Integration checklist |

### Usage, Audit & Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | \`/usage\` | API usage metrics |
| GET | \`/audit-trail\` | Your audit trail |
| GET | \`/health\` | Health check |

## Authentication

Include \`X-API-Key: YOUR_KEY\` header on all requests. Get your API key from the dashboard Settings page.

## Error Codes

All error responses include an \`error_code\` field for programmatic handling:

| Status | Error Code | Meaning |
|--------|-----------|---------|
| 401 | \`UNAUTHORIZED\` | Missing or invalid API key |
| 403 | \`FORBIDDEN\` | Insufficient permissions |
| 404 | \`NOT_FOUND\` | Resource not found |
| 422 | \`VALIDATION_ERROR\` | Invalid request body |
| 429 | \`RATE_LIMIT_EXCEEDED\` | Too many requests (check Retry-After header) |

## Idempotency

All POST endpoints support an \`Idempotency-Key\` header. If you send the same key twice within 24 hours, you get the cached response back (with \`X-Idempotent-Replay: true\` header).

## API Versioning

All responses include an \`API-Version\` header (currently \`1.0.0\`). The API follows semantic versioning — breaking changes only happen on major version bumps.`,
    },
  ];
}

export default function DocsPage() {
  useEffect(() => {
    document.title = "API Docs | Deferred KYC";
  }, []);
  const clientId = useAppSelector((s) => s.auth.clientId) || "";
  const [activeId, setActiveId] = useState("quickstart");

  const sections = buildSections();
  const active = sections.find((s) => s.id === activeId) || sections[0];

  const handleDownloadOpenAPI = () => {
    window.open(`${API_BASE_URL}/openapi.json`, "_blank");
  };

  const handlePostmanImport = () => {
    // Postman can import OpenAPI specs directly via URL
    const openApiUrl = encodeURIComponent(`${API_BASE_URL}/openapi.json`);
    window.open(`https://www.postman.com/import?url=${openApiUrl}`, "_blank");
  };

  return (
    <ClientGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Integration Guide
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Everything you need to integrate the Deferred KYC Engine
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadOpenAPI}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white dark:bg-navy-700 border dark:border-navy-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              OpenAPI Spec
            </button>
            <button
              onClick={handlePostmanImport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Postman
            </button>
            <a
              href={`${API_BASE_URL}/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-600 transition-colors"
            >
              Swagger UI &rarr;
            </a>
          </div>
        </div>

        {/* Your credentials */}
        <div className="bg-primary-50 dark:bg-navy-700 border border-primary-200 dark:border-navy-600 rounded-xl p-5">
          <h3 className="font-semibold text-primary-800 dark:text-primary-300 mb-3">
            Your Credentials
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400 block text-xs mb-1">
                Base URL
              </span>
              <div className="flex items-center">
                <code className="bg-primary-100 dark:bg-navy-800 px-2 py-1 rounded font-mono text-xs truncate">
                  {BASE}
                </code>
                <CopyButton text={BASE} />
              </div>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400 block text-xs mb-1">
                Client ID
              </span>
              <div className="flex items-center">
                <code className="bg-primary-100 dark:bg-navy-800 px-2 py-1 rounded font-mono text-xs truncate">
                  {clientId || "—"}
                </code>
                {clientId && <CopyButton text={clientId} />}
              </div>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400 block text-xs mb-1">
                API Key
              </span>
              <code className="bg-primary-100 dark:bg-navy-800 px-2 py-1 rounded font-mono text-xs block truncate">
                Manage in Settings &rarr; API Key tab
              </code>
            </div>
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex flex-wrap gap-2">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeId === s.id
                  ? "bg-primary text-white"
                  : "bg-white dark:bg-navy-700 border dark:border-navy-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600"
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {renderMarkdown(active.content)}
          </div>
        </div>
      </div>
    </ClientGuard>
  );
}

function renderMarkdown(content: string) {
  const blocks = content.split("\n\n");
  return blocks.map((block, i) => {
    const trimmed = block.trim();

    // Code blocks
    if (trimmed.startsWith("```")) {
      const lines = trimmed.split("\n");
      const lang = lines[0].replace("```", "").trim();
      const code = lines
        .slice(1, lines[lines.length - 1] === "```" ? -1 : undefined)
        .join("\n");
      return (
        <pre
          key={i}
          className="bg-gray-900 dark:bg-navy-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-xs my-3 relative group"
        >
          {lang && (
            <span className="absolute top-2 right-3 text-gray-500 text-[10px] uppercase">
              {lang}
            </span>
          )}
          <code>{code}</code>
        </pre>
      );
    }

    // Tables
    if (trimmed.includes("|") && trimmed.includes("---")) {
      const rows = trimmed
        .split("\n")
        .filter((r) => !r.match(/^\|[\s-|]+\|$/));
      const headerCells = rows[0]
        ?.split("|")
        .filter(Boolean)
        .map((c) => c.trim());
      const bodyRows = rows.slice(1);

      return (
        <div key={i} className="overflow-x-auto my-3">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b dark:border-navy-600">
                {headerCells?.map((cell, j) => (
                  <th
                    key={j}
                    className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 text-xs"
                  >
                    {renderInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => {
                const cells = row
                  .split("|")
                  .filter(Boolean)
                  .map((c) => c.trim());
                return (
                  <tr
                    key={ri}
                    className="border-b dark:border-navy-600/50"
                  >
                    {cells.map((cell, ci) => (
                      <td
                        key={ci}
                        className="px-3 py-2 text-gray-600 dark:text-gray-400 text-xs"
                      >
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    // Headings
    if (trimmed.startsWith("## ")) {
      return (
        <h2
          key={i}
          className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3"
        >
          {trimmed.replace("## ", "")}
        </h2>
      );
    }
    if (trimmed.startsWith("### ")) {
      return (
        <h3
          key={i}
          className="text-base font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-2"
        >
          {trimmed.replace("### ", "")}
        </h3>
      );
    }

    // Regular paragraphs
    return (
      <div
        key={i}
        className="text-sm text-gray-700 dark:text-gray-300 my-2 whitespace-pre-wrap leading-relaxed"
      >
        {renderInline(trimmed)}
      </div>
    );
  });
}

function renderInline(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, j) => {
    if (!part) return null;
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={j}
          className="bg-gray-100 dark:bg-navy-800 px-1 py-0.5 rounded text-xs font-mono text-primary-700 dark:text-primary-300"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={j} className="font-semibold text-gray-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={j}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return <span key={j}>{part}</span>;
  });
}
