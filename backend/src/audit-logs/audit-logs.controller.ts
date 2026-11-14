import { Controller, Get, Query } from '@nestjs/common';
import { ApprovalsService } from '../approvals/approvals.service.js';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get()
  findAll(@Query('userId') userId: string) {
    return this.approvalsService.listAuditLogs(userId);
  }
}
