import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  ApprovalStatus,
  PurchaseRequestStatus,
  Role,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApprovalsService } from '../approvals/approvals.service.js';
import { PurchaseRequestsService } from './purchase-requests.service.js';

type TestUser = {
  id: string;
  role: Role;
};

type TestApproval = {
  id: string;
  purchaseRequestId: string;
  status: ApprovalStatus;
  approverId: string | null;
  comment: string | null;
  decidedAt: Date | null;
};

type TestRequest = {
  id: string;
  title: string;
  description?: string;
  requesterId: string;
  status: PurchaseRequestStatus;
  items: unknown[];
};

describe('Purchase request workflow', () => {
  let purchaseRequestsService: PurchaseRequestsService;
  let approvalsService: ApprovalsService;
  let requests: Map<string, TestRequest>;
  let approvals: Map<string, TestApproval>;
  let auditLogs: Array<Record<string, unknown>>;
  let nextRequestId: number;

  beforeEach(() => {
    requests = new Map();
    approvals = new Map();
    auditLogs = [];
    nextRequestId = 1;

    const users = new Map<string, TestUser>([
      ['employee-1', { id: 'employee-1', role: Role.EMPLOYEE }],
      ['manager-1', { id: 'manager-1', role: Role.MANAGER }],
    ]);

    const materialize = (request: TestRequest) => ({
      ...request,
      requester: users.get(request.requesterId),
      approval: approvals.get(request.id) ?? null,
      auditLogs: auditLogs.filter(
        (log) => log.purchaseRequestId === request.id,
      ),
    });

    const prisma = {
      user: {
        findUnique: async ({ where }: { where: { id: string } }) =>
          users.get(where.id) ?? null,
      },
      purchaseRequest: {
        create: async ({ data }: { data: Record<string, any> }) => {
          const request: TestRequest = {
            id: `request-${nextRequestId++}`,
            title: data.title,
            description: data.description,
            requesterId: data.requesterId,
            status: PurchaseRequestStatus.DRAFT,
            items: data.items.create,
          };
          requests.set(request.id, request);
          return materialize(request);
        },
        findUnique: async ({ where }: { where: { id: string } }) => {
          const request = requests.get(where.id);
          if (!request) return null;
          return {
            ...materialize(request),
            approval: approvals.has(request.id)
              ? { id: approvals.get(request.id)!.id }
              : null,
          };
        },
        update: async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<TestRequest>;
        }) => {
          const request = requests.get(where.id)!;
          Object.assign(request, data);
          return materialize(request);
        },
      },
      approval: {
        create: async ({ data }: { data: { purchaseRequestId: string } }) => {
          const approval: TestApproval = {
            id: `approval-${data.purchaseRequestId}`,
            purchaseRequestId: data.purchaseRequestId,
            status: ApprovalStatus.PENDING,
            approverId: null,
            comment: null,
            decidedAt: null,
          };
          approvals.set(data.purchaseRequestId, approval);
          return approval;
        },
        update: async ({
          where,
          data,
        }: {
          where: { purchaseRequestId: string };
          data: Partial<TestApproval>;
        }) => {
          const approval = approvals.get(where.purchaseRequestId)!;
          Object.assign(approval, data);
          return approval;
        },
      },
      auditLog: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          auditLogs.push(data);
          return data;
        },
      },
      $transaction: async (callback: (client: unknown) => unknown) =>
        callback(prisma),
    };

    const prismaService = prisma as unknown as PrismaService;
    purchaseRequestsService = new PurchaseRequestsService(prismaService);
    approvalsService = new ApprovalsService(prismaService);
  });

  const createDraft = () =>
    purchaseRequestsService.createDraft({
      requesterId: 'employee-1',
      title: 'Developer laptops',
      items: [
        {
          name: 'Laptop',
          quantity: 2,
          estimatedUnitCost: 1500,
        },
      ],
    });

  it('creates a draft request', async () => {
    const request = await createDraft();

    expect(request.status).toBe(PurchaseRequestStatus.DRAFT);
    expect(request.items).toHaveLength(1);
  });

  it('submits a draft and records an audit log', async () => {
    const draft = await createDraft();
    const submitted = await purchaseRequestsService.submit(draft.id, {
      userId: 'employee-1',
    });

    expect(submitted.status).toBe(PurchaseRequestStatus.PENDING_APPROVAL);
    expect(approvals.get(draft.id)?.status).toBe(ApprovalStatus.PENDING);
    expect(auditLogs).toHaveLength(1);
  });

  it('allows a manager to approve a submitted request', async () => {
    const draft = await createDraft();
    await purchaseRequestsService.submit(draft.id, {
      userId: 'employee-1',
    });

    const approved = await approvalsService.approve(draft.id, {
      userId: 'manager-1',
      comment: 'Approved for this quarter',
    });

    expect(approved.status).toBe(PurchaseRequestStatus.APPROVED);
    expect(approvals.get(draft.id)).toMatchObject({
      status: ApprovalStatus.APPROVED,
      approverId: 'manager-1',
      comment: 'Approved for this quarter',
    });
    expect(approvals.get(draft.id)?.decidedAt).toBeInstanceOf(Date);
    expect(auditLogs).toHaveLength(2);
  });

  it('allows a manager to reject a submitted request', async () => {
    const draft = await createDraft();
    await purchaseRequestsService.submit(draft.id, {
      userId: 'employee-1',
    });

    const rejected = await approvalsService.reject(draft.id, {
      userId: 'manager-1',
      comment: 'Budget unavailable',
    });

    expect(rejected.status).toBe(PurchaseRequestStatus.REJECTED);
    expect(approvals.get(draft.id)).toMatchObject({
      status: ApprovalStatus.REJECTED,
      approverId: 'manager-1',
      comment: 'Budget unavailable',
    });
  });

  it('does not allow a request to be submitted twice', async () => {
    const draft = await createDraft();
    await purchaseRequestsService.submit(draft.id, {
      userId: 'employee-1',
    });

    await expect(
      purchaseRequestsService.submit(draft.id, { userId: 'employee-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not allow a non-manager to approve a request', async () => {
    const draft = await createDraft();
    await purchaseRequestsService.submit(draft.id, {
      userId: 'employee-1',
    });

    await expect(
      approvalsService.approve(draft.id, { userId: 'employee-1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
