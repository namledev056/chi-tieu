"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * Minimal i18n: one typed dictionary per language, no external library.
 * Add a language by adding an entry to DICTS that satisfies `Dict`.
 */

export type Lang = "vi" | "en";
export const LANGS: { id: Lang; label: string }[] = [
  { id: "vi", label: "Tiếng Việt" },
  { id: "en", label: "English" },
];

const STORAGE_KEY = "chi-tieu-lang";
const pad = (n: number) => String(n).padStart(2, "0");

const vi = {
  appName: "Chi tiêu",
  loading: "Đang tải",
  unknown: "Không rõ",

  // Navigation
  nav: "Điều hướng",
  overview: "Tổng quan",
  transactions: "Giao dịch",
  budgets: "Ngân sách",
  settings: "Cài đặt",
  addTx: "Thêm giao dịch",
  editTx: "Sửa giao dịch",
  search: "Tìm",

  // Months & dates
  monthShort: (m: number) => `Tháng ${m}`,
  monthLong: (m: number, y: number) => `Tháng ${m}, ${y}`,
  year: (y: number) => `Năm ${y}`,
  pickMonth: "Chọn tháng",
  prevYear: "Năm trước",
  nextYear: "Năm sau",
  thisMonth: "Về tháng này",
  today: "Hôm nay",
  yesterday: "Hôm qua",
  weekdays: ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"],
  dayLong: (weekday: string, d: number, m: number) => `${weekday}, ${pad(d)}/${pad(m)}`,
  dayShort: (d: number, m: number) => `${pad(d)}/${pad(m)}`,
  dateAria: (label: string) => `Ngày: ${label}`,

  // Hero / budgets summary
  spentThisMonth: "Đã chi tháng này",
  setBudgetHint: "Đặt ngân sách để biết tháng này còn tiêu được bao nhiêu.",
  canSpend: "Còn có thể chi",
  overBudget: "Đã vượt ngân sách",
  usedPct: (p: number) => `Đã dùng ${p}% ngân sách`,
  todayMarker: (d: number, n: number) => `Hôm nay: ngày ${d}/${n}`,
  spentOf: (spent: string, limit: string) => `Đã chi ${spent} / ${limit}`,
  daysLeft: (n: number) => `Còn ${n} ngày`,
  lastDay: "Ngày cuối tháng",
  overBy: (v: string) => `Đã chi quá ngân sách ${v}.`,
  fastPace: (p: number, d: number, n: number) => `Tiêu nhanh hơn kế hoạch: đã dùng ${p}% ngân sách sau ${d}/${n} ngày.`,
  over: (v: string) => `Vượt ${v}`,
  left: (v: string) => `Còn ${v}`,

  // Empty / error
  emptyTitle: (m: number) => `Tháng ${m} chưa có giao dịch nào`,
  emptyBody: "Ghi khoản chi đầu tiên để xem tháng này tiền đi đâu.",
  addExpense: "Thêm khoản chi",
  loadErrorTitle: "Không mở được dữ liệu",
  loadErrorBody: "Trình duyệt đang chặn bộ nhớ, thường do mở bằng tab ẩn danh. Mở bằng tab thường rồi thử lại.",
  retry: "Thử lại",
  close: "Đóng",

  // Overview
  setBudget: "Đặt ngân sách",
  income: "Thu",
  expense: "Chi",
  balance: "Dư",
  byCategory: "Theo danh mục",
  shareOfExpense: (p: number) => `${p}% tổng chi`,
  recent: "Gần đây",
  seeAll: "Xem tất cả",

  // Transactions
  all: "Tất cả",
  filter: "Lọc",
  searchPlaceholder: "Tìm ghi chú, danh mục",
  searchTx: "Tìm giao dịch",
  results: (n: number) => `${n} kết quả`,
  noMatch: "Không có giao dịch nào khớp bộ lọc.",

  // Budgets
  copyBudgets: (n: number) => `Chép ngân sách tháng trước (${n} mục)`,
  sortedByUsage: "Sắp xếp theo % đã dùng",
  noLimit: "Chưa đặt hạn mức",
  set: "Đặt",
  addToLimit: "+ Cộng thêm ₫",
  limitPlaceholder: "Hạn mức ₫",
  addToLimitAria: (name: string) => `Cộng thêm vào hạn mức ${name}`,
  limitAria: (name: string) => `Hạn mức ${name}`,
  remove: "Bỏ",
  save: "Lưu",
  current: "Hiện tại",
  newLimit: "Nhập mức mới",
  addMore: "Cộng thêm",

  // Transaction sheet
  expenseTab: "Khoản chi",
  incomeTab: "Khoản thu",
  delete: "Xóa",
  confirmDeleteTx: "Xóa giao dịch này?",
  amount: "Số tiền",
  category: "Danh mục",
  note: "Ghi chú",
  backspace: "Xóa một số",
  split: "Chia tiền",
  saveChanges: "Lưu thay đổi",
  saveExpense: "Lưu khoản chi",
  saveIncome: "Lưu khoản thu",

  // Settings
  data: "Dữ liệu",
  dataNote: "Dữ liệu chỉ lưu trên trình duyệt này. Hãy xuất CSV định kỳ để sao lưu.",
  exportCsv: "Xuất CSV",
  importCsv: "Nhập CSV",
  wipe: "Xóa dữ liệu",
  imported: (added: number, skipped: number) =>
    `Đã nhập ${added} giao dịch${skipped ? `, bỏ qua ${skipped} dòng lỗi` : ""}.`,
  csvError: "Không đọc được file CSV.",
  confirmWipe: "Xóa toàn bộ giao dịch và ngân sách? Không thể hoàn tác.",
  wiped: "Đã xóa toàn bộ dữ liệu.",
  csvFormat: "Định dạng CSV:",
  csvExample: "ví dụ",
  csvSample: "2026-11-04,chi,45000,Ăn uống,Phở",
  language: "Ngôn ngữ",
  payeeTitle: "Tài khoản nhận tiền",
  confirmDeletePayee: "Xóa tài khoản nhận tiền?",
  payeeIntro: "Thêm tài khoản ngân hàng để khi chia tiền, app tạo mã QR có sẵn số tiền cho từng người.",
  addAccount: "Thêm tài khoản",
  edit: "Sửa",
  expenseCategories: "Danh mục chi",
  incomeCategories: "Danh mục thu",
  add: "Thêm",
  confirmDeleteCat: (name: string) => `Xóa "${name}"? Các giao dịch sẽ chuyển sang danh mục Khác.`,
  lastCategoryError: "Cần giữ lại ít nhất một danh mục cho mỗi loại.",
  categoryName: "Tên danh mục",
  icon: "Biểu tượng",
  color: "Màu",
  cancel: "Hủy",
  colors: ["Cam", "Xanh dương", "Tím", "Vàng", "Hồng", "Xanh ngọc", "Đỏ", "Chàm", "Xanh lá", "Xám"],

  // Split bill
  qrReadError: "Không đọc được mã QR ngân hàng. Thử ảnh rõ hơn hoặc nhập tay bên dưới.",
  qrRead: (bank: string, account: string) => `Đã đọc: ${bank} · ${account}. Kiểm tra lại rồi bấm Lưu.`,
  readingQr: "Đang đọc mã…",
  uploadQr: "Tải ảnh mã QR ngân hàng",
  qrImage: "Ảnh mã QR ngân hàng",
  qrHowTo: "Mở app ngân hàng → mã QR nhận tiền → chụp màn hình, rồi tải ảnh đó lên.",
  bank: "Ngân hàng",
  pickBank: "Chọn ngân hàng",
  bankFallback: (bin: string) => `Ngân hàng ${bin}`,
  accountNumber: "Số tài khoản",
  accountNameOptional: "Tên chủ tài khoản (không bắt buộc)",
  accountName: "Tên chủ tài khoản",
  saveAccount: "Lưu tài khoản",
  shareHeading: "Chia tiền · mỗi người",
  transferNoteLine: (n: string) => `Nội dung: ${n}`,
  defaultTransferNote: (title: string) => `Chia tien ${title}`,
  shareFile: (amount: number) => `chia-tien-${amount}.png`,
  shareText: (title: string, each: string) => `Chia tiền ${title}: mỗi người ${each}. Quét mã để chuyển khoản.`,
  savedQr: "Đã lưu ảnh mã QR.",
  total: "Tổng",
  people: "Số người (gồm cả bạn)",
  peopleAria: "Số người",
  fewer: "Bớt một người",
  more: "Thêm một người",
  each: "Mỗi người",
  collectFrom: (n: number) => `Thu từ ${n} người · làm tròn lên 1.000 ₫`,
  yourPayee: "Tài khoản nhận tiền của bạn",
  payeeLocal: "Chỉ lưu trên máy này, dùng để tạo mã QR có sẵn số tiền.",
  qrAlt: (v: string) => `Mã QR chuyển ${v}`,
  changeAccount: "Đổi tài khoản",
  transferNote: "Nội dung chuyển khoản",
  saveImage: "Lưu ảnh",
  shareQr: "Chia sẻ mã QR",

  /** Screen-reader names for the icon picker. */
  icons: {
    utensils: "Ăn uống",
    coffee: "Cà phê",
    "shopping-cart": "Đi chợ",
    bike: "Xe máy",
    car: "Ô tô",
    bus: "Xe buýt",
    fuel: "Xăng",
    plane: "Du lịch",
    house: "Nhà",
    lightbulb: "Điện",
    zap: "Năng lượng",
    wifi: "Internet",
    smartphone: "Điện thoại",
    receipt: "Hóa đơn",
    "shopping-bag": "Mua sắm",
    shirt: "Quần áo",
    scissors: "Làm đẹp",
    sparkles: "Chăm sóc",
    clapperboard: "Phim ảnh",
    gamepad: "Trò chơi",
    music: "Âm nhạc",
    dumbbell: "Thể thao",
    pill: "Thuốc",
    stethoscope: "Khám bệnh",
    "book-open": "Sách",
    "graduation-cap": "Học phí",
    baby: "Con cái",
    "paw-print": "Thú cưng",
    users: "Gia đình",
    heart: "Từ thiện",
    gift: "Quà tặng",
    wrench: "Sửa chữa",
    laptop: "Công nghệ",
    "credit-card": "Thẻ tín dụng",
    landmark: "Ngân hàng",
    package: "Khác",
    briefcase: "Lương",
    "trending-up": "Đầu tư",
    store: "Kinh doanh",
    banknote: "Tiền mặt",
    coins: "Tiền lẻ",
    "hand-coins": "Cho vay",
    wallet: "Ví",
    "piggy-bank": "Tiết kiệm",
    tag: "Nhãn",
  } as Record<string, string>,

  /** Default category names, in the same order as DEFAULT_CATEGORIES in db.ts. */
  defaultCategories: [
    "Ăn uống", "Đi lại", "Nhà ở", "Hóa đơn", "Mua sắm", "Giải trí", "Sức khỏe", "Giáo dục", "Khác",
    "Lương", "Thưởng", "Kinh doanh", "Thu khác",
  ],
  otherExpense: "Khác",
  otherIncome: "Thu khác",
};

