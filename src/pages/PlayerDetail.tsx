import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Header, StatTile } from '../components/Header'
import { MonthChip } from '../components/MonthChip'
import { PaymentEditorModal } from '../components/PaymentEditorModal'
import { ConfirmDialog, Sheet } from '../components/Sheet'
import { useData } from '../lib/DataContext'
import { amountForEntry, attendeeFee, formatDinnerDate, formatEuro, seasonMonths } from '../lib/calc'
import type { MonthKey } from '../types'

export function PlayerDetail() {
  const { playerId } = useParams()
  const navigate = useNavigate()
  const { season, setPayment, updatePlayer, removePlayer } = useData()
  const [editingMonth, setEditingMonth] = useState<MonthKey | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showJoinMonth, setShowJoinMonth] = useState(false)

  const months = useMemo(() => seasonMonths(season), [season])
  const player = season.players.find((p) => p.id === playerId)

  const dinners = useMemo(() => {
    if (!player) return []
    return season.dinners
      .map((d) => ({ dinner: d, attendee: d.attendees.find((a) => a.playerId === player.id) }))
      .filter((x) => x.attendee)
      .sort((a, b) => b.dinner.date.localeCompare(a.dinner.date))
  }, [season.dinners, player])

  if (!player) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted">Jogador não encontrado.</p>
        <button onClick={() => navigate('/jogadores')} className="text-sm font-semibold text-brand-red">
          Voltar à lista
        </button>
      </div>
    )
  }

  const totalPaid = months.reduce((sum, m) => {
    const entry = player.payments[m.key]
    return sum + amountForEntry(entry?.status ?? 'pending', entry?.amount, season.monthlyFee)
  }, 0)
  const pendingMonths = months.filter((m) => (player.payments[m.key]?.status ?? 'pending') === 'pending')
  const dinnersOwed = dinners
    .filter((x) => !x.attendee!.paid)
    .reduce((sum, x) => sum + attendeeFee(x.dinner, x.attendee!), 0)

  return (
    <div className="flex flex-1 flex-col">
      <Header
        title={player.name}
        subtitle={`Época ${season.label}`}
        onBack={() => navigate(-1)}
        badge={player.active ? undefined : 'saiu'}
      />

      <div className="flex flex-col gap-3.5 px-4 pt-4">
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="Pago" value={formatEuro(totalPaid)} tone="ok" />
          <StatTile label="Em falta" value={String(pendingMonths.length)} hint="meses" tone="alert" />
          <StatTile label="Jantares" value={formatEuro(dinnersOwed)} hint="por pagar" tone={dinnersOwed > 0 ? 'alert' : 'neutral'} />
        </div>

        <label className="card flex items-center justify-between px-4 py-3">
          <span className="text-[14px] font-medium">No grupo atualmente</span>
          <input
            type="checkbox"
            checked={player.active}
            onChange={(e) => updatePlayer(player.id, { active: e.target.checked })}
            className="h-5 w-5 accent-[#a41f24]"
          />
        </label>

        <button onClick={() => setShowJoinMonth(true)} className="btn btn-soft w-full">
          Entrou a meio da época
        </button>

        <section className="card overflow-hidden">
          <h2 className="section-title px-4 pt-4">Mensalidades</h2>
          <ul className="mt-1 divide-y divide-line">
            {months.map((m) => {
              const entry = player.payments[m.key]
              const paid = entry?.status === 'paid'
              return (
                <li key={m.key} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <button
                    onClick={() => setEditingMonth(m.key)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block text-[14px] font-semibold">
                      {m.label} {m.year}
                    </span>
                    <span className="block truncate text-[12px] text-muted">
                      {paid
                        ? formatEuro(amountForEntry('paid', entry?.amount, season.monthlyFee))
                        : entry?.status === 'exempt'
                          ? 'Isento'
                          : 'Por pagar'}
                      {entry?.note ? ` · ${entry.note}` : ''}
                    </span>
                  </button>
                  <MonthChip
                    entry={entry}
                    size="md"
                    label={`${m.label}: alterar`}
                    onClick={() => setEditingMonth(m.key)}
                  />
                </li>
              )
            })}
          </ul>
        </section>

        {dinners.length > 0 && (
          <section className="card overflow-hidden">
            <h2 className="section-title px-4 pt-4">Jantares</h2>
            <ul className="mt-1 divide-y divide-line">
              {dinners.map(({ dinner, attendee }) => (
                <li key={dinner.id} className="flex items-center gap-3 px-4 py-2.5">
                  <button
                    onClick={() => navigate(`/jantares/${dinner.id}`)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-[14px] font-semibold">
                      vs {dinner.opponent || 'adversário'}
                    </span>
                    <span className="block text-[12px] text-muted">{formatDinnerDate(dinner.date)}</span>
                  </button>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      attendee!.paid ? 'bg-ok-soft text-ok' : 'bg-brand-red/10 text-brand-red'
                    }`}
                  >
                    {attendee!.paid ? 'pago' : formatEuro(attendeeFee(dinner, attendee!))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <button onClick={() => setConfirmDelete(true)} className="btn btn-danger mb-2 w-full">
          Remover jogador
        </button>
      </div>

      {showJoinMonth && (
        <Sheet
          title="A partir de que mês paga?"
          subtitle="Os meses anteriores ficam isentos — não entram em falta nem passam a dívida na época seguinte. Meses já pagos não são tocados."
          onClose={() => setShowJoinMonth(false)}
          scroll
        >
          <ul className="flex flex-col gap-1.5">
            {months.map((m, index) => (
              <li key={m.key}>
                <button
                  onClick={() => {
                    months.forEach((other, otherIndex) => {
                      const entry = player.payments[other.key]
                      if (entry?.status === 'paid') return
                      if (otherIndex < index) {
                        setPayment(player.id, other.key, { status: 'exempt' })
                      } else if (entry?.status === 'exempt') {
                        setPayment(player.id, other.key, { status: 'pending' })
                      }
                    })
                    setShowJoinMonth(false)
                  }}
                  className="flex w-full items-center justify-between rounded-2xl bg-ink/[0.03] px-3.5 py-3 text-left"
                >
                  <span className="text-[14px] font-semibold">
                    {m.label} {m.year}
                  </span>
                  <span className="text-[11px] text-subtle">
                    {index === 0 ? 'desde o início' : `isenta ${index} ${index === 1 ? 'mês' : 'meses'}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
      )}

      {editingMonth && (
        <PaymentEditorModal
          playerName={player.name}
          monthLabel={`${months.find((m) => m.key === editingMonth)?.label} ${months.find((m) => m.key === editingMonth)?.year}`}
          fee={season.monthlyFee}
          entry={player.payments[editingMonth]}
          onClose={() => setEditingMonth(null)}
          onSave={(entry) => {
            setPayment(player.id, editingMonth, entry)
            setEditingMonth(null)
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={`Remover ${player.name}?`}
          description="Todo o histórico de mensalidades deste jogador nesta época será apagado. Esta ação não pode ser desfeita."
          confirmLabel="Remover"
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => {
            removePlayer(player.id)
            navigate('/jogadores')
          }}
        />
      )}
    </div>
  )
}
