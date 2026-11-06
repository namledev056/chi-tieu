"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Calendar, Delete, Users } from "lucide-react";
import type { Category, Transaction, TxType } from "./db";
import { shortDateLabel } from "./dates";
import { formatAmountInput } from "./money";
import { deleteTransaction, saveTransaction } from "./repo";
import { CategoryIcon } from "./icons";
import SplitSheet from "./Split";
import { CloseButton, cx } from "./ui";
import { useT } from "./i18n";
import s from "./finance.module.css";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0"];
const MAX_DIGITS = 11; // up to 99.999.999.999 ₫

/** Column count that avoids a lone item on the last row (9 items: 5 + 4 instead of 4 + 4 + 1). */
const gridCols = (n: number) => [4, 5, 3].find((c) => n <= c || n % c !== 1) ?? 4;

export default function TxSheet({
  tx,
  categories,
  defaultDate,
  onClose,
}: {
  tx: Transaction | null;
  categories: Category[];
  defaultDate: string;
  onClose: () => void;
}) {
  const t = useT();
  const [type, setType] = useState<TxType>(tx?.type ?? "expense");
  const [digits, setDigits] = useState(tx ? String(tx.amount) : "");
  const [categoryId, setCategoryId] = useState<number | undefined>(
    tx?.categoryId ?? categories.find((c) => c.type === "expense")?.id,
  );
  const [date, setDate] = useState(tx?.date ?? defaultDate);
  const [note, setNote] = useState(tx?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const dateRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);

  const visible = categories.filter((c) => c.type === type);
  const amount = Number(digits || 0);
  const shown = digits ? formatAmountInput(digits) : "0";

  // Shrink the digits until they fit beside the date button (40px down to 18px).
  useLayoutEffect(() => {
    const box = amountRef.current;
    const value = valueRef.current;
    if (!box || !value) return;
    const fit = () => {
      let size = 40;
      box.style.fontSize = `${size}px`;
      while (size > 18 && value.scrollWidth > value.clientWidth) {
        size -= 2;
        box.style.fontSize = `${size}px`;
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, [shown]);
  const valid = amount > 0 && categoryId !== undefined;

  const press = useCallback((key: string) => {
    setDigits((d) => {
      if (key === "back") return d.slice(0, -1);
      const next = (d === "0" ? "" : d) + key;
      if (next.replace(/^0+/, "") === "") return "";
      return next.length > MAX_DIGITS ? d : next;
    });
  }, []);

  const save = useCallback(async () => {
    if (!valid || busy) return;
    setBusy(true);
    await saveTransaction({ type, amount, categoryId: categoryId!, date, note: note.trim() }, tx?.id);
    onClose();
  }, [valid, busy, type, amount, categoryId, date, note, tx, onClose]);

  // Physical keyboard (desktop): digits, Backspace, Enter to save, Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (splitting) return; // the split sheet is open and handles its own keys
      if (e.key === "Escape") return onClose();
      if ((e.target as HTMLElement).tagName === "INPUT") {
        if (e.key === "Enter") save();
        return;
      }
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("back");
      else if (e.key === "Enter") save();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, press, save, splitting]);

  const switchType = (next: TxType) => {
    setType(next);
    setCategoryId(categories.find((c) => c.type === next)?.id);
  };

  const remove = async () => {
    if (!tx || !window.confirm(t.confirmDeleteTx)) return;
    await deleteTransaction(tx.id);
    onClose();
  };

  const openDate = () => {
    const el = dateRef.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
    }
  };

  return (
    <>
      <div className={s.scrim} onClick={onClose} aria-hidden />
      <div className={s.sheet} role="dialog" aria-modal="true" aria-label={tx ? t.editTx : t.addTx}>
        <div className={s.grab} />
        <div className={s.sheetTop}>
          <div className={s.seg}>
            {(["expense", "income"] as const).map((k) => (
              <button key={k} type="button" aria-pressed={type === k} onClick={() => switchType(k)}>
                {k === "expense" ? t.expenseTab : t.incomeTab}
              </button>
            ))}
          </div>
          <div className={s.topActions}>
            {tx && (
              <button type="button" className={s.textDanger} onClick={remove}>
                {t.delete}
              </button>
            )}
            <CloseButton onClick={onClose} />
          </div>
        </div>

        <div className={s.amountRow}>
          <button type="button" className={s.fieldBtn} onClick={openDate}>
            <Calendar aria-hidden />
            <span className={s.dateLabel}>{shortDateLabel(date, t)}</span>
            <input
              ref={dateRef}
              type="date"
              className={s.hiddenDate}
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              tabIndex={-1}
              aria-label={t.dateAria(shortDateLabel(date, t))}
            />
          </button>
          <div
            className={cx(s.amount, type === "expense" ? s.out : s.in)}
            ref={amountRef}
            aria-live="polite"
            aria-label={t.amount}
          >
            <span ref={valueRef} className={cx(s.amountValue, !digits && s.amountEmpty)}>
              {shown}
            </span>
            <span className={s.caret} aria-hidden />
            <small>₫</small>
          </div>
        </div>

        <div
          className={s.catGrid}
          role="radiogroup"
          aria-label={t.category}
          style={{ gridTemplateColumns: `repeat(${gridCols(visible.length)}, minmax(0, 1fr))` }}
        >
          {visible.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={categoryId === c.id}
                className={s.catBtn}
                style={{ "--c": c.color } as React.CSSProperties}
                onClick={() => setCategoryId(c.id)}
              >
                <span className={s.catIc}>
                  <CategoryIcon name={c.icon} />
                </span>
                <span className={s.catName}>{c.name}</span>
              </button>
            ))}
        </div>

        <div className={s.formRow}>
          <input
            className={s.input}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t.note}
            maxLength={120}
            aria-label={t.note}
          />
        </div>

        <div className={s.keypad}>
          {KEYS.map((k) => (
            <button key={k} type="button" onClick={() => press(k)}>
              {k}
            </button>
          ))}
          <button type="button" onClick={() => press("back")} aria-label={t.backspace}>
            <Delete aria-hidden />
          </button>
        </div>

        <div className={s.saveRow}>
          {type === "expense" && (
            <button
              type="button"
              className={cx(s.btn, s.btnGhost, s.btnAuto)}
              disabled={amount <= 0}
              onClick={() => setSplitting(true)}
            >
              <Users aria-hidden />
              {t.split}
            </button>
          )}
          <button type="button" className={s.btn} disabled={!valid || busy} onClick={save}>
            {tx ? t.saveChanges : type === "expense" ? t.saveExpense : t.saveIncome}
          </button>
        </div>
      </div>
      {splitting && (
        <SplitSheet
          total={amount}
          title={note.trim() || categories.find((c) => c.id === categoryId)?.name || ""}
          onClose={() => setSplitting(false)}
        />
      )}
    </>
  );
}
