"use client";

import { Search } from "lucide-react";
import type { Category, Transaction } from "./db";
import { dayLabel } from "./dates";
import { formatVND } from "./money";
import { byNewest } from "./summary";
import { CategoryIcon } from "./icons";
import { cx, EmptyMonth, TxRow } from "./ui";
import { useT } from "./i18n";
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
  const t = useT();
  if (txs.length === 0) return <EmptyMonth month={month} onAdd={onAdd} />;

  const q = query.trim().toLowerCase();
  const shown = txs
    .filter((tx) =>
      filter === "all" ? true : typeof filter === "number" ? tx.categoryId === filter : tx.type === filter,
    )
    .filter(
      (tx) =>
        !q ||
        tx.note.toLowerCase().includes(q) ||
        (catMap.get(tx.categoryId)?.name.toLowerCase().includes(q) ?? false),
    )
    .sort(byNewest);

  const groups: { date: string; items: Transaction[]; net: number }[] = [];
  for (const tx of shown) {
    let g = groups[groups.length - 1];
    if (!g || g.date !== tx.date) {
      g = { date: tx.date, items: [], net: 0 };
      groups.push(g);
    }
    g.items.push(tx);
    g.net += tx.type === "income" ? tx.amount : -tx.amount;
  }
  const net = groups.reduce((sum, g) => sum + g.net, 0);
  const isFiltered = filter !== "all" || q !== "";
  const used = new Set(txs.map((tx) => tx.categoryId));

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
            placeholder={t.searchPlaceholder}
            aria-label={t.searchTx}
            autoFocus
          />
        </label>
      )}
      <div className={s.chipsWrap}>
        <div className={s.chips} role="toolbar" aria-label={t.filter}>
          {chip("all", t.all)}
          {chip("expense", t.expense)}
          {chip("income", t.income)}
          {categories.filter((c) => used.has(c.id)).map((c) => chip(c.id, c.name, c.icon))}
        </div>
      </div>

      {isFiltered && (
        <p className={s.resultMeta}>
          {t.results(shown.length)}{shown.length > 0 && ` · ${net < 0 ? "−" : "+"}${formatVND(Math.abs(net))}`}
        </p>
      )}

      {groups.length === 0 ? (
        <p className={cx(s.card, s.empty, s.mt)}>{t.noMatch}</p>
      ) : (
        groups.map((g) => (
          <section key={g.date}>
            <div className={s.day}>
              <span>{dayLabel(g.date, t)}</span>
              <span>{`${g.net < 0 ? "−" : "+"}${formatVND(Math.abs(g.net))}`}</span>
            </div>
            <div className={s.list}>
              {g.items.map((tx) => (
                <TxRow key={tx.id} tx={tx} cat={catMap.get(tx.categoryId)} onClick={() => onEdit(tx)} />
              ))}
            </div>
          </section>
        ))
      )}
    </>
  );
}
