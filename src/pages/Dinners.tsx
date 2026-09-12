import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header, StatTile } from '../components/Header'
import { Sheet } from '../components/Sheet'
import { useData } from '../lib/DataContext'
import {
  formatEuro,
  seasonDinnerTotals,
  sortedDinners,
  summarizeDinner,
} from '../lib/calc'

const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function todayISO() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
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
    <div className="flex flex-1 flex-col">
      <Header
        title="Jantares"
        subtitle={`${season.dinnerPlayerFee}€ jogador · ${season.dinnerGuestFee}€ convidado`}
        badge={`${dinners.length}`}
      />

      <div className="flex flex-col gap-3.5 px-4 pt-4">
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="Recebido" value={formatEuro(totals.received)} tone="ok" />
          <StatTile label="Em falta" value={formatEuro(totals.missing)} tone="alert" />
          <StatTile label="Custo" value={formatEuro(totals.cost)} />
        </div>

        <ul className="flex flex-col gap-2.5">
          {dinners.map((d) => {
            const s = summarizeDinner(d)
            const pct = s.expected === 0 ? 0 : Math.round((s.received / s.expected) * 100)
            return (
              <li key={d.id}>
                <button
                  onClick={() => navigate(`/jantares/${d.id}`)}
                  className="card w-full overflow-hidden p-4 text-left"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-ink/[0.06] leading-none ring-1 ring-line">
                      <span className="text-[17px] font-extrabold">{d.date.slice(8, 10)}</span>
                      <span className="text-[9px] font-bold uppercase">
                        {MONTH_ABBR[Number(d.date.slice(5, 7)) - 1]}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold tracking-tight">
                        vs {d.opponent || 'Adversário a definir'}
                      </span>
                      <span className="block text-[12px] text-muted">
                        {s.players} jogador{s.players === 1 ? '' : 'es'}
                        {s.guests > 0 && ` · ${s.guests} convidado${s.guests === 1 ? '' : 's'}`}
                        {d.cost != null && ` · custo ${formatEuro(d.cost)}`}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        s.missing > 0 ? 'bg-brand-red/10 text-brand-red' : 'bg-ok-soft text-ok'
                      }`}
                    >
                      {s.missing > 0 ? `falta ${formatEuro(s.missing)}` : 'tudo pago'}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/[0.07]">
                      <span
                        className="block h-full rounded-full bg-ok transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold text-subtle">
                      {formatEuro(s.received)} / {formatEuro(s.expected)}
                    </span>
                  </div>
                </button>
              </li>
            )
          })}
          {dinners.length === 0 && (
            <li className="card-flat px-6 py-12 text-center">
              <p className="text-[14px] font-semibold">Ainda não há jantares nesta época</p>
              <p className="mt-1 text-[13px] text-muted">
                Toca no + para criar o primeiro: data e equipa adversária.
              </p>
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
        className="fixed bottom-28 right-4 z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-red text-2xl font-bold text-white shadow-[0_10px_24px_rgb(164_31_36_/_0.4)] transition-transform active:scale-95"
        aria-label="Novo jantar"
      >
        +
      </button>

      {showAdd && (
        <Sheet
          title="Novo jantar"
          subtitle="Depois apontas quem vai e quem já pagou."
          onClose={() => setShowAdd(false)}
          footer={
            <>
              <button onClick={() => setShowAdd(false)} className="btn btn-soft flex-1">
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!date) return
                  const id = addDinner({ date, opponent: opponent.trim() })
                  setShowAdd(false)
                  navigate(`/jantares/${id}`)
                }}
                className="btn btn-primary flex-1"
              >
                Criar
              </button>
            </>
          }
        >
          <label className="mb-3 block">
            <span className="label">Data</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field" />
          </label>
          <label className="block">
            <span className="label">Equipa adversária</span>
            <input
              autoFocus
              type="text"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              placeholder="Ex: Sporting de Alenquer"
              className="field"
            />
          </label>
        </Sheet>
      )}
    </div>
  )
}
