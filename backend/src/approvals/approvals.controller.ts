import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/auth.decorators.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { ApprovalsService } from './approvals.service.js';
import { DecideApprovalDto } from './dto/decide-approval.dto.js';

@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get('pending')
  findPending(@CurrentUser() user: AuthenticatedUser) {
    return this.approvalsService.findPending(user.id);
  }

  @Get(':purchaseRequestId')
  findByPurchaseRequest(@Param('purchaseRequestId') purchaseRequestId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.approvalsService.findByPurchaseRequest(purchaseRequestId, user.id);
  }

  @Post(':purchaseRequestId/approve')
  approve(
    @Param('purchaseRequestId') purchaseRequestId: string,
    @Body() dto: DecideApprovalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.approvalsService.approve(purchaseRequestId, { userId: user.id, comment: dto.comment });
  }

  @Post(':purchaseRequestId/reject')
  reject(
    @Param('purchaseRequestId') purchaseRequestId: string,
    @Body() dto: DecideApprovalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.approvalsService.reject(purchaseRequestId, { userId: user.id, comment: dto.comment });
  }
}
