import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { PaymentsModule } from './payments/payments.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { StripeModule } from './stripe/stripe.module';
import { AuthModule } from './auth/auth.module';
import { SocketModule } from './socket/socket.module';
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
        host:
          config.get<string>('DB_HOST') ||
          config.get<string>('DATABASE_HOST') ||
          'localhost',
        port: Number(
          config.get('DB_PORT') || config.get('DATABASE_PORT') || 5432,
        ),
        username:
          config.get<string>('DB_USERNAME') ||
          config.get<string>('DATABASE_USER') ||
          'postgres',
        password:
          config.get<string>('DB_PASSWORD') ||
          config.get<string>('DATABASE_PASSWORD') ||
          'postgres',
        database: config.get<string>('DB_NAME', 'stripe_demo'),
        entities: [User, Product, Price, Order, Subscription],
        synchronize: false,
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
    }),
    StripeModule,
    AuthModule,
    SocketModule,
    UsersModule,
    ProductsModule,
    PaymentsModule,
    SubscriptionsModule,
    WebhooksModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
