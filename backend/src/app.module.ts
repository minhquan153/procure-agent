import { Module } from '@nestjs/common';
import { ApprovalsModule } from './approvals/approvals.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DepartmentsModule } from './departments/departments.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { PurchaseRequestsModule } from './purchase-requests/purchase-requests.module.js';
import { UsersModule } from './users/users.module.js';
import { AuditLogsModule } from './audit-logs/audit-logs.module.js';
import { AuthModule } from './auth/auth.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    DepartmentsModule,
    UsersModule,
    PurchaseRequestsModule,
    ApprovalsModule,
    AuditLogsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
