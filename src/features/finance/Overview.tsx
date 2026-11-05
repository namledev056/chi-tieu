import type { Budget, Category, Transaction } from "./db";
import { formatVND } from "./money";
import { budgetTone, byNewest, summarize } from "./summary";
import { BudgetRow, Bubble, cx, EmptyMonth, Hero, TxRow } from "./ui";
import s from "./finance.module.css";

interface Props {
  month: string;
  txs: Transaction[];
  budgets: Budget[];
  catMap: Map<number, Category>;
  onEdit: (tx: Transaction) => void;
  onAdd: () => void;
  goTransactions: () => void;
  goBudgets: () => void;
}

export default function Overview({ month, txs, budgets, catMap, onEdit, onAdd, goTransactions, goBudgets }: Props) {
  if (txs.length === 0) return <EmptyMonth month={month} onAdd={onAdd} />;

  const { income, expense, byCat, totalLimit } = summarize(txs, budgets);
  const balance = income - expense;
  const recent = [...txs].sort(byNewest).slice(0, 3);

  const budgetRows = budgets
    .map((b) => ({ b, spent: byCat.get(b.categoryId) ?? 0 }))
    .sort((x, y) => y.spent / y.b.limit - x.spent / x.b.limit)
    .slice(0, 4);
  const spendRows = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <>
      <Hero month={month} expense={expense} totalLimit={totalLimit}>
        {totalLimit <= 0 && (
          <button type="button" className={cx(s.btn, s.btnGhost, s.btnSm)} onClick={goBudgets}>
            Đặt ngân sách
          </button>
        )}
      </Hero>

      <section className={cx(s.card, s.stats)}>
        <div>
          <span className={s.statL}>Thu</span>
          <span className={cx(s.statV, s.in)}>{formatVND(income)}</span>
        </div>
        <div>
          <span className={s.statL}>Chi</span>
          <span className={s.statV}>{formatVND(expense)}</span>
        </div>
        <div>
          <span className={s.statL}>Dư</span>
          <span className={cx(s.statV, balance < 0 && s.out)}>
            {`${balance < 0 ? "−" : "+"}${formatVND(Math.abs(balance))}`}
          </span>
        </div>
      </section>

      {(budgetRows.length > 0 || spendRows.length > 0) && (
        <>
          <div className={s.secHead}>
            <h2 className={s.secTitle}>Theo danh mục</h2>
            <button type="button" className={s.link} onClick={goBudgets}>
              Ngân sách
            </button>
          </div>
          <div className={s.list}>
            {budgetRows.length > 0
              ? budgetRows.map(({ b, spent }) => (
                  <BudgetRow key={b.id} cat={catMap.get(b.categoryId)} spent={spent} limit={b.limit} onClick={goBudgets} />
                ))
              : spendRows.map(([id, value]) => {
                  const cat = catMap.get(id);
                  const share = value / expense;
                  return (
                    <button key={id} type="button" className={s.catRow} onClick={goTransactions}>
                      <Bubble cat={cat} />
                      <span className={s.rowName}>{cat?.name ?? "Không rõ"}</span>
                      <span className={s.catRight}>{formatVND(value)}</span>
                      <div className={cx(s.bar, s.thin)}>
                        <i className={s[budgetTone(0)]} style={{ width: `${share * 100}%` }} />
                      </div>
                      <div className={s.catSub}>
                        <span>{`${Math.round(share * 100)}% tổng chi`}</span>
                      </div>
                    </button>
                  );
                })}
          </div>
        </>
      )}

      <div className={s.secHead}>
        <h2 className={s.secTitle}>Gần đây</h2>
        <button type="button" className={s.link} onClick={goTransactions}>
          Xem tất cả
        </button>
      </div>
      <div className={s.list}>
        {recent.map((t) => (
          <TxRow key={t.id} tx={t} cat={catMap.get(t.categoryId)} onClick={() => onEdit(t)} />
        ))}
      </div>
    </>
  );
}
