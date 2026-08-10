import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Price } from './price.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'stripe_product_id', type: 'varchar', nullable: true, unique: true })
  stripeProductId: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => Price, (price) => price.product, { cascade: true })
  prices: Price[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
