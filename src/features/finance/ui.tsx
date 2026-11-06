"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Plus, RotateCw, TrendingUp, TriangleExclamationPoint, Wallet, X } from "lucide-react";
import type { Category, Transaction } from "./db";
import { currentMonth, daysInMonth, monthParts, today } from "./dates";
import { CategoryIcon } from "./icons";
import { formatVND } from "./money";
import { budgetTone } from "./summary";
import { useT } from "./i18n";
import s from "./finance.module.css";

export const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(" ");

export function Bubble({ cat }: { cat?: Category }) {
  return (
    <span className={s.bubble} style={{ "--c": cat?.color ?? "#868e96" } as React.CSSProperties} aria-hidden>
      <CategoryIcon name={cat?.icon} />
    </span>
  );
}

export function TxRow({ tx, cat, onClick }: { tx: Transaction; cat?: Category; onClick: () => void }) {
  const t = useT();
  const isIn = tx.type === "income";
  return (
    <button type="button" className={s.row} onClick={onClick}>
      <Bubble cat={cat} />
      <span className={s.rowMain}>
        <span className={s.rowName}>{tx.note || cat?.name || t.unknown}</span>
        {tx.note && <span className={s.rowSub}>{cat?.name ?? t.unknown}</span>}
      </span>
      <span className={cx(s.amt, isIn && s.in)}>
        {`${isIn ? "+" : "−"}${formatVND(tx.amount)}`}
      </span>
    </button>
  );
}

/** Category row with a budget progress bar. */
export function BudgetRow({
  cat,
  spent,
  limit,
  onClick,
}: {
  cat?: Category;
  spent: number;
  limit: number;
  onClick: () => void;
}) {
  const t = useT();
  const left = limit - spent;
  const ratio = spent / limit;
  return (
    <button type="button" className={s.catRow} onClick={onClick}>
      <Bubble cat={cat} />
      <span className={s.rowName}>{cat?.name ?? t.unknown}</span>
      <span className={cx(s.catRight, left < 0 && s.out)}>
        {left < 0 ? t.over(formatVND(-left)) : t.left(formatVND(left))}
      </span>
      <div className={cx(s.bar, s.thin)}>
        <i className={s[budgetTone(ratio)]} style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
      </div>
      <div className={s.catSub}>
        <span>{`${formatVND(spent).replace(" ₫", "")} / ${formatVND(limit)}`}</span>
        <span>{`${Math.round(ratio * 100)}%`}</span>
      </div>
    </button>
  );
}

/** Month's remaining-budget block. Without a budget it shows the amount spent. */
export function Hero({
  month,
  expense,
  totalLimit,
  children,
}: {
  month: string;
  expense: number;
  totalLimit: number;
  children?: React.ReactNode;
}) {
  const t = useT();
  if (totalLimit <= 0) {
    return (
      <section className={s.card}>
        <div className={s.heroLabel}>{t.spentThisMonth}</div>
        <div className={s.heroNum}>{formatVND(expense)}</div>
        <p className={s.note}>{t.setBudgetHint}</p>
        {children && <div className={s.heroCta}>{children}</div>}
      </section>
    );
  }
  const left = totalLimit - expense;
  const ratio = expense / totalLimit;
  const isCurrent = month === currentMonth();
  const n = daysInMonth(month);
  const day = Number(today().slice(8));
  const elapsed = isCurrent ? day / n : null;
  const fast = elapsed !== null && ratio <= 1 && ratio > elapsed + 0.1;
  const daysLeft = n - day;
  return (
    <section className={s.card}>
      <div className={s.heroLabel}>{left >= 0 ? t.canSpend : t.overBudget}</div>
      <div className={cx(s.heroNum, left < 0 && s.out)}>{formatVND(Math.abs(left))}</div>
      <div
        className={s.bar}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(Math.min(ratio, 1) * 100)}
        aria-label={t.usedPct(Math.round(ratio * 100))}
      >
        <i className={s[budgetTone(ratio, fast)]} style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
        {elapsed !== null && <b style={{ left: `${elapsed * 100}%` }} title={t.todayMarker(day, n)} />}
      </div>
      <div className={s.meta}>
        <span className={s.num}>{t.spentOf(formatVND(expense).replace(" ₫", ""), formatVND(totalLimit))}</span>
        {isCurrent && <span>{daysLeft > 0 ? t.daysLeft(daysLeft) : t.lastDay}</span>}
      </div>
      {ratio > 1 ? (
        <div className={cx(s.pace, s.paceOver)}>
          <TriangleExclamationPoint aria-hidden />
          <span>{t.overBy(formatVND(-left))}</span>
        </div>
      ) : (
        fast && (
          <div className={s.pace}>
            <TrendingUp aria-hidden />
            <span>{t.fastPace(Math.round(ratio * 100), day, n)}</span>
          </div>
        )
      )}
      {children && <div className={s.heroCta}>{children}</div>}
    </section>
  );
}

