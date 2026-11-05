import { db, type Category, type Transaction, type TxType } from "./db";
import { DEFAULT_ICON } from "./icons";
import { parseAmount } from "./money";
import type { Payee } from "./vietqr";

export type TxInput = Omit<Transaction, "id" | "createdAt">;

/* ---------- Giao dịch ---------- */

export async function saveTransaction(input: TxInput, id?: number) {
  if (id) await db.transactions.update(id, input);
  else await db.transactions.add({ ...input, createdAt: Date.now() });
}

export const deleteTransaction = (id: number) => db.transactions.delete(id);

export const monthTransactions = (month: string) =>
  db.transactions
    .where("date")
    .between(`${month}-01`, `${month}-31`, true, true)
    .toArray();

/* ---------- Danh mục ---------- */

export async function listCategories() {
  const all = await db.categories.toArray();
  return all.sort((a, b) => a.order - b.order);
}

export async function addCategory(input: Omit<Category, "id" | "order">) {
  const all = await db.categories.toArray();
  const order = all.reduce((max, c) => Math.max(max, c.order), -1) + 1;
  return db.categories.add({ ...input, order });
}

export const updateCategory = (id: number, patch: Partial<Omit<Category, "id">>) =>
  db.categories.update(id, patch);

/** Xóa danh mục, chuyển giao dịch của nó sang danh mục "Khác" cùng loại. */
export async function deleteCategory(cat: Category) {
  const others = (await db.categories.where("type").equals(cat.type).toArray()).filter(
    (c) => c.id !== cat.id,
  );
  if (!others.length) {
    throw new Error("Cần giữ lại ít nhất một danh mục cho mỗi loại.");
  }
  const fallback = others.find((c) => /khác/i.test(c.name)) ?? others[0];
  await db.transaction("rw", db.transactions, db.categories, db.budgets, async () => {
    await db.transactions.where("categoryId").equals(cat.id).modify({ categoryId: fallback.id });
    await db.budgets.where("categoryId").equals(cat.id).delete();
    await db.categories.delete(cat.id);
  });
  return fallback;
}

/* ---------- Ngân sách ---------- */

export const monthBudgets = (month: string) =>
  db.budgets.where("month").equals(month).toArray();

export async function setBudget(categoryId: number, month: string, limit: number) {
  const existing = await db.budgets
    .where("[categoryId+month]")
    .equals([categoryId, month])
    .first();
  if (limit <= 0) {
    if (existing) await db.budgets.delete(existing.id);
    return;
  }
  if (existing) await db.budgets.update(existing.id, { limit });
  else await db.budgets.add({ categoryId, month, limit });
}

export async function copyBudgets(fromMonth: string, toMonth: string) {
  const prev = await monthBudgets(fromMonth);
  await db.transaction("rw", db.budgets, async () => {
    for (const b of prev) await setBudget(b.categoryId, toMonth, b.limit);
  });
  return prev.length;
}

/* ---------- Tài khoản nhận tiền (chia tiền) ---------- */

export const getPayee = async () =>
  ((await db.settings.get("payee"))?.value as Payee | undefined) ?? null;

export const savePayee = (payee: Payee) => db.settings.put({ key: "payee", value: payee });

export const clearPayee = () => db.settings.delete("payee");

/* ---------- Dữ liệu ---------- */

export async function wipeData() {
  await db.transaction("rw", db.transactions, db.budgets, async () => {
    await db.transactions.clear();
    await db.budgets.clear();
  });
}

const CSV_HEADER = "ngay,loai,so_tien,danh_muc,ghi_chu";

function csvEscape(v: string | number) {
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function exportCSV(): Promise<string> {
  const [txs, cats] = await Promise.all([
    db.transactions.orderBy("date").toArray(),
    db.categories.toArray(),
  ]);
  const names = new Map(cats.map((c) => [c.id, c.name]));
  const lines = txs.map((t) =>
    [t.date, t.type === "income" ? "thu" : "chi", t.amount, names.get(t.categoryId) ?? "", t.note]
      .map(csvEscape)
      .join(","),
  );
  // BOM để Excel đọc đúng tiếng Việt
  return "﻿" + [CSV_HEADER, ...lines].join("\r\n");
}

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function parseType(v: string | undefined): TxType | null {
  const s = (v ?? "").trim().toLowerCase();
  if (s === "thu" || s === "income") return "income";
  if (s === "chi" || s === "expense") return "expense";
  return null;
}

export async function importCSV(text: string) {
  const rows = parseCSV(text.replace(/^﻿/, "")).filter((r) => r.some((c) => c.trim()));
  const body = rows[0]?.[0]?.trim().toLowerCase() === "ngay" ? rows.slice(1) : rows;
  let added = 0;
  let skipped = 0;

  await db.transaction("rw", db.transactions, db.categories, async () => {
    const cats = await db.categories.toArray();
    const resolveCategory = async (rawName: string, type: TxType) => {
      const name = rawName.trim() || (type === "income" ? "Thu khác" : "Khác");
      const found = cats.find((c) => c.type === type && c.name.toLowerCase() === name.toLowerCase());
      if (found) return found.id;
      const cat: Omit<Category, "id"> = {
        name,
        icon: DEFAULT_ICON[type],
        color: "#868e96",
        type,
        order: cats.length,
      };
      const id = await db.categories.add(cat);
      cats.push({ ...cat, id });
      return id;
    };

    for (const [date = "", kind, amount = "", category = "", note = ""] of body) {
      const type = parseType(kind);
      const value = parseAmount(amount);
      const d = date.trim();
      if (!type || !/^\d{4}-\d{2}-\d{2}$/.test(d) || value <= 0) {
        skipped++;
        continue;
      }
      await db.transactions.add({
        type,
        amount: value,
        categoryId: await resolveCategory(category, type),
        date: d,
        note: note.trim(),
        createdAt: Date.now(),
      });
      added++;
    }
  });

  return { added, skipped };
}
