import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto.js';
import { SubmitPurchaseRequestDto } from './dto/submit-purchase-request.dto.js';
import { PurchaseRequestsService } from './purchase-requests.service.js';

@Controller('purchase-requests')
export class PurchaseRequestsController {
  constructor(
    private readonly purchaseRequestsService: PurchaseRequestsService,
  ) {}

  @Post()
  createDraft(@Body() dto: CreatePurchaseRequestDto) {
    return this.purchaseRequestsService.createDraft(dto);
  }

  @Get()
  findAll() {
    return this.purchaseRequestsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchaseRequestsService.findOne(id);
  }

  @Post(':id/submit')
  submit(@Param('id') id: string, @Body() dto: SubmitPurchaseRequestDto) {
    return this.purchaseRequestsService.submit(id, dto);
  }
}
