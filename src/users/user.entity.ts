import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from '../payments/order.entity';
import { Subscription } from '../subscriptions/subscription.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ name: 'stripe_customer_id', type: 'varchar', nullable: true, unique: true })
  stripeCustomerId: string | null;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToMany(() => Subscription, (sub) => sub.user)
  subscriptions: Subscription[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
