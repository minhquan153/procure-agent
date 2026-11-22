"use client";

import Link from "next/link";
import { useState } from "react";
import type { PurchaseRequest } from "@/types/api";
import { formatDate, formatMoney, requestTotal, statusLabels } from "@/lib/format";
import { useConfirmation } from "@/components/confirmation-dialog";

export function WorkflowQueue({
  requests,
  mode,
  busyId,
  onAction,
}: {
  requests: PurchaseRequest[];
  mode: "approval" | "procurement";
  busyId: string;
  onAction: (requestId: string, action: string, comment?: string) => void;
}) {
  const [rejectingId, setRejectingId] = useState("");
  const [reason, setReason] = useState("");
  const { ask, dialog } = useConfirmation();

  async function confirmAction(request: PurchaseRequest, action: string, comment?: string) {
    const copy: Record<string, { title: string; message: string; button: string; danger?: boolean }> = {
      approve: { title: "Duy\u1ec7t y\u00eau c\u1ea7u?", message: "B\u1ea1n c\u00f3 ch\u1eafc mu\u1ed1n duy\u1ec7t y\u00eau c\u1ea7u: " + request.title + " v\u00e0 chuy\u1ec3n sang thu mua?", button: "Duy\u1ec7t y\u00eau c\u1ea7u" },
      reject: { title: "T\u1eeb ch\u1ed1i y\u00eau c\u1ea7u?", message: "Y\u00eau c\u1ea7u: " + request.title + ". L\u00fd do: " + (comment ?? ""), button: "T\u1eeb ch\u1ed1i y\u00eau c\u1ea7u", danger: true },
      "start-purchasing": { title: "B\u1eaft \u0111\u1ea7u thu mua?", message: "B\u1ea1n c\u00f3 ch\u1eafc mu\u1ed1n b\u1eaft \u0111\u1ea7u thu mua y\u00eau c\u1ea7u: " + request.title + "?", button: "B\u1eaft \u0111\u1ea7u thu mua" },
      complete: { title: "Ho\u00e0n t\u1ea5t y\u00eau c\u1ea7u?", message: "B\u1ea1n c\u00f3 ch\u1eafc mu\u1ed1n \u0111\u00e1nh d\u1ea5u y\u00eau c\u1ea7u: " + request.title + " l\u00e0 ho\u00e0n t\u1ea5t?", button: "\u0110\u00e1nh d\u1ea5u ho\u00e0n t\u1ea5t" },
    };
    const actionCopy = copy[action];
    if (!actionCopy) return;
    const confirmed = await ask({ title: actionCopy.title, message: actionCopy.message, confirmLabel: actionCopy.button, danger: actionCopy.danger });
    if (!confirmed) return;
    onAction(request.id, action, comment);
    if (action === "reject") { setRejectingId(""); setReason(""); }
  }

  if (requests.length === 0) return <div className="empty-state"><span className="empty-icon">✓</span><h3>Hàng đợi đang trống</h3><p>{mode === "approval" ? "Các yêu cầu cần bạn xét duyệt sẽ hiển thị tại đây." : "Yêu cầu đã được duyệt sẽ hiển thị tại đây để xử lý."}</p></div>;

  return <><div className="queue-list">{requests.map((request) => <article className="queue-card" key={request.id}>
    <div className="queue-card-main"><div className="queue-card-overline"><span className={`status-pill status-${request.status.toLowerCase()}`}>{statusLabels[request.status]}</span><span>Mã {request.id.slice(0, 8).toUpperCase()}</span></div><Link href={`/requests/${request.id}`} className="queue-title">{request.title} <span>↗</span></Link><p>{request.requester?.fullName ?? "Người yêu cầu"} · {request.requester?.department?.name ?? ""} · {formatDate(request.createdAt)}</p><div className="queue-card-bottom"><span>{request.items.length} mặt hàng</span><strong>{formatMoney(requestTotal(request.items))}</strong></div></div>
    <div className="queue-actions">{mode === "approval" ? <>{rejectingId === request.id ? <div className="reject-inline"><label className="field-label">Lý do từ chối<textarea rows={2} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Nhập lý do để người yêu cầu biết" /></label><div><button className="button button-danger button-small" disabled={busyId === request.id || !reason.trim()} onClick={() => void confirmAction(request, "reject", reason.trim())}>Xác nhận từ chối</button><button className="text-button" onClick={() => { setRejectingId(""); setReason(""); }}>Hủy</button></div></div> : <><button className="button button-primary button-small" disabled={busyId === request.id} onClick={() => void confirmAction(request, "approve")}>Duyệt yêu cầu</button><button className="button button-light button-small" disabled={busyId === request.id} onClick={() => { setRejectingId(request.id); setReason(""); }}>Từ chối</button></>}</> : request.status === "APPROVED" ? <button className="button button-primary button-small" disabled={busyId === request.id} onClick={() => void confirmAction(request, "start-purchasing")}>Bắt đầu thu mua</button> : <button className="button button-primary button-small" disabled={busyId === request.id} onClick={() => void confirmAction(request, "complete")}>Đánh dấu hoàn tất</button>}</div>
  </article>)}</div>{dialog}</>;
}
