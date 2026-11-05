"use client";

import dynamic from "next/dynamic";

// IndexedDB chỉ có ở trình duyệt → tắt SSR cho app.
const FinanceApp = dynamic(() => import("./FinanceApp"), {
  ssr: false,
  loading: () => <div className="boot">Đang tải…</div>,
});

export default function FinanceLoader() {
  return <FinanceApp />;
}
