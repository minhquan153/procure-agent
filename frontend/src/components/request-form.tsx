"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import type { CreatePurchaseRequestInput, PurchaseRequest, PurchaseRequestItem } from "@/types/api";
import { useConfirmation } from "@/components/confirmation-dialog";

type EditableItem = { name: string; description: string; quantity: string; estimatedUnitCost: string };
const emptyItem = (): EditableItem => ({ name: "", description: "", quantity: "1", estimatedUnitCost: "" });

export function RequestForm({ userId, request }: { userId: string; request?: PurchaseRequest }) {
  const router = useRouter();
  const [title, setTitle] = useState(request?.title ?? "");
  const [description, setDescription] = useState(request?.description ?? "");
  const [items, setItems] = useState<EditableItem[]>(request?.items.map((item: PurchaseRequestItem) => ({
    name: item.name,
    description: item.description ?? "",
    quantity: String(item.quantity),
    estimatedUnitCost: item.estimatedUnitCost === null ? "" : String(item.estimatedUnitCost),
  })) ?? [emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { ask, dialog } = useConfirmation();

  function updateItem(index: number, key: keyof EditableItem, value: string) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  }

  async function removeItem(index: number, itemName: string) {
    const confirmed = await ask({ title: "X\u00f3a m\u1eb7t h\u00e0ng?", message: `B\u1ea1n c\u00f3 ch\u1eafc mu\u1ed1n x\u00f3a \"${itemName || `M\u1eb7t h\u00e0ng ${index + 1}`}\" kh\u1ecfi y\u00eau c\u1ea7u?`, confirmLabel: "X\u00f3a m\u1eb7t h\u00e0ng", danger: true });
    if (confirmed) setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const payload: CreatePurchaseRequestInput = {
      requesterId: userId,
      title: title.trim(),
      description: description.trim() || undefined,
      items: items.map((item) => ({
        name: item.name.trim(),
        description: item.description.trim() || undefined,
        quantity: Number(item.quantity),
        ...(item.estimatedUnitCost.trim() ? { estimatedUnitCost: Number(item.estimatedUnitCost) } : {}),
      })),
    };
    if (!payload.title || payload.items.some((item) => !item.name || !Number.isInteger(item.quantity) || item.quantity < 1 || (item.estimatedUnitCost !== undefined && Number(item.estimatedUnitCost) < 0))) {
      setError("Hãy nhập tiêu đề, tên hàng, số lượng nguyên dương và đơn giá hợp lệ.");
      return;
    }
    setSaving(true);
    try {
      const saved = request
        ? await apiRequest<PurchaseRequest>(`/purchase-requests/${request.id}`, { method: "PATCH", body: JSON.stringify({ title: payload.title, description: description.trim(), items: payload.items }) })
        : await apiRequest<PurchaseRequest>("/purchase-requests", { method: "POST", body: JSON.stringify({ title: payload.title, description: payload.description, items: payload.items }) });
      router.push(`/requests/${saved.id}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không lưu được yêu cầu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
    <form className="form-card" onSubmit={submit}>
      <div className="form-section-label">THÔNG TIN YÊU CẦU</div>
      <label className="field-label"><span className="field-label-text">Tên yêu cầu <b>*</b></span><input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Thiết bị làm việc quý 1" /></label>
      <label className="field-label">Mô tả <small>TÙY CHỌN</small><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Mục đích hoặc thông tin bổ sung" /></label>
      <div className="form-section-heading"><div><div className="form-section-label">MẶT HÀNG</div></div><button className="button button-light button-small" type="button" onClick={() => setItems((current) => [...current, emptyItem()])}>＋ Thêm mặt hàng</button></div>
      <div className="item-editor-list">
        {items.map((item, index) => (
          <fieldset className="item-editor" key={index}>
            <div className="item-editor-title"><strong>Mặt hàng {String(index + 1).padStart(2, "0")}</strong>{items.length > 1 && <button className="text-button danger-text" type="button" onClick={() => void removeItem(index, item.name)}>Xóa</button>}</div>
            <div className="item-fields"><label className="field-label"><span className="field-label-text">Tên mặt hàng <b>*</b></span><input required value={item.name} onChange={(event) => updateItem(index, "name", event.target.value)} placeholder="Tên hàng hóa hoặc dịch vụ" /></label><label className="field-label"><span className="field-label-text">Số lượng <b>*</b></span><input required type="number" min="1" step="1" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} /></label><label className="field-label">Đơn giá dự kiến <small>TÙY CHỌN</small><input type="number" min="0" step="1000" value={item.estimatedUnitCost} onChange={(event) => updateItem(index, "estimatedUnitCost", event.target.value)} placeholder="VNĐ" /></label></div>
            <label className="field-label item-description">Ghi chú mặt hàng<textarea rows={2} value={item.description} onChange={(event) => updateItem(index, "description", event.target.value)} placeholder="Mô tả quy cách, yêu cầu..." /></label>
          </fieldset>
        ))}
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="form-actions"><button className="button button-primary" type="submit" disabled={saving}>{saving ? "Đang lưu..." : request ? "Lưu thay đổi" : "Tạo bản nháp"}</button><button className="button button-light" type="button" onClick={() => router.back()}>Quay lại</button></div>
    </form>
    {dialog}
    </>
  );
}
