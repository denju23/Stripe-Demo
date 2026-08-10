import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './order.entity';
import {
  CreateCheckoutSessionDto,
  CreatePaymentIntentDto,
} from './dto/checkout.dto';
import { UsersService } from '../users/users.service';
import { ProductsService } from '../products/products.service';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Order) private readonly ordersRepo: Repository<Order>,
    private readonly usersService: UsersService,
    private readonly productsService: ProductsService,
    private readonly stripeService: StripeService,
  ) {}

  async listOrders(userId?: string): Promise<Order[]> {
    return this.ordersRepo.find({
      where: userId ? { userId } : {},
      order: { createdAt: 'DESC' },
    });
  }

  async getOrder(id: string): Promise<Order> {
    const order = await this.ordersRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  async createCheckoutSession(dto: CreateCheckoutSessionDto) {
    const user = await this.usersService.findOne(dto.userId);
    await this.usersService.ensureStripeCustomer(user);
    const price = await this.productsService.findPrice(dto.priceId);

    if (!price.stripePriceId) {
      throw new BadRequestException(
        'Price is not synced to Stripe. Recreate product with syncToStripe=true',
      );
    }

    const mode =
      dto.mode || (price.type === 'recurring' ? 'subscription' : 'payment');
    const quantity = dto.quantity || 1;
    const frontend = this.stripeService.frontendUrl;

    const order = this.ordersRepo.create({
      userId: user.id,
      amount: price.amount * quantity,
      currency: price.currency,
      status: 'requires_payment',
      metadata: {
        priceId: price.id,
        productId: price.productId,
        mode,
        quantity,
      },
    });
    const savedOrder = await this.ordersRepo.save(order);

    const session = await this.stripeService.client.checkout.sessions.create({
      mode,
      customer: user.stripeCustomerId!,
      line_items: [{ price: price.stripePriceId, quantity }],
      success_url:
        dto.successUrl ||
        `${frontend}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: dto.cancelUrl || `${frontend}/checkout/cancel`,
      metadata: {
        orderId: savedOrder.id,
        userId: user.id,
        priceId: price.id,
      },
      ...(mode === 'subscription'
        ? {
            subscription_data: {
              metadata: {
                userId: user.id,
                priceId: price.id,
                orderId: savedOrder.id,
              },
            },
          }
        : {
            payment_intent_data: {
              metadata: {
                orderId: savedOrder.id,
                userId: user.id,
              },
            },
          }),
    });

    savedOrder.stripeCheckoutSessionId = session.id;
    await this.ordersRepo.save(savedOrder);

    return {
      orderId: savedOrder.id,
      sessionId: session.id,
      url: session.url,
      mode,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    };
  }

  async createPaymentIntent(dto: CreatePaymentIntentDto) {
    const user = await this.usersService.findOne(dto.userId);
    await this.usersService.ensureStripeCustomer(user);

    let amount = dto.amount;
    let currency = (dto.currency || this.stripeService.currency).toLowerCase();
    let priceId: string | undefined = dto.priceId;

    if (dto.priceId) {
      const price = await this.productsService.findPrice(dto.priceId);
      if (price.type !== 'one_time') {
        throw new BadRequestException(
          'PaymentIntent is for one-time prices only. Use checkout for subscriptions.',
        );
      }
      amount = price.amount;
      currency = price.currency;
      priceId = price.id;
    }

    if (!amount) {
      throw new BadRequestException('amount or priceId is required');
    }

    const order = await this.ordersRepo.save(
      this.ordersRepo.create({
        userId: user.id,
        amount,
        currency,
        status: 'requires_payment',
        metadata: { priceId: priceId ?? null, flow: 'payment_intent' },
      }),
    );

    const intent = await this.stripeService.client.paymentIntents.create({
      amount,
      currency,
      customer: user.stripeCustomerId!,
      automatic_payment_methods: { enabled: true },
      metadata: {
        orderId: order.id,
        userId: user.id,
      },
    });

    order.stripePaymentIntentId = intent.id;
    await this.ordersRepo.save(order);

    return {
      orderId: order.id,
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    };
  }

  async markOrderPaid(params: {
    orderId?: string;
    paymentIntentId?: string;
    checkoutSessionId?: string;
  }): Promise<Order | null> {
    let order: Order | null = null;
    if (params.orderId) {
      order = await this.ordersRepo.findOne({ where: { id: params.orderId } });
    } else if (params.paymentIntentId) {
      order = await this.ordersRepo.findOne({
        where: { stripePaymentIntentId: params.paymentIntentId },
      });
    } else if (params.checkoutSessionId) {
      order = await this.ordersRepo.findOne({
        where: { stripeCheckoutSessionId: params.checkoutSessionId },
      });
    }
    if (!order) return null;
    order.status = 'paid';
    if (params.paymentIntentId) {
      order.stripePaymentIntentId = params.paymentIntentId;
    }
    return this.ordersRepo.save(order);
  }

  async markOrderFailed(paymentIntentId: string): Promise<void> {
    const order = await this.ordersRepo.findOne({
      where: { stripePaymentIntentId: paymentIntentId },
    });
    if (!order) return;
    order.status = 'failed';
    await this.ordersRepo.save(order);
  }
}
