"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useCurrentUser } from "@/lib/current-user";
import { formatDate, formatMoney, requestTotal, statusLabels } from "@/lib/format";
import type { PurchaseRequest } from "@/types/api";
import { useConfirmation } from "@/components/confirmation-dialog";

export default function RequestDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, userId, users } = useCurrentUser();
  const [request, setRequest] = useState<PurchaseRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { ask, dialog } = useConfirmation();

  const load = useCallback(async () => {
    const result = await apiRequest<PurchaseRequest>(`/purchase-requests/${id}`);
    setRequest(result);
  }, [id]);

  useEffect(() => {
    let active = true;
    apiRequest<PurchaseRequest>(`/purchase-requests/${id}`).then((result) => active && setRequest(result)).catch((cause: Error) => active && setError(cause.message)).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  async function act(path: string, body: unknown, successMessage: string) {
    setBusy(true); setError("");
    try {
      await apiRequest(`/purchase-requests/${id}/${path}`, { method: "POST", body: JSON.stringify(body ?? {}) });
      await load();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : successMessage);
    } finally { setBusy(false); }
  }

  async function confirmAction(path: "submit" | "cancel") {
    const isSubmit = path === "submit";
    const confirmed = await ask({
      title: isSubmit ? "G\u1eedi y\u00eau c\u1ea7u ph\u00ea duy\u1ec7t?" : "H\u1ee7y b\u1ea3n nh\u00e1p?",
      message: isSubmit ? "Sau khi g\u1eedi, b\u1ea1n s\u1ebd kh\u00f4ng th\u1ec3 ch\u1ec9nh s\u1eeda y\u00eau c\u1ea7u." : "B\u1ea1n c\u00f3 ch\u1eafc mu\u1ed1n h\u1ee7y b\u1ea3n nh\u00e1p n\u00e0y? Thao t\u00e1c kh\u00f4ng th\u1ec3 ho\u00e0n t\u00e1c.",
      confirmLabel: isSubmit ? "G\u1eedi duy\u1ec7t" : "H\u1ee7y b\u1ea3n nh\u00e1p",
      danger: !isSubmit,
    });
    if (confirmed) await act(path, {}, isSubmit ? "Kh\u00f4ng g\u1eedi \u0111\u01b0\u1ee3c y\u00eau c\u1ea7u." : "Kh\u00f4ng h\u1ee7y \u0111\u01b0\u1ee3c b\u1ea3n nh\u00e1p.");
  }

  if (loading) return <div className="loading-state">Đang tải chi tiết yêu cầu...</div>;
  if (!request) return <div className="page-stack"><Link className="back-link" href="/requests">← Danh sách yêu cầu</Link><div className="form-error">{error || "Không tìm thấy yêu cầu."}</div></div>;

  const isOwner = request.requesterId === userId && user?.role === "EMPLOYEE";
  const total = requestTotal(request.items);
  const missingUnitCost = request.items.some((item) => item.estimatedUnitCost === null);
  return (
    <>
    <div className="page-stack">
      <Link className="back-link" href="/requests">← Danh sách yêu cầu</Link>
        <div className="detail-heading"><div><div className="detail-title-row"><h1>{request.title}</h1><span className={`status-pill status-${request.status.toLowerCase()}`}>{statusLabels[request.status]}</span></div><div className="detail-meta-line">{formatDate(request.createdAt)} · {request.id.slice(0, 8).toUpperCase()}</div>{isOwner && request.status === "DRAFT" && missingUnitCost && <p className="submit-hint">Cần nhập đơn giá cho tất cả mặt hàng trước khi gửi duyệt.</p>}</div><div className="detail-actions">{isOwner && request.status === "DRAFT" && <><Link href={`/requests/${request.id}/edit`} className="button button-light">Chỉnh sửa</Link><button className="button button-primary" disabled={busy || missingUnitCost} onClick={() => void confirmAction("submit")}>Gửi duyệt</button><button className="button button-danger" disabled={busy} onClick={() => void confirmAction("cancel")}>Hủy bản nháp</button></>}</div></div>
      {error && <div className="form-error" role="alert">{error}</div>}
      {request.status === "REJECTED" && request.approval?.comment && <div className="rejection-note"><strong>Lý do từ chối</strong><p>{request.approval.comment}</p></div>}
      <div className="detail-grid">
        <section className="detail-card"><div className="card-heading"><div><h2>Mặt hàng</h2></div><span>{request.items.length} dòng</span></div><div className="detail-items">{request.items.map((item) => <article className="detail-item" key={item.id}><div className="detail-item-copy"><strong>{item.name}</strong>{item.description && <p>{item.description}</p>}</div><div className="detail-item-total"><span>SL: {item.quantity} <span aria-hidden="true">·</span> Đơn giá: {formatMoney(item.estimatedUnitCost)}</span><b>{item.estimatedUnitCost === null ? "—" : formatMoney(item.quantity * Number(item.estimatedUnitCost))}</b></div></article>)}</div><div className="detail-total"><span>Tổng dự kiến</span><strong>{formatMoney(total)}</strong></div></section>
        <aside className="detail-card detail-meta"><div className="section-overline">NGƯỜI YÊU CẦU</div><div className="requester-profile"><span className="profile-avatar">{request.requester?.department?.code ?? request.requester?.fullName.slice(0, 1) ?? "?"}</span><div><strong>{request.requester?.fullName ?? "Người dùng"}</strong><span>{request.requester?.department?.name ?? ""}</span></div></div><div className="meta-divider-line"/><div className="meta-pair"><span>Trạng thái</span><strong>{statusLabels[request.status]}</strong></div><div className="meta-pair"><span>Cập nhật lần cuối</span><strong>{formatDate(request.updatedAt)}</strong></div>{request.approval?.approver && <div className="meta-pair"><span>Quản lý phụ trách</span><strong>{request.approval.approver.fullName}</strong></div>}{request.approval?.decidedAt && <div className="meta-pair"><span>Ngày quyết định</span><strong>{formatDate(request.approval.decidedAt)}</strong></div>}</aside>
      </div>
      <section className="detail-card timeline-card"><div className="card-heading"><div><div className="section-overline">THEO DÕI</div><h2>Lịch sử hoạt động</h2></div><span className="event-count">{request.auditLogs?.length ?? 0} SỰ KIỆN</span></div><div className="timeline">{request.auditLogs?.length ? request.auditLogs.map((log) => { const details = log.details as { from?: string; to?: string } | null; const actor = users.find((candidate) => candidate.id === log.actorId); const label = details?.to ? `Chuyển trạng thái: ${statusLabels[details.to as keyof typeof statusLabels] ?? details.to}` : log.action === "REQUEST_CREATED" ? "Tạo bản nháp" : log.action === "REQUEST_UPDATED" ? "Cập nhật yêu cầu" : log.action; return <div className="timeline-event" key={log.id}><span className="timeline-dot"/><div><strong>{label}</strong><p>{actor?.fullName ?? "Hệ thống"} · {formatDate(log.createdAt)}</p></div></div>; }) : <p className="muted-copy">Chưa có lịch sử hoạt động.</p>}</div></section>
    </div>
    {dialog}
    </>
  );
}
