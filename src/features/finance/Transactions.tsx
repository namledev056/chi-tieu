"use client";

import { Search } from "lucide-react";
import type { Category, Transaction } from "./db";
import { dayLabel } from "./dates";
import { formatVND } from "./money";
import { byNewest } from "./summary";
import { CategoryIcon } from "./icons";
import { cx, EmptyMonth, TxRow } from "./ui";
import s from "./finance.module.css";

export type TxFilter = "all" | "expense" | "income" | number;

export default function Transactions({
  month,
  txs,
  categories,
  catMap,
  filter,
  setFilter,
  query,
  setQuery,
  showSearch,
  onEdit,
  onAdd,
}: {
  month: string;
  txs: Transaction[];
  categories: Category[];
  catMap: Map<number, Category>;
  filter: TxFilter;
  setFilter: (f: TxFilter) => void;
  query: string;
  setQuery: (q: string) => void;
  showSearch: boolean;
  onEdit: (tx: Transaction) => void;
  onAdd: () => void;
}) {
  if (txs.length === 0) return <EmptyMonth month={month} onAdd={onAdd} />;

  const q = query.trim().toLowerCase();
  const shown = txs
    .filter((t) =>
      filter === "all" ? true : typeof filter === "number" ? t.categoryId === filter : t.type === filter,
    )
    .filter(
      (t) =>
        !q ||
        t.note.toLowerCase().includes(q) ||
        (catMap.get(t.categoryId)?.name.toLowerCase().includes(q) ?? false),
    )
    .sort(byNewest);

  const groups: { date: string; items: Transaction[]; net: number }[] = [];
  for (const t of shown) {
    let g = groups[groups.length - 1];
    if (!g || g.date !== t.date) {
      g = { date: t.date, items: [], net: 0 };
      groups.push(g);
    }
    g.items.push(t);
    g.net += t.type === "income" ? t.amount : -t.amount;
  }
  const net = groups.reduce((sum, g) => sum + g.net, 0);
  const isFiltered = filter !== "all" || q !== "";
  const used = new Set(txs.map((t) => t.categoryId));

  const chip = (value: TxFilter, label: string, icon?: string) => (
    <button
      key={String(value)}
      type="button"
      className={s.chip}
      aria-pressed={filter === value}
      onClick={() => setFilter(value)}
    >
      {icon && <CategoryIcon name={icon} />}
      {label}
    </button>
  );

  return (
    <>
      {showSearch && (
        <label className={s.search}>
          <Search aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm ghi chú, danh mục"
            aria-label="Tìm giao dịch"
            autoFocus
          />
        </label>
      )}
      <div className={s.chipsWrap}>
        <div className={s.chips} role="toolbar" aria-label="Lọc">
          {chip("all", "Tất cả")}
          {chip("expense", "Chi")}
          {chip("income", "Thu")}
          {categories.filter((c) => used.has(c.id)).map((c) => chip(c.id, c.name, c.icon))}
        </div>
      </div>

      {isFiltered && (
        <p className={s.resultMeta}>
          {shown.length} kết quả{shown.length > 0 && ` · ${net < 0 ? "−" : "+"}${formatVND(Math.abs(net))}`}
        </p>
      )}

      {groups.length === 0 ? (
        <p className={cx(s.card, s.empty, s.mt)}>Không có giao dịch nào khớp bộ lọc.</p>
      ) : (
        groups.map((g) => (
          <section key={g.date}>
            <div className={s.day}>
              <span>{dayLabel(g.date)}</span>
              <span>{`${g.net < 0 ? "−" : "+"}${formatVND(Math.abs(g.net))}`}</span>
            </div>
            <div className={s.list}>
              {g.items.map((t) => (
                <TxRow key={t.id} tx={t} cat={catMap.get(t.categoryId)} onClick={() => onEdit(t)} />
              ))}
            </div>
          </section>
        ))
      )}
    </>
  );
}
