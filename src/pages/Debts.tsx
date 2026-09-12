import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../lib/DataContext'
import {
  amountToInput,
  formatEuro,
  getCurrentMonthKey,
  monthLabel,
  openDebts,
  parseAmount,
  seasonMonths,
} from '../lib/calc'
import { MONTH_KEYS, PAYMENT_METHODS, methodLabel } from '../types'
import type { CarriedDebt, MonthKey, PaymentMethod } from '../types'

export function Debts() {
  const { season, settleDebt, unsettleDebt, removeDebt, addDebt } = useData()
  const navigate = useNavigate()
  const [settling, setSettling] = useState<CarriedDebt | null>(null)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [month, setMonth] = useState<MonthKey>(getCurrentMonthKey(season) ?? MONTH_KEYS[0])
  const [showAdd, setShowAdd] = useState(false)
  const [newPlayerId, setNewPlayerId] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newAmount, setNewAmount] = useState(amountToInput(season.monthlyFee))

  const months = useMemo(() => seasonMonths(season), [season])
  const open = useMemo(() => openDebts(season), [season])
  const settled = useMemo(() => season.carriedDebts.filter((d) => d.settled), [season])
  const openTotal = open.reduce((sum, d) => sum + d.amount, 0)
  const settledTotal = settled.reduce((sum, d) => sum + (d.settled?.amount ?? 0), 0)

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; debts: CarriedDebt[]; total: number }>()
    for (const d of open) {
      const entry = map.get(d.playerId) ?? { name: d.playerName, debts: [], total: 0 }
      entry.debts.push(d)
      entry.total += d.amount
      map.set(d.playerId, entry)
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt'))
  }, [open])

  const sortedPlayers = useMemo(
    () => [...season.players].sort((a, b) => a.name.localeCompare(b.name, 'pt')),
    [season.players],
  )

  function openSettle(debt: CarriedDebt) {
    setSettling(debt)
    setAmount(amountToInput(debt.amount))
    setMethod('cash')
    setMonth(getCurrentMonthKey(season) ?? MONTH_KEYS[0])
  }

  return (
    <div className="flex flex-1 flex-col pb-4">
      <header className="flex items-center gap-3 bg-brand-red px-4 pb-4 pt-[calc(env(safe-area-inset-top)+16px)] text-white">
        <button onClick={() => navigate(-1)} className="text-2xl leading-none">
          ‹
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-bold leading-tight">Pagamentos em atraso</h1>
          <p className="text-[12px] text-white/80">De épocas anteriores · a cobrar em {season.label}</p>
        </div>
      </header>

      <div className="flex flex-col gap-4 px-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-black/[0.06] p-3.5 dark:border-white/10">
            <p className="text-[11px] font-medium uppercase text-black/40 dark:text-white/40">Por cobrar</p>
            <p className="mt-0.5 text-xl font-bold text-brand-red">{formatEuro(openTotal)}</p>
          </div>
          <div className="rounded-2xl border border-black/[0.06] p-3.5 dark:border-white/10">
            <p className="text-[11px] font-medium uppercase text-black/40 dark:text-white/40">Já recebido</p>
            <p className="mt-0.5 text-xl font-bold text-emerald-600">{formatEuro(settledTotal)}</p>
          </div>
        </div>

        {season.carriedDebts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/10 p-6 text-center text-sm text-black/40 dark:border-white/15 dark:text-white/40">
            Não há atrasados transportados para esta época.
          </div>
        ) : (
          grouped.map((g) => (
            <div key={g.name + g.debts[0].id} className="rounded-2xl border border-black/[0.06] dark:border-white/10">
              <div className="flex items-center justify-between px-4 pt-3.5">
                <h2 className="truncate text-[15px] font-bold">{g.name}</h2>
                <span className="shrink-0 text-[14px] font-bold text-brand-red">{formatEuro(g.total)}</span>
              </div>
              <ul className="divide-y divide-black/[0.05] px-4 dark:divide-white/10">
                {g.debts.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px]">{d.monthLabel}</p>
                      <p className="text-[11px] text-black/40 dark:text-white/40">Época {d.fromSeasonLabel}</p>
                    </div>
                    <span className="shrink-0 text-[14px] font-semibold">{formatEuro(d.amount)}</span>
                    <button
                      onClick={() => openSettle(d)}
                      className="shrink-0 rounded-lg bg-brand-red px-3 py-1.5 text-[12px] font-bold text-white"
                    >
                      Recebi
                    </button>
                    <button
                      onClick={() => removeDebt(d.id)}
                      aria-label="Remover dívida"
                      className="shrink-0 text-black/25 dark:text-white/25"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}

        {settled.length > 0 && (
          <div className="rounded-2xl border border-black/[0.06] dark:border-white/10">
            <h2 className="px-4 pt-3.5 text-[13px] font-bold uppercase tracking-wide text-black/40 dark:text-white/40">
              Já pagos
            </h2>
            <ul className="divide-y divide-black/[0.05] px-4 dark:divide-white/10">
              {settled.map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">{d.playerName}</p>
                    <p className="text-[11px] text-black/40 dark:text-white/40">
                      {d.monthLabel} ({d.fromSeasonLabel}) · entrou em{' '}
                      {monthLabel(season, d.settled!.month)} · {methodLabel(d.settled!.method).toLowerCase()}
                    </p>
                  </div>
                  <span className="shrink-0 text-[14px] font-semibold text-emerald-600">
                    {formatEuro(d.settled!.amount)}
                  </span>
                  <button
                    onClick={() => unsettleDebt(d.id)}
                    className="shrink-0 text-[12px] font-semibold text-brand-red underline"
                  >
                    Anular
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-2xl border border-black/[0.06] p-4 dark:border-white/10">
          {!showAdd ? (
            <button
              onClick={() => {
                setNewPlayerId(sortedPlayers[0]?.id ?? '')
                setNewLabel('')
                setNewAmount(String(season.monthlyFee))
                setShowAdd(true)
              }}
              className="text-[12px] font-semibold text-black/40 underline dark:text-white/40"
            >
              Adicionar atraso à mão
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <h2 className="text-[13px] font-bold uppercase tracking-wide text-black/40 dark:text-white/40">
                Novo atraso
              </h2>
              <select
                value={newPlayerId}
                onChange={(e) => setNewPlayerId(e.target.value)}
                className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-[15px] dark:border-white/15 dark:bg-white/5"
              >
                {sortedPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Mês em falta (ex: Mai 2026)"
                  className="min-w-0 flex-1 rounded-xl border border-black/10 px-3 py-2.5 text-[15px] outline-none focus:border-brand-red dark:border-white/15 dark:bg-white/5"
                />
                <input
                  type="text"
                  inputMode="decimal"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="€"
                  className="w-20 rounded-xl border border-black/10 px-3 py-2.5 text-[15px] outline-none focus:border-brand-red dark:border-white/15 dark:bg-white/5"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAdd(false)}
                  className="flex-1 rounded-xl bg-black/[0.04] py-2.5 text-sm font-semibold dark:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const player = sortedPlayers.find((p) => p.id === newPlayerId)
                    const value = parseAmount(newAmount)
                    if (!player || !value) return
                    const previous = season.carriedDebts[0]
                    addDebt({
                      playerId: player.id,
                      playerName: player.name,
                      fromSeasonId: previous?.fromSeasonId ?? 'manual',
                      fromSeasonLabel: previous?.fromSeasonLabel ?? 'anterior',
                      month: MONTH_KEYS[0],
                      monthLabel: newLabel.trim() || 'Em atraso',
                      amount: value,
                    })
                    setShowAdd(false)
                  }}
                  className="flex-1 rounded-xl bg-brand-red py-2.5 text-sm font-semibold text-white"
                >
                  Adicionar
                </button>
              </div>
            </div>
          )}
          <p className="mt-3 text-[12px] text-black/40 dark:text-white/40">
            O mapa da época anterior não é alterado — fica o registo de que esse mês ficou por pagar
            nessa época. O dinheiro recebido entra na caixa desta época, no mês que escolheres.
          </p>
        </div>
      </div>

      {settling && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setSettling(null)}
        >
          <div
            className="w-full max-w-[480px] rounded-t-3xl bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-2xl dark:bg-[#221f20]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-black/10 dark:bg-white/15" />
            <h2 className="mb-1 text-lg font-bold">{settling.playerName}</h2>
            <p className="mb-4 text-[13px] text-black/50 dark:text-white/50">
              {settling.monthLabel} · época {settling.fromSeasonLabel}
            </p>

            <label className="mb-3 block text-sm">
              <span className="mb-1 block text-black/50 dark:text-white/50">Valor recebido</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-[15px] outline-none focus:border-brand-red dark:border-white/15 dark:bg-white/5"
              />
            </label>

            <div className="mb-3">
              <span className="mb-1 block text-sm text-black/50 dark:text-white/50">Como pagou</span>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setMethod(key)}
                    className={`rounded-xl px-1 py-2.5 text-[12px] font-semibold ${
                      method === key
                        ? 'bg-brand-red text-white'
                        : 'bg-black/[0.04] text-black/60 dark:bg-white/10 dark:text-white/60'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <label className="mb-4 block text-sm">
              <span className="mb-1 block text-black/50 dark:text-white/50">Mês em que entrou na caixa</span>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value as MonthKey)}
                className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-[15px] dark:border-white/15 dark:bg-white/5"
              >
                {months.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label} {m.year}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex gap-2">
              <button
                onClick={() => setSettling(null)}
                className="flex-1 rounded-xl bg-black/[0.04] py-3 text-sm font-semibold text-black/60 dark:bg-white/10 dark:text-white/60"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const value = parseAmount(amount)
                  if (!value) return
                  settleDebt(settling.id, { month, method, amount: value })
                  setSettling(null)
                }}
                className="flex-1 rounded-xl bg-brand-red py-3 text-sm font-semibold text-white"
              >
                Registar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
