# Socket.IO — order / payment notifications (NestJS)

Realtime fan-out for Stripe order + subscription status. **Not** a chat product.

## Mental model (same as your Express app)

| Layer | Role |
|-------|------|
| REST / webhooks | Source of truth (create/update order in DB) |
| Socket.IO | Push already-committed state to online users |
| Presence map `StripeDemo:{userId}` | Routing / isOnline table |
| Room `user:{userId}` | Multi-device emit target (Nest upgrade over single socketId) |

Pattern after DB success:

```ts
await this.ordersRepo.save(order);
this.safeEmit(() => this.socketEmit.emitPaymentSucceeded(userId, order));
```

Never let socket errors fail the HTTP response.

## Folder map

| File | Role (Express counterpart) |
|------|----------------------------|
| `src/socket/order-socket.gateway.ts` | `chatSocket.ts` — IO, auth, presence, listeners |
| `src/socket/socket-emit.service.ts` | `chatSocketEvents.ts` — `getIO()` + emit helpers |
| `src/socket/presence/socket-presence.service.ts` | `CacheService.set("FetchIt", userId, socketId)` |
| `src/socket/validation/socket-validation.ts` | `chatSocketValidationRules.ts` |
| `src/socket/constants/socket-events.ts` | `Constants.SOCKET_EVENTS` |
| `src/auth/*` | JWT mint + verify for handshake |

## Connection flow

1. Client gets JWT: `POST /api/auth/socket-token` `{ "userId": "..." }` or `{ "email": "demo@stripe.dev" }`
2. Client connects with JWT in one of:
   - `auth: { authorization: accessToken }` (preferred)
   - `headers.authorization`
   - `query.authorization`
3. Gateway verifies JWT → loads user → `socket.user`
4. Presence: `set(userId, socketId, ttlMs: 0)` — **no 5‑minute expiry**
5. Room: `socket.join("user:" + userId)`
6. On disconnect: presence deleted only if socketId still matches

## Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `orderStatusUpdated` | Server → user | Order status change |
| `paymentSucceeded` | Server → user | Paid |
| `paymentFailed` | Server → user | Failed |
| `subscriptionUpdated` | Server → user | Sub create/update/cancel |
| `socketError` | Server → client | Validation / auth errors |
| `heartbeat` | Client → server | Optional presence touch |
| `clientPing` / `clientPong` | Bidirectional | Demo validated inbound |

Who emits today:

- `PaymentsService` → checkout created, paid, failed
- `SubscriptionsService` → upsert / cancel
- Stripe webhooks call those services → sockets fire after DB write

## Client (JS)

```js
import { io } from "socket.io-client";

const { accessToken } = await fetch("http://localhost:3000/api/auth/socket-token", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "demo@stripe.dev" }),
}).then((r) => r.json());

const socket = io("http://localhost:3000", {
  transports: ["websocket", "polling"],
  auth: { authorization: accessToken },
});

socket.on("connect", () => console.log("connected", socket.id));
socket.on("connect_error", (err) => console.error(err.message));
socket.on("orderStatusUpdated", (p) => console.log("order", p));
socket.on("paymentSucceeded", (p) => console.log("paid", p));
socket.on("paymentFailed", (p) => console.log("failed", p));
socket.on("subscriptionUpdated", (p) => console.log("sub", p));
socket.on("socketError", (e) => console.error(e));

// optional heartbeat every 60s
setInterval(() => socket.emit("heartbeat", {}), 60_000);
```

Or open `examples/socket-client.html` in a browser.

## Add a new notification (3 places)

1. Event string in `SOCKET_EVENTS`
2. Helper on `SocketEmitService` (`emitX`)
3. Call it from HTTP/webhook service after DB success (wrap in try/catch)

If clients must send an event:

1. DTO in `socket/dto`
2. Register in `SOCKET_INBOUND_VALIDATORS` (event name must match constant)
3. `@SubscribeMessage(SOCKET_EVENTS.X)` in the gateway

## Fixes applied vs Express gaps you listed

| Gap | Nest demo fix |
|-----|----------------|
| 300s TTL drops online users | Presence `ttlMs: 0` while connected |
| Wrong emit helper / event name mismatch | One source of truth: `SOCKET_EVENTS` + validators keyed by same strings |
| Single socket overwrite | Rooms `user:{id}` + presence still tracks latest socketId |
| “chat” naming | Folder is `socket/` — docs say order notifications |

## Debug HTTP

- `GET /api/socket/events` — event name map
- `GET /api/socket/online` — presence snapshot

## Rules of thumb

- Always send a valid JWT; connection is rejected without it.
- Treat sockets as **push only** for payments; core logic stays in REST + Stripe webhooks.
- Reconnect with a fresh token after login/refresh.
- For multi-device, rely on rooms (already joined); don’t assume one device.
