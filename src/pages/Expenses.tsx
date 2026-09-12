import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Header, StatTile } from '../components/Header'
import { useData } from '../lib/DataContext'
import {
  computeLedgerBalance,
  debtsIncomeForMonth,
  dinnersCostForMonth,
  dinnersForMonth,
  dinnersIncomeForMonth,
  expensesForMonth,
  formatDinnerDate,
  formatEuro,
  getCurrentMonthKey,
  monthExpensesTotal,
  monthOutflowTotal,
  seasonMonths,
  parseAmount,
  summarizeMonth,
} from '../lib/calc'
import { MONTH_KEYS } from '../types'
import type { MonthKey } from '../types'

export function Expenses() {
  const { season, addExpense, removeExpense, setConfirmedBalance } = useData()
  const months = useMemo(() => seasonMonths(season), [season])
  const currentMonth = getCurrentMonthKey(season) ?? MONTH_KEYS[MONTH_KEYS.length - 1]
  const [month, setMonth] = useState<MonthKey>(currentMonth)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [balanceInput, setBalanceInput] = useState('')
  const [showManualAdjust, setShowManualAdjust] = useState(false)

  const items = useMemo(() => expensesForMonth(season, month), [season, month])
  const dinners = useMemo(() => dinnersForMonth(season, month), [season, month])
  const expensesTotal = monthExpensesTotal(season, month)
  const dinnerCost = dinnersCostForMonth(season, month)
  const outflow = monthOutflowTotal(season, month)
  const feesReceived = summarizeMonth(season, month).totalReceived
  const dinnerIncome = dinnersIncomeForMonth(season, month)
  const debtIncome = debtsIncomeForMonth(season, month)
  const received = feesReceived + dinnerIncome + debtIncome
  const confirmedBalance = season.confirmedBalances[month]
  const ledgerBalance = useMemo(() => computeLedgerBalance(season, month), [season, month])
  const monthName = months.find((m) => m.key === month)!

  return (
    <div className="flex flex-1 flex-col">
      <Header title="Despesas & Saldo" subtitle={`Época ${season.label}`} badge={monthName.label} />

      <div className="flex gap-1.5 overflow-x-auto px-4 pb-1 pt-4">
        {months.map((m) => (
          <button
            key={m.key}
            onClick={() => setMonth(m.key)}
            className={`shrink-0 rounded-xl px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
              month === m.key ? 'bg-brand-red text-white shadow-sm' : 'bg-ink/[0.05] text-muted'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3.5 px-4 pt-3">
        {/* Saldo primeiro: é a pergunta a que este ecrã responde. */}
        <div className="app-header rounded-[22px] p-5 shadow-lg">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/70">
            Saldo no fim de {monthName.label} {monthName.year}
          </p>
          <p className="mt-1 text-[32px] font-extrabold leading-none tracking-tight">
            {formatEuro(ledgerBalance)}
          </p>
          <p className="mt-2 text-[12px] text-white/75">
            Mensalidades, jantares, atrasados cobrados e todas as despesas
            {confirmedBalance != null ? ' · com ajuste manual neste mês' : ''}.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatTile
            label="Entrou"
            value={formatEuro(received)}
            tone="ok"
            hint={[
              `${formatEuro(feesReceived)} mensalidades`,
              dinnerIncome > 0 ? `${formatEuro(dinnerIncome)} jantares` : '',
              debtIncome > 0 ? `${formatEuro(debtIncome)} atrasados` : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          />
          <StatTile
            label="Saiu"
            value={formatEuro(outflow)}
            tone="alert"
            hint={[
              `${formatEuro(expensesTotal)} despesas`,
              dinnerCost > 0 ? `${formatEuro(dinnerCost)} jantares` : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          />
        </div>

        <section className="card overflow-hidden">
          <h2 className="section-title px-4 pt-4">Despesas do mês</h2>
          <ul className="mt-1 divide-y divide-line">
            {items.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="truncate text-[14px]">{e.description}</span>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-[14px] font-semibold">{formatEuro(e.amount)}</span>
                  <button
                    onClick={() => removeExpense(e.id)}
                    aria-label="Remover despesa"
                    className="text-subtle"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
            {dinners
              .filter((d) => d.cost != null && d.cost > 0)
              .map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <Link to={`/jantares/${d.id}`} className="min-w-0 flex-1">
                    <span className="block truncate text-[14px]">
                      Jantar {formatDinnerDate(d.date)} · vs {d.opponent || 'adversário'}
                    </span>
                    <span className="text-[11px] text-subtle">registado na página dos jantares</span>
                  </Link>
                  <span className="shrink-0 text-[14px] font-semibold">{formatEuro(d.cost!)}</span>
                </li>
              ))}
            {items.length === 0 && dinnerCost === 0 && (
              <li className="px-4 py-6 text-center text-[13px] text-muted">
                Sem despesas registadas neste mês.
              </li>
            )}
          </ul>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              const value = parseAmount(amount)
              if (!description.trim() || !value) return
              addExpense({ month, description: description.trim(), amount: value })
              setDescription('')
              setAmount('')
            }}
            className="flex gap-2 border-t border-line p-3"
          >
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição"
              className="field min-w-0 flex-1"
            />
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="€"
              className="field w-20 shrink-0"
            />
            <button type="submit" aria-label="Adicionar despesa" className="btn btn-primary shrink-0 px-4">
              +
            </button>
          </form>
        </section>

        <section className="card p-4">
          {!showManualAdjust ? (
            <button
              onClick={() => setShowManualAdjust(true)}
              className="text-[12px] font-semibold text-muted"
            >
              Ajustar saldo manualmente (opcional)
            </button>
          ) : (
            <>
              <h2 className="section-title mb-2">Ajustar saldo manualmente</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={balanceInput}
                  onChange={(e) => setBalanceInput(e.target.value)}
                  placeholder={formatEuro(ledgerBalance)}
                  className="field min-w-0 flex-1"
                />
                <button
                  onClick={() => {
                    const value = parseAmount(balanceInput)
                    if (value === undefined) return
                    setConfirmedBalance(month, value)
                    setBalanceInput('')
                  }}
                  className="btn btn-primary shrink-0"
                >
                  Guardar
                </button>
              </div>
              {confirmedBalance != null && (
                <button
                  onClick={() => {
                    setConfirmedBalance(month, undefined)
                    setBalanceInput('')
                  }}
                  className="mt-2 text-[12px] font-semibold text-brand-red"
                >
                  Repor cálculo automático
                </button>
              )}
              <p className="mt-2 text-[12px] leading-relaxed text-subtle">
                Usa isto só se o saldo real (banco/caixa) for diferente do calculado — por exemplo,
                para reconciliar. A partir do valor que guardares, os meses seguintes continuam a
                calcular-se automaticamente.
              </p>
            </>
          )}
        </section>

        <div className="pb-2" />
      </div>
    </div>
  )
}
