"use client";

import Link from "next/link";
import { RequestForm } from "@/components/request-form";
import { useCurrentUser } from "@/lib/current-user";

export default function NewRequestPage() {
  const { user, userId } = useCurrentUser();
  return <div className="page-stack"><div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> YÊU CẦU MỚI</div><h1>Tạo yêu cầu mua sắm<span className="heading-period">.</span></h1><p className="page-lede">Lưu thành bản nháp, sau đó kiểm tra lại trước khi gửi duyệt.</p></div></div>{user?.role !== "EMPLOYEE" ? <div className="inline-notice">Chỉ người dùng có vai trò Nhân viên mới tạo được yêu cầu. <Link href="/">Quay về tổng quan</Link></div> : userId ? <RequestForm userId={userId} /> : <div className="loading-state">Đang tải danh tính demo...</div>}</div>;
}
