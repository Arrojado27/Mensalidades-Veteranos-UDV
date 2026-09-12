import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { MONTH_KEYS } from '../types'
import type {
  AppData,
  CarriedDebt,
  Dinner,
  DinnerAttendee,
  ExpenseItem,
  MonthKey,
  PaymentEntry,
  PaymentMethod,
  Player,
  SeasonData,
} from '../types'
import {
  buildCarriedDebts,
  isMonthElapsed,
  monthIncomeTotal,
  monthOutflowTotal,
  seasonFinalBalance,
} from './calc'
import { loadData, saveData } from './storage'

export interface NewSeasonOptions {
  label: string
  startYear: number
  monthlyFee: number
  dinnerPlayerFee: number
  dinnerGuestFee: number
  /** Transporta os jogadores ativos da época atual. */
  carryPlayers: boolean
  /** Arranca com o saldo em caixa da época atual. */
  carryBalance: boolean
  /** Transporta os meses por pagar da época atual como dívidas a cobrar. */
  carryDebts: boolean
}

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
  setDinnerFees: (playerFee: number, guestFee: number) => void
  addDinner: (dinner: { date: string; opponent: string; note?: string }) => string
  updateDinner: (dinnerId: string, patch: Partial<Omit<Dinner, 'id'>>) => void
  removeDinner: (dinnerId: string) => void
  addAttendees: (dinnerId: string, attendees: Omit<DinnerAttendee, 'id'>[]) => void
  updateAttendee: (dinnerId: string, attendeeId: string, patch: Partial<DinnerAttendee>) => void
  removeAttendee: (dinnerId: string, attendeeId: string) => void
  addDebt: (debt: Omit<CarriedDebt, 'id'>) => void
  settleDebt: (debtId: string, settle: { month: MonthKey; method: PaymentMethod; amount: number }) => void
  unsettleDebt: (debtId: string) => void
  removeDebt: (debtId: string) => void
  createSeason: (options: NewSeasonOptions) => void
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

  const updateDinnerInSeason = useCallback(
    (dinnerId: string, updater: (dinner: Dinner) => Dinner) => {
      updateSeason((s) => ({
        ...s,
        dinners: s.dinners.map((d) => (d.id === dinnerId ? updater(d) : d)),
      }))
    },
    [updateSeason],
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

  /**
   * Quem entra a meio da época não deve os meses anteriores à entrada: esses
   * ficam isentos. Sem isto apareceria em falta em meses em que nem era do
   * grupo — e essa falta seguia como dívida para a época seguinte.
   */
  const addPlayer = useCallback(
    (name: string) => {
      updateSeason((s) => {
        const payments: Player['payments'] = {}
        for (const key of MONTH_KEYS) {
          if (isMonthElapsed(s, key)) payments[key] = { status: 'exempt' }
        }
        return {
          ...s,
          players: [...s.players, { id: nextId('player'), name, active: true, payments }],
        }
      })
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
      updateSeason((s) => ({
        ...s,
        players: s.players.filter((p) => p.id !== playerId),
        // Tira-o também dos jantares, para não continuar a contar dinheiro dele.
        dinners: s.dinners.map((d) => ({
          ...d,
          attendees: d.attendees.filter((a) => a.playerId !== playerId),
        })),
      }))
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
    (month: MonthKey, endOfMonthValue: number | undefined) => {
      updateSeason((s) => {
        const confirmedBalances = { ...s.confirmedBalances }
        if (endOfMonthValue === undefined) {
          delete confirmedBalances[month]
        } else {
          // Guarda o saldo TRANSITADO para este mês, não o valor final — assim as
          // entradas/saídas do próprio mês continuam a somar-se em tempo real.
          confirmedBalances[month] =
            endOfMonthValue - monthIncomeTotal(s, month) + monthOutflowTotal(s, month)
        }
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

  const setDinnerFees = useCallback(
    (playerFee: number, guestFee: number) => {
      updateSeason((s) => ({ ...s, dinnerPlayerFee: playerFee, dinnerGuestFee: guestFee }))
    },
    [updateSeason],
  )

  const addDinner = useCallback(
    ({ date, opponent, note }: { date: string; opponent: string; note?: string }) => {
      const id = nextId('dinner')
      updateSeason((s) => ({
        ...s,
        dinners: [
          ...s.dinners,
          {
            id,
            date,
            opponent,
            note,
            playerFee: s.dinnerPlayerFee,
            guestFee: s.dinnerGuestFee,
            attendees: [],
          },
        ],
      }))
      return id
    },
    [updateSeason],
  )

  const updateDinner = useCallback(
    (dinnerId: string, patch: Partial<Omit<Dinner, 'id'>>) => {
      updateDinnerInSeason(dinnerId, (d) => ({ ...d, ...patch }))
    },
    [updateDinnerInSeason],
  )

  const removeDinner = useCallback(
    (dinnerId: string) => {
      updateSeason((s) => ({ ...s, dinners: s.dinners.filter((d) => d.id !== dinnerId) }))
    },
    [updateSeason],
  )

  const addAttendees = useCallback(
    (dinnerId: string, attendees: Omit<DinnerAttendee, 'id'>[]) => {
      updateDinnerInSeason(dinnerId, (d) => ({
        ...d,
        attendees: [...d.attendees, ...attendees.map((a) => ({ ...a, id: nextId('att') }))],
      }))
    },
    [updateDinnerInSeason],
  )

  const updateAttendee = useCallback(
    (dinnerId: string, attendeeId: string, patch: Partial<DinnerAttendee>) => {
      updateDinnerInSeason(dinnerId, (d) => ({
        ...d,
        attendees: d.attendees.map((a) => (a.id === attendeeId ? { ...a, ...patch } : a)),
      }))
    },
    [updateDinnerInSeason],
  )

  const removeAttendee = useCallback(
    (dinnerId: string, attendeeId: string) => {
      updateDinnerInSeason(dinnerId, (d) => ({
        ...d,
        attendees: d.attendees.filter((a) => a.id !== attendeeId),
      }))
    },
    [updateDinnerInSeason],
  )

  const addDebt = useCallback(
    (debt: Omit<CarriedDebt, 'id'>) => {
      updateSeason((s) => ({ ...s, carriedDebts: [...s.carriedDebts, { ...debt, id: nextId('debt') }] }))
    },
    [updateSeason],
  )

  const settleDebt = useCallback(
    (debtId: string, settle: { month: MonthKey; method: PaymentMethod; amount: number }) => {
      updateSeason((s) => ({
        ...s,
        carriedDebts: s.carriedDebts.map((d) =>
          d.id === debtId
            ? { ...d, settled: { ...settle, date: new Date().toISOString().slice(0, 10) } }
            : d,
        ),
      }))
    },
    [updateSeason],
  )

  const unsettleDebt = useCallback(
    (debtId: string) => {
      updateSeason((s) => ({
        ...s,
        carriedDebts: s.carriedDebts.map((d) =>
          d.id === debtId ? { ...d, settled: undefined } : d,
        ),
      }))
    },
    [updateSeason],
  )

  const removeDebt = useCallback(
    (debtId: string) => {
      updateSeason((s) => ({ ...s, carriedDebts: s.carriedDebts.filter((d) => d.id !== debtId) }))
    },
    [updateSeason],
  )

  const createSeason = useCallback(
    (options: NewSeasonOptions) => {
      setData((prev) => {
        const current = prev.seasons.find((s) => s.id === prev.currentSeasonId) ?? prev.seasons[0]
        const newSeason: SeasonData = {
          id: `season-${Date.now()}`,
          label: options.label,
          startYear: options.startYear,
          monthlyFee: options.monthlyFee,
          dinnerPlayerFee: options.dinnerPlayerFee,
          dinnerGuestFee: options.dinnerGuestFee,
          openingBalance: options.carryBalance && current ? seasonFinalBalance(current) : 0,
          players:
            options.carryPlayers && current
              ? current.players
                  .filter((p) => p.active)
                  .map((p) => ({ id: p.id, name: p.name, active: true, payments: {} }))
              : [],
          expenses: [],
          dinners: [],
          carriedDebts: options.carryDebts && current ? buildCarriedDebts(current) : [],
          confirmedBalances: {},
        }
        return {
          ...prev,
          seasons: [...prev.seasons, newSeason],
          currentSeasonId: newSeason.id,
        }
      })
    },
    [setData],
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
    setDinnerFees,
    addDinner,
    updateDinner,
    removeDinner,
    addAttendees,
    updateAttendee,
    removeAttendee,
    addDebt,
    settleDebt,
    unsettleDebt,
    removeDebt,
    createSeason,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData deve ser usado dentro de DataProvider')
  return ctx
}
