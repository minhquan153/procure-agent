import type { PurchaseRequestStatus } from "@/types/api";

export const statusLabels: Record<PurchaseRequestStatus, string> = {
  DRAFT: "Bản nháp",
  PENDING_APPROVAL: "Chờ phê duyệt",
  APPROVED: "Đã phê duyệt",
  REJECTED: "Bị từ chối",
  PURCHASING: "Đang thu mua",
  COMPLETED: "Đã hoàn tất",
  CANCELLED: "Đã hủy",
};

export function formatMoney(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "Chưa nhập";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function requestTotal(items: { quantity: number; estimatedUnitCost: number | string | null }[]) {
  return items.reduce(
    (total, item) => total + item.quantity * Number(item.estimatedUnitCost ?? 0),
    0,
  );
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
