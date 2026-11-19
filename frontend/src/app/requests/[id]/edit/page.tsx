"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RequestForm } from "@/components/request-form";
import { useCurrentUser } from "@/lib/current-user";
import { apiRequest } from "@/lib/api";
import type { PurchaseRequest } from "@/types/api";

export default function EditRequestPage() {
  const { id } = useParams<{ id: string }>();
  const { user, userId } = useCurrentUser();
  const [request, setRequest] = useState<PurchaseRequest | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!id) return;
    let active = true;
    apiRequest<PurchaseRequest>(`/purchase-requests/${id}`).then((result) => active && setRequest(result)).catch((cause: Error) => active && setError(cause.message));
    return () => { active = false; };
  }, [id]);
  return <div className="page-stack"><div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> CHỈNH SỬA BẢN NHÁP</div><h1>Cập nhật yêu cầu<span className="heading-period">.</span></h1></div></div>{error && <div className="form-error">{error}</div>}{request && userId && (request.status !== "DRAFT" || request.requesterId !== userId || user?.role !== "EMPLOYEE") ? <div className="inline-notice">Chỉ người tạo mới có thể sửa yêu cầu đang ở trạng thái bản nháp. <Link href={`/requests/${id}`}>Quay lại chi tiết</Link></div> : request && userId ? <RequestForm userId={userId} request={request} /> : <div className="loading-state">Đang tải yêu cầu...</div>}</div>;
}
