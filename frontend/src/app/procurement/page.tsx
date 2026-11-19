"use client";

import { useCallback, useEffect, useState } from "react";
import { WorkflowQueue } from "@/components/workflow-queue";
import { apiRequest } from "@/lib/api";
import { useCurrentUser } from "@/lib/current-user";
import type { PurchaseRequest } from "@/types/api";

export default function ProcurementPage() {
  const { user, userId } = useCurrentUser();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedForUser, setLoadedForUser] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    if (!userId) return;
    const result = await apiRequest<PurchaseRequest[]>("/purchase-requests/procurement/queue");
    setRequests(result);
  }, [userId]);

  useEffect(() => {
    if (!userId || !["PROCUREMENT", "ADMIN"].includes(user?.role ?? "")) return;
    let active = true;
    apiRequest<PurchaseRequest[]>("/purchase-requests/procurement/queue").then((result) => { if (!active) return; setRequests(result); setLoadedForUser(userId); setError(""); }).catch((cause: Error) => { if (!active) return; setError(cause.message); setLoadedForUser(userId); }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [userId, user?.role]);

  async function process(requestId: string, action: string) {
    if (!userId) return;
    setBusyId(requestId); setError("");
    try {
      await apiRequest(`/purchase-requests/${requestId}/${action}`, { method: "POST" });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không cập nhật được yêu cầu."); }
    finally { setBusyId(""); }
  }

  return <div className="page-stack"><div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> HÀNG ĐỢI THU MUA</div><h1>Thu mua<span className="heading-period">.</span></h1><p className="page-lede">Tiếp nhận yêu cầu đã duyệt và cập nhật tiến độ thực hiện.</p></div><span className="queue-count">{requests.length} ĐANG XỬ LÝ</span></div>{user && !["PROCUREMENT", "ADMIN"].includes(user.role) && <div className="inline-notice">Hãy chọn tài khoản Thu mua hoặc Quản trị viên ở góc trên để mở hàng đợi.</div>}{error && <div className="form-error" role="alert">{error}</div>}{!userId || (["PROCUREMENT", "ADMIN"].includes(user?.role ?? "") && (loading || loadedForUser !== userId)) ? <div className="loading-state">Đang tải hàng đợi...</div> : ["PROCUREMENT", "ADMIN"].includes(user?.role ?? "") ? <WorkflowQueue requests={requests} mode="procurement" busyId={busyId} onAction={process} /> : null}</div>;
}
