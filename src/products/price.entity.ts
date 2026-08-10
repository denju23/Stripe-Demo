import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';

export type PriceType = 'one_time' | 'recurring';
export type RecurringInterval = 'day' | 'week' | 'month' | 'year';

@Entity('prices')
export class Price {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, (product) => product.prices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ name: 'stripe_price_id', type: 'varchar', nullable: true, unique: true })
  stripePriceId: string | null;

  /** Amount in the smallest currency unit (e.g. cents) */
  @Column({ type: 'int' })
  amount: number;

  @Column({ length: 3, default: 'usd' })
  currency: string;

  @Column({ type: 'varchar', default: 'one_time' })
  type: PriceType;

  @Column({ type: 'varchar', nullable: true })
  interval: RecurringInterval | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
