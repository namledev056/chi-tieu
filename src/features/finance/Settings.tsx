"use client";

import { useRef, useState } from "react";
import { Download, Landmark, Plus, Upload } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import type { Category, TxType } from "./db";
import { today } from "./dates";
import {
  addCategory,
  clearPayee,
  csvHeader,
  deleteCategory,
  exportCSV,
  getPayee,
  importCSV,
  LastCategoryError,
  updateCategory,
  wipeData,
} from "./repo";
import { PayeeEditor } from "./Split";
import { bankName } from "./vietqr";
import { CategoryIcon, DEFAULT_ICON, ICON_KEYS } from "./icons";
import { LANGS, useI18n, useT } from "./i18n";
import { Bubble, cx } from "./ui";
import s from "./finance.module.css";

/** Swatch colors; their names are t.colors, in the same order. */
const COLORS = ["#e8590c", "#1c7ed6", "#7048e8", "#f59f00", "#d6336c", "#0ca678", "#e03131", "#3b5bdb", "#2f9e44", "#868e96"];

export default function Settings({ categories }: { categories: Category[] }) {
  const { lang, t, setLang } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");

  const doExport = async () => {
    const url = URL.createObjectURL(new Blob([await exportCSV(lang)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `chi-tieu-${today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = async (file: File) => {
    try {
      const { added, skipped } = await importCSV(await file.text(), lang);
      setMsg(t.imported(added, skipped));
    } catch {
      setMsg(t.csvError);
    }
  };

  const doWipe = async () => {
    if (!window.confirm(t.confirmWipe)) return;
    await wipeData();
    setMsg(t.wiped);
  };

  return (
    <>
      <div className={s.secHead}>
        <h2 className={s.secTitle}>{t.language}</h2>
      </div>
      <div className={cx(s.seg, s.langSeg)} role="group" aria-label={t.language}>
        {LANGS.map((l) => (
          <button key={l.id} type="button" lang={l.id} aria-pressed={lang === l.id} onClick={() => setLang(l.id)}>
            {l.label}
          </button>
        ))}
      </div>

      <PayeeSection />
      {(["expense", "income"] as const).map((type) => (
        <CategorySection key={type} type={type} categories={categories.filter((c) => c.type === type)} />
      ))}

      <div className={s.secHead}>
        <h2 className={s.secTitle}>{t.data}</h2>
      </div>
      <section className={s.card}>
        <p className={s.note}>{t.dataNote}</p>
        <div className={cx(s.actions, s.mt)}>
          <button type="button" className={cx(s.btn, s.btnGhost, s.btnSm)} onClick={doExport}>
            <Download aria-hidden />
            {t.exportCsv}
          </button>
          <button type="button" className={cx(s.btn, s.btnGhost, s.btnSm)} onClick={() => fileRef.current?.click()}>
            <Upload aria-hidden />
            {t.importCsv}
          </button>
          <button type="button" className={cx(s.btn, s.btnDanger, s.btnSm)} onClick={doWipe}>
            {t.wipe}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) doImport(f);
            e.target.value = "";
          }}
        />
        {msg && (
          <p className={cx(s.note, s.mt)} role="status">
            {msg}
          </p>
        )}
        <p className={cx(s.hint, s.mt)}>
          {t.csvFormat} <code>{csvHeader(lang)}</code>, {t.csvExample} <code>{t.csvSample}</code>
        </p>
      </section>
    </>
  );
}

function PayeeSection() {
  const t = useT();
  const payee = useLiveQuery(getPayee);
  const [editing, setEditing] = useState(false);
  if (payee === undefined) return null;
  return (
    <>
      <div className={s.secHead}>
        <h2 className={s.secTitle}>{t.payeeTitle}</h2>
        {payee && !editing && (
          <button
            type="button"
            className={cx(s.link, s.textDangerLink)}
            onClick={() => window.confirm(t.confirmDeletePayee) && clearPayee()}
          >
            {t.delete}
          </button>
        )}
      </div>
      {editing || !payee ? (
        <section className={s.card}>
          {!payee && !editing ? (
            <>
              <p className={s.note}>{t.payeeIntro}</p>
              <button type="button" className={cx(s.btn, s.btnGhost, s.btnSm, s.mt)} onClick={() => setEditing(true)}>
                <Plus aria-hidden />
                {t.addAccount}
              </button>
            </>
          ) : (
            <PayeeEditor payee={payee} onDone={() => setEditing(false)} />
          )}
        </section>
      ) : (
        <div className={s.list}>
          <button type="button" className={s.row} onClick={() => setEditing(true)}>
            <span className={s.bubble} aria-hidden>
              <Landmark />
            </span>
            <span className={s.rowMain}>
              <span className={s.rowName}>{`${bankName(payee.bin, t)} · ${payee.account}`}</span>
              {payee.name && <span className={s.rowSub}>{payee.name}</span>}
            </span>
            <span className={s.link}>{t.edit}</span>
          </button>
        </div>
      )}
    </>
  );
}

function CategorySection({ type, categories }: { type: TxType; categories: Category[] }) {
  const t = useT();
  const [editing, setEditing] = useState<number | "new" | null>(null);
  return (
    <>
      <div className={s.secHead}>
        <h2 className={s.secTitle}>{type === "expense" ? t.expenseCategories : t.incomeCategories}</h2>
        <button type="button" className={s.link} onClick={() => setEditing("new")}>
          <Plus aria-hidden style={{ width: 16, height: 16 }} />
          {t.add}
        </button>
      </div>
      <div className={s.list}>
        {editing === "new" && <CategoryEditor type={type} onDone={() => setEditing(null)} />}
        {categories.map((c) =>
          editing === c.id ? (
            <CategoryEditor key={c.id} type={type} cat={c} onDone={() => setEditing(null)} />
          ) : (
            <button key={c.id} type="button" className={s.row} onClick={() => setEditing(c.id)}>
              <Bubble cat={c} />
              <span className={s.rowMain}>
                <span className={s.rowName}>{c.name}</span>
              </span>
              <span className={s.link}>{t.edit}</span>
            </button>
          ),
        )}
      </div>
    </>
  );
}

function CategoryEditor({ type, cat, onDone }: { type: TxType; cat?: Category; onDone: () => void }) {
  const t = useT();
  const [name, setName] = useState(cat?.name ?? "");
  const [icon, setIcon] = useState<string>(cat?.icon ?? DEFAULT_ICON[type]);
  const [color, setColor] = useState(cat?.color ?? COLORS[0]);
  const [error, setError] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const data = { name: n, icon, color, type };
    if (cat) await updateCategory(cat.id, data);
    else await addCategory(data);
    onDone();
  };

  const remove = async () => {
    if (!cat || !window.confirm(t.confirmDeleteCat(cat.name))) return;
    try {
      await deleteCategory(cat);
      onDone();
    } catch (err) {
      setError(err instanceof LastCategoryError ? t.lastCategoryError : (err as Error).message);
    }
  };

  return (
    <form className={s.editor} onSubmit={save}>
      <div className={s.formRow} style={{ marginBottom: 0 }}>
        <Bubble cat={{ ...(cat ?? { id: 0, order: 0, type }), name, icon, color }} />
        <input
          className={s.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.categoryName}
          aria-label={t.categoryName}
          maxLength={30}
          autoFocus
        />
      </div>
      <div className={s.iconGrid} role="radiogroup" aria-label={t.icon}>
        {ICON_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={icon === k}
            aria-label={t.icons[k]}
            className={s.iconPick}
            onClick={() => setIcon(k)}
          >
            <CategoryIcon name={k} />
          </button>
        ))}
      </div>
      <div className={s.swatches} role="radiogroup" aria-label={t.color}>
        {COLORS.map((c, i) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={color === c}
            aria-label={t.colors[i]}
            className={s.swatch}
            style={{ background: c }}
            onClick={() => setColor(c)}
          />
        ))}
      </div>
      {error && <p className={s.errorText}>{error}</p>}
      <div className={s.actions}>
        {cat && (
          <button type="button" className={cx(s.btn, s.btnDanger, s.btnSm)} onClick={remove}>
            {t.delete}
          </button>
        )}
        <button type="button" className={cx(s.btn, s.btnGhost, s.btnSm)} onClick={onDone}>
          {t.cancel}
        </button>
        <button type="submit" className={cx(s.btn, s.btnSm)} disabled={!name.trim()}>
          {t.save}
        </button>
      </div>
    </form>
  );
}
