import type {
  CarriedDebt,
  Dinner,
  DinnerAttendee,
  MonthInfo,
  MonthKey,
  Player,
  SeasonData,
} from '../types'
import { MONTH_KEYS, MONTH_TEMPLATE, monthsForStartYear } from '../types'

/** Meses desta época, já com os anos certos. */
export function seasonMonths(season: SeasonData): MonthInfo[] {
  return monthsForStartYear(season.startYear)
}

export function monthInfo(season: SeasonData, month: MonthKey): MonthInfo {
  return seasonMonths(season).find((m) => m.key === month)!
}

export function monthLabel(season: SeasonData, month: MonthKey): string {
  const info = monthInfo(season, month)
  return `${info.label} ${info.year}`
}

export function monthIndex(month: MonthKey): number {
  return MONTH_KEYS.indexOf(month)
}

/** Mês da época correspondente a hoje, ou null se hoje estiver fora da época. */
export function getCurrentMonthKey(season: SeasonData, today: Date = new Date()): MonthKey | null {
  const y = today.getFullYear()
  const m = today.getMonth()
  const found = MONTH_TEMPLATE.find(
    (info) => season.startYear + info.yearOffset === y && info.monthNumber === m,
  )
  return found?.key ?? null
}

/** Mês da época em que cai uma data ISO; datas fora da época encostam ao extremo mais próximo. */
export function monthKeyForDate(season: SeasonData, isoDate: string): MonthKey {
  const d = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(d.getTime())) return MONTH_KEYS[0]
  const exact = getCurrentMonthKey(season, d)
  if (exact) return exact
  const seasonStart = new Date(season.startYear, 8, 1)
  return d < seasonStart ? MONTH_KEYS[0] : MONTH_KEYS[MONTH_KEYS.length - 1]
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
    // Sem registo = por pagar (é assim que arranca uma época nova). Só conta como
    // isento quando isso foi marcado à mão na ficha do jogador.
    if (entry?.status === 'exempt') {
      exemptOrInactive += 1
      continue
    }
    totalExpected += season.monthlyFee
    if (entry?.status === 'paid') {
      paid.push(p)
      totalReceived += amountForEntry(entry.status, entry.amount, season.monthlyFee)
    } else {
      pending.push(p)
    }
  }

  return { month, paid, pending, exemptOrInactive, totalReceived, totalExpected }
}

// ---------------------------------------------------------------- jantares

/** Preço a cobrar a um participante (preço do jantar ou valor específico). */
export function attendeeFee(dinner: Dinner, attendee: DinnerAttendee): number {
  if (attendee.amount != null) return attendee.amount
  return attendee.kind === 'guest' ? dinner.guestFee : dinner.playerFee
}

export interface DinnerSummary {
  players: number
  guests: number
  expected: number
  received: number
  missing: number
  unpaid: DinnerAttendee[]
}

export function summarizeDinner(dinner: Dinner): DinnerSummary {
  let players = 0
  let guests = 0
  let expected = 0
  let received = 0
  const unpaid: DinnerAttendee[] = []

  for (const a of dinner.attendees) {
    if (a.kind === 'guest') guests += 1
    else players += 1
    const fee = attendeeFee(dinner, a)
    expected += fee
    if (a.paid) received += fee
    else unpaid.push(a)
  }

  return { players, guests, expected, received, missing: expected - received, unpaid }
}

export function dinnersForMonth(season: SeasonData, month: MonthKey): Dinner[] {
  return season.dinners.filter((d) => monthKeyForDate(season, d.date) === month)
}

/** Dinheiro dos jantares efetivamente recebido num mês. */
export function dinnersIncomeForMonth(season: SeasonData, month: MonthKey): number {
  return dinnersForMonth(season, month).reduce((sum, d) => sum + summarizeDinner(d).received, 0)
}

/** Custo dos jantares (restaurante) imputado a um mês. */
export function dinnersCostForMonth(season: SeasonData, month: MonthKey): number {
  return dinnersForMonth(season, month).reduce((sum, d) => sum + (d.cost ?? 0), 0)
}

export function seasonDinnerTotals(season: SeasonData) {
  let received = 0
  let expected = 0
  let cost = 0
  for (const d of season.dinners) {
    const s = summarizeDinner(d)
    received += s.received
    expected += s.expected
    cost += d.cost ?? 0
  }
  return { received, expected, missing: expected - received, cost }
}

export function sortedDinners(season: SeasonData): Dinner[] {
  return [...season.dinners].sort((a, b) => b.date.localeCompare(a.date))
}

export function formatDinnerDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ------------------------------------------------------ dívidas transitadas

let debtIdCounter = Date.now()

/** True se o mês da época já passou (não conta meses que ainda estão para vir). */
export function isMonthElapsed(season: SeasonData, month: MonthKey, today: Date = new Date()): boolean {
  const info = MONTH_TEMPLATE.find((m) => m.key === month)!
  const monthStart = new Date(season.startYear + info.yearOffset, info.monthNumber, 1)
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  return monthStart < thisMonthStart
}