export type Dict = typeof vi;

const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_EN_SHORT = MONTHS_EN.map((m) => m.slice(0, 3));

const en: Dict = {
  appName: "Chi tiêu",
  loading: "Loading",
  unknown: "Unknown",

  nav: "Navigation",
  overview: "Overview",
  transactions: "Transactions",
  budgets: "Budgets",
  settings: "Settings",
  addTx: "Add transaction",
  editTx: "Edit transaction",
  search: "Search",

  monthShort: (m) => MONTHS_EN_SHORT[m - 1],
  monthLong: (m, y) => `${MONTHS_EN[m - 1]} ${y}`,
  year: (y) => String(y),
  pickMonth: "Pick month",
  prevYear: "Previous year",
  nextYear: "Next year",
  thisMonth: "Go to this month",
  today: "Today",
  yesterday: "Yesterday",
  weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  dayLong: (weekday, d, m) => `${weekday}, ${MONTHS_EN_SHORT[m - 1]} ${d}`,
  dayShort: (d, m) => `${MONTHS_EN_SHORT[m - 1]} ${d}`,
  dateAria: (label) => `Date: ${label}`,

  spentThisMonth: "Spent this month",
  setBudgetHint: "Set a budget to see how much you can still spend this month.",
  canSpend: "Left to spend",
  overBudget: "Over budget",
  usedPct: (p) => `${p}% of budget used`,
  todayMarker: (d, n) => `Today: day ${d}/${n}`,
  spentOf: (spent, limit) => `Spent ${spent} / ${limit}`,
  daysLeft: (n) => (n === 1 ? "1 day left" : `${n} days left`),
  lastDay: "Last day of the month",
  overBy: (v) => `Over budget by ${v}.`,
  fastPace: (p, d, n) => `Spending faster than planned: ${p}% of budget used after ${d}/${n} days.`,
  over: (v) => `Over ${v}`,
  left: (v) => `${v} left`,

  emptyTitle: (m) => `No transactions in ${MONTHS_EN[m - 1]} yet`,
  emptyBody: "Log your first expense to see where your money goes this month.",
  addExpense: "Add expense",
  loadErrorTitle: "Couldn't open your data",
  loadErrorBody: "The browser is blocking storage, usually because this is a private window. Open it in a normal tab and try again.",
  retry: "Try again",
  close: "Close",

  setBudget: "Set budget",
  income: "Income",
  expense: "Expense",
  balance: "Net",
  byCategory: "By category",
  shareOfExpense: (p) => `${p}% of spending`,
  recent: "Recent",
  seeAll: "See all",

  all: "All",
  filter: "Filter",
  searchPlaceholder: "Search notes, categories",
  searchTx: "Search transactions",
  results: (n) => (n === 1 ? "1 result" : `${n} results`),
  noMatch: "No transactions match this filter.",

  copyBudgets: (n) => `Copy last month's budget (${n} ${n === 1 ? "item" : "items"})`,
  sortedByUsage: "Sorted by % used",
  noLimit: "No limit set",
  set: "Set",
  addToLimit: "+ Add ₫",
  limitPlaceholder: "Limit ₫",
  addToLimitAria: (name) => `Add to ${name} limit`,
  limitAria: (name) => `${name} limit`,
  remove: "Remove",
  save: "Save",
  current: "Current",
  newLimit: "Enter new limit",
  addMore: "Add to limit",

  expenseTab: "Expense",
  incomeTab: "Income",
  delete: "Delete",
  confirmDeleteTx: "Delete this transaction?",
  amount: "Amount",
  category: "Category",
  note: "Note",
  backspace: "Delete digit",
  split: "Split bill",
  saveChanges: "Save changes",
  saveExpense: "Save expense",
  saveIncome: "Save income",

  data: "Data",
  dataNote: "Data is stored only in this browser. Export CSV regularly as a backup.",
  exportCsv: "Export CSV",
  importCsv: "Import CSV",
  wipe: "Delete data",
  imported: (added, skipped) =>
    `Imported ${added} ${added === 1 ? "transaction" : "transactions"}${skipped ? `, skipped ${skipped} invalid ${skipped === 1 ? "row" : "rows"}` : ""}.`,
  csvError: "Couldn't read the CSV file.",
  confirmWipe: "Delete all transactions and budgets? This can't be undone.",
  wiped: "All data deleted.",
  csvFormat: "CSV format:",
  csvExample: "e.g.",
  csvSample: "2026-11-04,expense,45000,Food,Noodles",
  language: "Language",
  payeeTitle: "Receiving account",
  confirmDeletePayee: "Remove receiving account?",
  payeeIntro: "Add your bank account so that splitting a bill creates a QR code with the amount for each person.",
  addAccount: "Add account",
  edit: "Edit",
  expenseCategories: "Expense categories",
  incomeCategories: "Income categories",
  add: "Add",
  confirmDeleteCat: (name) => `Delete "${name}"? Its transactions will move to the Other category.`,
  lastCategoryError: "Keep at least one category of each type.",
  categoryName: "Category name",
  icon: "Icon",
  color: "Color",
  cancel: "Cancel",
  colors: ["Orange", "Blue", "Purple", "Yellow", "Pink", "Teal", "Red", "Indigo", "Green", "Gray"],

  qrReadError: "Couldn't read a bank QR code. Try a clearer image or enter the details below.",
  qrRead: (bank, account) => `Read: ${bank} · ${account}. Check the details, then tap Save.`,
  readingQr: "Reading code…",
  uploadQr: "Upload bank QR image",
  qrImage: "Bank QR image",
  qrHowTo: "Open your banking app → receive-money QR → take a screenshot, then upload it.",
  bank: "Bank",
  pickBank: "Choose a bank",
  bankFallback: (bin) => `Bank ${bin}`,
  accountNumber: "Account number",
  accountNameOptional: "Account holder name (optional)",
  accountName: "Account holder name",
  saveAccount: "Save account",
  shareHeading: "Split bill · per person",
  transferNoteLine: (n) => `Note: ${n}`,
  defaultTransferNote: (title) => `Split ${title}`,
  shareFile: (amount) => `split-${amount}.png`,
  shareText: (title, each) => `Splitting ${title}: ${each} per person. Scan the code to transfer.`,
  savedQr: "QR image saved.",
  total: "Total",
  people: "People (including you)",
  peopleAria: "People",
  fewer: "One fewer person",
  more: "One more person",
  each: "Per person",
  collectFrom: (n) => `Collect from ${n} ${n === 1 ? "person" : "people"} · rounded up to 1,000 ₫`,
  yourPayee: "Your receiving account",
  payeeLocal: "Stored only on this device, used to create QR codes with the amount filled in.",
  qrAlt: (v) => `QR code to transfer ${v}`,
  changeAccount: "Change account",
  transferNote: "Transfer note",
  saveImage: "Save image",
  shareQr: "Share QR code",

  icons: {
    utensils: "Food",
    coffee: "Coffee",
    "shopping-cart": "Groceries",
    bike: "Motorbike",
    car: "Car",
    bus: "Bus",
    fuel: "Fuel",
    plane: "Travel",
    house: "Home",
    lightbulb: "Electricity",
    zap: "Energy",
    wifi: "Internet",
    smartphone: "Phone",
    receipt: "Bills",
    "shopping-bag": "Shopping",
    shirt: "Clothes",
    scissors: "Beauty",
    sparkles: "Self-care",
    clapperboard: "Movies",
    gamepad: "Games",
    music: "Music",
    dumbbell: "Sports",
    pill: "Medicine",
    stethoscope: "Doctor",
    "book-open": "Books",
    "graduation-cap": "Tuition",
    baby: "Kids",
    "paw-print": "Pets",
    users: "Family",
    heart: "Charity",
    gift: "Gifts",
    wrench: "Repairs",
    laptop: "Tech",
    "credit-card": "Credit card",
    landmark: "Bank",
    package: "Other",
    briefcase: "Salary",
    "trending-up": "Investments",
    store: "Business",
    banknote: "Cash",
    coins: "Coins",
    "hand-coins": "Loans",
    wallet: "Wallet",
    "piggy-bank": "Savings",
    tag: "Tag",
  },

  defaultCategories: [
    "Food", "Transport", "Housing", "Bills", "Shopping", "Entertainment", "Health", "Education", "Other",
    "Salary", "Bonus", "Business", "Other income",
  ],
  otherExpense: "Other",
  otherIncome: "Other income",
};

export const DICTS: Record<Lang, Dict> = { vi, en };

/** Saved choice first, then the browser language; Vietnamese for vi-*, English otherwise. */
export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "vi" || saved === "en") return saved;
  } catch {
    // Storage may be blocked (private mode); fall through to the browser language.
  }
  if (typeof navigator === "undefined") return "vi";
  return navigator.language.toLowerCase().startsWith("vi") ? "vi" : "en";
}

const LangContext = createContext<{ lang: Lang; t: Dict; setLang: (l: Lang) => void }>({
  lang: "vi",
  t: vi,
  setLang: () => {},
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // Not persisted; the choice still applies for this session.
    }
  }, []);

  const value = useMemo(() => ({ lang, t: DICTS[lang], setLang }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useI18n = () => useContext(LangContext);
export const useT = () => useContext(LangContext).t;
