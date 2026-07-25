export type MonthKey = 'set' | 'out' | 'nov' | 'dez' | 'jan' | 'fev' | 'mar' | 'abr' | 'mai' | 'jun'

export interface MonthInfo {
  key: MonthKey
  label: string
  year: number
}

export const SEASON_MONTHS: MonthInfo[] = [
  { key: 'set', label: 'Set', year: 2025 },
  { key: 'out', label: 'Out', year: 2025 },
  { key: 'nov', label: 'Nov', year: 2025 },
  { key: 'dez', label: 'Dez', year: 2025 },
  { key: 'jan', label: 'Jan', year: 2026 },
  { key: 'fev', label: 'Fev', year: 2026 },
  { key: 'mar', label: 'Mar', year: 2026 },
  { key: 'abr', label: 'Abr', year: 2026 },
  { key: 'mai', label: 'Mai', year: 2026 },
  { key: 'jun', label: 'Jun', year: 2026 },
]

export type PaymentMethod = 'mb' | 'cash'
export type PaymentStatus = 'paid' | 'pending' | 'exempt'

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

export interface SeasonData {
  id: string
  label: string
  monthlyFee: number
  openingBalance: number
  players: Player[]
  expenses: ExpenseItem[]
  confirmedBalances: Partial<Record<MonthKey, number>>
}

export interface AppData {
  version: number
  seasons: SeasonData[]
  currentSeasonId: string
  pin?: string
}
