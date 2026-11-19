export type UserRole = "EMPLOYEE" | "MANAGER" | "PROCUREMENT" | "ADMIN";

export type PurchaseRequestStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "PURCHASING"
  | "COMPLETED"
  | "CANCELLED";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  departmentId: string;
  department?: Department;
}

export interface PurchaseRequestItem {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  estimatedUnitCost: number | string | null;
}

export interface Approval {
  id: string;
  status: ApprovalStatus;
  comment: string | null;
  decidedAt: string | null;
  approverId: string | null;
  approver?: User | null;
}

export interface PurchaseRequest {
  id: string;
  title: string;
  description: string | null;
  status: PurchaseRequestStatus;
  requesterId: string;
  items: PurchaseRequestItem[];
  approval?: Approval | null;
  requester?: User;
  auditLogs?: AuditLog[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  details: unknown;
  purchaseRequestId: string;
  actorId: string | null;
  createdAt: string;
}

export interface CreatePurchaseRequestItemInput {
  name: string;
  description?: string;
  quantity: number;
  estimatedUnitCost?: number | string;
}

export interface CreatePurchaseRequestInput {
  requesterId: string;
  title: string;
  description?: string;
  items: CreatePurchaseRequestItemInput[];
}

export type UpdatePurchaseRequestInput = Partial<
  Omit<CreatePurchaseRequestInput, "requesterId">
>;

export interface UserActionInput {
  userId: string;
}

export interface ApprovalDecisionInput extends UserActionInput {
  comment?: string;
}

export const USER_ROLES: UserRole[] = [
  "EMPLOYEE",
  "MANAGER",
  "PROCUREMENT",
  "ADMIN",
];

export const PURCHASE_REQUEST_STATUSES: PurchaseRequestStatus[] = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "PURCHASING",
  "COMPLETED",
  "CANCELLED",
];
