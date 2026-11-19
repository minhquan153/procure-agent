"use client";

import { useCallback, useEffect, useState } from "react";
import { WorkflowQueue } from "@/components/workflow-queue";
import { apiRequest } from "@/lib/api";
import { useCurrentUser } from "@/lib/current-user";
import type { PurchaseRequest } from "@/types/api";

export default function ApprovalsPage() {
  const { user, userId } = useCurrentUser();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedForUser, setLoadedForUser] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    if (!userId) return;
    const result = await apiRequest<PurchaseRequest[]>("/purchase-requests/manager-queue");
    setRequests(result);
  }, [userId]);

  useEffect(() => {
    if (!userId || user?.role !== "MANAGER") return;
    let active = true;
    apiRequest<PurchaseRequest[]>("/purchase-requests/manager-queue").then((result) => { if (!active) return; setRequests(result); setLoadedForUser(userId); setError(""); }).catch((cause: Error) => { if (!active) return; setError(cause.message); setLoadedForUser(userId); }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [userId, user?.role]);

  async function decide(requestId: string, action: string, comment?: string) {
    if (!userId) return;
    setBusyId(requestId); setError("");
    try {
      await apiRequest(`/approvals/${requestId}/${action}`, { method: "POST", body: JSON.stringify({ ...(comment ? { comment } : {}) }) });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không cập nhật được quyết định."); }
    finally { setBusyId(""); }
  }

  return <div className="page-stack"><div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> HÀNG ĐỢI QUẢN LÝ</div><h1>Phê duyệt yêu cầu<span className="heading-period">.</span></h1><p className="page-lede">Xem yêu cầu thuộc phòng ban và đưa ra quyết định.</p></div><span className="queue-count">{requests.length} ĐANG CHỜ</span></div>{user && user.role !== "MANAGER" && <div className="inline-notice">Hãy chọn tài khoản Quản lý được phân công ở góc trên để mở hàng đợi.</div>}{error && <div className="form-error" role="alert">{error}</div>}{!userId || (user?.role === "MANAGER" && (loading || loadedForUser !== userId)) ? <div className="loading-state">Đang tải hàng đợi...</div> : user?.role === "MANAGER" ? <WorkflowQueue requests={requests} mode="approval" busyId={busyId} onAction={decide} /> : null}</div>;
}
