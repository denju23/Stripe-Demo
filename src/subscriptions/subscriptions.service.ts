import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import {
  Subscription,
  SubscriptionStatus,
} from './subscription.entity';
import { UsersService } from '../users/users.service';
import { StripeService } from '../stripe/stripe.service';
import { CreateBillingPortalDto } from './dto/subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subsRepo: Repository<Subscription>,
    private readonly usersService: UsersService,
    private readonly stripeService: StripeService,
  ) {}

  async list(userId?: string): Promise<Subscription[]> {
    return this.subsRepo.find({
      where: userId ? { userId } : {},
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Subscription> {
    const sub = await this.subsRepo.findOne({ where: { id } });
    if (!sub) throw new NotFoundException(`Subscription ${id} not found`);
    return sub;
  }

  async upsertFromStripe(
    stripeSub: Stripe.Subscription,
    extras?: { userId?: string; priceId?: string },
  ): Promise<Subscription> {
    const existing = await this.subsRepo.findOne({
      where: { stripeSubscriptionId: stripeSub.id },
    });

    const userId =
      extras?.userId ||
      (stripeSub.metadata?.userId as string | undefined) ||
      existing?.userId;

    if (!userId) {
      throw new Error(
        `Cannot upsert subscription ${stripeSub.id}: missing userId metadata`,
      );
    }

    const priceId =
      extras?.priceId ||
      (stripeSub.metadata?.priceId as string | undefined) ||
      existing?.priceId ||
      null;

    const payload: Partial<Subscription> = {
      userId,
      priceId,
      stripeSubscriptionId: stripeSub.id,
      status: stripeSub.status as SubscriptionStatus,
      currentPeriodStart: stripeSub.current_period_start
        ? new Date(stripeSub.current_period_start * 1000)
        : null,
      currentPeriodEnd: stripeSub.current_period_end
        ? new Date(stripeSub.current_period_end * 1000)
        : null,
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
    };

    if (existing) {
      Object.assign(existing, payload);
      return this.subsRepo.save(existing);
    }

    return this.subsRepo.save(this.subsRepo.create(payload));
  }

  async cancel(id: string, cancelAtPeriodEnd = true): Promise<Subscription> {
    const sub = await this.findOne(id);
    const updated = await this.stripeService.client.subscriptions.update(
      sub.stripeSubscriptionId,
      { cancel_at_period_end: cancelAtPeriodEnd },
    );
    if (!cancelAtPeriodEnd) {
      await this.stripeService.client.subscriptions.cancel(
        sub.stripeSubscriptionId,
      );
      sub.status = 'canceled';
      sub.cancelAtPeriodEnd = false;
      return this.subsRepo.save(sub);
    }
    return this.upsertFromStripe(updated, {
      userId: sub.userId,
      priceId: sub.priceId ?? undefined,
    });
  }

  async createBillingPortal(dto: CreateBillingPortalDto) {
    const user = await this.usersService.findOne(dto.userId);
    await this.usersService.ensureStripeCustomer(user);
    const session = await this.stripeService.client.billingPortal.sessions.create(
      {
        customer: user.stripeCustomerId!,
        return_url:
          dto.returnUrl || `${this.stripeService.frontendUrl}/account`,
      },
    );
    return { url: session.url };
  }
}