export function MonthButton({ month, onClick, small }: { month: string; onClick: () => void; small?: boolean }) {
  const t = useT();
  const { y, m } = monthParts(month);
  return (
    <button type="button" className={cx(s.monthBtn, small && s.monthSm)} onClick={onClick} aria-label={t.pickMonth}>
      {small ? t.monthShort(m) : t.monthLong(m, y)}
      <ChevronDown aria-hidden />
    </button>
  );
}

export function MonthSheet({
  month,
  onPick,
  onClose,
}: {
  month: string;
  onPick: (m: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [year, setYear] = useState(monthParts(month).y);
  const now = currentMonth();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <>
      <div className={s.scrim} onClick={onClose} aria-hidden />
      <div className={s.sheet} role="dialog" aria-modal="true" aria-label={t.pickMonth}>
        <div className={s.grab} />
        <div className={s.sheetTop}>
          <button type="button" className={cx(s.iconBtn, s.iconBtnPlain)} onClick={() => setYear(year - 1)} aria-label={t.prevYear}>
            <ChevronLeft />
          </button>
          <span className={s.sheetTitle}>{t.year(year)}</span>
          <button type="button" className={cx(s.iconBtn, s.iconBtnPlain)} onClick={() => setYear(year + 1)} aria-label={t.nextYear}>
            <ChevronRight />
          </button>
        </div>
        <div className={s.monthGrid}>
          {Array.from({ length: 12 }, (_, i) => {
            const value = `${year}-${String(i + 1).padStart(2, "0")}`;
            return (
              <button
                key={value}
                type="button"
                className={s.monthCell}
                aria-current={value === month}
                onClick={() => {
                  onPick(value);
                  onClose();
                }}
              >
                {t.monthShort(i + 1)}
                {value === now ? " •" : ""}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className={cx(s.btn, s.btnGhost, s.mt)}
          onClick={() => {
            onPick(now);
            onClose();
          }}
        >
          {t.thisMonth}
        </button>
      </div>
    </>
  );
}

export function Loading() {
  const t = useT();
  return (
    <div aria-busy="true" aria-label={t.loading}>
      <div className={s.card}>
        <div className={s.sk} style={{ width: "40%", height: 14 }} />
        <div className={s.sk} style={{ width: "65%", height: 34, margin: "10px 0 14px" }} />
        <div className={s.sk} style={{ height: 10 }} />
      </div>
      <div className={s.list}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={s.row}>
            <div className={s.sk} style={{ width: 40, height: 40, borderRadius: 12 }} />
            <div className={s.rowMain}>
              <div className={s.sk} style={{ width: "55%", height: 14 }} />
              <div className={s.sk} style={{ width: "30%", height: 12 }} />
            </div>
            <div className={s.sk} style={{ width: 72, height: 14 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyMonth({ month, onAdd }: { month: string; onAdd: () => void }) {
  const t = useT();
  return (
    <section className={cx(s.card, s.empty)}>
      <div className={s.emptyIc}>
        <Wallet aria-hidden />
      </div>
      <h2>{t.emptyTitle(monthParts(month).m)}</h2>
      <p>{t.emptyBody}</p>
      <button type="button" className={s.btn} onClick={onAdd}>
        <Plus aria-hidden />
        {t.addExpense}
      </button>
    </section>
  );
}

export function LoadError() {
  const t = useT();
  return (
    <section className={cx(s.card, s.empty)}>
      <div className={s.emptyIc}>
        <TriangleExclamationPoint aria-hidden />
      </div>
      <h2>{t.loadErrorTitle}</h2>
      <p>{t.loadErrorBody}</p>
      <button type="button" className={cx(s.btn, s.btnGhost)} onClick={() => location.reload()}>
        <RotateCw aria-hidden />
        {t.retry}
      </button>
    </section>
  );
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  const t = useT();
  return (
    <button type="button" className={cx(s.iconBtn, s.iconBtnPlain)} onClick={onClick} aria-label={t.close}>
      <X />
    </button>
  );
}
