"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiRequest, ApiError } from "@/lib/api";
import type { User } from "@/types/api";

const roleLabels: Record<string, string> = {
  EMPLOYEE: "Nhân viên",
  MANAGER: "Quản lý",
  PROCUREMENT: "Thu mua",
  ADMIN: "Quản trị viên",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (isLoginPage) return;
    let active = true;
    void apiRequest<User>("/auth/me")
      .then((current) => { if (active) setUser(current); })
      .catch((cause: Error) => {
        if (!active) return;
        setUser(null);
        if (cause instanceof ApiError && cause.status === 401) router.replace("/login");
        else setError(cause.message || "Không kiểm tra được phiên đăng nhập.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isLoginPage, retryKey, router]);

  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      router.replace("/login");
    };
    window.addEventListener("procure-auth-expired", onExpired);
    return () => window.removeEventListener("procure-auth-expired", onExpired);
  }, [router]);

  async function logout() {
    setSigningOut(true);
    try {
      await apiRequest("/auth/logout", { method: "POST" });
      setUser(null);
      router.replace("/login");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không đăng xuất được.");
    } finally {
      setSigningOut(false);
    }
  }

  if (isLoginPage) return <>{children}</>;
  if (loading) return <div className="auth-loading">Đang kiểm tra phiên đăng nhập…</div>;
  if (!user) return <div className="auth-loading"><p>{error || "Đang chuyển đến trang đăng nhập…"}</p><button className="button button-light" onClick={() => { setLoading(true); setError(""); setRetryKey((current) => current + 1); }}>Thử lại</button></div>;

  const navItems = [
    ...(user.role === "EMPLOYEE" ? [{ href: "/requests", icon: "▤", label: "Yêu cầu mua sắm" }] : []),
    ...(user.role === "MANAGER" ? [{ href: "/approvals", icon: "✓", label: "Phê duyệt" }] : []),
    ...(["PROCUREMENT", "ADMIN"].includes(user.role) ? [{ href: "/procurement", icon: "◈", label: "Thu mua" }] : []),
    ...(user.role === "ADMIN" ? [{ href: "/admin", icon: "⚙", label: "Quản trị" }] : []),
  ];
  const pageLabel = pathname.startsWith("/requests") ? "Yêu cầu mua sắm" : pathname.startsWith("/approvals") ? "Phê duyệt" : pathname.startsWith("/procurement") ? "Thu mua" : pathname.startsWith("/admin") ? "Quản trị" : "Tổng quan";

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Procure, trang chủ"><span className="brand-mark">P</span><span>procure<span className="brand-dot">.</span></span></Link>
        <div className="workspace-label">KHÔNG GIAN LÀM VIỆC</div>
        <nav className="side-nav" aria-label="Điều hướng chính">
          <Link href="/" className={`nav-item ${pathname === "/" ? "active" : ""}`} aria-current={pathname === "/" ? "page" : undefined}><span className="nav-icon">⌂</span> Tổng quan</Link>
          <div className="nav-section-label">QUY TRÌNH</div>
          {navItems.map((item) => <Link key={item.href} href={item.href} className={`nav-item ${pathname.startsWith(item.href) ? "active" : ""}`} aria-current={pathname.startsWith(item.href) ? "page" : undefined}><span className="nav-icon">{item.icon}</span> {item.label}</Link>)}
        </nav>
        <div className="sidebar-bottom" />
      </aside>
      <div className="main-column">
        <header className="topbar"><div className="breadcrumb"><span>Không gian làm việc</span><b>/</b><strong>{pageLabel}</strong></div><div className="signed-in-user"><span className="avatar">{user.fullName.slice(0, 1)}</span><span className="signed-in-copy"><strong>{user.fullName}</strong><small>{roleLabels[user.role] ?? user.role}</small></span><button className="logout-button" onClick={logout} disabled={signingOut}>{signingOut ? "Đang thoát…" : "Đăng xuất"}</button></div></header>
        {error && <div className="connection-alert" role="status">{error}</div>}
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
