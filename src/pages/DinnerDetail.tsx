import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MoneyInput } from '../components/MoneyInput'
import { useData } from '../lib/DataContext'
import { attendeeFee, formatDinnerDate, formatEuro, monthLabel, monthKeyForDate, summarizeDinner } from '../lib/calc'
import { PAYMENT_METHODS, methodLabel } from '../types'
import type { DinnerAttendee } from '../types'

export function DinnerDetail() {
  const { dinnerId } = useParams()
  const navigate = useNavigate()
  const { season, updateDinner, removeDinner, addAttendees, updateAttendee, removeAttendee } = useData()

  const [showPlayerPicker, setShowPlayerPicker] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [guestName, setGuestName] = useState('')
  const [showGuest, setShowGuest] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const dinner = season.dinners.find((d) => d.id === dinnerId)

  const available = useMemo(() => {
    if (!dinner) return []
    const taken = new Set(dinner.attendees.map((a) => a.playerId).filter(Boolean))
    return season.players
      .filter((p) => p.active && !taken.has(p.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt'))
  }, [dinner, season.players])

  if (!dinner) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-black/50">Jantar não encontrado.</p>
        <button onClick={() => navigate('/jantares')} className="text-sm font-semibold text-brand-red">
          Voltar aos jantares
        </button>
      </div>
    )
  }

  const summary = summarizeDinner(dinner)
  const sortedAttendees = [...dinner.attendees].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'player' ? -1 : 1
    return a.name.localeCompare(b.name, 'pt')
  })

  function togglePaid(attendee: DinnerAttendee) {
    if (attendee.paid) {
      updateAttendee(dinner!.id, attendee.id, { paid: false, method: undefined })
    } else {
      updateAttendee(dinner!.id, attendee.id, { paid: true, method: attendee.method ?? 'cash' })
    }
  }

  return (
    <div className="flex flex-1 flex-col pb-4">
      <header className="flex items-center gap-3 bg-brand-red px-4 pb-4 pt-[calc(env(safe-area-inset-top)+16px)] text-white">
        <button onClick={() => navigate('/jantares')} className="text-2xl leading-none">
          ‹
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-bold leading-tight">
            vs {dinner.opponent || 'Adversário a definir'}
          </h1>
          <p className="text-[12px] text-white/80">
            {formatDinnerDate(dinner.date)} · conta em {monthLabel(season, monthKeyForDate(season, dinner.date))}
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-4 px-4 pt-4">
        <div className="rounded-2xl border border-black/[0.06] p-4 dark:border-white/10">
          <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-black/40 dark:text-white/40">
            Dados do jantar
          </h2>
          <div className="flex flex-col gap-3">
            <label className="block text-sm">
              <span className="mb-1 block text-black/50 dark:text-white/50">Data</span>
              <input
                type="date"
                value={dinner.date}
                onChange={(e) => updateDinner(dinner.id, { date: e.target.value })}
                className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-[15px] outline-none focus:border-brand-red dark:border-white/15 dark:bg-white/5"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-black/50 dark:text-white/50">Equipa adversária</span>
              <input
                type="text"
                value={dinner.opponent}
                onChange={(e) => updateDinner(dinner.id, { opponent: e.target.value })}
                placeholder="Nome da equipa"
                className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-[15px] outline-none focus:border-brand-red dark:border-white/15 dark:bg-white/5"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1 block text-black/50 dark:text-white/50">€ por jogador</span>
                <MoneyInput
                  value={dinner.playerFee}
                  onChange={(v) => updateDinner(dinner.id, { playerFee: v ?? 0 })}
                  className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-[15px] outline-none focus:border-brand-red dark:border-white/15 dark:bg-white/5"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-black/50 dark:text-white/50">€ por convidado</span>
                <MoneyInput
                  value={dinner.guestFee}
                  onChange={(v) => updateDinner(dinner.id, { guestFee: v ?? 0 })}
                  className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-[15px] outline-none focus:border-brand-red dark:border-white/15 dark:bg-white/5"
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block text-black/50 dark:text-white/50">
                Custo do jantar (restaurante) — opcional
              </span>
              <MoneyInput
                value={dinner.cost}
                onChange={(v) => updateDinner(dinner.id, { cost: v })}
                placeholder="€"
                ariaLabel="Custo do jantar"
                className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-[15px] outline-none focus:border-brand-red dark:border-white/15 dark:bg-white/5"
              />
              <span className="mt-1 block text-[12px] text-black/40 dark:text-white/40">
                Entra automaticamente nas despesas do mês do jantar.
              </span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-black/[0.06] p-3 dark:border-white/10">
            <p className="text-[11px] font-medium uppercase text-black/40 dark:text-white/40">Vão</p>
            <p className="mt-0.5 text-[17px] font-bold">{summary.players + summary.guests}</p>
            <p className="text-[11px] text-black/40 dark:text-white/40">
              {summary.players} jog · {summary.guests} conv
            </p>
          </div>
          <div className="rounded-2xl border border-black/[0.06] p-3 dark:border-white/10">
            <p className="text-[11px] font-medium uppercase text-black/40 dark:text-white/40">Recebido</p>
            <p className="mt-0.5 text-[17px] font-bold text-emerald-600">{formatEuro(summary.received)}</p>
          </div>
          <div className="rounded-2xl border border-black/[0.06] p-3 dark:border-white/10">
            <p className="text-[11px] font-medium uppercase text-black/40 dark:text-white/40">Falta</p>
            <p className="mt-0.5 text-[17px] font-bold text-brand-red">{formatEuro(summary.missing)}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-black/[0.06] dark:border-white/10">
          <div className="flex items-center justify-between px-4 pt-3.5">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-black/40 dark:text-white/40">
              Quem vai ao jantar
            </h2>
            <span className="text-[12px] text-black/40 dark:text-white/40">
              total {formatEuro(summary.expected)}
            </span>
          </div>
          <ul className="divide-y divide-black/[0.05] px-4 dark:divide-white/10">
            {sortedAttendees.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2.5">
                <button
                  onClick={() => togglePaid(a)}
                  aria-label={a.paid ? 'Marcar como não pago' : 'Marcar como pago'}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                    a.paid
                      ? 'bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-400'
                      : 'bg-black/[0.04] text-black/25 ring-1 ring-black/10 dark:bg-white/10 dark:text-white/25 dark:ring-white/15'
                  }`}
                >
                  {a.paid ? '✓' : ''}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold">{a.name}</p>
                  <p className="text-[11px] text-black/40 dark:text-white/40">
                    {a.kind === 'guest' ? 'Convidado' : 'Jogador'} · {formatEuro(attendeeFee(dinner, a))}
                    {a.paid && ` · ${methodLabel(a.method).toLowerCase()}`}
                  </p>
                </div>
                {a.paid && (
                  <div className="flex shrink-0 overflow-hidden rounded-lg ring-1 ring-black/10 dark:ring-white/15">
                    {PAYMENT_METHODS.map(({ key, short, label }) => (
                      <button
                        key={key}
                        onClick={() => updateAttendee(dinner.id, a.id, { method: key })}
                        aria-label={`${a.name} pagou por ${label}`}
                        className={`px-2 py-1 text-[11px] font-bold ${
                          (a.method ?? 'cash') === key
                            ? 'bg-brand-red text-white'
                            : 'text-black/40 dark:text-white/40'
                        }`}
                      >
                        {short}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => removeAttendee(dinner.id, a.id)}
                  aria-label={`Remover ${a.name} do jantar`}
                  className="shrink-0 text-black/25 dark:text-white/25"
                >
                  ✕
                </button>
              </li>
            ))}
            {sortedAttendees.length === 0 && (
              <li className="py-5 text-center text-sm text-black/40 dark:text-white/40">
                Ainda ninguém apontado para este jantar.
              </li>
            )}
          </ul>
          <div className="flex gap-2 px-4 py-3">
            <button
              onClick={() => {
                setPicked([])
                setShowPlayerPicker(true)
              }}
              className="flex-1 rounded-xl bg-brand-red py-2.5 text-sm font-semibold text-white"
            >
              + Jogadores
            </button>
            <button
              onClick={() => {
                setGuestName('')
                setShowGuest(true)
              }}
              className="flex-1 rounded-xl bg-black/[0.04] py-2.5 text-sm font-semibold text-black/60 dark:bg-white/10 dark:text-white/60"
            >
              + Convidado
            </button>
          </div>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-black/50 dark:text-white/50">Notas</span>
          <textarea
            value={dinner.note ?? ''}
            onChange={(e) => updateDinner(dinner.id, { note: e.target.value || undefined })}
            rows={2}
            placeholder="Restaurante, hora, quem trata da marcação..."
            className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-[15px] outline-none focus:border-brand-red dark:border-white/15 dark:bg-white/5"
          />
        </label>

        <button
          onClick={() => setConfirmDelete(true)}
          className="rounded-2xl border border-red-200 py-3 text-center text-sm font-semibold text-brand-red dark:border-red-900/40"
        >
          Apagar jantar
        </button>
      </div>

      {showPlayerPicker && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setShowPlayerPicker(false)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-[480px] flex-col rounded-t-3xl bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-2xl dark:bg-[#221f20]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 shrink-0 rounded-full bg-black/10 dark:bg-white/15" />
            <h2 className="mb-1 shrink-0 text-lg font-bold">Quem vai ao jantar</h2>
            <p className="mb-3 shrink-0 text-[12px] text-black/40 dark:text-white/40">
              Marca os jogadores presentes. Cada um paga {formatEuro(dinner.playerFee)}.
            </p>
            <ul className="-mx-1 mb-3 flex-1 overflow-y-auto px-1">
              {available.map((p) => {
                const on = picked.includes(p.id)
                return (
                  <li key={p.id}>
                    <button
                      onClick={() =>
                        setPicked((prev) => (on ? prev.filter((id) => id !== p.id) : [...prev, p.id]))
                      }
                      className="flex w-full items-center gap-3 border-b border-black/[0.05] py-2.5 text-left dark:border-white/10"
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[12px] font-bold ${
                          on
                            ? 'bg-brand-red text-white'
                            : 'bg-black/[0.04] text-transparent ring-1 ring-black/10 dark:bg-white/10 dark:ring-white/15'
                        }`}
                      >
                        ✓
                      </span>
                      <span className="truncate text-[14px] font-medium">{p.name}</span>
                    </button>
                  </li>
                )
              })}
              {available.length === 0 && (
                <li className="py-6 text-center text-sm text-black/40 dark:text-white/40">
                  Já estão todos os jogadores ativos neste jantar.
                </li>
              )}
            </ul>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => setShowPlayerPicker(false)}
                className="flex-1 rounded-xl bg-black/[0.04] py-3 text-sm font-semibold text-black/60 dark:bg-white/10 dark:text-white/60"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (picked.length > 0) {
                    addAttendees(
                      dinner.id,
                      picked.map((id) => ({
                        kind: 'player' as const,
                        playerId: id,
                        name: season.players.find((p) => p.id === id)?.name ?? 'Jogador',
                        paid: false,
                      })),
                    )
                  }
                  setShowPlayerPicker(false)
                }}
                className="flex-1 rounded-xl bg-brand-red py-3 text-sm font-semibold text-white"
              >
                Adicionar ({picked.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {showGuest && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setShowGuest(false)}
        >
          <div
            className="w-full max-w-[480px] rounded-t-3xl bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-2xl dark:bg-[#221f20]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-black/10 dark:bg-white/15" />
            <h2 className="mb-1 text-lg font-bold">Novo convidado</h2>
            <p className="mb-3 text-[12px] text-black/40 dark:text-white/40">
              Paga {formatEuro(dinner.guestFee)}.
            </p>
            <input
              autoFocus
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Nome do convidado"
              className="mb-4 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-[15px] outline-none focus:border-brand-red dark:border-white/15 dark:bg-white/5"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowGuest(false)}
                className="flex-1 rounded-xl bg-black/[0.04] py-3 text-sm font-semibold text-black/60 dark:bg-white/10 dark:text-white/60"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (guestName.trim()) {
                    addAttendees(dinner.id, [
                      { kind: 'guest', name: guestName.trim(), paid: false },
                    ])
                  }
                  setShowGuest(false)
                }}
                className="flex-1 rounded-xl bg-brand-red py-3 text-sm font-semibold text-white"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 dark:bg-[#221f20]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-2 text-base font-bold">Apagar este jantar?</h2>
            <p className="mb-5 text-sm text-black/50 dark:text-white/50">
              A lista de presenças e os pagamentos deste jantar são apagados.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-xl bg-black/[0.04] py-2.5 text-sm font-semibold text-black/60 dark:bg-white/10 dark:text-white/60"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  removeDinner(dinner.id)
                  navigate('/jantares')
                }}
                className="flex-1 rounded-xl bg-brand-red py-2.5 text-sm font-semibold text-white"
              >
                Apagar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
