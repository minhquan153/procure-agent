import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalStatus,
  PurchaseRequestStatus,
  Role,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DecideApprovalDto } from './dto/decide-approval.dto.js';

@Injectable()
export class ApprovalsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByPurchaseRequest(purchaseRequestId: string) {
    const approval = await this.prisma.approval.findUnique({
      where: { purchaseRequestId },
      include: { approver: true, purchaseRequest: true },
    });

    if (!approval) {
      throw new NotFoundException(
        `Approval for purchase request ${purchaseRequestId} not found`,
      );
    }

    return approval;
  }

  approve(purchaseRequestId: string, dto: DecideApprovalDto) {
    return this.decide(
      purchaseRequestId,
      dto,
      ApprovalStatus.APPROVED,
      PurchaseRequestStatus.APPROVED,
    );
  }

  reject(purchaseRequestId: string, dto: DecideApprovalDto) {
    return this.decide(
      purchaseRequestId,
      dto,
      ApprovalStatus.REJECTED,
      PurchaseRequestStatus.REJECTED,
    );
  }

  private async decide(
    purchaseRequestId: string,
    dto: DecideApprovalDto,
    approvalStatus: ApprovalStatus,
    requestStatus: PurchaseRequestStatus,
  ) {
    if (!dto.userId?.trim()) {
      throw new BadRequestException('userId is required');
    }

    return this.prisma.$transaction(async (tx) => {
      const approver = await tx.user.findUnique({
        where: { id: dto.userId },
        select: { id: true, role: true },
      });

      if (!approver) {
        throw new NotFoundException(`User ${dto.userId} not found`);
      }

      if (approver.role !== Role.MANAGER) {
        throw new ForbiddenException(
          'Only users with the MANAGER role can approve or reject requests',
        );
      }

      const purchaseRequest = await tx.purchaseRequest.findUnique({
        where: { id: purchaseRequestId },
        select: { id: true, status: true, approval: { select: { id: true } } },
      });

      if (!purchaseRequest) {
        throw new NotFoundException(
          `Purchase request ${purchaseRequestId} not found`,
        );
      }

      if (purchaseRequest.status !== PurchaseRequestStatus.PENDING_APPROVAL) {
        throw new BadRequestException(
          'Only PENDING_APPROVAL requests can be approved or rejected',
        );
      }

      if (!purchaseRequest.approval) {
        throw new NotFoundException(
          `Approval for purchase request ${purchaseRequestId} not found`,
        );
      }

      const decidedAt = new Date();

      await tx.approval.update({
        where: { purchaseRequestId },
        data: {
          status: approvalStatus,
          approverId: dto.userId,
          comment: dto.comment?.trim(),
          decidedAt,
        },
      });
      await tx.auditLog.create({
        data: {
          action: 'STATUS_CHANGED',
          details: {
            from: PurchaseRequestStatus.PENDING_APPROVAL,
            to: requestStatus,
          },
          purchaseRequestId,
          actorId: dto.userId,
        },
      });

      return tx.purchaseRequest.update({
        where: { id: purchaseRequestId },
        data: { status: requestStatus },
        include: {
          requester: { include: { department: true } },
          items: true,
          approval: { include: { approver: true } },
          auditLogs: { orderBy: { createdAt: 'asc' } },
        },
      });
    });
  }
}
