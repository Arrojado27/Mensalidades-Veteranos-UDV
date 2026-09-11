import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { useData } from '../lib/DataContext'
import { formatDinnerDate, formatEuro, seasonDinnerTotals, sortedDinners, summarizeDinner } from '../lib/calc'

function todayISO() {
  const d = new Date()
  const offset = d.getTimezoneOffset()
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10)
}

export function Dinners() {
  const { season, addDinner } = useData()
  const navigate = useNavigate()
  const [showAdd, setShowAdd] = useState(false)
  const [date, setDate] = useState(todayISO())
  const [opponent, setOpponent] = useState('')

  const dinners = useMemo(() => sortedDinners(season), [season])
  const totals = useMemo(() => seasonDinnerTotals(season), [season])

  return (
    <div className="flex flex-1 flex-col pb-4">
      <Header title="Jantares" subtitle={`Época ${season.label} · ${season.dinnerPlayerFee}€ jogador · ${season.dinnerGuestFee}€ convidado`} />

      <div className="flex flex-col gap-4 px-4 pt-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-black/[0.06] p-3 dark:border-white/10">
            <p className="text-[11px] font-medium uppercase text-black/40 dark:text-white/40">Recebido</p>
            <p className="mt-0.5 text-[17px] font-bold text-emerald-600">{formatEuro(totals.received)}</p>
          </div>
          <div className="rounded-2xl border border-black/[0.06] p-3 dark:border-white/10">
            <p className="text-[11px] font-medium uppercase text-black/40 dark:text-white/40">Em falta</p>
            <p className="mt-0.5 text-[17px] font-bold text-brand-red">{formatEuro(totals.missing)}</p>
          </div>
          <div className="rounded-2xl border border-black/[0.06] p-3 dark:border-white/10">
            <p className="text-[11px] font-medium uppercase text-black/40 dark:text-white/40">Custo</p>
            <p className="mt-0.5 text-[17px] font-bold">{formatEuro(totals.cost)}</p>
          </div>
        </div>

        <ul className="flex flex-col gap-2">
          {dinners.map((d) => {
            const s = summarizeDinner(d)
            return (
              <li key={d.id}>
                <button
                  onClick={() => navigate(`/jantares/${d.id}`)}
                  className="w-full rounded-2xl border border-black/[0.06] p-4 text-left dark:border-white/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold">vs {d.opponent || 'Adversário a definir'}</p>
                      <p className="text-[12px] text-black/50 dark:text-white/50">{formatDinnerDate(d.date)}</p>
                    </div>
                    {s.missing > 0 ? (
                      <span className="shrink-0 rounded-full bg-brand-red/10 px-2.5 py-1 text-[11px] font-bold text-brand-red">
                        falta {formatEuro(s.missing)}
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                        tudo pago
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-black/50 dark:text-white/50">
                    <span>
                      {s.players} jogador{s.players === 1 ? '' : 'es'} · {s.guests} convidado
                      {s.guests === 1 ? '' : 's'}
                    </span>
                    <span>
                      {formatEuro(s.received)} / {formatEuro(s.expected)}
                    </span>
                    {d.cost != null && <span>custo {formatEuro(d.cost)}</span>}
                  </div>
                </button>
              </li>
            )
          })}
          {dinners.length === 0 && (
            <li className="rounded-2xl border border-dashed border-black/10 py-10 text-center text-sm text-black/40 dark:border-white/15 dark:text-white/40">
              Ainda não há jantares nesta época.
              <br />
              Toca no + para criar o primeiro.
            </li>
          )}
        </ul>
      </div>

      <button
        onClick={() => {
          setDate(todayISO())
          setOpponent('')
          setShowAdd(true)
        }}
        className="fixed bottom-24 right-4 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-brand-red text-2xl font-bold text-white shadow-lg active:scale-95"
        aria-label="Novo jantar"
      >
        +
      </button>

      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="w-full max-w-[480px] rounded-t-3xl bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-2xl dark:bg-[#221f20]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-black/10 dark:bg-white/15" />
            <h2 className="mb-3 text-lg font-bold">Novo jantar</h2>
            <label className="mb-3 block text-sm">
              <span className="mb-1 block text-black/50 dark:text-white/50">Data</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-[15px] outline-none focus:border-brand-red dark:border-white/15 dark:bg-white/5"
              />
            </label>
            <label className="mb-4 block text-sm">
              <span className="mb-1 block text-black/50 dark:text-white/50">Equipa adversária</span>
              <input
                autoFocus
                type="text"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="Ex: Sporting de Alenquer"
                className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-[15px] outline-none focus:border-brand-red dark:border-white/15 dark:bg-white/5"
              />
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 rounded-xl bg-black/[0.04] py-3 text-sm font-semibold text-black/60 dark:bg-white/10 dark:text-white/60"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!date) return
                  const id = addDinner({ date, opponent: opponent.trim() })
                  setShowAdd(false)
                  navigate(`/jantares/${id}`)
                }}
                className="flex-1 rounded-xl bg-brand-red py-3 text-sm font-semibold text-white active:bg-brand-red-dark"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
