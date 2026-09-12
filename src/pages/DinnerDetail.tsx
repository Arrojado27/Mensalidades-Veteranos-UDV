import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Header, StatTile } from '../components/Header'
import { MoneyInput } from '../components/MoneyInput'
import { ConfirmDialog, Sheet } from '../components/Sheet'
import { useData } from '../lib/DataContext'
import {
  attendeeFee,
  formatDinnerDate,
  formatEuro,
  monthKeyForDate,
  monthLabel,
  summarizeDinner,
} from '../lib/calc'
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
  const [showDetails, setShowDetails] = useState(false)
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
        <p className="text-sm text-muted">Jantar não encontrado.</p>
        <button onClick={() => navigate('/jantares')} className="text-sm font-semibold text-brand-red">
          Voltar aos jantares
        </button>
      </div>
    )
  }

  const summary = summarizeDinner(dinner)
  const sortedAttendees = [...dinner.attendees].sort((a, b) => {
    if (a.paid !== b.paid) return a.paid ? 1 : -1
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
    <div className="flex flex-1 flex-col">
      <Header
        title={`vs ${dinner.opponent || 'Adversário a definir'}`}
        subtitle={`${formatDinnerDate(dinner.date)} · conta em ${monthLabel(season, monthKeyForDate(season, dinner.date))}`}
        onBack={() => navigate('/jantares')}
      />

      <div className="flex flex-col gap-3.5 px-4 pt-4">
        <div className="grid grid-cols-3 gap-2">
          <StatTile
            label="Vão"
            value={String(summary.players + summary.guests)}
            hint={`${summary.players} jog · ${summary.guests} conv`}
          />
          <StatTile label="Recebido" value={formatEuro(summary.received)} tone="ok" />
          <StatTile label="Falta" value={formatEuro(summary.missing)} tone="alert" />
        </div>

        <section className="card card-glass overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4">
            <h2 className="section-title">Quem vai ao jantar</h2>
            <span className="text-[12px] font-semibold text-subtle">
              total {formatEuro(summary.expected)}
            </span>
          </div>

          <div className="flex gap-2 px-4 pt-3">
            <button
              onClick={() => {
                setPicked([])
                setShowPlayerPicker(true)
              }}
              className="btn btn-primary flex-1"
            >
              + Jogadores
            </button>
            <button
              onClick={() => {
                setGuestName('')
                setShowGuest(true)
              }}
              className="btn btn-soft flex-1"
            >
              + Convidado
            </button>
          </div>

          <ul className="mt-2 divide-y divide-line">
            {sortedAttendees.map((a) => (
              <li key={a.id} className="flex items-center gap-2.5 px-4 py-2.5">
                <button
                  onClick={() => togglePaid(a)}
                  aria-label={a.paid ? 'Marcar como não pago' : 'Marcar como pago'}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[14px] font-bold transition-colors ${
                    a.paid
                      ? 'bg-ok-soft text-ok ring-1 ring-ok/30'
                      : 'bg-ink/[0.04] text-transparent ring-1 ring-line'
                  }`}
                >
                  ✓
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[14px] font-semibold ${a.paid ? 'text-muted' : ''}`}>
                    {a.name}
                  </p>
                  <p className="text-[11px] text-subtle">
                    {a.kind === 'guest' ? 'Convidado' : 'Jogador'} · {formatEuro(attendeeFee(dinner, a))}
                    {a.paid && ` · ${methodLabel(a.method).toLowerCase()}`}
                  </p>
                </div>
                {a.paid && (
                  <div className="flex shrink-0 overflow-hidden rounded-xl ring-1 ring-line">
                    {PAYMENT_METHODS.map(({ key, short, label }) => (
                      <button
                        key={key}
                        onClick={() => updateAttendee(dinner.id, a.id, { method: key })}
                        aria-label={`${a.name} pagou por ${label}`}
                        className={`px-2 py-1.5 text-[11px] font-bold ${
                          (a.method ?? 'cash') === key ? 'bg-brand-red text-white' : 'text-subtle'
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
                  className="shrink-0 px-1 text-subtle"
                >
                  ✕
                </button>
              </li>
            ))}
            {sortedAttendees.length === 0 && (
              <li className="px-4 py-8 text-center text-[13px] text-muted">
                Ainda ninguém apontado para este jantar.
              </li>
            )}
          </ul>
        </section>

        <section className="card card-glass overflow-hidden">
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3.5"
          >
            <span className="section-title">Dados do jantar</span>
            <span className="text-[12px] font-semibold text-muted">
              {showDetails ? 'Fechar' : 'Editar'}
            </span>
          </button>

          {showDetails && (
            <div className="flex flex-col gap-3 border-t border-line px-4 py-4">
              <label className="block">
                <span className="label">Data</span>
                <input
                  type="date"
                  value={dinner.date}
                  onChange={(e) => updateDinner(dinner.id, { date: e.target.value })}
                  className="field"
                />
              </label>
              <label className="block">
                <span className="label">Equipa adversária</span>
                <input
                  type="text"
                  value={dinner.opponent}
                  onChange={(e) => updateDinner(dinner.id, { opponent: e.target.value })}
                  placeholder="Nome da equipa"
                  className="field"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="label">€ por jogador</span>
                  <MoneyInput
                    value={dinner.playerFee}
                    onChange={(v) => updateDinner(dinner.id, { playerFee: v ?? 0 })}
                    className="field"
                  />
                </label>
                <label className="block">
                  <span className="label">€ por convidado</span>
                  <MoneyInput
                    value={dinner.guestFee}
                    onChange={(v) => updateDinner(dinner.id, { guestFee: v ?? 0 })}
                    className="field"
                  />
                </label>
              </div>
              <label className="block">
                <span className="label">Custo do jantar (restaurante) — opcional</span>
                <MoneyInput
                  value={dinner.cost}
                  onChange={(v) => updateDinner(dinner.id, { cost: v })}
                  placeholder="€"
                  ariaLabel="Custo do jantar"
                  className="field"
                />
                <span className="mt-1.5 block text-[12px] text-subtle">
                  Entra automaticamente nas despesas do mês do jantar.
                </span>
              </label>
              <label className="block">
                <span className="label">Notas</span>
                <textarea
                  value={dinner.note ?? ''}
                  onChange={(e) => updateDinner(dinner.id, { note: e.target.value || undefined })}
                  rows={2}
                  placeholder="Restaurante, hora, quem trata da marcação..."
                  className="field"
                />
              </label>
              <button onClick={() => setConfirmDelete(true)} className="btn btn-danger w-full">
                Apagar jantar
              </button>
            </div>
          )}
        </section>

        <div className="pb-2" />
      </div>

      {showPlayerPicker && (
        <Sheet
          title="Quem vai ao jantar"
          subtitle={`Marca os presentes. Cada jogador paga ${formatEuro(dinner.playerFee)}.`}
          onClose={() => setShowPlayerPicker(false)}
          scroll
          footer={
            <>
              <button onClick={() => setShowPlayerPicker(false)} className="btn btn-soft flex-1">
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
                className="btn btn-primary flex-1"
              >
                Adicionar ({picked.length})
              </button>
            </>
          }
        >
          <ul className="flex flex-col gap-1.5">
            {available.map((p) => {
              const on = picked.includes(p.id)
              return (
                <li key={p.id}>
                  <button
                    onClick={() =>
                      setPicked((prev) => (on ? prev.filter((id) => id !== p.id) : [...prev, p.id]))
                    }
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors ${
                      on ? 'bg-brand-red/10' : 'bg-ink/[0.03]'
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold ${
                        on ? 'bg-brand-red text-white' : 'bg-surface text-transparent ring-1 ring-line'
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
              <li className="py-6 text-center text-[13px] text-muted">
                Já estão todos os jogadores ativos neste jantar.
              </li>
            )}
          </ul>
        </Sheet>
      )}

      {showGuest && (
        <Sheet
          title="Novo convidado"
          subtitle={`Paga ${formatEuro(dinner.guestFee)}.`}
          onClose={() => setShowGuest(false)}
          footer={
            <>
              <button onClick={() => setShowGuest(false)} className="btn btn-soft flex-1">
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (guestName.trim()) {
                    addAttendees(dinner.id, [{ kind: 'guest', name: guestName.trim(), paid: false }])
                  }
                  setShowGuest(false)
                }}
                className="btn btn-primary flex-1"
              >
                Adicionar
              </button>
            </>
          }
        >
          <input
            autoFocus
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Nome do convidado"
            className="field"
          />
        </Sheet>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Apagar este jantar?"
          description="A lista de presenças e os pagamentos deste jantar são apagados."
          confirmLabel="Apagar"
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => {
            removeDinner(dinner.id)
            navigate('/jantares')
          }}
        />
      )}
    </div>
  )
}
