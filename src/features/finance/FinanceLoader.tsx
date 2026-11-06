"use client";

import dynamic from "next/dynamic";
import { LangProvider } from "./i18n";

// IndexedDB only exists in the browser, so the app skips SSR.
const FinanceApp = dynamic(() => import("./FinanceApp"), {
  ssr: false,
  loading: () => <div className="boot" aria-busy="true">…</div>,
});

export default function FinanceLoader() {
  return (
    <LangProvider>
      <FinanceApp />
    </LangProvider>
  );
}
