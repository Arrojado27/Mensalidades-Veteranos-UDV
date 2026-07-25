import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { AppData, ExpenseItem, MonthKey, Player, PaymentEntry, SeasonData } from '../types'
import { loadData, saveData } from './storage'

interface DataContextValue {
  data: AppData
  season: SeasonData
  setData: (updater: (prev: AppData) => AppData) => void
  updateSeason: (updater: (season: SeasonData) => SeasonData) => void
  setPayment: (playerId: string, month: MonthKey, entry: PaymentEntry) => void
  addPlayer: (name: string) => void
  updatePlayer: (playerId: string, patch: Partial<Player>) => void
  removePlayer: (playerId: string) => void
  addExpense: (expense: Omit<ExpenseItem, 'id'>) => void
  removeExpense: (expenseId: string) => void
  setConfirmedBalance: (month: MonthKey, value: number | undefined) => void
  setMonthlyFee: (fee: number) => void
}

const DataContext = createContext<DataContextValue | null>(null)

let idCounter = Date.now()
function nextId(prefix: string) {
  idCounter += 1
  return `${prefix}-${idCounter}`
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setDataState] = useState<AppData>(() => loadData())

  useEffect(() => {
    saveData(data)
  }, [data])

  const setData = useCallback((updater: (prev: AppData) => AppData) => {
    setDataState((prev) => updater(prev))
  }, [])

  const season = useMemo(
    () => data.seasons.find((s) => s.id === data.currentSeasonId) ?? data.seasons[0],
    [data],
  )

  const updateSeason = useCallback(
    (updater: (season: SeasonData) => SeasonData) => {
      setData((prev) => ({
        ...prev,
        seasons: prev.seasons.map((s) => (s.id === prev.currentSeasonId ? updater(s) : s)),
      }))
    },
    [setData],
  )

  const setPayment = useCallback(
    (playerId: string, month: MonthKey, entry: PaymentEntry) => {
      updateSeason((s) => ({
        ...s,
        players: s.players.map((p) =>
          p.id === playerId ? { ...p, payments: { ...p.payments, [month]: entry } } : p,
        ),
      }))
    },
    [updateSeason],
  )

  const addPlayer = useCallback(
    (name: string) => {
      updateSeason((s) => ({
        ...s,
        players: [...s.players, { id: nextId('player'), name, active: true, payments: {} }],
      }))
    },
    [updateSeason],
  )

  const updatePlayer = useCallback(
    (playerId: string, patch: Partial<Player>) => {
      updateSeason((s) => ({
        ...s,
        players: s.players.map((p) => (p.id === playerId ? { ...p, ...patch } : p)),
      }))
    },
    [updateSeason],
  )

  const removePlayer = useCallback(
    (playerId: string) => {
      updateSeason((s) => ({ ...s, players: s.players.filter((p) => p.id !== playerId) }))
    },
    [updateSeason],
  )

  const addExpense = useCallback(
    (expense: Omit<ExpenseItem, 'id'>) => {
      updateSeason((s) => ({
        ...s,
        expenses: [...s.expenses, { ...expense, id: nextId('expense') }],
      }))
    },
    [updateSeason],
  )

  const removeExpense = useCallback(
    (expenseId: string) => {
      updateSeason((s) => ({ ...s, expenses: s.expenses.filter((e) => e.id !== expenseId) }))
    },
    [updateSeason],
  )

  const setConfirmedBalance = useCallback(
    (month: MonthKey, value: number | undefined) => {
      updateSeason((s) => {
        const confirmedBalances = { ...s.confirmedBalances }
        if (value === undefined) delete confirmedBalances[month]
        else confirmedBalances[month] = value
        return { ...s, confirmedBalances }
      })
    },
    [updateSeason],
  )

  const setMonthlyFee = useCallback(
    (fee: number) => {
      updateSeason((s) => ({ ...s, monthlyFee: fee }))
    },
    [updateSeason],
  )

  const value: DataContextValue = {
    data,
    season,
    setData,
    updateSeason,
    setPayment,
    addPlayer,
    updatePlayer,
    removePlayer,
    addExpense,
    removeExpense,
    setConfirmedBalance,
    setMonthlyFee,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData deve ser usado dentro de DataProvider')
  return ctx
}
