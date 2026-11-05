"use client";

import { useRef, useState } from "react";
import { Download, Plus, Upload } from "lucide-react";
import type { Category, TxType } from "./db";
import { today } from "./dates";
import { addCategory, deleteCategory, exportCSV, importCSV, updateCategory, wipeData } from "./repo";
import { Bubble, cx } from "./ui";
import s from "./finance.module.css";

const COLORS = ["#e8590c", "#1c7ed6", "#7048e8", "#f59f00", "#d6336c", "#0ca678", "#e03131", "#3b5bdb", "#2f9e44", "#868e96"];

export default function Settings({ categories }: { categories: Category[] }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");

  const doExport = async () => {
    const url = URL.createObjectURL(new Blob([await exportCSV()], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `chi-tieu-${today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = async (file: File) => {
    try {
      const { added, skipped } = await importCSV(await file.text());
      setMsg(`Đã nhập ${added} giao dịch${skipped ? `, bỏ qua ${skipped} dòng lỗi` : ""}.`);
    } catch {
      setMsg("Không đọc được file CSV.");
    }
  };

  const doWipe = async () => {
    if (!window.confirm("Xóa toàn bộ giao dịch và ngân sách? Không thể hoàn tác.")) return;
    await wipeData();
    setMsg("Đã xóa toàn bộ dữ liệu.");
  };

  return (
    <>
      {(["expense", "income"] as const).map((type) => (
        <CategorySection key={type} type={type} categories={categories.filter((c) => c.type === type)} />
      ))}

      <div className={s.secHead}>
        <h2 className={s.secTitle}>Dữ liệu</h2>
      </div>
      <section className={s.card}>
        <p className={s.note}>Dữ liệu chỉ lưu trên trình duyệt này. Hãy xuất CSV định kỳ để sao lưu.</p>
        <div className={cx(s.actions, s.mt)}>
          <button type="button" className={cx(s.btn, s.btnGhost, s.btnSm)} onClick={doExport}>
            <Download aria-hidden />
            Xuất CSV
          </button>
          <button type="button" className={cx(s.btn, s.btnGhost, s.btnSm)} onClick={() => fileRef.current?.click()}>
            <Upload aria-hidden />
            Nhập CSV
          </button>
          <button type="button" className={cx(s.btn, s.btnDanger, s.btnSm)} onClick={doWipe}>
            Xóa dữ liệu
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
          Định dạng CSV: <code>ngay,loai,so_tien,danh_muc,ghi_chu</code>, ví dụ{" "}
          <code>2026-11-04,chi,45000,Ăn uống,Phở</code>
        </p>
      </section>
    </>
  );
}

function CategorySection({ type, categories }: { type: TxType; categories: Category[] }) {
  const [editing, setEditing] = useState<number | "new" | null>(null);
  return (
    <>
      <div className={s.secHead}>
        <h2 className={s.secTitle}>{type === "expense" ? "Danh mục chi" : "Danh mục thu"}</h2>
        <button type="button" className={s.link} onClick={() => setEditing("new")}>
          <Plus aria-hidden style={{ width: 14, height: 14, verticalAlign: -2 }} /> Thêm
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
              <span className={s.link}>Sửa</span>
            </button>
          ),
        )}
      </div>
    </>
  );
}

function CategoryEditor({ type, cat, onDone }: { type: TxType; cat?: Category; onDone: () => void }) {
  const [name, setName] = useState(cat?.name ?? "");
  const [icon, setIcon] = useState(cat?.icon ?? (type === "expense" ? "📦" : "💰"));
  const [color, setColor] = useState(cat?.color ?? COLORS[0]);
  const [error, setError] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const data = { name: n, icon: icon.trim() || "📦", color, type };
    if (cat) await updateCategory(cat.id, data);
    else await addCategory(data);
    onDone();
  };

  const remove = async () => {
    if (!cat || !window.confirm(`Xóa "${cat.name}"? Các giao dịch sẽ chuyển sang danh mục Khác.`)) return;
    try {
      await deleteCategory(cat);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <form className={s.editor} onSubmit={save}>
      <div className={s.formRow} style={{ marginBottom: 0 }}>
        <input
          className={cx(s.input, s.emojiInput)}
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          aria-label="Biểu tượng (emoji)"
          maxLength={4}
        />
        <input
          className={s.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên danh mục"
          aria-label="Tên danh mục"
          maxLength={30}
          autoFocus
        />
      </div>
      <div className={s.swatches} role="radiogroup" aria-label="Màu">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={color === c}
            aria-label={c}
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
            Xóa
          </button>
        )}
        <button type="button" className={cx(s.btn, s.btnGhost, s.btnSm)} onClick={onDone}>
          Hủy
        </button>
        <button type="submit" className={cx(s.btn, s.btnSm)} disabled={!name.trim()}>
          Lưu
        </button>
      </div>
    </form>
  );
}
