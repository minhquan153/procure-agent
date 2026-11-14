import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PurchaseRequestStatus, Role } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ProcurementService {
  constructor(private readonly prisma: PrismaService) {}

  async findQueue(userId: string) {
    if (!userId?.trim()) throw new BadRequestException('userId is required');
    const actor = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!actor) throw new NotFoundException(`User ${userId} not found`);
    if (actor.role !== Role.PROCUREMENT && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only PROCUREMENT or ADMIN can view purchasing requests');
    }
    return this.prisma.purchaseRequest.findMany({
      where: { status: { in: [PurchaseRequestStatus.APPROVED, PurchaseRequestStatus.PURCHASING] } },
      orderBy: { updatedAt: 'asc' },
      include: {
        requester: { include: { department: true } }, items: true,
        approval: { include: { approver: true } },
        auditLogs: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  start(id: string, userId: string) {
    return this.transition(id, userId, PurchaseRequestStatus.APPROVED, PurchaseRequestStatus.PURCHASING);
  }

  complete(id: string, userId: string) {
    return this.transition(id, userId, PurchaseRequestStatus.PURCHASING, PurchaseRequestStatus.COMPLETED);
  }

  private async transition(
    id: string,
    userId: string,
    from: PurchaseRequestStatus,
    to: PurchaseRequestStatus,
  ) {
    if (!userId?.trim()) throw new BadRequestException('userId is required');
    return this.prisma.$transaction(async (tx) => {
      const actor = await tx.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (!actor) throw new NotFoundException(`User ${userId} not found`);
      if (actor.role !== Role.PROCUREMENT && actor.role !== Role.ADMIN) {
        throw new ForbiddenException('Only PROCUREMENT or ADMIN can process requests');
      }
      const request = await tx.purchaseRequest.findUnique({ where: { id }, select: { status: true } });
      if (!request) throw new NotFoundException(`Purchase request ${id} not found`);
      if (request.status !== from) throw new ConflictException(`Request must be ${from} before it can become ${to}`);
      const updated = await tx.purchaseRequest.update({ where: { id }, data: { status: to } });
      await tx.auditLog.create({
        data: { action: 'STATUS_CHANGED', purchaseRequestId: id, actorId: userId, details: { from, to } },
      });
      return updated;
    });
  }
}
