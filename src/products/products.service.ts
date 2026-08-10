import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { Price } from './price.entity';
import { CreatePriceDto, CreateProductDto } from './dto/create-product.dto';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
    @InjectRepository(Price) private readonly pricesRepo: Repository<Price>,
    private readonly stripeService: StripeService,
  ) {}

  async findAll(): Promise<Product[]> {
    return this.productsRepo.find({
      where: { isActive: true },
      relations: ['prices'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productsRepo.findOne({
      where: { id },
      relations: ['prices'],
    });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async findPrice(priceId: string): Promise<Price> {
    const price = await this.pricesRepo.findOne({
      where: { id: priceId },
      relations: ['product'],
    });
    if (!price) throw new NotFoundException(`Price ${priceId} not found`);
    return price;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const currency = (dto.currency || this.stripeService.currency).toLowerCase();
    const sync = dto.syncToStripe !== false;

    let stripeProductId: string | null = null;
    let stripePriceId: string | null = null;

    if (sync) {
      const stripeProduct = await this.stripeService.client.products.create({
        name: dto.name,
        description: dto.description,
        metadata: { source: 'stripe-demo' },
      });
      stripeProductId = stripeProduct.id;

      const stripePrice = await this.stripeService.client.prices.create({
        product: stripeProductId,
        unit_amount: dto.amount,
        currency,
        ...(dto.type === 'recurring'
          ? { recurring: { interval: dto.interval! } }
          : {}),
      });
      stripePriceId = stripePrice.id;
    }

    const product = this.productsRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      stripeProductId,
      isActive: true,
    });
    const saved = await this.productsRepo.save(product);

    const price = this.pricesRepo.create({
      productId: saved.id,
      stripePriceId,
      amount: dto.amount,
      currency,
      type: dto.type,
      interval: dto.type === 'recurring' ? dto.interval! : null,
      isActive: true,
    });
    await this.pricesRepo.save(price);

    return this.findOne(saved.id);
  }

  async addPrice(dto: CreatePriceDto): Promise<Price> {
    const product = await this.findOne(dto.productId);
    const currency = (dto.currency || this.stripeService.currency).toLowerCase();

    let stripePriceId: string | null = null;
    if (product.stripeProductId) {
      const stripePrice = await this.stripeService.client.prices.create({
        product: product.stripeProductId,
        unit_amount: dto.amount,
        currency,
        ...(dto.type === 'recurring'
          ? { recurring: { interval: dto.interval! } }
          : {}),
      });
      stripePriceId = stripePrice.id;
    }

    const price = this.pricesRepo.create({
      productId: product.id,
      stripePriceId,
      amount: dto.amount,
      currency,
      type: dto.type,
      interval: dto.type === 'recurring' ? dto.interval! : null,
      isActive: true,
    });
    return this.pricesRepo.save(price);
  }
}
