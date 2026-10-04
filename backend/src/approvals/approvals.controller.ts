import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApprovalsService } from './approvals.service.js';
import { DecideApprovalDto } from './dto/decide-approval.dto.js';

@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get(':purchaseRequestId')
  findByPurchaseRequest(@Param('purchaseRequestId') purchaseRequestId: string) {
    return this.approvalsService.findByPurchaseRequest(purchaseRequestId);
  }

  @Post(':purchaseRequestId/approve')
  approve(
    @Param('purchaseRequestId') purchaseRequestId: string,
    @Body() dto: DecideApprovalDto,
  ) {
    return this.approvalsService.approve(purchaseRequestId, dto);
  }

  @Post(':purchaseRequestId/reject')
  reject(
    @Param('purchaseRequestId') purchaseRequestId: string,
    @Body() dto: DecideApprovalDto,
  ) {
    return this.approvalsService.reject(purchaseRequestId, dto);
  }
}
