import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, Header, StatTile } from '../components/Header'
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
  // Por ordem alfabética: é assim que se percorre o grupo a cobrar.
  const pending = useMemo(
    () => [...summary.pending].sort((a, b) => a.name.localeCompare(b.name, 'pt')),
    [summary.pending],
  )
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
          <div className="card card-glass border-brand-gold/30 bg-brand-gold/10 px-4 py-3 text-[13px] leading-relaxed">
            A época {season.label} terminou. Cria a nova época em{' '}
            <Link to="/definicoes" className="font-semibold text-danger underline">
              Definições
            </Link>
            .
          </div>
        )}

        {/* Saldo — o número que o tesoureiro quer ver primeiro. */}
        <div className="accent-card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-subtle">
            Saldo em caixa
          </p>
          <p className="mt-1.5 text-[34px] font-extrabold leading-none tracking-tight">
            {formatEuro(balance)}
          </p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {([
              ['Mensalidades', totals.totalReceived, FeeIcon],
              ['Jantares', totals.dinnersReceived, DinnerIcon],
              ['Saídas', totals.totalExpenses, OutIcon],
            ] as const).map(([label, value, Icon]) => (
              <div key={label}>
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-subtle">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </p>
                <p className="mt-1 text-[15px] font-bold tracking-tight">{formatEuro(value)}</p>
              </div>
            ))}
          </div>
        </div>

        {debtsCount > 0 && (
          <Link to="/atrasados" className="accent-card accent-card-warn flex items-center gap-3 px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-bold leading-tight text-brand-gold-dark dark:text-brand-gold">
                Atrasados de épocas anteriores
              </p>
              <p className="mt-0.5 text-[12px] text-muted">
                {debtsCount} mensalidade{debtsCount === 1 ? '' : 's'} por cobrar
              </p>
            </div>
            <span className="shrink-0 text-[16px] font-extrabold text-brand-gold-dark dark:text-brand-gold">
              {formatEuro(debtsTotal)}
            </span>
          </Link>
        )}

        {/* Mês atual: quem falta, com um toque para marcar. */}
        <section className="card card-glass overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4">
            <div>
              <h2 className="text-[16px] font-bold tracking-tight">
                {referenceInfo.long} {referenceInfo.year}
              </h2>
              <p className="text-[12px] text-muted">
                {summary.paid.length} de {total} pagaram · {formatEuro(summary.totalReceived)}
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${
                progressPct === 100 ? 'bg-ok-soft text-ok' : 'bg-danger-soft text-danger'
              }`}
            >
              {progressPct}%
            </span>
          </div>

          {summary.pending.length > 0 && (
            <p className="mt-2 px-4 text-[11px] text-subtle">
              "Pago" regista logo com a forma habitual do jogador · toca no nome para escolher outra.
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
              {pending.map((p, index) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                  <button
                    onClick={() => setEditing({ player: p, month: referenceMonth })}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <Avatar name={p.name} index={index} />
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-semibold">{p.name}</span>
                      <span className="block text-[11px] text-subtle">
                        {formatEuro(season.monthlyFee)}
                      </span>
                    </span>
                  </button>
                  <button
                    onClick={() =>
                      setPayment(p.id, referenceMonth, {
                        status: 'paid',
                        method: mostUsedMethod(p),
                      })
                    }
                    className="btn btn-pay shrink-0 px-4 py-2 text-[12px]"
                  >
                    Pago
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {lastDinner && (
          <Link to={`/jantares/${lastDinner.id}`} className="card card-glass flex items-center gap-3 p-4">
            <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-2xl bg-ink/[0.06] leading-none ring-1 ring-line">
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
              <span className="shrink-0 rounded-full bg-brand-red/10 px-2.5 py-1 text-[11px] font-bold text-danger">
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

        <Link to="/jogadores" className="btn btn-soft mb-2 w-full text-danger">
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

function FeeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3 10h18" />
    </svg>
  )
}

function DinnerIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 3v6a2 2 0 0 0 4 0V3" />
      <path d="M7 9v12" />
      <path d="M17.5 3c-1.4 1.6-2.3 3.5-2.3 5.7 0 1.6.8 2.8 2.3 2.8H19V3z" />
      <path d="M18 11.5V21" />
    </svg>
  )
}

function OutIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 12h12" />
      <path d="m12 7 5 5-5 5" />
      <path d="M20 4v16" />
    </svg>
  )
}

const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function monthAbbr(isoDate: string) {
  const index = Number(isoDate.slice(5, 7)) - 1
  return MONTH_ABBR[index] ?? ''
}
