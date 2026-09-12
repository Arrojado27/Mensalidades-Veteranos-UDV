import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Header, StatTile } from '../components/Header'
import { PaymentEditorModal } from '../components/PaymentEditorModal'
import { useData } from '../lib/DataContext'
import {
  computeLedgerBalance,
  formatDinnerDate,
  formatEuro,
  getCurrentMonthKey,
  monthIndex,
  monthInfo,
  mostUsedMethod,
  openDebts,
  openDebtsTotal,
  seasonTotals,
  sortedDinners,
  summarizeDinner,
  summarizeMonth,
} from '../lib/calc'
import { MONTH_KEYS } from '../types'
import type { MonthKey, Player } from '../types'

export function Dashboard() {
  const { season, setPayment } = useData()
  const [editing, setEditing] = useState<{ player: Player; month: MonthKey } | null>(null)

  const currentMonthKey = getCurrentMonthKey(season)
  const referenceMonth = currentMonthKey ?? MONTH_KEYS[MONTH_KEYS.length - 1]
  const referenceInfo = monthInfo(season, referenceMonth)
  const summary = useMemo(() => summarizeMonth(season, referenceMonth), [season, referenceMonth])
  const balance = useMemo(() => computeLedgerBalance(season, referenceMonth), [season, referenceMonth])
  const totals = useMemo(() => seasonTotals(season), [season])
  const debtsTotal = useMemo(() => openDebtsTotal(season), [season])
  const debtsCount = useMemo(() => openDebts(season).length, [season])
  const lastDinner = useMemo(() => sortedDinners(season)[0], [season])

  const seasonEnded = currentMonthKey === null && monthIndex(referenceMonth) === MONTH_KEYS.length - 1
  const total = summary.paid.length + summary.pending.length
  const progressPct = total === 0 ? 100 : Math.round((summary.paid.length / total) * 100)

  return (
    <div className="flex flex-1 flex-col">
      <Header
        title="Veteranos U.D.V."
        subtitle={`Época ${season.label}`}
        badge={`${referenceInfo.label} ${referenceInfo.year}`}
      />

      <div className="flex flex-1 flex-col gap-3.5 px-4 pt-4">
        {seasonEnded && (
          <div className="card border-brand-gold/30 bg-brand-gold/10 px-4 py-3 text-[13px] leading-relaxed">
            A época {season.label} terminou. Cria a nova época em{' '}
            <Link to="/definicoes" className="font-semibold text-brand-red underline">
              Definições
            </Link>
            .
          </div>
        )}

        {/* Saldo — o número que o tesoureiro quer ver primeiro. */}
        <div className="app-header rounded-[22px] p-5 shadow-lg">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/70">
            Saldo em caixa
          </p>
          <p className="mt-1 text-[38px] font-extrabold leading-none tracking-tight">
            {formatEuro(balance)}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              ['Mensalidades', totals.totalReceived],
              ['Jantares', totals.dinnersReceived],
              ['Saídas', totals.totalExpenses],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-2xl bg-white/12 px-2.5 py-2 ring-1 ring-white/15">
                <p className="text-[10px] font-medium uppercase tracking-wide text-white/65">{label}</p>
                <p className="mt-0.5 text-[13px] font-bold">{formatEuro(value as number)}</p>
              </div>
            ))}
          </div>
        </div>

        {debtsCount > 0 && (
          <Link
            to="/atrasados"
            className="card flex items-center gap-3 border-brand-red/25 bg-brand-red/[0.06] px-4 py-3.5"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-red/12 text-[15px] font-bold text-brand-red">
              !
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-bold leading-tight text-brand-red">
                Atrasados de épocas anteriores
              </p>
              <p className="mt-0.5 text-[12px] text-muted">
                {debtsCount} mensalidade{debtsCount === 1 ? '' : 's'} por cobrar
              </p>
            </div>
            <span className="shrink-0 text-[16px] font-extrabold text-brand-red">
              {formatEuro(debtsTotal)}
            </span>
          </Link>
        )}

        {/* Mês atual: quem falta, com um toque para marcar. */}
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4">
            <div>
              <h2 className="text-[15px] font-bold tracking-tight">
                {referenceInfo.label} {referenceInfo.year}
              </h2>
              <p className="text-[12px] text-muted">
                {summary.paid.length} de {total} pagaram · {formatEuro(summary.totalReceived)}
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${
                progressPct === 100 ? 'bg-ok-soft text-ok' : 'bg-brand-red/10 text-brand-red'
              }`}
            >
              {progressPct}%
            </span>
          </div>

          {summary.pending.length > 0 && (
            <p className="mt-2 px-4 text-[11px] text-subtle">
              "Pagou" marca logo com a forma habitual do jogador · toca no nome para escolher outra.
            </p>
          )}

          <div className="mx-4 mt-3 h-1.5 overflow-hidden rounded-full bg-ink/[0.07]">
            <div
              className="h-full rounded-full bg-ok transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {summary.pending.length === 0 ? (
            <p className="px-4 py-5 text-center text-[13px] text-muted">
              Está tudo pago este mês. 🎉
            </p>
          ) : (
            <ul className="mt-1 divide-y divide-line">
              {summary.pending.map((p) => (
                <li key={p.id} className="flex items-center gap-2 px-4 py-2.5">
                  <button
                    onClick={() => setEditing({ player: p, month: referenceMonth })}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-[14px] font-medium">{p.name}</span>
                    <span className="block text-[11px] text-subtle">
                      {formatEuro(season.monthlyFee)}
                    </span>
                  </button>
                  <button
                    onClick={() =>
                      setPayment(p.id, referenceMonth, {
                        status: 'paid',
                        method: mostUsedMethod(p),
                      })
                    }
                    className="btn btn-primary shrink-0 px-3.5 py-2 text-[12px]"
                  >
                    Pagou
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {lastDinner && (
          <Link to={`/jantares/${lastDinner.id}`} className="card flex items-center gap-3 p-4">
            <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-2xl bg-brand-red/10 leading-none text-brand-red">
              <span className="text-[15px] font-extrabold">{lastDinner.date.slice(8, 10)}</span>
              <span className="text-[9px] font-bold uppercase">{monthAbbr(lastDinner.date)}</span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">
                Último jantar
              </p>
              <p className="truncate text-[14px] font-bold">
                vs {lastDinner.opponent || 'adversário a definir'}
              </p>
              <p className="text-[12px] text-muted">
                {formatDinnerDate(lastDinner.date)} ·{' '}
                {summarizeDinner(lastDinner).players + summarizeDinner(lastDinner).guests} presenças
              </p>
            </div>
            {summarizeDinner(lastDinner).missing > 0 && (
              <span className="shrink-0 rounded-full bg-brand-red/10 px-2.5 py-1 text-[11px] font-bold text-brand-red">
                falta {formatEuro(summarizeDinner(lastDinner).missing)}
              </span>
            )}
          </Link>
        )}

        <div className="grid grid-cols-2 gap-3">
          <StatTile
            label="No grupo"
            value={String(season.players.filter((p) => p.active).length)}
            hint="jogadores ativos"
          />
          <StatTile
            label="Por receber"
            value={formatEuro(Math.max(0, summary.totalExpected - summary.totalReceived))}
            hint="este mês"
            tone="alert"
          />
        </div>

        <Link to="/jogadores" className="btn btn-soft mb-2 w-full text-brand-red">
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

const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function monthAbbr(isoDate: string) {
  const index = Number(isoDate.slice(5, 7)) - 1
  return MONTH_ABBR[index] ?? ''
}
