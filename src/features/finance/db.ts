import Dexie, { type EntityTable } from "dexie";
import { CATEGORY_ICONS, DEFAULT_ICON, EMOJI_TO_ICON } from "./icons";

export type TxType = "income" | "expense";

export interface Category {
  id: number;
  name: string;
  /** Khóa icon Lucide, xem CATEGORY_ICONS trong icons.tsx */
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
  { name: "Ăn uống", icon: "utensils", color: "#e8590c", type: "expense", order: 0 },
  { name: "Đi lại", icon: "bike", color: "#1c7ed6", type: "expense", order: 1 },
  { name: "Nhà ở", icon: "house", color: "#7048e8", type: "expense", order: 2 },
  { name: "Hóa đơn", icon: "lightbulb", color: "#f59f00", type: "expense", order: 3 },
  { name: "Mua sắm", icon: "shopping-bag", color: "#d6336c", type: "expense", order: 4 },
  { name: "Giải trí", icon: "clapperboard", color: "#0ca678", type: "expense", order: 5 },
  { name: "Sức khỏe", icon: "pill", color: "#e03131", type: "expense", order: 6 },
  { name: "Giáo dục", icon: "book-open", color: "#3b5bdb", type: "expense", order: 7 },
  { name: "Khác", icon: "package", color: "#868e96", type: "expense", order: 8 },
  { name: "Lương", icon: "briefcase", color: "#2f9e44", type: "income", order: 9 },
  { name: "Thưởng", icon: "gift", color: "#37b24d", type: "income", order: 10 },
  { name: "Kinh doanh", icon: "trending-up", color: "#099268", type: "income", order: 11 },
  { name: "Thu khác", icon: "piggy-bank", color: "#74b816", type: "income", order: 12 },
];

/** Cài đặt dạng khóa–giá trị, vd { key: "payee", value: Payee } */
export interface Setting {
  key: string;
  value: unknown;
}

class FinanceDB extends Dexie {
  transactions!: EntityTable<Transaction, "id">;
  categories!: EntityTable<Category, "id">;
  budgets!: EntityTable<Budget, "id">;
  settings!: EntityTable<Setting, "key">;

  constructor() {
    super("chi-tieu");
    this.version(1).stores({
      transactions: "++id, date, categoryId, type",
      categories: "++id, type",
      budgets: "++id, &[categoryId+month], month, categoryId",
    });
    // v2: icon danh mục đổi từ emoji sang khóa icon SVG.
    this.version(2).upgrade((tx) =>
      tx
        .table("categories")
        .toCollection()
        .modify((c: Category) => {
          if (CATEGORY_ICONS[c.icon]) return;
          c.icon = EMOJI_TO_ICON[c.icon.trim()] ?? DEFAULT_ICON[c.type] ?? "tag";
        }),
    );
    // v3: bảng cài đặt (tài khoản nhận tiền khi chia tiền).
    this.version(3).stores({ settings: "key" });
    this.on("populate", (tx) => {
      tx.table("categories").bulkAdd(DEFAULT_CATEGORIES);
    });
  }
}

export const db = new FinanceDB();
