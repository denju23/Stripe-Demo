import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Create first — base schema for Stripe demo.
 * Run: npm run migration:run
 */
export class InitSchema1730000000001 implements MigrationInterface {
  name = 'InitSchema1730000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "email" varchar NOT NULL UNIQUE,
        "full_name" varchar NOT NULL,
        "stripe_customer_id" varchar UNIQUE,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "description" text,
        "stripe_product_id" varchar UNIQUE,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "prices" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
        "stripe_price_id" varchar UNIQUE,
        "amount" integer NOT NULL,
        "currency" varchar(3) NOT NULL DEFAULT 'usd',
        "type" varchar NOT NULL DEFAULT 'one_time',
        "interval" varchar,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "stripe_checkout_session_id" varchar UNIQUE,
        "stripe_payment_intent_id" varchar UNIQUE,
        "amount" integer NOT NULL,
        "currency" varchar(3) NOT NULL DEFAULT 'usd',
        "status" varchar NOT NULL DEFAULT 'pending',
        "metadata" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "subscriptions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "price_id" uuid REFERENCES "prices"("id") ON DELETE SET NULL,
        "stripe_subscription_id" varchar NOT NULL UNIQUE,
        "status" varchar NOT NULL DEFAULT 'incomplete',
        "current_period_start" TIMESTAMPTZ,
        "current_period_end" TIMESTAMPTZ,
        "cancel_at_period_end" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_orders_user_id" ON "orders" ("user_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_subscriptions_user_id" ON "subscriptions" ("user_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_prices_product_id" ON "prices" ("product_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "subscriptions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "orders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "prices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
