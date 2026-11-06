"use client";

import { useState } from "react";
import type { Budget, Category, Transaction } from "./db";
import { shiftMonth } from "./dates";
import { formatAmountInput, formatVND, parseAmount } from "./money";
import { copyBudgets, setBudget } from "./repo";
import { summarize } from "./summary";
import { BudgetRow, Bubble, cx, Hero } from "./ui";
import { useT } from "./i18n";
import s from "./finance.module.css";

export default function Budgets({
  month,
  categories,
  txs,
  budgets,
  prevBudgetCount,
}: {
  month: string;
  categories: Category[];
  txs: Transaction[];
  budgets: Budget[];
  prevBudgetCount: number;
}) {
  const t = useT();
  const [editing, setEditing] = useState<number | null>(null);
  const { expense, byCat, totalLimit } = summarize(txs, budgets);
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const limitOf = new Map(budgets.map((b) => [b.categoryId, b.limit]));

  const rows = budgets
    .map((b) => ({ b, spent: byCat.get(b.categoryId) ?? 0 }))
    .sort((x, y) => y.spent / y.b.limit - x.spent / x.b.limit);
  const unset = categories.filter((c) => c.type === "expense" && !limitOf.has(c.id));

  const editor = (cat: Category) => (
    <LimitEditor
      key={`edit-${cat.id}`}
      cat={cat}
      limit={limitOf.get(cat.id) ?? 0}
      onDone={async (v) => {
        if (v !== null) await setBudget(cat.id, month, v);
        setEditing(null);
      }}
    />
  );

  return (
    <>
      <Hero month={month} expense={expense} totalLimit={totalLimit}>
        {totalLimit <= 0 && prevBudgetCount > 0 && (
          <button
            type="button"
            className={cx(s.btn, s.btnGhost, s.btnSm)}
            onClick={() => copyBudgets(shiftMonth(month, -1), month)}
          >
            {t.copyBudgets(prevBudgetCount)}
          </button>
        )}
      </Hero>

      {rows.length > 0 && (
        <>
          <div className={s.secHead}>
            <h2 className={s.secTitle}>{t.byCategory}</h2>
            <span className={s.secHint}>{t.sortedByUsage}</span>
          </div>
          <div className={s.list}>
            {rows.map(({ b, spent }) => {
              const cat = catMap.get(b.categoryId);
              return editing === b.categoryId && cat ? (
                editor(cat)
              ) : (
                <BudgetRow key={b.id} cat={cat} spent={spent} limit={b.limit} onClick={() => setEditing(b.categoryId)} />
              );
            })}
          </div>
        </>
      )}

      {unset.length > 0 && (
        <>
          <div className={s.secHead}>
            <h2 className={s.secTitle}>{t.noLimit}</h2>
          </div>
          <div className={s.list}>
            {unset.map((c) =>
              editing === c.id ? (
                editor(c)
              ) : (
                <button key={c.id} type="button" className={s.row} onClick={() => setEditing(c.id)}>
                  <Bubble cat={c} />
                  <span className={s.rowMain}>
                    <span className={s.rowName}>{c.name}</span>
                  </span>
                  <span className={s.link}>{t.set}</span>
                </button>
              ),
            )}
          </div>
        </>
      )}
    </>
  );
}

function LimitEditor({
  cat,
  limit,
  onDone,
}: {
  cat: Category;
  limit: number;
  onDone: (value: number | null) => void;
}) {
  const t = useT();
  // With an existing limit, default to adding on top; otherwise enter a new limit.
  const [mode, setMode] = useState<"add" | "set">(limit > 0 ? "add" : "set");
  const [draft, setDraft] = useState("");
  const value = parseAmount(draft);
  const next = mode === "add" ? limit + value : value;

  const switchMode = () => {
    setMode(mode === "add" ? "set" : "add");
    setDraft(mode === "add" ? formatAmountInput(String(limit)) : "");
  };

  return (
    <form
      className={cx(s.editRow, s.editRowWrap)}
      onSubmit={(e) => {
        e.preventDefault();
        onDone(mode === "add" && value === 0 ? null : next);
      }}
    >
      <Bubble cat={cat} />
      <input
        className={cx(s.input, s.inputSm)}
        inputMode="numeric"
        placeholder={mode === "add" ? t.addToLimit : t.limitPlaceholder}
        value={mode === "add" && draft ? `+${draft}` : draft}
        onChange={(e) => setDraft(formatAmountInput(e.target.value))}
        onKeyDown={(e) => e.key === "Escape" && onDone(null)}
        aria-label={mode === "add" ? t.addToLimitAria(cat.name) : t.limitAria(cat.name)}
        autoFocus
      />
      {limit > 0 && (
        <button type="button" className={s.textDanger} onClick={() => onDone(0)}>
          {t.remove}
        </button>
      )}
      <button type="submit" className={cx(s.btn, s.btnSm)}>
        {t.save}
      </button>
      {limit > 0 && (
        <div className={s.editHint}>
          <span>
            {t.current} {formatVND(limit)}
            {mode === "add" && value > 0 && <> → <b>{formatVND(next)}</b></>}
          </span>
          <button type="button" className={s.link} onClick={switchMode}>
            {mode === "add" ? t.newLimit : t.addMore}
          </button>
        </div>
      )}
    </form>
  );
}
