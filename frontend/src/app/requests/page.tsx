"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RequestList } from "@/components/request-list";
import { useCurrentUser } from "@/lib/current-user";
import { apiRequest } from "@/lib/api";
import type { PurchaseRequest } from "@/types/api";

export default function RequestsPage() {
  const { user, userId } = useCurrentUser();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedForUser, setLoadedForUser] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId || user?.role !== "EMPLOYEE") return;
    let active = true;
    apiRequest<PurchaseRequest[]>("/purchase-requests")
      .then((result) => { if (!active) return; setRequests(result); setLoadedForUser(userId); setError(""); })
      .catch((cause: Error) => { if (!active) return; setError(cause.message); setLoadedForUser(userId); })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [userId, user?.role]);

  return (
    <div className="page-stack">
      <div className="page-heading page-heading-row"><div><div className="eyebrow"><span className="eyebrow-line" /> KHU VỰC NHÂN VIÊN</div><h1>Yêu cầu mua sắm<span className="heading-period">.</span></h1><p className="page-lede">Tạo yêu cầu mới và theo dõi tiến độ xử lý của bạn.</p></div>{user?.role === "EMPLOYEE" && <Link className="button button-primary" href="/requests/new">＋ Tạo yêu cầu</Link>}</div>
      {!userId && <div className="inline-notice">Đang tải danh tính demo...</div>}
      {user && user.role !== "EMPLOYEE" && <div className="inline-notice">Chọn vai trò Nhân viên ở góc trên để quản lý yêu cầu cá nhân.</div>}
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="list-toolbar"><div><strong>{requests.length}</strong> yêu cầu <span>·</span> Sắp xếp mới nhất</div><span className="list-scope">YÊU CẦU CỦA TÔI</span></div>
      {!userId || (user?.role === "EMPLOYEE" && (loading || loadedForUser !== userId)) ? <div className="loading-state">Đang tải yêu cầu...</div> : user?.role === "EMPLOYEE" ? <RequestList requests={requests} emptyTitle="Chưa có yêu cầu mua sắm" emptyText="Tạo bản nháp đầu tiên để bắt đầu quy trình." /> : null}
    </div>
  );
}
