import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly stripeService: StripeService,
  ) {}

  async findAll(): Promise<User[]> {
    return this.usersRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const customer = await this.stripeService.client.customers.create({
      email: dto.email,
      name: dto.fullName,
      metadata: { source: 'stripe-demo' },
    });

    const user = this.usersRepo.create({
      email: dto.email,
      fullName: dto.fullName,
      stripeCustomerId: customer.id,
    });
    return this.usersRepo.save(user);
  }

  async ensureStripeCustomer(user: User): Promise<User> {
    if (user.stripeCustomerId) return user;

    const customer = await this.stripeService.client.customers.create({
      email: user.email,
      name: user.fullName,
      metadata: { userId: user.id },
    });
    user.stripeCustomerId = customer.id;
    return this.usersRepo.save(user);
  }
}
