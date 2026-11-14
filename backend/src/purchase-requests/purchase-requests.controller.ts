import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto.js';
import { PurchaseRequestActionDto } from './dto/purchase-request-action.dto.js';
import { SubmitPurchaseRequestDto } from './dto/submit-purchase-request.dto.js';
import { UpdatePurchaseRequestDto } from './dto/update-purchase-request.dto.js';
import { ProcurementService } from './procurement.service.js';
import { PurchaseRequestsService } from './purchase-requests.service.js';

@Controller('purchase-requests')
export class PurchaseRequestsController {
  constructor(
    private readonly purchaseRequestsService: PurchaseRequestsService,
    private readonly procurementService: ProcurementService,
  ) {}

  @Post()
  createDraft(@Body() dto: CreatePurchaseRequestDto) {
    return this.purchaseRequestsService.createDraft(dto);
  }

  @Get()
  findAll(@Query('userId') userId?: string) {
    return this.purchaseRequestsService.findAll(userId);
  }

  @Get('manager-queue')
  findApprovals(@Query('userId') userId: string) {
    return this.purchaseRequestsService.findPendingForManager(userId);
  }

  @Get('procurement/queue')
  findForProcurement(@Query('userId') userId: string) {
    return this.purchaseRequestsService.findForProcurement(userId);
  }

  @Get('audit-logs')
  findAuditLogs(@Query('userId') userId: string) {
    return this.purchaseRequestsService.findAuditLogs(userId);
  }

  @Patch(':id')
  updateDraft(
    @Param('id') id: string,
    @Query('userId') userId: string,
    @Body() dto: UpdatePurchaseRequestDto,
  ) {
    return this.purchaseRequestsService.updateDraft(id, userId, dto);
  }

  @Post(':id/cancel')
  cancelDraft(@Param('id') id: string, @Body() dto: PurchaseRequestActionDto) {
    return this.purchaseRequestsService.cancelDraft(id, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchaseRequestsService.findOne(id);
  }

  @Post(':id/submit')
  submit(@Param('id') id: string, @Body() dto: SubmitPurchaseRequestDto) {
    return this.purchaseRequestsService.submit(id, dto);
  }

  @Post(':id/start-purchasing')
  startPurchasing(@Param('id') id: string, @Body() dto: PurchaseRequestActionDto) {
    return this.procurementService.start(id, dto.userId);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string, @Body() dto: PurchaseRequestActionDto) {
    return this.procurementService.complete(id, dto.userId);
  }
}