/**
 * Meses por pagar de uma época, prontos a transportar para a época seguinte.
 * Sem registo = por pagar; meses que ainda não chegaram ficam de fora.
 */
export function buildCarriedDebts(season: SeasonData, today: Date = new Date()): CarriedDebt[] {
  const debts: CarriedDebt[] = []
  for (const player of season.players) {
    if (!player.active) continue
    for (const key of MONTH_KEYS) {
      const entry = player.payments[key]
      if (entry && entry.status !== 'pending') continue
      if (!isMonthElapsed(season, key, today)) continue
      debtIdCounter += 1
      debts.push({
        id: `debt-${debtIdCounter}`,
        playerId: player.id,
        playerName: player.name,
        fromSeasonId: season.id,
        fromSeasonLabel: season.label,
        month: key,
        monthLabel: monthLabel(season, key),
        amount: season.monthlyFee,
      })
    }
  }
  return debts
}

export function openDebts(season: SeasonData) {
  return season.carriedDebts.filter((d) => !d.settled)
}

export function openDebtsTotal(season: SeasonData) {
  return openDebts(season).reduce((sum, d) => sum + d.amount, 0)
}

/** Dívidas de épocas anteriores liquidadas num determinado mês desta época. */
export function debtsIncomeForMonth(season: SeasonData, month: MonthKey): number {
  return season.carriedDebts
    .filter((d) => d.settled?.month === month)
    .reduce((sum, d) => sum + (d.settled?.amount ?? 0), 0)
}

// ------------------------------------------------------------ despesas/saldo

/** Evita cêntimos fantasma (0,1 + 0,2) quando se somam valores em euros. */
export function roundCents(value: number): number {
  return Math.round(value * 100) / 100
}

export function expensesForMonth(season: SeasonData, month: MonthKey) {
  return season.expenses.filter((e) => e.month === month)
}

export function monthExpensesTotal(season: SeasonData, month: MonthKey) {
  return expensesForMonth(season, month).reduce((sum, e) => sum + e.amount, 0)
}

/** Tudo o que entrou em caixa num mês: mensalidades + jantares + dívidas antigas. */
export function monthIncomeTotal(season: SeasonData, month: MonthKey): number {
  return (
    summarizeMonth(season, month).totalReceived +
    dinnersIncomeForMonth(season, month) +
    debtsIncomeForMonth(season, month)
  )
}

/** Tudo o que saiu de caixa num mês: despesas soltas + custo dos jantares. */
export function monthOutflowTotal(season: SeasonData, month: MonthKey): number {
  return monthExpensesTotal(season, month) + dinnersCostForMonth(season, month)
}

export function seasonTotals(season: SeasonData) {
  let totalReceived = 0
  let totalExpected = 0
  for (const month of MONTH_KEYS) {
    const s = summarizeMonth(season, month)
    totalReceived += s.totalReceived
    totalExpected += s.totalExpected
  }
  const dinners = seasonDinnerTotals(season)
  const debtsReceived = season.carriedDebts.reduce((sum, d) => sum + (d.settled?.amount ?? 0), 0)
  const totalExpenses = season.expenses.reduce((sum, e) => sum + e.amount, 0) + dinners.cost
  return {
    totalReceived,
    totalExpected,
    totalExpenses,
    dinnersReceived: dinners.received,
    dinnersCost: dinners.cost,
    debtsReceived,
    totalIn: totalReceived + dinners.received + debtsReceived,
  }
}

/**
 * Saldo em caixa no fim de cada mês (saldo transitado + entradas − saídas do mês).
 * `confirmedBalances[mês]` guarda, quando existe, um ajuste ao saldo TRANSITADO para
 * esse mês (não ao resultado final) — por isso as entradas/saídas do próprio mês
 * somam-se sempre por cima, em tempo real, mesmo num mês já ajustado à mão.
 */
export function computeLedgerBalance(season: SeasonData, uptoMonth: MonthKey): number {
  let balance = season.openingBalance
  for (const key of MONTH_KEYS) {
    const carryIn = season.confirmedBalances[key] ?? balance
    balance = roundCents(carryIn + monthIncomeTotal(season, key) - monthOutflowTotal(season, key))
    if (key === uptoMonth) break
  }
  return balance
}

/** Saldo final da época (último mês). */
export function seasonFinalBalance(season: SeasonData): number {
  return computeLedgerBalance(season, MONTH_KEYS[MONTH_KEYS.length - 1])
}

/**
 * Lê um valor em euros escrito à mão, aceitando vírgula decimal (4072,73) e
 * separador de milhares (4.072,73), como se escreve em Portugal.
 * Devolve undefined se o campo estiver vazio ou não for um número.
 */
export function parseAmount(input: string): number | undefined {
  let cleaned = input.trim().replace(/[\s€]/g, '')
  if (cleaned === '') return undefined
  if (cleaned.includes(',')) cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : undefined
}

/** Escreve um número para dentro de um campo de euros (vírgula decimal). */
export function amountToInput(value: number | undefined): string {
  if (value == null) return ''
  return String(value).replace('.', ',')
}

export function formatEuro(value: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value)
}
