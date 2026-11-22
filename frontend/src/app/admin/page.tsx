"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { User, UserRole } from "@/types/api";
import { useConfirmation } from "@/components/confirmation-dialog";

type Department = { id: string; name: string; code: string };
const roleNames: Record<UserRole, string> = { EMPLOYEE: "Nhân viên", MANAGER: "Quản lý", PROCUREMENT: "Thu mua", ADMIN: "Quản trị viên" };

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const { ask, dialog } = useConfirmation();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "EMPLOYEE" as UserRole, departmentId: "" });

  const load = useCallback(async () => {
    const [nextUsers, nextDepartments] = await Promise.all([apiRequest<User[]>("/users"), apiRequest<Department[]>("/departments")]);
    setUsers(nextUsers);
    setDepartments(nextDepartments);
    setForm((current) => ({ ...current, departmentId: current.departmentId || nextDepartments[0]?.id || "" }));
  }, []);

  useEffect(() => { void load().catch((cause: Error) => setError(cause.message)); }, [load]);

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      await apiRequest("/users", { method: "POST", body: JSON.stringify(form) });
      setForm((current) => ({ ...current, fullName: "", email: "", password: "" }));
      await load(); setNotice("Đã tạo tài khoản.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không tạo được tài khoản."); }
    finally { setBusy(false); }
  }

  async function toggleUser(user: User & { isActive?: boolean }) {
    const locking = Boolean(user.isActive);
    const confirmed = await ask({
      title: locking ? "Kh\u00f3a t\u00e0i kho\u1ea3n?" : "M\u1edf kh\u00f3a t\u00e0i kho\u1ea3n?",
      message: locking ? "T\u00e0i kho\u1ea3n " + user.fullName + " s\u1ebd kh\u00f4ng th\u1ec3 \u0111\u0103ng nh\u1eadp cho \u0111\u1ebfn khi \u0111\u01b0\u1ee3c m\u1edf kh\u00f3a." : "Cho ph\u00e9p " + user.fullName + " \u0111\u0103ng nh\u1eadp l\u1ea1i?",
      confirmLabel: locking ? "Kh\u00f3a t\u00e0i kho\u1ea3n" : "M\u1edf kh\u00f3a",
      danger: locking,
    });
    if (!confirmed) return;
    setBusy(true); setError(""); setNotice("");
    try { await apiRequest(`/users/${user.id}/status`, { method: "PATCH", body: JSON.stringify({ isActive: !user.isActive }) }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không cập nhật được tài khoản."); }
    finally { setBusy(false); }
  }

  return <><div className="page-stack admin-page">
    <header className="page-heading"><div><h1>Quản trị</h1><p className="page-lede">Tài khoản nội bộ</p></div></header>
    {error && <div className="form-error" role="alert">{error}</div>}{notice && <div className="success-notice" role="status">{notice}</div>}
    <section className="form-card admin-create"><div className="card-heading"><div><h2>Tạo tài khoản</h2></div></div>
      <form className="admin-user-form" onSubmit={createUser}>
        <label className="field-label">Họ và tên<input required maxLength={120} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label>
        <label className="field-label">Email<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label className="field-label">Mật khẩu tạm<input required minLength={12} type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><small>Tối thiểu 12 ký tự</small></label>
        <label className="field-label">Vai trò<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>{Object.entries(roleNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="field-label">Phòng ban<select required value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
        <button className="button button-primary" disabled={busy || !departments.length}>{busy ? "Đang lưu…" : "Tạo tài khoản"}</button>
      </form>
    </section>
    <section className="form-card admin-users"><div className="card-heading"><div><h2>Danh sách tài khoản</h2><p className="muted-copy">{users.length} tài khoản</p></div></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Người dùng</th><th>Vai trò</th><th>Phòng ban</th><th>Trạng thái</th><th></th></tr></thead><tbody>{users.map((raw) => { const user = raw as User & { isActive?: boolean }; return <tr key={user.id}><td><strong>{user.fullName}</strong><small>{user.email}</small></td><td>{roleNames[user.role]}</td><td>{user.department?.name ?? "—"}</td><td><span className={`status-pill ${user.isActive ? "status-approved" : "status-cancelled"}`}>{user.isActive ? "Đang hoạt động" : "Đã khóa"}</span></td><td><button className="button button-secondary button-small" disabled={busy} onClick={() => void toggleUser(user)}>{user.isActive ? "Khóa tài khoản" : "Mở lại"}</button></td></tr>; })}</tbody></table></div>
    </section>
  </div>{dialog}</>;
}
