"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PurchaseRequest } from "@/types/api";
import { formatDate, formatMoney, requestTotal, statusLabels } from "@/lib/format";
import { PURCHASE_REQUEST_STATUSES, type PurchaseRequestStatus } from "@/types/api";

export function RequestList({ requests, emptyTitle = "Chưa có yêu cầu nào", emptyText = "Khi có yêu cầu, chúng sẽ xuất hiện tại đây." }: {
  requests: PurchaseRequest[];
  emptyTitle?: string;
  emptyText?: string;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PurchaseRequestStatus | "ALL">("ALL");
  const filteredRequests = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("vi");
    return requests.filter((request) => {
      const matchesStatus = status === "ALL" || request.status === status;
      const searchable = [request.title, request.description ?? "", ...request.items.map((item) => item.name)].join(" ").toLocaleLowerCase("vi");
      return matchesStatus && (!query || searchable.includes(query));
    });
  }, [requests, search, status]);

  if (requests.length === 0) {
    return <div className="empty-state"><span className="empty-icon">▤</span><h3>{emptyTitle}</h3><p>{emptyText}</p></div>;
  }

  return (
    <>
    <div className="request-filters"><label className="search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tiêu đề hoặc mặt hàng" aria-label="Tìm yêu cầu" /></label><label className="filter-select-label"><span>Trạng thái</span><select value={status} onChange={(event) => setStatus(event.target.value as PurchaseRequestStatus | "ALL")}><option value="ALL">Tất cả</option>{PURCHASE_REQUEST_STATUSES.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</select></label><span className="filter-result">{filteredRequests.length} / {requests.length}</span></div>
    {filteredRequests.length === 0 ? <div className="empty-state filtered-empty"><span className="empty-icon">⌕</span><h3>Không tìm thấy yêu cầu</h3><p>Thử từ khóa khác hoặc đổi bộ lọc trạng thái.</p></div> : <div className="request-list">
      {filteredRequests.map((request) => (
        <Link className="request-row" href={`/requests/${request.id}`} key={request.id}>
          <div className="request-row-main">
            <span className={`status-pill status-${request.status.toLowerCase()}`}>{statusLabels[request.status]}</span>
            <h3>{request.title}</h3>
            <p>{request.items.length} mặt hàng <span>·</span> {formatDate(request.createdAt)}</p>
          </div>
          <div className="request-row-side"><span>{formatMoney(requestTotal(request.items))}</span><b>→</b></div>
        </Link>
      ))}
    </div>}
    </>
  );
}
