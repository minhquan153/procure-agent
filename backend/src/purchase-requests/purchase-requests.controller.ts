import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/auth.decorators.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto.js';
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
  createDraft(@Body() dto: CreatePurchaseRequestDto, @CurrentUser() user: AuthenticatedUser) {
    return this.purchaseRequestsService.createDraft({
      requesterId: user.id,
      title: dto.title,
      description: dto.description,
      items: dto.items,
    });
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.purchaseRequestsService.findAll(user.id);
  }

  @Get('manager-queue')
  findApprovals(@CurrentUser() user: AuthenticatedUser) {
    return this.purchaseRequestsService.findPendingForManager(user.id);
  }

  @Get('procurement/queue')
  findForProcurement(@CurrentUser() user: AuthenticatedUser) {
    return this.purchaseRequestsService.findForProcurement(user.id);
  }

  @Get('audit-logs')
  findAuditLogs(@CurrentUser() user: AuthenticatedUser) {
    return this.purchaseRequestsService.findAuditLogs(user.id);
  }

  @Patch(':id')
  updateDraft(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchaseRequestsService.updateDraft(id, user.id, dto);
  }

  @Post(':id/cancel')
  cancelDraft(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.purchaseRequestsService.cancelDraft(id, { userId: user.id });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.purchaseRequestsService.findOne(id, user.id);
  }

  @Post(':id/submit')
  submit(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.purchaseRequestsService.submit(id, { userId: user.id });
  }

  @Post(':id/start-purchasing')
  startPurchasing(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.procurementService.start(id, user.id);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.procurementService.complete(id, user.id);
  }
}
