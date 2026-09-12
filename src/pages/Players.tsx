import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, Header } from '../components/Header'
import { MonthChip } from '../components/MonthChip'
import { ConfirmDialog, Sheet } from '../components/Sheet'
import { useData } from '../lib/DataContext'
import { getCurrentMonthKey, seasonMonths } from '../lib/calc'
import { MONTH_KEYS } from '../types'
import type { Player } from '../types'

type Filter = 'todos' | 'falta' | 'fora'

const FILTERS: [Filter, string][] = [
  ['todos', 'No grupo'],
  ['falta', 'Em falta'],
  ['fora', 'Saíram'],
]

export function Players() {
  const { season, addPlayer, updatePlayer, removePlayer } = useData()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('todos')
  const [manage, setManage] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState<Player | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<Player | null>(null)

  const months = useMemo(() => seasonMonths(season), [season])
  const currentMonth = getCurrentMonthKey(season) ?? MONTH_KEYS[MONTH_KEYS.length - 1]

  const players = useMemo(() => {
    return season.players
      .filter((p) => {
        if (filter === 'fora') return !p.active
        if (!p.active) return false
        if (filter === 'falta') return (p.payments[currentMonth]?.status ?? 'pending') === 'pending'
        return true
      })
      .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt'))
  }, [season.players, query, filter, currentMonth])

  function paidCount(player: Player) {
    return MONTH_KEYS.filter((k) => player.payments[k]?.status === 'paid').length
  }

  return (
    <div className="flex flex-1 flex-col">
      <Header
        title="Jogadores"
        subtitle={`Época ${season.label}`}
        badge={`${season.players.filter((p) => p.active).length} no grupo`}
      />

      <div className="px-4 pt-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar jogador..."
          className="field"
        />

        <div className="mt-3 flex gap-1.5 rounded-2xl bg-ink/[0.05] p-1">
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex-1 rounded-xl py-1.5 text-[12px] font-semibold transition-colors ${
                filter === key ? 'bg-surface text-ink shadow-sm' : 'text-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-3">
          <p className="min-w-0 flex-1 truncate text-[11px] text-subtle">
            T transferência &nbsp;·&nbsp; € numerário &nbsp;·&nbsp; ! por pagar &nbsp;·&nbsp; · isento
          </p>
          <button
            onClick={() => setManage((v) => !v)}
            className={`shrink-0 text-[12px] font-semibold ${manage ? 'text-danger' : 'text-muted'}`}
          >
            {manage ? 'Concluir' : 'Gerir'}
          </button>
        </div>
      </div>

      <ul className="mt-3 flex flex-1 flex-col gap-2 px-4">
        {players.map((p) => (
          <li key={p.id} className="card flex items-center gap-2.5 p-3">
            <button
              onClick={() => navigate(`/jogadores/${p.id}`)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <Avatar name={p.name} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={`truncate text-[14px] font-semibold ${!p.active ? 'text-muted' : ''}`}>
                    {p.name}
                  </span>
                  <span className="shrink-0 text-[11px] font-medium text-subtle">
                    {paidCount(p)}/{MONTH_KEYS.length}
                  </span>
                </span>
                <span className="mt-1.5 flex gap-1">
                  {months.map((m) => (
                    <MonthChip key={m.key} entry={p.payments[m.key]} size="sm" />
                  ))}
                </span>
              </span>
            </button>
            {manage && (
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  onClick={() => {
                    setRenaming(p)
                    setRenameValue(p.name)
                  }}
                  aria-label={`Mudar nome de ${p.name}`}
                  className="btn btn-soft px-2.5 py-1 text-[11px]"
                >
                  Nome
                </button>
                <button
                  onClick={() => setConfirmDelete(p)}
                  aria-label={`Remover ${p.name}`}
                  className="btn btn-danger px-2.5 py-1 text-[11px]"
                >
                  ✕
                </button>
              </div>
            )}
          </li>
        ))}
        {players.length === 0 && (
          <li className="card-flat px-4 py-10 text-center text-[13px] text-muted">
            {filter === 'falta'
              ? 'Ninguém em falta este mês. 🎉'
              : 'Nenhum jogador encontrado.'}
          </li>
        )}
      </ul>

      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-28 right-4 z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-red text-2xl font-bold text-white shadow-[0_10px_24px_rgb(164_31_36_/_0.4)] transition-transform active:scale-95"
        aria-label="Adicionar jogador"
      >
        +
      </button>

      {showAdd && (
        <Sheet
          title="Novo jogador"
          subtitle="Entra na época atual sem histórico de pagamentos."
          onClose={() => setShowAdd(false)}
          footer={
            <>
              <button onClick={() => setShowAdd(false)} className="btn btn-soft flex-1">
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
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do jogador"
            className="field"
          />
        </Sheet>
      )}

      {renaming && (
        <Sheet
          title="Mudar nome"
          onClose={() => setRenaming(null)}
          footer={
            <>
              <button onClick={() => setRenaming(null)} className="btn btn-soft flex-1">
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (renameValue.trim()) updatePlayer(renaming.id, { name: renameValue.trim() })
                  setRenaming(null)
                }}
                className="btn btn-primary flex-1"
              >
                Guardar
              </button>
            </>
          }
        >
          <input
            autoFocus
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            className="field"
          />
        </Sheet>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={`Remover ${confirmDelete.name}?`}
          description='Apaga o histórico de mensalidades desta época e tira-o dos jantares. Se ele só saiu do grupo, desliga antes "No grupo atualmente" na ficha dele — assim o histórico fica.'
          confirmLabel="Remover"
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => {
            removePlayer(confirmDelete.id)
            setConfirmDelete(null)
          }}
        />
      )}
    </div>
  )
}
