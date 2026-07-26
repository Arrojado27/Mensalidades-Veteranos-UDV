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

/**
 * Saldo em caixa no fim de cada mês, calculado automaticamente (saldo inicial +
 * receitas − despesas). Sempre que um mês tem um saldo confirmado manualmente
 * (reconciliação com o banco/caixa real), esse valor passa a ser a base para os
 * meses seguintes — o cálculo automático só preenche os meses sem confirmação.
 */
export function computeLedgerBalance(season: SeasonData, uptoMonth: MonthKey): number {
  let balance = season.openingBalance
  for (const m of SEASON_MONTHS) {
    const manual = season.confirmedBalances[m.key]
    if (manual !== undefined) {
      balance = manual
    } else {
      balance += summarizeMonth(season, m.key).totalReceived - monthExpensesTotal(season, m.key)
    }
    if (m.key === uptoMonth) break
  }
  return balance
}

export function formatEuro(value: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value)
}
