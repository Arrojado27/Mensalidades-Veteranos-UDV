import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../components/Header'
import { MonthChip } from '../components/MonthChip'
import { PaymentEditorModal } from '../components/PaymentEditorModal'
import { useData } from '../lib/DataContext'
import {
  computeLedgerBalance,
  formatEuro,
  getCurrentMonthKey,
  monthIndex,
  seasonTotals,
  summarizeMonth,
} from '../lib/calc'
import { SEASON_MONTHS } from '../types'
import type { MonthKey, Player } from '../types'

export function Dashboard() {
  const { season, setPayment } = useData()
  const [editing, setEditing] = useState<{ player: Player; month: MonthKey } | null>(null)

  const currentMonthKey = getCurrentMonthKey()
  const referenceMonth = currentMonthKey ?? SEASON_MONTHS[SEASON_MONTHS.length - 1].key
  const referenceInfo = SEASON_MONTHS.find((m) => m.key === referenceMonth)!
  const summary = useMemo(() => summarizeMonth(season, referenceMonth), [season, referenceMonth])
  const balance = useMemo(() => computeLedgerBalance(season, referenceMonth), [season, referenceMonth])
  const totals = useMemo(() => seasonTotals(season), [season])

  const seasonEnded = currentMonthKey === null && monthIndex(referenceMonth) === SEASON_MONTHS.length - 1
  const progressPct = summary.paid.length + summary.pending.length === 0
    ? 100
    : Math.round((summary.paid.length / (summary.paid.length + summary.pending.length)) * 100)

  return (
    <div className="flex flex-1 flex-col pb-4">
      <Header title="Veteranos U.D.V." subtitle={`Época ${season.label} · Mensalidades`} />

      <div className="flex flex-1 flex-col gap-4 px-4 pt-4">
        {seasonEnded && (
          <div className="rounded-2xl bg-brand-gold/15 px-4 py-3 text-sm text-brand-gold-dark ring-1 ring-brand-gold/30">
            A época {season.label} terminou. Quando estiveres pronto, cria a nova época em{' '}
            <Link to="/definicoes" className="underline font-semibold">
              Definições
            </Link>
            .
          </div>
        )}

        <div className="rounded-2xl bg-brand-red p-5 text-white shadow-md">
          <p className="text-[12px] font-medium uppercase tracking-wide text-white/70">
            Saldo em caixa (a {referenceInfo.label})
          </p>
          <p className="mt-1 text-3xl font-extrabold">{formatEuro(balance)}</p>
          <div className="mt-3 flex gap-4 text-[12px] text-white/80">
            <span>Recebido: {formatEuro(totals.totalReceived)}</span>
            <span>Despesas: {formatEuro(totals.totalExpenses)}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-black/[0.06] p-4 dark:border-white/10">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[15px] font-bold">
              {referenceInfo.label} {referenceInfo.year}
            </h2>
            <span className="text-[13px] font-medium text-black/50 dark:text-white/50">
              {summary.paid.length}/{summary.paid.length + summary.pending.length} pagaram
            </span>
          </div>
          <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {summary.pending.length === 0 ? (
            <p className="py-2 text-sm text-black/50 dark:text-white/50">
              Toda a gente pagou este mês. 🎉
            </p>
          ) : (
            <ul className="divide-y divide-black/[0.05] dark:divide-white/10">
              {summary.pending.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="truncate text-[14px] font-medium">{p.name}</span>
                  <MonthChip
                    entry={p.payments[referenceMonth]}
                    size="md"
                    onClick={() => setEditing({ player: p, month: referenceMonth })}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <Link
          to="/jogadores"
          className="rounded-2xl border border-black/[0.06] px-4 py-3 text-center text-sm font-semibold text-brand-red dark:border-white/10"
        >
          Ver todos os jogadores →
        </Link>
      </div>

      {editing && (
        <PaymentEditorModal
          playerName={editing.player.name}
          monthLabel={`${referenceInfo.label} ${referenceInfo.year}`}
          fee={season.monthlyFee}
          entry={editing.player.payments[editing.month]}
          onClose={() => setEditing(null)}
          onSave={(entry) => {
            setPayment(editing.player.id, editing.month, entry)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
