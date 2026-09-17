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
  const { season, settleDebt, settleDebts, unsettleDebt, removeDebt, addDebt } = useData()
  const navigate = useNavigate()
  const [settling, setSettling] = useState<{ name: string; debts: CarriedDebt[] } | null>(null)
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

  /**
   * A ordem e a lista ficam presas ao que estava por cobrar quando o ecrã abriu:
   * marcar um mês como pago não faz saltar aquilo em que se está a tocar. Só ao
   * sair e voltar é que a lista se reorganiza.
   */
  const [frozen] = useState(() => {
    const totals = new Map<string, { name: string; total: number }>()
    const initial = openDebts(season)
    for (const d of initial) {
      const entry = totals.get(d.playerId) ?? { name: d.playerName, total: 0 }
      entry.total += d.amount
      totals.set(d.playerId, entry)
    }
    return {
      ids: new Set(initial.map((d) => d.id)),
      order: [...totals.entries()]
        .sort((a, b) => b[1].total - a[1].total || a[1].name.localeCompare(b[1].name, 'pt'))
        .map(([playerId]) => playerId),
    }
  })

  const grouped = useMemo(() => {
    const map = new Map<string, { playerId: string; name: string; debts: CarriedDebt[]; total: number }>()
    for (const d of season.carriedDebts) {
      // Mantém à vista as que já estavam abertas ao abrir o ecrã, mesmo depois
      // de pagas; as pagas de outras vezes ficam só na secção "Já pagos".
      if (d.settled && !frozen.ids.has(d.id)) continue
      const entry = map.get(d.playerId) ?? {
        playerId: d.playerId,
        name: d.playerName,
        debts: [],
        total: 0,
      }
      entry.debts.push(d)
      if (!d.settled) entry.total += d.amount
      map.set(d.playerId, entry)
    }
    const rank = (playerId: string) => {
      const index = frozen.order.indexOf(playerId)
      return index === -1 ? frozen.order.length : index
    }
    return [...map.values()].sort(
      (a, b) => rank(a.playerId) - rank(b.playerId) || a.name.localeCompare(b.name, 'pt'),
    )
  }, [season.carriedDebts, frozen])

  const sortedPlayers = useMemo(
    () => [...season.players].sort((a, b) => a.name.localeCompare(b.name, 'pt')),
    [season.players],
  )

  function openSettle(name: string, debts: CarriedDebt[]) {
    if (debts.length === 0) return
    setSettling({ name, debts })
    setAmount(amountToInput(debts[0].amount))
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
                  onClick={() =>
                    setClearing({
                      name: g.name,
                      ids: g.debts.filter((d) => !d.settled).map((d) => d.id),
                    })
                  }
                  className="shrink-0 text-[11px] font-semibold text-muted"
                >
                  Apagar
                </button>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold ${
                    g.total > 0 ? 'bg-danger-soft text-danger' : 'bg-ok-soft text-ok'
                  }`}
                >
                  {g.total > 0 ? formatEuro(g.total) : 'tudo pago'}
                </span>
              </div>

              {g.debts.filter((d) => !d.settled).length > 1 && (
                <button
                  onClick={() =>
                    openSettle(
                      g.name,
                      g.debts.filter((d) => !d.settled),
                    )
                  }
                  className="btn btn-primary mx-4 mt-3 w-[calc(100%-2rem)]"
                >
                  Recebi tudo · {formatEuro(g.total)}
                </button>
              )}
              <ul className="mt-1 divide-y divide-line">
                {g.debts.map((d) => (
                  <li key={d.id} className="flex items-center gap-2 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-[14px] font-medium ${d.settled ? 'text-muted' : ''}`}>
                        {d.monthLabel}
                      </p>
                      <p className="text-[11px] text-subtle">
                        {d.settled
                          ? `Recebido · entrou em ${monthLabel(season, d.settled.month)}`
                          : `Época ${d.fromSeasonLabel}`}
                      </p>
                    </div>
                    <span className={`shrink-0 text-[14px] font-semibold ${d.settled ? 'text-ok' : ''}`}>
                      {formatEuro(d.settled?.amount ?? d.amount)}
                    </span>
                    {d.settled ? (
                      <button
                        onClick={() => unsettleDebt(d.id)}
                        aria-label={`Anular pagamento de ${d.monthLabel}`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ok-soft text-[14px] font-bold text-ok ring-1 ring-ok/35"
                      >
                        ✓
                      </button>
                    ) : (
                      <button
                        onClick={() => openSettle(g.name, [d])}
                        className="btn btn-primary shrink-0 px-3 py-1.5 text-[12px]"
                      >
                        Recebi
                      </button>
                    )}
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
          title={settling.name}
          subtitle={
            settling.debts.length === 1
              ? `${settling.debts[0].monthLabel} · época ${settling.debts[0].fromSeasonLabel}`
              : `${settling.debts.length} mensalidades · ${settling.debts
                  .map((d) => d.monthLabel)
                  .join(', ')}`
          }
          onClose={() => setSettling(null)}
          footer={
            <>
              <button onClick={() => setSettling(null)} className="btn btn-soft flex-1">
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (settling.debts.length === 1) {
                    const value = parseAmount(amount)
                    if (!value) return
                    settleDebt(settling.debts[0].id, { month, method, amount: value })
                  } else {
                    settleDebts(
                      settling.debts.map((d) => d.id),
                      { month, method },
                    )
                  }
                  setSettling(null)
                }}
                className="btn btn-primary flex-1"
              >
                Registar
              </button>
            </>
          }
        >
          {settling.debts.length === 1 ? (
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
          ) : (
            <div className="card-flat mb-3 flex items-center justify-between p-3">
              <span className="text-[13px] text-muted">Total a receber</span>
              <span className="text-[17px] font-bold">
                {formatEuro(settling.debts.reduce((sum, d) => sum + d.amount, 0))}
              </span>
            </div>
          )}

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
