import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { MonthChip } from '../components/MonthChip'
import { useData } from '../lib/DataContext'
import { seasonMonths } from '../lib/calc'
import type { Player } from '../types'

export function Players() {
  const { season, addPlayer, updatePlayer, removePlayer } = useData()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [manage, setManage] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState<Player | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<Player | null>(null)

  const months = useMemo(() => seasonMonths(season), [season])

  const players = useMemo(() => {
    return season.players
      .filter((p) => (showInactive ? true : p.active))
      .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt'))
  }, [season.players, query, showInactive])

  return (
    <div className="flex flex-1 flex-col pb-4">
      <Header
        title="Jogadores"
        subtitle={`${season.players.filter((p) => p.active).length} ativos · Época ${season.label}`}
      />

      <div className="px-4 pt-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar jogador..."
          className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-[15px] outline-none focus:border-brand-red dark:border-white/15 dark:bg-white/5"
        />
        <div className="mt-2 flex items-center justify-between">
          <button
            onClick={() => setShowInactive((v) => !v)}
            className="text-[12px] font-medium text-black/40 underline dark:text-white/40"
          >
            {showInactive ? 'Ocultar jogadores fora do grupo' : 'Mostrar jogadores fora do grupo'}
          </button>
          <button
            onClick={() => setManage((v) => !v)}
            className={`text-[12px] font-semibold underline ${
              manage ? 'text-brand-red' : 'text-black/40 dark:text-white/40'
            }`}
          >
            {manage ? 'Concluir' : 'Gerir'}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-black/35 dark:text-white/35">
          MB Multibanco · T Transferência · € Numerário · ! por pagar · · isento
        </p>
      </div>

      <ul className="mt-2 flex flex-1 flex-col divide-y divide-black/[0.05] px-4 dark:divide-white/10">
        {players.map((p) => (
          <li key={p.id} className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/jogadores/${p.id}`)}
              className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-red/10 text-[13px] font-bold text-brand-red">
                {p.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-[14px] font-semibold ${!p.active ? 'text-black/40 dark:text-white/40' : ''}`}>
                  {p.name}
                </p>
                <div className="mt-1 flex gap-1">
                  {months.map((m) => (
                    <MonthChip key={m.key} entry={p.payments[m.key]} size="sm" />
                  ))}
                </div>
              </div>
            </button>
            {manage && (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => {
                    setRenaming(p)
                    setRenameValue(p.name)
                  }}
                  aria-label={`Mudar nome de ${p.name}`}
                  className="rounded-lg bg-black/[0.04] px-2.5 py-1.5 text-[12px] font-semibold text-black/50 dark:bg-white/10 dark:text-white/50"
                >
                  Nome
                </button>
                <button
                  onClick={() => setConfirmDelete(p)}
                  aria-label={`Remover ${p.name}`}
                  className="rounded-lg bg-brand-red/10 px-2.5 py-1.5 text-[12px] font-bold text-brand-red"
                >
                  ✕
                </button>
              </div>
            )}
          </li>
        ))}
        {players.length === 0 && (
          <li className="py-8 text-center text-sm text-black/40 dark:text-white/40">
            Nenhum jogador encontrado.
          </li>
        )}
      </ul>

      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-24 right-4 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-brand-red text-2xl font-bold text-white shadow-lg active:scale-95"
        aria-label="Adicionar jogador"
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
            <h2 className="mb-3 text-lg font-bold">Novo jogador</h2>
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome do jogador"
              className="mb-4 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-[15px] outline-none focus:border-brand-red dark:border-white/15 dark:bg-white/5"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 rounded-xl bg-black/[0.04] py-3 text-sm font-semibold text-black/60 dark:bg-white/10 dark:text-white/60"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (newName.trim()) {
                    addPlayer(newName.trim())
                    setNewName('')
                    setShowAdd(false)
                  }
                }}
                className="flex-1 rounded-xl bg-brand-red py-3 text-sm font-semibold text-white active:bg-brand-red-dark"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {renaming && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setRenaming(null)}
        >
          <div
            className="w-full max-w-[480px] rounded-t-3xl bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-2xl dark:bg-[#221f20]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-black/10 dark:bg-white/15" />
            <h2 className="mb-3 text-lg font-bold">Mudar nome</h2>
            <input
              autoFocus
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="mb-4 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-[15px] outline-none focus:border-brand-red dark:border-white/15 dark:bg-white/5"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setRenaming(null)}
                className="flex-1 rounded-xl bg-black/[0.04] py-3 text-sm font-semibold text-black/60 dark:bg-white/10 dark:text-white/60"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (renameValue.trim()) updatePlayer(renaming.id, { name: renameValue.trim() })
                  setRenaming(null)
                }}
                className="flex-1 rounded-xl bg-brand-red py-3 text-sm font-semibold text-white"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 dark:bg-[#221f20]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-2 text-base font-bold">Remover {confirmDelete.name}?</h2>
            <p className="mb-5 text-sm text-black/50 dark:text-white/50">
              Apaga o histórico de mensalidades desta época e tira-o dos jantares. Se ele só saiu do
              grupo, é melhor desligar "No grupo atualmente" na ficha dele — assim o histórico fica.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-xl bg-black/[0.04] py-2.5 text-sm font-semibold text-black/60 dark:bg-white/10 dark:text-white/60"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  removePlayer(confirmDelete.id)
                  setConfirmDelete(null)
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
