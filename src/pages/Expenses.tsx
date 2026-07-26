import { useMemo, useState } from 'react'
import { Header } from '../components/Header'
import { useData } from '../lib/DataContext'
import {
  computeLedgerBalance,
  expensesForMonth,
  formatEuro,
  getCurrentMonthKey,
  monthExpensesTotal,
  summarizeMonth,
} from '../lib/calc'
import { SEASON_MONTHS } from '../types'
import type { MonthKey } from '../types'

export function Expenses() {
  const { season, addExpense, removeExpense, setConfirmedBalance } = useData()
  const currentMonth = getCurrentMonthKey() ?? SEASON_MONTHS[SEASON_MONTHS.length - 1].key
  const [month, setMonth] = useState<MonthKey>(currentMonth)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [balanceInput, setBalanceInput] = useState('')
  const [showManualAdjust, setShowManualAdjust] = useState(false)

  const items = useMemo(() => expensesForMonth(season, month), [season, month])
  const total = monthExpensesTotal(season, month)
  const received = summarizeMonth(season, month).totalReceived
  const confirmedBalance = season.confirmedBalances[month]
  const ledgerBalance = useMemo(() => computeLedgerBalance(season, month), [season, month])

  return (
    <div className="flex flex-1 flex-col pb-4">
      <Header title="Despesas & Saldo" subtitle={`Época ${season.label}`} />

      <div className="flex gap-2 overflow-x-auto px-4 pt-4 pb-1">
        {SEASON_MONTHS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMonth(m.key)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
              month === m.key
                ? 'bg-brand-red text-white'
                : 'bg-black/[0.05] text-black/50 dark:bg-white/10 dark:text-white/50'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 px-4 pt-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-black/[0.06] p-3.5 dark:border-white/10">
            <p className="text-[11px] font-medium uppercase text-black/40 dark:text-white/40">Recebido no mês</p>
            <p className="mt-0.5 text-lg font-bold text-emerald-600">{formatEuro(received)}</p>
          </div>
          <div className="rounded-2xl border border-black/[0.06] p-3.5 dark:border-white/10">
            <p className="text-[11px] font-medium uppercase text-black/40 dark:text-white/40">Despesas do mês</p>
            <p className="mt-0.5 text-lg font-bold text-brand-red">{formatEuro(total)}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-black/[0.06] dark:border-white/10">
          <div className="flex items-center justify-between px-4 pt-3.5">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-black/40 dark:text-white/40">
              Despesas
            </h2>
          </div>
          <ul className="divide-y divide-black/[0.05] px-4 dark:divide-white/10">
            {items.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="truncate text-[14px]">{e.description}</span>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-[14px] font-semibold">{formatEuro(e.amount)}</span>
                  <button
                    onClick={() => removeExpense(e.id)}
                    aria-label="Remover despesa"
                    className="text-black/30 dark:text-white/30"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
            {items.length === 0 && (
              <li className="py-4 text-center text-sm text-black/40 dark:text-white/40">
                Sem despesas registadas.
              </li>
            )}
          </ul>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const value = Number(amount)
              if (!description.trim() || !value) return
              addExpense({ month, description: description.trim(), amount: value })
              setDescription('')
              setAmount('')
            }}
            className="flex gap-2 px-4 py-3"
          >
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição"
              className="min-w-0 flex-1 rounded-xl border border-black/10 px-3 py-2 text-[14px] outline-none focus:border-brand-red dark:border-white/15 dark:bg-white/5"
            />
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="€"
              className="w-20 rounded-xl border border-black/10 px-3 py-2 text-[14px] outline-none focus:border-brand-red dark:border-white/15 dark:bg-white/5"
            />
            <button
              type="submit"
              className="rounded-xl bg-brand-red px-4 text-sm font-semibold text-white"
            >
              +
            </button>
          </form>
        </div>

        <div className="rounded-2xl bg-brand-red p-4 text-white shadow-md">
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">
            Saldo em caixa no fim do mês
          </p>
          <p className="mt-0.5 text-2xl font-extrabold">{formatEuro(ledgerBalance)}</p>
          <p className="mt-1 text-[12px] text-white/80">
            Atualiza-se sozinho sempre que adicionas ou removes uma despesa
            {confirmedBalance != null ? ' (com um ajuste manual aplicado a este mês)' : ''}.
          </p>
        </div>

        <div className="rounded-2xl border border-black/[0.06] p-4 dark:border-white/10">
          {!showManualAdjust ? (
            <button
              onClick={() => setShowManualAdjust(true)}
              className="text-[12px] font-semibold text-black/40 underline dark:text-white/40"
            >
              Ajustar saldo manualmente (opcional)
            </button>
          ) : (
            <>
              <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-black/40 dark:text-white/40">
                Ajustar saldo manualmente
              </h2>
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  value={balanceInput}
                  onChange={(e) => setBalanceInput(e.target.value)}
                  placeholder={String(ledgerBalance)}
                  className="min-w-0 flex-1 rounded-xl border border-black/10 px-3 py-2.5 text-[15px] outline-none focus:border-brand-red dark:border-white/15 dark:bg-white/5"
                />
                <button
                  onClick={() => {
                    if (balanceInput.trim() === '') return
                    setConfirmedBalance(month, Number(balanceInput))
                    setBalanceInput('')
                  }}
                  className="rounded-xl bg-brand-red px-4 text-sm font-semibold text-white"
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
                  className="mt-2 text-[12px] font-semibold text-brand-red underline"
                >
                  Repor cálculo automático
                </button>
              )}
              <p className="mt-2 text-[12px] text-black/40 dark:text-white/40">
                Usa isto só se o saldo real (banco/caixa) for diferente do calculado — por exemplo,
                para reconciliar. A partir do valor que guardares, os meses seguintes continuam a
                calcular-se automaticamente.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
