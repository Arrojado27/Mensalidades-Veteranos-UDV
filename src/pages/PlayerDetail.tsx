import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MonthChip } from '../components/MonthChip'
import { PaymentEditorModal } from '../components/PaymentEditorModal'
import { useData } from '../lib/DataContext'
import { amountForEntry, formatEuro, seasonMonths } from '../lib/calc'
import type { MonthKey } from '../types'

export function PlayerDetail() {
  const { playerId } = useParams()
  const navigate = useNavigate()
  const { season, setPayment, updatePlayer, removePlayer } = useData()
  const [editingMonth, setEditingMonth] = useState<MonthKey | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const months = useMemo(() => seasonMonths(season), [season])
  const player = season.players.find((p) => p.id === playerId)

  if (!player) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-black/50">Jogador não encontrado.</p>
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

  return (
    <div className="flex flex-1 flex-col pb-4">
      <header className="flex items-center gap-3 bg-brand-red px-4 pb-4 pt-[calc(env(safe-area-inset-top)+16px)] text-white">
        <button onClick={() => navigate(-1)} className="text-2xl leading-none">
          ‹
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-bold leading-tight">{player.name}</h1>
          <p className="text-[12px] text-white/80">Época {season.label}</p>
        </div>
      </header>

      <div className="flex flex-col gap-4 px-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-black/[0.06] p-3.5 dark:border-white/10">
            <p className="text-[11px] font-medium uppercase text-black/40 dark:text-white/40">Total pago</p>
            <p className="mt-0.5 text-xl font-bold">{formatEuro(totalPaid)}</p>
          </div>
          <div className="rounded-2xl border border-black/[0.06] p-3.5 dark:border-white/10">
            <p className="text-[11px] font-medium uppercase text-black/40 dark:text-white/40">Meses em falta</p>
            <p className="mt-0.5 text-xl font-bold text-brand-red">{pendingMonths.length}</p>
          </div>
        </div>

        <label className="flex items-center justify-between rounded-2xl border border-black/[0.06] px-4 py-3 dark:border-white/10">
          <span className="text-[14px] font-medium">No grupo atualmente</span>
          <input
            type="checkbox"
            checked={player.active}
            onChange={(e) => updatePlayer(player.id, { active: e.target.checked })}
            className="h-5 w-5 accent-[#a41f24]"
          />
        </label>

        <div className="rounded-2xl border border-black/[0.06] dark:border-white/10">
          <h2 className="px-4 pt-3.5 text-[13px] font-bold uppercase tracking-wide text-black/40 dark:text-white/40">
            Mensalidades
          </h2>
          <ul className="divide-y divide-black/[0.05] px-4 dark:divide-white/10">
            {months.map((m) => {
              const entry = player.payments[m.key]
              return (
                <li key={m.key} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold">
                      {m.label} {m.year}
                    </p>
                    {entry?.note && (
                      <p className="truncate text-[12px] text-black/40 dark:text-white/40">{entry.note}</p>
                    )}
                  </div>
                  <MonthChip entry={entry} size="md" onClick={() => setEditingMonth(m.key)} />
                </li>
              )
            })}
          </ul>
        </div>

        <button
          onClick={() => setConfirmDelete(true)}
          className="rounded-2xl border border-red-200 py-3 text-center text-sm font-semibold text-brand-red dark:border-red-900/40"
        >
          Remover jogador
        </button>
      </div>

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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 dark:bg-[#221f20]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-2 text-base font-bold">Remover {player.name}?</h2>
            <p className="mb-5 text-sm text-black/50 dark:text-white/50">
              Todo o histórico de mensalidades deste jogador será apagado. Esta ação não pode ser desfeita.
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
                  removePlayer(player.id)
                  navigate('/jogadores')
                }}
                className="flex-1 rounded-xl bg-brand-red py-2.5 text-sm font-semibold text-white"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
