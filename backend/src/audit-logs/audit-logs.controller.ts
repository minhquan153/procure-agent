import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/auth.decorators.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { ApprovalsService } from '../approvals/approvals.service.js';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.approvalsService.listAuditLogs(user.id);
  }
}
