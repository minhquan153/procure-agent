import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PurchaseRequestsController } from './purchase-requests.controller.js';
import { PurchaseRequestsService } from './purchase-requests.service.js';
import { ProcurementService } from './procurement.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [PurchaseRequestsController],
  providers: [PurchaseRequestsService, ProcurementService],
  exports: [PurchaseRequestsService, ProcurementService],
})
export class PurchaseRequestsModule {}
