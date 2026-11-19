import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PurchaseRequestStatus,
  Role,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto.js';
import { PurchaseRequestActionDto } from './dto/purchase-request-action.dto.js';
import { SubmitPurchaseRequestDto } from './dto/submit-purchase-request.dto.js';
import { UpdatePurchaseRequestDto } from './dto/update-purchase-request.dto.js';

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
      select: { id: true, role: true },
    });

    if (!requester) {
      throw new NotFoundException(`User ${dto.requesterId} not found`);
    }
    if (requester.role !== Role.EMPLOYEE) {
      throw new ForbiddenException('Only employees can create purchase requests');
    }

    const request = await this.prisma.purchaseRequest.create({
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
    await this.prisma.auditLog.create({
      data: {
        action: 'REQUEST_CREATED',
        purchaseRequestId: request.id,
        actorId: dto.requesterId,
        details: { status: PurchaseRequestStatus.DRAFT },
      },
    });
    return this.findOne(request.id, dto.requesterId);
  }

  findAll(userId?: string) {
    if (userId) {
      return this.prisma.purchaseRequest.findMany({
        where: { requesterId: userId },
        orderBy: { createdAt: 'desc' },
        include: purchaseRequestInclude,
      });
    }
    return this.prisma.purchaseRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: purchaseRequestInclude,
    });
  }

  async findAuditLogs(userId: string) {
    if (!userId?.trim()) throw new BadRequestException('userId is required');
    const admin = await this.prisma.user.findUnique({
      where: { id: userId }, select: { id: true, role: true },
    });
    if (!admin) throw new NotFoundException(`User ${userId} not found`);
    if (admin.role !== Role.ADMIN) throw new ForbiddenException('Only ADMIN can view audit logs');
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: { actor: true, purchaseRequest: true },
    });
  }

  async findPendingForManager(userId: string) {
    if (!userId?.trim()) throw new BadRequestException('userId is required');
    const manager = await this.prisma.user.findUnique({
      where: { id: userId }, select: { id: true, role: true },
    });
    if (!manager) throw new NotFoundException(`User ${userId} not found`);
    if (manager.role !== Role.MANAGER) throw new ForbiddenException('Only MANAGER can view pending approvals');
    return this.prisma.purchaseRequest.findMany({
      where: { status: PurchaseRequestStatus.PENDING_APPROVAL, approval: { approverId: manager.id } },
      orderBy: { createdAt: 'asc' }, include: purchaseRequestInclude,
    });
  }

  async findForProcurement(userId: string) {
    if (!userId?.trim()) throw new BadRequestException('userId is required');
    const actor = await this.prisma.user.findUnique({
      where: { id: userId }, select: { id: true, role: true },
    });
    if (!actor) throw new NotFoundException(`User ${userId} not found`);
    if (actor.role !== Role.PROCUREMENT && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only PROCUREMENT or ADMIN can view purchasing requests');
    }
    return this.prisma.purchaseRequest.findMany({
      where: { status: { in: [PurchaseRequestStatus.APPROVED, PurchaseRequestStatus.PURCHASING] } },
      orderBy: { updatedAt: 'asc' }, include: purchaseRequestInclude,
    });
  }

  private async ensureRequester(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }, select: { id: true, role: true },
    });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    if (user.role !== Role.EMPLOYEE) {
      throw new ForbiddenException('Only employees can modify their own request drafts');
    }
  }

  async updateDraft(id: string, userId: string, dto: UpdatePurchaseRequestDto) {
    if (!userId?.trim()) throw new BadRequestException('userId is required');
    if (dto.items !== undefined) {
      this.validateDraft({
        requesterId: userId,
        title: dto.title ?? 'draft',
        items: dto.items,
      });
    }
    if (dto.title !== undefined && !dto.title.trim()) {
      throw new BadRequestException('title cannot be empty');
    }
    await this.ensureRequester(userId);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.purchaseRequest.findUnique({
        where: { id },
        select: { id: true, requesterId: true, status: true },
      });
      if (!existing) throw new NotFoundException(`Purchase request ${id} not found`);
      if (existing.requesterId !== userId) {
        throw new ForbiddenException('Only the requester can edit this request');
      }
      if (existing.status !== PurchaseRequestStatus.DRAFT) {
        throw new ConflictException('Only DRAFT requests can be edited');
      }
      const data: Record<string, unknown> = {};
      if (dto.title !== undefined) data.title = dto.title.trim();
      if (dto.description !== undefined) data.description = dto.description.trim();
      if (dto.items !== undefined) {
        data.items = {
          deleteMany: {},
          create: dto.items.map((item) => ({
            name: item.name.trim(),
            description: item.description?.trim(),
            quantity: item.quantity,
            estimatedUnitCost: item.estimatedUnitCost,
          })),
        };
      }
      await tx.purchaseRequest.update({ where: { id }, data });
      await tx.auditLog.create({
        data: { action: 'REQUEST_UPDATED', purchaseRequestId: id, actorId: userId },
      });
      return tx.purchaseRequest.findUniqueOrThrow({
        where: { id }, include: purchaseRequestInclude,
      });
    });
  }

  async cancelDraft(id: string, dto: PurchaseRequestActionDto) {
    if (!dto.userId?.trim()) throw new BadRequestException('userId is required');
    await this.ensureRequester(dto.userId);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.purchaseRequest.findUnique({
        where: { id }, select: { requesterId: true, status: true },
      });
      if (!existing) throw new NotFoundException(`Purchase request ${id} not found`);
      if (existing.requesterId !== dto.userId) {
        throw new ForbiddenException('Only the requester can cancel this request');
      }
      if (existing.status !== PurchaseRequestStatus.DRAFT) {
        throw new ConflictException('Only DRAFT requests can be cancelled');
      }
      const result = await tx.purchaseRequest.update({
        where: { id }, data: { status: PurchaseRequestStatus.CANCELLED },
      });
      await tx.auditLog.create({
        data: {
          action: 'STATUS_CHANGED', purchaseRequestId: id, actorId: dto.userId,
          details: { from: PurchaseRequestStatus.DRAFT, to: PurchaseRequestStatus.CANCELLED },
        },
      });
      return result;
    });
  }

  async findOne(id: string, userId: string) {
    const purchaseRequest = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      include: purchaseRequestInclude,
    });

    if (!purchaseRequest) {
      throw new NotFoundException(`Purchase request ${id} not found`);
    }

    const actor = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const procurementVisibleStatuses: PurchaseRequestStatus[] = [
      PurchaseRequestStatus.APPROVED,
      PurchaseRequestStatus.PURCHASING,
      PurchaseRequestStatus.COMPLETED,
    ];
    const allowed = actor?.role === Role.ADMIN ||
      purchaseRequest.requesterId === userId ||
      purchaseRequest.approval?.approverId === userId ||
      (actor?.role === Role.PROCUREMENT && procurementVisibleStatuses.includes(purchaseRequest.status));
    if (!allowed) throw new NotFoundException(`Purchase request ${id} not found`);

    return purchaseRequest;
  }

  submit(id: string, dto: SubmitPurchaseRequestDto) {
    if (!dto.userId?.trim()) {
      throw new BadRequestException('userId is required');
    }
    return this.prisma.$transaction(async (tx) => {
      const purchaseRequest = await tx.purchaseRequest.findUnique({
        where: { id },
        include: { requester: { select: { id: true, departmentId: true } }, items: true },
      });

      if (!purchaseRequest) {
        throw new NotFoundException(`Purchase request ${id} not found`);
      }

      if (purchaseRequest.status !== PurchaseRequestStatus.DRAFT) {
        throw new BadRequestException('Only DRAFT requests can be submitted');
      }
      if (purchaseRequest.requesterId !== dto.userId) {
        throw new ForbiddenException('Only the requester can submit this request');
      }
      const validItems = purchaseRequest.items.filter(
        (item) => item.quantity > 0 && item.estimatedUnitCost !== null,
      );
      if (validItems.length !== purchaseRequest.items.length) {
        throw new BadRequestException('Every item needs a positive quantity and estimated unit cost');
      }
      const total = validItems.reduce(
        (sum, item) => sum + item.quantity * Number(item.estimatedUnitCost), 0,
      );
      if (!Number.isFinite(total)) {
        throw new BadRequestException('The request total is outside the supported range');
      }
      const fiscalYear = new Date().getFullYear();

      const budget = await tx.departmentBudget.findUnique({
        where: {
          departmentId_fiscalYear: {
            departmentId: purchaseRequest.requester.departmentId,
            fiscalYear,
          },
        },
      });
      if (!budget) {
        throw new ConflictException(`No department budget configured for ${fiscalYear}`);
      }
      const reserved = await tx.purchaseRequest.findMany({
        where: {
          requester: { departmentId: purchaseRequest.requester.departmentId },
          status: { in: [
            PurchaseRequestStatus.PENDING_APPROVAL,
            PurchaseRequestStatus.APPROVED,
            PurchaseRequestStatus.PURCHASING,
            PurchaseRequestStatus.COMPLETED,
          ] },
          id: { not: id },
        },
        include: { items: true },
      });
      const committed = reserved.reduce((sum, request) => sum + request.items.reduce(
        (requestSum, item) => requestSum + item.quantity * Number(item.estimatedUnitCost ?? 0), 0,
      ), 0);
      if (!Number.isFinite(committed) || !Number.isFinite(committed + total)) {
        throw new ConflictException('The department budget total is outside the supported range');
      }
      if (committed + total > Number(budget.budgetLimit)) {
        throw new ConflictException('The request exceeds the available department budget');
      }

      const manager = await tx.user.findFirst({
        where: { role: Role.MANAGER, departmentId: purchaseRequest.requester.departmentId },
        select: { id: true },
      });
      if (!manager) {
        throw new ConflictException('No authorized manager is configured for this department');
      }

      await tx.approval.create({
        data: { purchaseRequestId: id, approverId: manager.id },
      });
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
    }, { isolationLevel: 'Serializable' });
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
