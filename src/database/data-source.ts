import { DataSource } from 'typeorm';
import { config as dotenvConfig } from 'dotenv';
import { User } from '../users/user.entity';
import { Product } from '../products/product.entity';
import { Price } from '../products/price.entity';
import { Order } from '../payments/order.entity';
import { Subscription } from '../subscriptions/subscription.entity';

dotenvConfig({ path: '.env' });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || process.env.DATABASE_HOST || 'localhost',
  port: Number(process.env.DB_PORT || process.env.DATABASE_PORT || 5432),
  username:
    process.env.DB_USERNAME || process.env.DATABASE_USER || 'postgres',
  password:
    process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'stripe_demo',
  entities: [User, Product, Price, Order, Subscription],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: true,
});
