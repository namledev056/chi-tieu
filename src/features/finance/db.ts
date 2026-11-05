import Dexie, { type EntityTable } from "dexie";

export type TxType = "income" | "expense";

export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  type: TxType;
  order: number;
}

export interface Transaction {
  id: number;
  type: TxType;
  /** Số nguyên VND, luôn dương. */
  amount: number;
  categoryId: number;
  /** YYYY-MM-DD theo giờ địa phương */
  date: string;
  note: string;
  createdAt: number;
}

export interface Budget {
  id: number;
  categoryId: number;
  /** YYYY-MM */
  month: string;
  limit: number;
}

export const DEFAULT_CATEGORIES: Omit<Category, "id">[] = [
  { name: "Ăn uống", icon: "🍜", color: "#e8590c", type: "expense", order: 0 },
  { name: "Đi lại", icon: "🛵", color: "#1c7ed6", type: "expense", order: 1 },
  { name: "Nhà ở", icon: "🏠", color: "#7048e8", type: "expense", order: 2 },
  { name: "Hóa đơn", icon: "💡", color: "#f59f00", type: "expense", order: 3 },
  { name: "Mua sắm", icon: "🛍️", color: "#d6336c", type: "expense", order: 4 },
  { name: "Giải trí", icon: "🎬", color: "#0ca678", type: "expense", order: 5 },
  { name: "Sức khỏe", icon: "💊", color: "#e03131", type: "expense", order: 6 },
  { name: "Giáo dục", icon: "📚", color: "#3b5bdb", type: "expense", order: 7 },
  { name: "Khác", icon: "📦", color: "#868e96", type: "expense", order: 8 },
  { name: "Lương", icon: "💼", color: "#2f9e44", type: "income", order: 9 },
  { name: "Thưởng", icon: "🎁", color: "#37b24d", type: "income", order: 10 },
  { name: "Kinh doanh", icon: "📈", color: "#099268", type: "income", order: 11 },
  { name: "Thu khác", icon: "💰", color: "#74b816", type: "income", order: 12 },
];

class FinanceDB extends Dexie {
  transactions!: EntityTable<Transaction, "id">;
  categories!: EntityTable<Category, "id">;
  budgets!: EntityTable<Budget, "id">;

  constructor() {
    super("chi-tieu");
    this.version(1).stores({
      transactions: "++id, date, categoryId, type",
      categories: "++id, type",
      budgets: "++id, &[categoryId+month], month, categoryId",
    });
    this.on("populate", (tx) => {
      tx.table("categories").bulkAdd(DEFAULT_CATEGORIES);
    });
  }
}

export const db = new FinanceDB();
