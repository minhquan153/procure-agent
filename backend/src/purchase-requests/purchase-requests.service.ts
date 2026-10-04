import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PurchaseRequestStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto.js';
import { SubmitPurchaseRequestDto } from './dto/submit-purchase-request.dto.js';

const purchaseRequestInclude = {
  requester: { include: { department: true } },
  items: true,
  approval: { include: { approver: true } },
  auditLogs: { orderBy: { createdAt: 'asc' as const } },
} as const;

@Injectable()
export class PurchaseRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async createDraft(dto: CreatePurchaseRequestDto) {
    this.validateDraft(dto);

    const requester = await this.prisma.user.findUnique({
      where: { id: dto.requesterId },
      select: { id: true },
    });

    if (!requester) {
      throw new NotFoundException(`User ${dto.requesterId} not found`);
    }

    return this.prisma.purchaseRequest.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim(),
        requesterId: dto.requesterId,
        items: {
          create: dto.items.map((item) => ({
            name: item.name.trim(),
            description: item.description?.trim(),
            quantity: item.quantity,
            estimatedUnitCost: item.estimatedUnitCost,
          })),
        },
      },
      include: purchaseRequestInclude,
    });
  }

  findAll() {
    return this.prisma.purchaseRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: purchaseRequestInclude,
    });
  }

  async findOne(id: string) {
    const purchaseRequest = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      include: purchaseRequestInclude,
    });

    if (!purchaseRequest) {
      throw new NotFoundException(`Purchase request ${id} not found`);
    }

    return purchaseRequest;
  }

  submit(id: string, dto: SubmitPurchaseRequestDto) {
    if (!dto.userId?.trim()) {
      throw new BadRequestException('userId is required');
    }

    return this.prisma.$transaction(async (tx) => {
      const purchaseRequest = await tx.purchaseRequest.findUnique({
        where: { id },
        select: { id: true, status: true },
      });

      if (!purchaseRequest) {
        throw new NotFoundException(`Purchase request ${id} not found`);
      }

      if (purchaseRequest.status !== PurchaseRequestStatus.DRAFT) {
        throw new BadRequestException('Only DRAFT requests can be submitted');
      }

      const actor = await tx.user.findUnique({
        where: { id: dto.userId },
        select: { id: true },
      });

      if (!actor) {
        throw new NotFoundException(`User ${dto.userId} not found`);
      }

      await tx.approval.create({ data: { purchaseRequestId: id } });
      await tx.auditLog.create({
        data: {
          action: 'STATUS_CHANGED',
          details: {
            from: PurchaseRequestStatus.DRAFT,
            to: PurchaseRequestStatus.PENDING_APPROVAL,
          },
          purchaseRequestId: id,
          actorId: dto.userId,
        },
      });

      return tx.purchaseRequest.update({
        where: { id },
        data: { status: PurchaseRequestStatus.PENDING_APPROVAL },
        include: purchaseRequestInclude,
      });
    });
  }

  private validateDraft(dto: CreatePurchaseRequestDto): void {
    if (!dto.requesterId?.trim()) {
      throw new BadRequestException('requesterId is required');
    }

    if (!dto.title?.trim()) {
      throw new BadRequestException('title is required');
    }

    if (!Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }

    for (const item of dto.items) {
      if (!item.name?.trim()) {
        throw new BadRequestException('Each item must have a name');
      }

      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new BadRequestException(
          'Item quantity must be a positive integer',
        );
      }

      if (
        item.estimatedUnitCost !== undefined &&
        (!Number.isFinite(Number(item.estimatedUnitCost)) ||
          Number(item.estimatedUnitCost) < 0)
      ) {
        throw new BadRequestException(
          'Item estimatedUnitCost must be a non-negative number',
        );
      }
    }
  }
}
