import 'reflect-metadata';
import { config as dotenvConfig } from 'dotenv';
import Stripe from 'stripe';
import { AppDataSource } from '../data-source';
import { User } from '../../users/user.entity';
import { Product } from '../../products/product.entity';
import { Price } from '../../products/price.entity';

dotenvConfig({ path: '.env' });

/**
 * Run AFTER migrations: npm run seed
 * Creates demo user + one-time + subscription products in DB and Stripe (if key is set).
 */
async function seed() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const syncStripe = Boolean(stripeKey && !stripeKey.includes('xxxxxxxx'));
  const currency = (process.env.STRIPE_CURRENCY || 'usd').toLowerCase();

  const stripe = syncStripe ? new Stripe(stripeKey!) : null;

  if (!syncStripe) {
    console.warn(
      'STRIPE_SECRET_KEY not set — seeding local DB only (no Stripe IDs).',
    );
  }

  await AppDataSource.initialize();
  const usersRepo = AppDataSource.getRepository(User);
  const productsRepo = AppDataSource.getRepository(Product);
  const pricesRepo = AppDataSource.getRepository(Price);

  // --- Demo user ---
  let user = await usersRepo.findOne({ where: { email: 'demo@stripe.dev' } });
  if (!user) {
    let stripeCustomerId: string | null = null;
    if (stripe) {
      const customer = await stripe.customers.create({
        email: 'demo@stripe.dev',
        name: 'Demo User',
        metadata: { seeded: 'true' },
      });
      stripeCustomerId = customer.id;
    }
    user = await usersRepo.save(
      usersRepo.create({
        email: 'demo@stripe.dev',
        fullName: 'Demo User',
        stripeCustomerId,
      }),
    );
    console.log('Created user:', user.id, user.email);
  } else {
    console.log('User already exists:', user.id);
  }

  // --- One-time product ---
  await upsertCatalog({
    productsRepo,
    pricesRepo,
    stripe,
    currency,
    name: 'Demo Starter Pack',
    description: 'One-time purchase demo product',
    amount: 1999,
    type: 'one_time',
    interval: null,
  });

  // --- Subscription product ---
  await upsertCatalog({
    productsRepo,
    pricesRepo,
    stripe,
    currency,
    name: 'Demo Pro Plan',
    description: 'Monthly subscription demo',
    amount: 999,
    type: 'recurring',
    interval: 'month',
  });

  await AppDataSource.destroy();
  console.log('Seed complete.');
}

async function upsertCatalog(opts: {
  productsRepo: ReturnType<typeof AppDataSource.getRepository<Product>>;
  pricesRepo: ReturnType<typeof AppDataSource.getRepository<Price>>;
  stripe: Stripe | null;
  currency: string;
  name: string;
  description: string;
  amount: number;
  type: 'one_time' | 'recurring';
  interval: 'month' | null;
}) {
  const {
    productsRepo,
    pricesRepo,
    stripe,
    currency,
    name,
    description,
    amount,
    type,
    interval,
  } = opts;

  let product = await productsRepo.findOne({
    where: { name },
    relations: ['prices'],
  });

  if (product) {
    console.log(`Product already exists: ${name}`);
    return product;
  }

  let stripeProductId: string | null = null;
  let stripePriceId: string | null = null;

  if (stripe) {
    const sp = await stripe.products.create({
      name,
      description,
      metadata: { seeded: 'true' },
    });
    stripeProductId = sp.id;
    const spr = await stripe.prices.create({
      product: sp.id,
      unit_amount: amount,
      currency,
      ...(type === 'recurring' && interval
        ? { recurring: { interval } }
        : {}),
    });
    stripePriceId = spr.id;
  }

  product = await productsRepo.save(
    productsRepo.create({
      name,
      description,
      stripeProductId,
      isActive: true,
    }),
  );

  await pricesRepo.save(
    pricesRepo.create({
      productId: product.id,
      stripePriceId,
      amount,
      currency,
      type,
      interval,
      isActive: true,
    }),
  );

  console.log(`Created product: ${name} (${product.id})`);
  return product;
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
