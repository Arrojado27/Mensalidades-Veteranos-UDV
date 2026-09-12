export type MonthKey = 'set' | 'out' | 'nov' | 'dez' | 'jan' | 'fev' | 'mar' | 'abr' | 'mai' | 'jun'

export interface MonthInfo {
  key: MonthKey
  label: string
  long: string
  year: number
}

/**
 * Meses da época, por ordem. `yearOffset` 0 = ano civil em que a época começa
 * (Set..Dez), 1 = ano seguinte (Jan..Jun). `monthNumber` segue o JS (0 = janeiro).
 */
export const MONTH_TEMPLATE: {
  key: MonthKey
  label: string
  long: string
  yearOffset: 0 | 1
  monthNumber: number
}[] = [
  { key: 'set', label: 'Set', long: 'Setembro', yearOffset: 0, monthNumber: 8 },
  { key: 'out', label: 'Out', long: 'Outubro', yearOffset: 0, monthNumber: 9 },
  { key: 'nov', label: 'Nov', long: 'Novembro', yearOffset: 0, monthNumber: 10 },
  { key: 'dez', label: 'Dez', long: 'Dezembro', yearOffset: 0, monthNumber: 11 },
  { key: 'jan', label: 'Jan', long: 'Janeiro', yearOffset: 1, monthNumber: 0 },
  { key: 'fev', label: 'Fev', long: 'Fevereiro', yearOffset: 1, monthNumber: 1 },
  { key: 'mar', label: 'Mar', long: 'Março', yearOffset: 1, monthNumber: 2 },
  { key: 'abr', label: 'Abr', long: 'Abril', yearOffset: 1, monthNumber: 3 },
  { key: 'mai', label: 'Mai', long: 'Maio', yearOffset: 1, monthNumber: 4 },
  { key: 'jun', label: 'Jun', long: 'Junho', yearOffset: 1, monthNumber: 5 },
]

export const MONTH_KEYS: MonthKey[] = MONTH_TEMPLATE.map((m) => m.key)

export const DEFAULT_SEASON_START_YEAR = 2025
export const DEFAULT_DINNER_PLAYER_FEE = 10
export const DEFAULT_DINNER_GUEST_FEE = 18

/** Meses de uma época que arranca em `startYear` (Set desse ano a Jun do seguinte). */
export function monthsForStartYear(startYear: number): MonthInfo[] {
  return MONTH_TEMPLATE.map((m) => ({
    key: m.key,
    label: m.label,
    long: m.long,
    year: startYear + m.yearOffset,
  }))
}

export type PaymentMethod = 'transfer' | 'cash'
export type PaymentStatus = 'paid' | 'pending' | 'exempt'

/** Forma como o dinheiro entrou. Multibanco e transferência contam como o mesmo. */
export const PAYMENT_METHODS: { key: PaymentMethod; label: string; short: string }[] = [
  { key: 'transfer', label: 'Transferência', short: 'T' },
  { key: 'cash', label: 'Numerário', short: '€' },
]

/** Dados gravados antes da junção ainda podem trazer 'mb'. */
function normalizeMethod(method: PaymentMethod | 'mb' | undefined): PaymentMethod | undefined {
  if (method === undefined) return undefined
  return method === 'mb' ? 'transfer' : method
}

export function methodLabel(method: PaymentMethod | undefined): string {
  return PAYMENT_METHODS.find((m) => m.key === normalizeMethod(method))?.label ?? 'Numerário'
}

export function methodShort(method: PaymentMethod | undefined): string {
  return PAYMENT_METHODS.find((m) => m.key === normalizeMethod(method))?.short ?? '€'
}

export interface PaymentEntry {
  status: PaymentStatus
  method?: PaymentMethod
  /** Valor efetivamente pago, só quando difere da mensalidade padrão da época. */
  amount?: number
  note?: string
}

export interface Player {
  id: string
  name: string
  active: boolean
  payments: Partial<Record<MonthKey, PaymentEntry>>
}

export interface ExpenseItem {
  id: string
  month: MonthKey
  description: string
  amount: number
}

/** Um mês por pagar transportado de uma época anterior. */
export interface CarriedDebt {
  id: string
  /** Id do jogador (mantém-se igual ao da época de origem). */
  playerId: string
  /** Nome à data do transporte, caso o jogador venha a ser removido. */
  playerName: string
  fromSeasonId: string
  fromSeasonLabel: string
  month: MonthKey
  monthLabel: string
  amount: number
  /** Preenchido ao liquidar; o dinheiro entra no mês indicado DESTA época. */
  settled?: {
    month: MonthKey
    date: string
    method: PaymentMethod
    amount: number
  }
}

export type AttendeeKind = 'player' | 'guest'

export interface DinnerAttendee {
  id: string
  kind: AttendeeKind
  /** Só para jogadores do grupo. */
  playerId?: string
  name: string
  paid: boolean
  method?: PaymentMethod
  /** Valor cobrado, quando difere do preço normal (jogador/convidado). */
  amount?: number
}

export interface Dinner {
  id: string
  /** Data do jantar, ISO 'YYYY-MM-DD'. */
  date: string
  /** Equipa adversária. */
  opponent: string
  note?: string
  /** Preços praticados neste jantar (snapshot, para não mexer no histórico). */
  playerFee: number
  guestFee: number
  /** Custo total pago ao restaurante, quando conhecido. */
  cost?: number
  attendees: DinnerAttendee[]
}

export interface SeasonData {
  id: string
  label: string
  /** Ano civil em que a época arranca (2025 para a época 2025/26). */
  startYear: number
  monthlyFee: number
  /** Quanto paga um jogador do grupo por cada jantar. */
  dinnerPlayerFee: number
  /** Quanto paga um convidado por cada jantar. */
  dinnerGuestFee: number
  openingBalance: number
  players: Player[]
  expenses: ExpenseItem[]
  dinners: Dinner[]
  carriedDebts: CarriedDebt[]
  confirmedBalances: Partial<Record<MonthKey, number>>
}

export interface AppData {
  version: number
  seasons: SeasonData[]
  currentSeasonId: string
  pin?: string
}
