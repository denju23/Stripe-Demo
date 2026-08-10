import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreatePriceDto, CreateProductDto } from './dto/create-product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Post('prices')
  addPrice(@Body() dto: CreatePriceDto) {
    return this.productsService.addPrice(dto);
  }
}
