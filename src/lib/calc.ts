import type { MonthKey, Player, SeasonData } from '../types'
import { SEASON_MONTHS } from '../types'

export function monthIndex(month: MonthKey): number {
  return SEASON_MONTHS.findIndex((m) => m.key === month)
}

/** Devolve o mês da época correspondente à data de hoje, ou null se hoje estiver fora da época. */
export function getCurrentMonthKey(today: Date = new Date()): MonthKey | null {
  const y = today.getFullYear()
  const m = today.getMonth() // 0-indexed
  const found = SEASON_MONTHS.find((info, i) => {
    const infoMonthNum = (i + 8) % 12 // set=8 (setembro, index 8 em JS Date: jan=0)
    return info.year === y && infoMonthNum === m
  })
  return found?.key ?? null
}

export function amountForEntry(status: string, amount: number | undefined, fee: number): number {
  if (status !== 'paid') return 0
  return amount ?? fee
}

export interface MonthSummary {
  month: MonthKey
  paid: Player[]
  pending: Player[]
  exemptOrInactive: number
  totalReceived: number
  totalExpected: number
}

export function summarizeMonth(season: SeasonData, month: MonthKey): MonthSummary {
  const paid: Player[] = []
  const pending: Player[] = []
  let exemptOrInactive = 0
  let totalReceived = 0
  let totalExpected = 0

  for (const p of season.players) {
    if (!p.active) {
      exemptOrInactive += 1
      continue
    }
    const entry = p.payments[month]
    if (!entry || entry.status === 'exempt') {
      exemptOrInactive += 1
      continue
    }
    totalExpected += season.monthlyFee
    if (entry.status === 'paid') {
      paid.push(p)
      totalReceived += amountForEntry(entry.status, entry.amount, season.monthlyFee)
    } else {
      pending.push(p)
    }
  }

  return { month, paid, pending, exemptOrInactive, totalReceived, totalExpected }
}

export function seasonTotals(season: SeasonData) {
  let totalReceived = 0
  let totalExpected = 0
  for (const month of SEASON_MONTHS) {
    const s = summarizeMonth(season, month.key)
    totalReceived += s.totalReceived
    totalExpected += s.totalExpected
  }
  const totalExpenses = season.expenses.reduce((sum, e) => sum + e.amount, 0)
  return { totalReceived, totalExpected, totalExpenses }
}

export function expensesForMonth(season: SeasonData, month: MonthKey) {
  return season.expenses.filter((e) => e.month === month)
}

export function monthExpensesTotal(season: SeasonData, month: MonthKey) {
  return expensesForMonth(season, month).reduce((sum, e) => sum + e.amount, 0)
}

/** Saldo confirmado mais recente registado (o mais próximo, mas não posterior, ao mês indicado). */
export function latestConfirmedBalanceUpTo(season: SeasonData, month: MonthKey) {
  const idx = monthIndex(month)
  for (let i = idx; i >= 0; i--) {
    const key = SEASON_MONTHS[i].key
    const value = season.confirmedBalances[key]
    if (value !== undefined) {
      return { month: key, value }
    }
  }
  return null
}

export function latestConfirmedBalance(season: SeasonData) {
  for (let i = SEASON_MONTHS.length - 1; i >= 0; i--) {
    const key = SEASON_MONTHS[i].key
    const value = season.confirmedBalances[key]
    if (value !== undefined) {
      return { month: key, value }
    }
  }
  return null
}

export function formatEuro(value: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value)
}
