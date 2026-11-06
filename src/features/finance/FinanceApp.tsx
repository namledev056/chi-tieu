"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { LayoutDashboard, List, Plus, Search, Settings as SettingsIcon, Target } from "lucide-react";
import { db, type Transaction } from "./db";
import { currentMonth, shiftMonth, today } from "./dates";
import { listCategories, monthBudgets, monthTransactions } from "./repo";
import Overview from "./Overview";
import Transactions, { type TxFilter } from "./Transactions";
import Budgets from "./Budgets";
import Settings from "./Settings";
import TxSheet from "./TxSheet";
import { cx, Loading, LoadError, MonthButton, MonthSheet } from "./ui";
import { useT } from "./i18n";
import s from "./finance.module.css";

type Tab = "overview" | "transactions" | "budgets" | "settings";

export default function FinanceApp() {
  const t = useT();
  const [tab, setTab] = useState<Tab>("overview");
  const [month, setMonth] = useState(currentMonth);
  const [sheet, setSheet] = useState<{ tx: Transaction | null } | null>(null);
  const [pickMonth, setPickMonth] = useState(false);
  const [filter, setFilter] = useState<TxFilter>("all");
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [dbError, setDbError] = useState(false);

  useEffect(() => {
    db.open().catch(() => setDbError(true));
  }, []);

  const categories = useLiveQuery(listCategories);
  const txs = useLiveQuery(() => monthTransactions(month), [month]);
  const budgets = useLiveQuery(() => monthBudgets(month), [month]);
  const prevBudgetCount = useLiveQuery(() => monthBudgets(shiftMonth(month, -1)).then((b) => b.length), [month]);

  const catMap = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c])), [categories]);
  const closeSheet = useCallback(() => setSheet(null), []);
  const openEdit = useCallback((tx: Transaction) => setSheet({ tx }), []);
  const openAdd = useCallback(() => setSheet({ tx: null }), []);

  const ready = categories && txs && budgets && prevBudgetCount !== undefined;
  const defaultDate = month === currentMonth() ? today() : `${month}-01`;
  const monthBtn = (small: boolean) => <MonthButton month={month} small={small} onClick={() => setPickMonth(true)} />;

  const header =
    tab === "overview" ? (
      monthBtn(false)
    ) : tab === "transactions" ? (
      <>
        <h1 className={s.h1}>{t.transactions}</h1>
        <div className={s.topActions}>
          {monthBtn(true)}
          <button
            type="button"
            className={s.iconBtn}
            aria-label={t.search}
            aria-pressed={showSearch}
            onClick={() => {
              setShowSearch(!showSearch);
              if (showSearch) setQuery("");
            }}
          >
            <Search />
          </button>
        </div>
      </>
    ) : tab === "budgets" ? (
      <>
        <h1 className={s.h1}>{t.budgets}</h1>
        {monthBtn(true)}
      </>
    ) : (
      <h1 className={s.h1}>{t.settings}</h1>
    );

  let content: React.ReactNode;
  if (dbError) content = <LoadError />;
  else if (!ready) content = <Loading />;
  else if (tab === "overview")
    content = (
      <Overview
        month={month}
        txs={txs}
        budgets={budgets}
        catMap={catMap}
        onEdit={openEdit}
        onAdd={openAdd}
        goTransactions={() => setTab("transactions")}
        goBudgets={() => setTab("budgets")}
      />
    );
  else if (tab === "transactions")
    content = (
      <Transactions
        month={month}
        txs={txs}
        categories={categories}
        catMap={catMap}
        filter={filter}
        setFilter={setFilter}
        query={query}
        setQuery={setQuery}
        showSearch={showSearch}
        onEdit={openEdit}
        onAdd={openAdd}
      />
    );
  else if (tab === "budgets")
    content = (
      <Budgets month={month} categories={categories} txs={txs} budgets={budgets} prevBudgetCount={prevBudgetCount} />
    );
  else content = <Settings categories={categories} />;

  const navItem = (id: Tab, Icon: typeof List, label: string) => (
    <button
      type="button"
      className={s.navItem}
      aria-current={tab === id ? "page" : undefined}
      onClick={() => setTab(id)}
    >
      <Icon aria-hidden />
      {label}
    </button>
  );

  return (
    <div className={s.app}>
      <div className={s.shell}>
        <header className={s.top}>{header}</header>
        <main>{content}</main>
      </div>

      <nav className={s.nav} aria-label={t.nav}>
        <div className={s.navIn}>
          {navItem("overview", LayoutDashboard, t.overview)}
          {navItem("transactions", List, t.transactions)}
          <button
            type="button"
            className={cx(s.plus)}
            onClick={openAdd}
            disabled={!ready}
            aria-label={t.addTx}
          >
            <Plus />
          </button>
          {navItem("budgets", Target, t.budgets)}
          {navItem("settings", SettingsIcon, t.settings)}
        </div>
      </nav>

      {sheet && categories && (
        <TxSheet tx={sheet.tx} categories={categories} defaultDate={defaultDate} onClose={closeSheet} />
      )}
      {pickMonth && <MonthSheet month={month} onPick={setMonth} onClose={() => setPickMonth(false)} />}
    </div>
  );
}
