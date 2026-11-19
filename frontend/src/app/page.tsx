"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { PurchaseRequest, User } from "@/types/api";

const labels: Record<string, string> = {
  DRAFT: "Bản nháp",
  PENDING_APPROVAL: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  PURCHASING: "Đang thu mua",
  COMPLETED: "Hoàn tất",
  REJECTED: "Từ chối",
  CANCELLED: "Đã hủy",
};

const rolePage: Record<string, { path: string; label: string }> = {
  EMPLOYEE: { path: "/requests", label: "Yêu cầu của tôi" },
  MANAGER: { path: "/approvals", label: "Yêu cầu chờ duyệt" },
  PROCUREMENT: { path: "/procurement", label: "Yêu cầu cần thu mua" },
  ADMIN: { path: "/procurement", label: "Quản lý yêu cầu" },
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest<User>("/auth/me").then(async (current) => {
      if (!active) return;
      setUser(current);
      const path = current.role === "MANAGER"
        ? "/purchase-requests/manager-queue"
        : current.role === "PROCUREMENT" || current.role === "ADMIN"
          ? "/purchase-requests/procurement/queue"
          : "/purchase-requests";
      try {
        const result = await apiRequest<PurchaseRequest[]>(path);
        if (active) setRequests(result);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Không tải được yêu cầu.");
      }
    }).catch((cause: Error) => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, []);

  const action = user ? rolePage[user.role] : rolePage.EMPLOYEE;
  const counts = ["DRAFT", "PENDING_APPROVAL", "PURCHASING", "COMPLETED"] as const;
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div><p className="dashboard-date">PROCUREMENT</p><h1>Xin chào{user ? `, ${user.fullName}` : ""}</h1><p className="dashboard-subtitle">Theo dõi các yêu cầu mua sắm của bạn.</p></div>
        {user?.role === "EMPLOYEE" && <Link href="/requests/new" className="button button-primary dashboard-primary-action">＋ Tạo yêu cầu</Link>}
      </header>

      <section className="dashboard-metrics" aria-label="Tổng quan yêu cầu">
        {counts.map((status) => <article className="metric-card" key={status}><span>{labels[status]}</span><strong>{requests.filter((request) => request.status === status).length}</strong></article>)}
      </section>

      <section className="dashboard-list-panel">
        <div className="dashboard-list-heading"><div><h2>{action.label}</h2><p>{requests.length} yêu cầu</p></div><Link className="button button-secondary" href={action.path}>Xem danh sách <span aria-hidden="true">→</span></Link></div>
        {error ? <p className="dashboard-message" role="status">{error}</p> : requests.length ? <div className="dashboard-recent-list">{requests.slice(0, 5).map((request) => <Link className="dashboard-request-row" href={`/requests/${request.id}`} key={request.id}><span className="dashboard-request-main"><strong>{request.title}</strong><small>{request.items.length} mặt hàng · {new Date(request.updatedAt).toLocaleDateString("vi-VN")}</small></span><span className={`status-pill status-${request.status.toLowerCase()}`}>{labels[request.status]}</span><span className="dashboard-row-arrow" aria-hidden="true">→</span></Link>)}</div> : <div className="dashboard-empty"><p>Chưa có yêu cầu nào.</p>{user?.role === "EMPLOYEE" && <Link href="/requests/new">Tạo yêu cầu đầu tiên <span aria-hidden="true">→</span></Link>}</div>}
      </section>
    </div>
  );
}
