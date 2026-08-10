# NestJS Stripe Demo (PostgreSQL)

Production-style NestJS demo for **one-time payments**, **subscriptions**, **Checkout**, **PaymentIntents**, and **webhooks**, backed by PostgreSQL + TypeORM.

---

## Create / run in this order

### 1. Environment

```bash
cp .env.example .env
```

Fill in PostgreSQL credentials and Stripe **test** keys from [Stripe Dashboard → API keys](https://dashboard.stripe.com/test/apikeys).

| Variable | Purpose |
|----------|---------|
| `DB_*` | PostgreSQL connection |
| `STRIPE_SECRET_KEY` | Server-side Stripe SDK (`sk_test_...`) |
| `STRIPE_PUBLISHABLE_KEY` | Returned to clients for Elements / Checkout |
| `STRIPE_WEBHOOK_SECRET` | From Stripe CLI (`whsec_...`) |
| `FRONTEND_URL` | Success / cancel / portal return URLs |
| `PORT` | API port (default `3000`) |

### 2. Database

```bash
# create DB once
createdb stripe_demo
# or: psql -U postgres -c "CREATE DATABASE stripe_demo;"
```

### 3. Migration (create tables first)

```bash
npm install
npm run migration:run
```

| Migration file | What it creates |
|----------------|-----------------|
| `src/database/migrations/1730000000001-InitSchema.ts` | `users`, `products`, `prices`, `orders`, `subscriptions` + indexes |

### 4. Seeder (demo catalog + user)

```bash
npm run seed
```

| Seeder | What it creates |
|--------|-----------------|
| `src/database/seeds/run-seed.ts` | User `demo@stripe.dev`, product **Demo Starter Pack** ($19.99 one-time), product **Demo Pro Plan** ($9.99/mo). Syncs to Stripe when `STRIPE_SECRET_KEY` is real. |

### 5. Start API + webhooks

```bash
npm run start:dev

# separate terminal — Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Paste the CLI `whsec_...` into `.env` as `STRIPE_WEBHOOK_SECRET`, then restart the API.

---

## API endpoints

Base URL: `http://localhost:3000/api`

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness check |

### Users

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/users` | List users |
| `GET` | `/users/:id` | Get user |
| `POST` | `/users` | Create user + Stripe Customer |

```json
POST /api/users
{ "email": "alice@example.com", "fullName": "Alice Demo" }
```

### Products & prices

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/products` | List active products (+ prices) |
| `GET` | `/products/:id` | Product detail |
| `POST` | `/products` | Create product + price (syncs to Stripe) |
| `POST` | `/products/prices` | Add another price to a product |

```json
POST /api/products
{
  "name": "T-Shirt",
  "description": "Demo merch",
  "amount": 2500,
  "currency": "usd",
  "type": "one_time",
  "syncToStripe": true
}
```

```json
POST /api/products
{
  "name": "Team Plan",
  "amount": 2900,
  "type": "recurring",
  "interval": "month"
}
```

### Payments

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/payments/orders` | List orders (`?userId=`) |
| `GET` | `/payments/orders/:id` | Order detail |
| `POST` | `/payments/checkout-session` | Stripe Checkout (payment or subscription) |
| `POST` | `/payments/payment-intent` | PaymentIntent for Stripe Elements |

```json
POST /api/payments/checkout-session
{
  "userId": "<uuid>",
  "priceId": "<uuid>",
  "quantity": 1
}
```

Response includes `url` — open it in a browser (use Stripe test card `4242 4242 4242 4242`).

```json
POST /api/payments/payment-intent
{
  "userId": "<uuid>",
  "priceId": "<uuid>"
}
```

Response: `clientSecret` + `publishableKey` for Payment Element.

### Subscriptions

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/subscriptions` | List (`?userId=`) |
| `GET` | `/subscriptions/:id` | Detail |
| `POST` | `/subscriptions/billing-portal` | Stripe Customer Portal URL |
| `POST` | `/subscriptions/:id/cancel?atPeriodEnd=true` | Cancel (default: end of period) |

```json
POST /api/subscriptions/billing-portal
{ "userId": "<uuid>" }
```

### Webhooks

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/webhooks/stripe` | Stripe signed events (raw body) |

Handled events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`.

---

## Quick demo flow

1. `npm run migration:run` → `npm run seed`
2. `GET /api/users` and `GET /api/products` — note `userId` + `priceId`
3. `POST /api/payments/checkout-session` with those IDs
4. Open returned `url`, pay with `4242…`
5. Confirm webhook updates order / subscription
6. `GET /api/payments/orders` and `GET /api/subscriptions`

---

## Project layout

```
src/
  users/           # customers mirrored in Stripe
  products/        # products + prices
  payments/        # checkout, payment intents, orders
  subscriptions/   # local sub records + portal + cancel
  webhooks/        # Stripe webhook handler
  stripe/          # shared Stripe client
  database/
    migrations/    # run first
    seeds/         # run second
```

## Scripts

| Script | Command |
|--------|---------|
| Dev server | `npm run start:dev` |
| Run migrations | `npm run migration:run` |
| Revert last migration | `npm run migration:revert` |
| Seed demo data | `npm run seed` |
| Build | `npm run build` |
