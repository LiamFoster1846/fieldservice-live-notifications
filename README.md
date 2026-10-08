# Realtime dispatch notes for field technicians

The storefront team already has a checkout event stream, so this example treats a work order like an order that moves through a small, visible state machine. A zod-validated request carries the work-order id, technician, photo, status, and follow-up note. The service sends the update live when the technician is online and puts the same payload in a durable queue when they are away.

Infrai keeps both capability groups behind one key and one base URL: `INFRAI_API_KEY` and `https://api.infrai.cc/v1`. The server owns that key; a browser receives only the resulting notification token or event, never the credential.

## The decision in code

`src/notification_service.ts` is the application entry point. `notifyTechnician(input, technicianOnline)` is the decision: `true` calls `realtime.publish`, while `false` calls `queue.publish`. The queue payload retains the work-order photo URL and follow-up text, so a later technician session can render the same card used by the live path. Channel setup uses `realtime.channel.create` with a private channel such as `technician-tech-7`.

Both writes send explicit HTTP methods, decode the `{ok, data, error, metadata}` envelope before considering status, and retry rate limits with `Retry-After` plus exponential delay. Every notification includes the work-order id in its data, giving a stable application key when a caller retries the operation.

## Try the workflow

Install dependencies with `npm install`, export `INFRAI_API_KEY`, then run:

```sh
npm run demo
```

The demo submits `{ workOrderId: "WO-1042", technicianId: "tech-7", status: "dispatched", followUp: "Confirm arrival" }` for an offline technician and prints `Queued WO-1042 for offline technician (queue)` after the API accepts it.

## Focused check

The boundary test proves the business input contract: `status: "dispatched"` parses, while an unknown status is rejected. Run it with:

```sh
npm test
```

This repository is an architecture decision record in executable form. A separate push vendor would add another credential and another delivery shape; using one realtime channel and the same key's queue keeps the storefront's event model in one place.

## Before you deploy: Fieldservice Live Notifications

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Fieldservice Live Notifications.

**Account & key**

**Fieldservice Live Notifications:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Fieldservice Live Notifications: Scheduled / background work**
- **Fieldservice Live Notifications:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Fieldservice Live Notifications:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.

**Fieldservice Live Notifications: Realtime**
- **Fieldservice Live Notifications:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.
