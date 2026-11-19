"use client";

import Link from "next/link";
import { useState } from "react";
import type { PurchaseRequest } from "@/types/api";
import { formatDate, formatMoney, requestTotal, statusLabels } from "@/lib/format";

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

  if (requests.length === 0) return <div className="empty-state"><span className="empty-icon">✓</span><h3>Hàng đợi đang trống</h3><p>{mode === "approval" ? "Các yêu cầu cần bạn xét duyệt sẽ hiển thị tại đây." : "Yêu cầu đã được duyệt sẽ hiển thị tại đây để xử lý."}</p></div>;

  return <div className="queue-list">{requests.map((request) => <article className="queue-card" key={request.id}>
    <div className="queue-card-main"><div className="queue-card-overline"><span className={`status-pill status-${request.status.toLowerCase()}`}>{statusLabels[request.status]}</span><span>Mã {request.id.slice(0, 8).toUpperCase()}</span></div><Link href={`/requests/${request.id}`} className="queue-title">{request.title} <span>↗</span></Link><p>{request.requester?.fullName ?? "Người yêu cầu"} · {request.requester?.department?.name ?? ""} · {formatDate(request.createdAt)}</p><div className="queue-card-bottom"><span>{request.items.length} mặt hàng</span><strong>{formatMoney(requestTotal(request.items))}</strong></div></div>
    <div className="queue-actions">{mode === "approval" ? <>{rejectingId === request.id ? <div className="reject-inline"><label className="field-label">Lý do từ chối<textarea rows={2} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Nhập lý do để người yêu cầu biết" /></label><div><button className="button button-danger button-small" disabled={busyId === request.id || !reason.trim()} onClick={() => { onAction(request.id, "reject", reason.trim()); setRejectingId(""); setReason(""); }}>Xác nhận từ chối</button><button className="text-button" onClick={() => { setRejectingId(""); setReason(""); }}>Hủy</button></div></div> : <><button className="button button-primary button-small" disabled={busyId === request.id} onClick={() => onAction(request.id, "approve")}>Duyệt yêu cầu</button><button className="button button-light button-small" disabled={busyId === request.id} onClick={() => { setRejectingId(request.id); setReason(""); }}>Từ chối</button></>}</> : request.status === "APPROVED" ? <button className="button button-primary button-small" disabled={busyId === request.id} onClick={() => onAction(request.id, "start-purchasing")}>Bắt đầu thu mua</button> : <button className="button button-primary button-small" disabled={busyId === request.id} onClick={() => onAction(request.id, "complete")}>Đánh dấu hoàn tất</button>}</div>
  </article>)}</div>;
}
