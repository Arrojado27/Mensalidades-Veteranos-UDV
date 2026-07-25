import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { MonthChip } from '../components/MonthChip'
import { useData } from '../lib/DataContext'
import { SEASON_MONTHS } from '../types'

export function Players() {
  const { season, addPlayer } = useData()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')

  const players = useMemo(() => {
    return season.players
      .filter((p) => (showInactive ? true : p.active))
      .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt'))
  }, [season.players, query, showInactive])

  return (
    <div className="flex flex-1 flex-col pb-4">
      <Header title="Jogadores" subtitle={`${season.players.filter((p) => p.active).length} ativos · Época ${season.label}`} />

      <div className="px-4 pt-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar jogador..."
          className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-[15px] outline-none focus:border-brand-red dark:border-white/15 dark:bg-white/5"
        />
        <button
          onClick={() => setShowInactive((v) => !v)}
          className="mt-2 text-[12px] font-medium text-black/40 underline dark:text-white/40"
        >
          {showInactive ? 'Ocultar jogadores fora do grupo' : 'Mostrar jogadores fora do grupo'}
        </button>
      </div>

      <ul className="mt-2 flex flex-1 flex-col divide-y divide-black/[0.05] px-4 dark:divide-white/10">
        {players.map((p) => (
          <li key={p.id}>
            <button
              onClick={() => navigate(`/jogadores/${p.id}`)}
              className="flex w-full items-center gap-3 py-3 text-left"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-red/10 text-[13px] font-bold text-brand-red">
                {p.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-[14px] font-semibold ${!p.active ? 'text-black/40 dark:text-white/40' : ''}`}>
                  {p.name}
                </p>
                <div className="mt-1 flex gap-1">
                  {SEASON_MONTHS.map((m) => (
                    <MonthChip key={m.key} entry={p.payments[m.key]} size="sm" />
                  ))}
                </div>
              </div>
            </button>
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
    </div>
  )
}
