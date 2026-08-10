import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export type OrderStatus =
  | 'pending'
  | 'requires_payment'
  | 'paid'
  | 'failed'
  | 'canceled'
  | 'refunded';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.orders, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'user_id', nullable: true })
  userId: string | null;

  @Column({ name: 'stripe_checkout_session_id', type: 'varchar', nullable: true, unique: true })
  stripeCheckoutSessionId: string | null;

  @Column({ name: 'stripe_payment_intent_id', type: 'varchar', nullable: true, unique: true })
  stripePaymentIntentId: string | null;

  @Column({ type: 'int' })
  amount: number;

  @Column({ length: 3, default: 'usd' })
  currency: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: OrderStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
