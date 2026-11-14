import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ApprovalsModule } from '../approvals/approvals.module.js';
import { AuditLogsController } from './audit-logs.controller.js';

@Module({
  imports: [PrismaModule, ApprovalsModule],
  controllers: [AuditLogsController],
})
export class AuditLogsModule {}
