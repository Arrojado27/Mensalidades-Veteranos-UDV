import type {
  CarriedDebt,
  PaymentMethod,
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

/**
 * Forma de pagamento que o jogador mais usou nesta época — serve de sugestão
 * ao marcar um pagamento rápido, para não obrigar a escolher de cada vez.
 */
export function mostUsedMethod(player: Player, fallback: PaymentMethod = 'cash'): PaymentMethod {
  const counts = new Map<PaymentMethod, number>()
  for (const key of MONTH_KEYS) {
    const entry = player.payments[key]
    if (entry?.status !== 'paid' || !entry.method) continue
    counts.set(entry.method, (counts.get(entry.method) ?? 0) + 1)
  }
  let best: PaymentMethod | undefined
  let bestCount = 0
  for (const [method, count] of counts) {
    if (count > bestCount) {
      best = method
      bestCount = count
    }
  }
  return best ?? fallback
}

/**
 * Mensalidades que entraram na caixa num mês — dinheiro real, não competência.
 * Uma mensalidade conta no mês em que foi recebida (`receivedIn`); sem esse
 * campo, conta no mês a que diz respeito, que é como era antes de o campo
 * existir e o que mantém os saldos antigos inalterados.
 *
 * Ao contrário do summarizeMonth, não salta quem já não está no grupo: para
 * saber quanto está na caixa, o dinheiro de quem saiu conta como qualquer
 * outro.
 */
export function feesCashForMonth(season: SeasonData, month: MonthKey): number {
  let total = 0
  for (const player of season.players) {
    for (const key of MONTH_KEYS) {
      const entry = player.payments[key]
      if (entry?.status !== 'paid') continue
      if ((entry.receivedIn ?? key) !== month) continue
      total += amountForEntry(entry.status, entry.amount, season.monthlyFee)
    }
  }
  return total
}

export interface AdvancePayment {
  playerId: string
  playerName: string
  /** Meses já pagos que ainda não chegaram, sem mês de entrada em caixa marcado. */
  months: MonthKey[]
  total: number
}

/**
 * Mensalidades de meses que ainda não chegaram, já pagas, e cujo dinheiro não
 * tem mês de entrada marcado — ou seja, está a contar no saldo de um mês futuro
 * em vez do mês em que foi recebido. É o que fica por arrumar depois de o saldo
 * passar a contar por caixa.
 *
 * Só olha para o futuro de propósito: um mês passado pago é indistinguível de
 * um mês passado pago a horas, e a app não guarda a data em que cada registo
 * foi feito.
 */
export function advancePayments(season: SeasonData, today: Date = new Date()): AdvancePayment[] {
  const current = getCurrentMonthKey(season, today)
  const out: AdvancePayment[] = []
  for (const player of season.players) {
    const months: MonthKey[] = []
    let total = 0
    for (const key of MONTH_KEYS) {
      if (key === current) continue
      if (isMonthElapsed(season, key, today)) continue
      const entry = player.payments[key]
      if (entry?.status !== 'paid') continue
      if (entry.receivedIn) continue
      months.push(key)
      total += amountForEntry(entry.status, entry.amount, season.monthlyFee)
    }
    if (months.length > 0) out.push({ playerId: player.id, playerName: player.name, months, total })
  }
  return out.sort((a, b) => a.playerName.localeCompare(b.playerName, 'pt'))
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
  if (attendee.kind === 'guest') return dinner.guestFee
  if (attendee.kind === 'child') return dinner.childFee
  return dinner.playerFee
}

export interface DinnerSummary {
  players: number
  guests: number
  children: number
  expected: number
  received: number
  missing: number
  unpaid: DinnerAttendee[]
}

export function summarizeDinner(dinner: Dinner): DinnerSummary {
  let players = 0
  let guests = 0
  let children = 0
  let expected = 0
  let received = 0
  const unpaid: DinnerAttendee[] = []

  for (const a of dinner.attendees) {
    if (a.kind === 'guest') guests += 1
    else if (a.kind === 'child') children += 1
    else players += 1
    const fee = attendeeFee(dinner, a)
    expected += fee
    if (a.paid) received += fee
    else unpaid.push(a)
  }

  return { players, guests, children, expected, received, missing: expected - received, unpaid }
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
    feesCashForMonth(season, month) +
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
 * Lê um valor em euros escrito à mão, como se escreve em Portugal.
 * Devolve undefined se o campo estiver vazio ou não for um número.
 *
 *   450        -> 450
 *   1250       -> 1250
 *   1.250      -> 1250      (ponto de milhares, sem casas decimais)
 *   1.250,00   -> 1250
 *   4.072,73   -> 4072,73
 *   12,27      -> 12,27
 *   1.5        -> 1,5       (ponto solto com 1 ou 2 casas vale como decimal)
 *
 * O caso do `1.250` é o que faltava: sem vírgula pelo meio, o ponto era lido
 * como decimal e uma conta de 1.250 € ficava gravada como 1,25 € — mil vezes
 * menor, sem aviso nenhum. Um grupo de exatamente três dígitos depois do ponto
 * só pode ser separador de milhares; um grupo de um ou dois é casa decimal, que
 * é o que sai de um teclado que só dá ponto.
 */
export function parseAmount(input: string): number | undefined {
  const cleaned = input.trim().replace(/[\s\u00a0€]/g, '')
  if (cleaned === '') return undefined
  let normalized: string
  if (cleaned.includes(',')) {
    // Há vírgula decimal, logo os pontos que existam são de milhares.
    normalized = cleaned.replace(/\./g, '').replace(',', '.')
  } else if (/^-?[1-9]\d{0,2}(\.\d{3})+$/.test(cleaned)) {
    // Só pontos, em grupos de três: 1.250 e 1.250.500 são milhares.
    normalized = cleaned.replace(/\./g, '')
  } else {
    normalized = cleaned
  }
  const value = Number(normalized)
  return Number.isFinite(value) ? value : undefined
}

/** Escreve um número para dentro de um campo de euros (vírgula decimal). */
export function amountToInput(value: number | undefined): string {
  if (value == null) return ''
  return String(value).replace('.', ',')
}

const EURO_FORMAT = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
  useGrouping: true,
})

export function formatEuro(value: number) {
  // O pt-PT separa os milhares com espaço; em contas escritas à mão usa-se o
  // ponto, que é também o que se lê melhor num ecrã pequeno.
  return EURO_FORMAT.format(value).replace(/[\s\u00a0\u202f]/g, (match, offset, full) =>
    offset === full.length - 2 ? match : '.',
  )
}
