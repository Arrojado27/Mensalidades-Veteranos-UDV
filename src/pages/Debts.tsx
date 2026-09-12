import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header, StatTile } from '../components/Header'
import { ConfirmDialog, Sheet } from '../components/Sheet'
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
  const [clearing, setClearing] = useState<{ name: string; ids: string[] } | null>(null)
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
    return [...map.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'pt'))
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
    <div className="flex flex-1 flex-col">
      <Header
        title="Pagamentos em atraso"
        subtitle={`De épocas anteriores · a cobrar em ${season.label}`}
        onBack={() => navigate(-1)}
      />

      <div className="flex flex-col gap-3.5 px-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Por cobrar" value={formatEuro(openTotal)} tone="alert" />
          <StatTile label="Já recebido" value={formatEuro(settledTotal)} tone="ok" />
        </div>

        {season.carriedDebts.length === 0 ? (
          <div className="card-flat px-6 py-12 text-center">
            <p className="text-[14px] font-semibold">Sem atrasados nesta época</p>
            <p className="mt-1 text-[13px] text-muted">
              Ao criar uma época nova podes transportar os meses por pagar da anterior.
            </p>
          </div>
        ) : (
          grouped.map((g) => (
            <section key={g.name + g.debts[0].id} className="card overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 pt-4">
                <h2 className="min-w-0 flex-1 truncate text-[15px] font-bold tracking-tight">{g.name}</h2>
                <button
                  onClick={() => setClearing({ name: g.name, ids: g.debts.map((d) => d.id) })}
                  className="shrink-0 text-[11px] font-semibold text-muted"
                >
                  Apagar todas
                </button>
                <span className="shrink-0 rounded-full bg-brand-red/10 px-2.5 py-1 text-[12px] font-bold text-danger">
                  {formatEuro(g.total)}
                </span>
              </div>
              <ul className="mt-1 divide-y divide-line">
                {g.debts.map((d) => (
                  <li key={d.id} className="flex items-center gap-2 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium">{d.monthLabel}</p>
                      <p className="text-[11px] text-subtle">Época {d.fromSeasonLabel}</p>
                    </div>
                    <span className="shrink-0 text-[14px] font-semibold">{formatEuro(d.amount)}</span>
                    <button
                      onClick={() => openSettle(d)}
                      className="btn btn-primary shrink-0 px-3 py-1.5 text-[12px]"
                    >
                      Recebi
                    </button>
                    <button
                      onClick={() => removeDebt(d.id)}
                      aria-label="Remover dívida"
                      className="shrink-0 px-1 text-subtle"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}

        {settled.length > 0 && (
          <section className="card overflow-hidden">
            <h2 className="section-title px-4 pt-4">Já pagos</h2>
            <ul className="mt-1 divide-y divide-line">
              {settled.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">{d.playerName}</p>
                    <p className="text-[11px] text-subtle">
                      {d.monthLabel} ({d.fromSeasonLabel}) · entrou em{' '}
                      {monthLabel(season, d.settled!.month)} ·{' '}
                      {methodLabel(d.settled!.method).toLowerCase()}
                    </p>
                  </div>
                  <span className="shrink-0 text-[14px] font-semibold text-ok">
                    {formatEuro(d.settled!.amount)}
                  </span>
                  <button
                    onClick={() => unsettleDebt(d.id)}
                    className="shrink-0 text-[12px] font-semibold text-danger"
                  >
                    Anular
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="card card-glass p-4">
          <button
            onClick={() => {
              setNewPlayerId(sortedPlayers[0]?.id ?? '')
              setNewLabel('')
              setNewAmount(amountToInput(season.monthlyFee))
              setShowAdd(true)
            }}
            className="btn btn-soft w-full"
          >
            Adicionar atraso à mão
          </button>
          <p className="mt-3 text-[12px] leading-relaxed text-subtle">
            O mapa da época anterior não é alterado — fica o registo de que esse mês ficou por pagar
            nessa época. O dinheiro recebido entra na caixa desta época, no mês que escolheres.
          </p>
        </section>

        <div className="pb-2" />
      </div>

      {clearing && (
        <ConfirmDialog
          title={`Apagar os atrasados de ${clearing.name}?`}
          description={`Deixa de haver ${clearing.ids.length} mensalidade${clearing.ids.length === 1 ? '' : 's'} por cobrar a este jogador. Usa isto quando ele afinal não devia nada — por exemplo, se só entrou para o grupo esta época.`}
          confirmLabel="Apagar"
          onClose={() => setClearing(null)}
          onConfirm={() => {
            clearing.ids.forEach((id) => removeDebt(id))
            setClearing(null)
          }}
        />
      )}

      {showAdd && (
        <Sheet
          title="Novo atraso"
          onClose={() => setShowAdd(false)}
          footer={
            <>
              <button onClick={() => setShowAdd(false)} className="btn btn-soft flex-1">
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
                className="btn btn-primary flex-1"
              >
                Adicionar
              </button>
            </>
          }
        >
          <label className="mb-3 block">
            <span className="label">Jogador</span>
            <select
              value={newPlayerId}
              onChange={(e) => setNewPlayerId(e.target.value)}
              className="field"
            >
              {sortedPlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <label className="min-w-0 flex-1">
              <span className="label">Mês em falta</span>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Ex: Mai 2026"
                className="field"
              />
            </label>
            <label className="w-24 shrink-0">
              <span className="label">Valor</span>
              <input
                type="text"
                inputMode="decimal"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="€"
                className="field"
              />
            </label>
          </div>
        </Sheet>
      )}

      {settling && (
        <Sheet
          title={settling.playerName}
          subtitle={`${settling.monthLabel} · época ${settling.fromSeasonLabel}`}
          onClose={() => setSettling(null)}
          footer={
            <>
              <button onClick={() => setSettling(null)} className="btn btn-soft flex-1">
                Cancelar
              </button>
              <button
                onClick={() => {
                  const value = parseAmount(amount)
                  if (!value) return
                  settleDebt(settling.id, { month, method, amount: value })
                  setSettling(null)
                }}
                className="btn btn-primary flex-1"
              >
                Registar
              </button>
            </>
          }
        >
          <label className="mb-3 block">
            <span className="label">Valor recebido</span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="field"
            />
          </label>

          <div className="mb-3">
            <span className="label">Como pagou</span>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setMethod(key)}
                  className={`btn px-1 text-[12px] ${
                    method === key ? 'btn-primary' : 'btn-soft text-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="label">Mês em que entrou na caixa</span>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value as MonthKey)}
              className="field"
            >
              {months.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label} {m.year}
                </option>
              ))}
            </select>
          </label>
        </Sheet>
      )}
    </div>
  )
}
