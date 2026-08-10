import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { PaymentsModule } from './payments/payments.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { StripeModule } from './stripe/stripe.module';
import { HealthController } from './health.controller';
import { User } from './users/user.entity';
import { Product } from './products/product.entity';
import { Price } from './products/price.entity';
import { Order } from './payments/order.entity';
import { Subscription } from './subscriptions/subscription.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USERNAME', 'postgres'),
        password: config.get<string>('DB_PASSWORD', 'postgres'),
        database: config.get<string>('DB_NAME', 'stripe_demo'),
        entities: [User, Product, Price, Order, Subscription],
        synchronize: false, // use migrations
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
    }),
    StripeModule,
    UsersModule,
    ProductsModule,
    PaymentsModule,
    SubscriptionsModule,
    WebhooksModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
