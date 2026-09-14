import type { AppData, PaymentEntry, PaymentMethod, SeasonData } from '../types'
import {
  DEFAULT_DINNER_CHILD_FEE,
  DEFAULT_DINNER_GUEST_FEE,
  DEFAULT_DINNER_PLAYER_FEE,
  DEFAULT_SEASON_START_YEAR,
  MONTH_KEYS,
} from '../types'
import { createSeedSeason } from '../data/seed'
import { monthExpensesTotal, summarizeMonth } from './calc'

const STORAGE_KEY = 'udv-veteranos-mensalidades-v1'
const DATA_VERSION = 4

function createInitialData(): AppData {
  const season = createSeedSeason()
  return {
    version: DATA_VERSION,
    seasons: [season],
    currentSeasonId: season.id,
  }
}

/** Ano de arranque a partir do rótulo da época ("2025/26" -> 2025). */
export function startYearFromLabel(label: string): number {
  const match = /(\d{4})/.exec(label)
  return match ? Number(match[1]) : DEFAULT_SEASON_START_YEAR
}

/**
 * Garante que uma época vinda de um backup antigo tem todos os campos novos
 * (ano de arranque, preços dos jantares, lista de jantares e dívidas transitadas).
 */
function normalizeSeason(season: SeasonData): SeasonData {
  return {
    ...season,
    startYear: season.startYear ?? startYearFromLabel(season.label),
    dinnerPlayerFee: season.dinnerPlayerFee ?? DEFAULT_DINNER_PLAYER_FEE,
    dinnerGuestFee: season.dinnerGuestFee ?? DEFAULT_DINNER_GUEST_FEE,
    dinnerChildFee: season.dinnerChildFee ?? DEFAULT_DINNER_CHILD_FEE,
    // Jantares gravados antes de haver preço de criança.
    dinners: (season.dinners ?? []).map((d) => ({
      ...d,
      childFee: d.childFee ?? season.dinnerChildFee ?? DEFAULT_DINNER_CHILD_FEE,
    })),
    carriedDebts: season.carriedDebts ?? [],
    expenses: season.expenses ?? [],
    players: season.players ?? [],
    confirmedBalances: season.confirmedBalances ?? {},
  }
}

/**
 * Antes da v2, `confirmedBalances[mês]` guardava o saldo FINAL do mês, o que
 * "congelava" o valor e ignorava despesas adicionadas depois. Converte para o
 * saldo TRANSITADO equivalente (ver computeLedgerBalance), preservando o valor
 * final já mostrado ao utilizador e passando a atualizar-se em tempo real daqui
 * para a frente.
 */
function migrateSeasonToV2(season: SeasonData): SeasonData {
  const confirmedBalances: SeasonData['confirmedBalances'] = {}
  for (const key of MONTH_KEYS) {
    const endValue = season.confirmedBalances[key]
    if (endValue === undefined) continue
    const income = summarizeMonth(season, key).totalReceived
    const expenses = monthExpensesTotal(season, key)
    confirmedBalances[key] = endValue - income + expenses
  }
  return { ...season, confirmedBalances }
}

/**
 * Multibanco e transferência passam a ser a mesma coisa: tudo o que estava
 * marcado como 'mb' fica como transferência.
 */
function migrateSeasonToV4(season: SeasonData): SeasonData {
  const fix = (method: string | undefined) => (method === 'mb' ? 'transfer' : method)
  return {
    ...season,
    players: season.players.map((p) => ({
      ...p,
      payments: Object.fromEntries(
        Object.entries(p.payments).map(([key, entry]) => [
          key,
          entry ? { ...entry, method: fix(entry.method) as PaymentEntry['method'] } : entry,
        ]),
      ),
    })),
    dinners: season.dinners.map((d) => ({
      ...d,
      attendees: d.attendees.map((a) => ({ ...a, method: fix(a.method) as PaymentEntry['method'] })),
    })),
    carriedDebts: season.carriedDebts.map((debt) =>
      debt.settled
        ? {
            ...debt,
            settled: { ...debt.settled, method: fix(debt.settled.method) as PaymentMethod },
          }
        : debt,
    ),
  }
}

/**
 * Põe os dados na forma atual, venham de onde vierem: do armazenamento deste
 * aparelho, de um backup ou da nuvem. Sem isto, dados gravados antes de um campo
 * existir voltam sem ele e as contas dão valores em falta.
 */
export function normalizeAppData(data: AppData): AppData {
  const version = data.version ?? 1
  if (version >= DATA_VERSION) {
    // Mesmo já na versão atual, garante a forma dos dados (backups manuais, etc.).
    return { ...data, seasons: data.seasons.map(normalizeSeason) }
  }
  const seasons = data.seasons
    .map(normalizeSeason)
    .map((s) => (version < 2 ? migrateSeasonToV2(s) : s))
    .map((s) => (version < 4 ? migrateSeasonToV4(s) : s))
  return { ...data, version: DATA_VERSION, seasons }
}

export function loadData(): AppData {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const initial = createInitialData()
    saveData(initial)
    return initial
  }
  try {
    const parsed = JSON.parse(raw) as AppData
    if (!parsed.seasons || parsed.seasons.length === 0) {
      return createInitialData()
    }
    const migrated = normalizeAppData(parsed)
    if ((parsed.version ?? 1) < DATA_VERSION) saveData(migrated)
    return migrated
  } catch {
    return createInitialData()
  }
}

export function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function exportBackup(data: AppData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `backup-mensalidades-udv-${date}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function importBackup(file: File): Promise<AppData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as AppData
        if (!parsed.seasons || !Array.isArray(parsed.seasons)) {
          reject(new Error('Ficheiro inválido: não parece ser um backup desta app.'))
          return
        }
        resolve(normalizeAppData(parsed))
      } catch {
        reject(new Error('Não foi possível ler o ficheiro. Confirma que é um backup .json válido.'))
      }
    }
    reader.onerror = () => reject(new Error('Erro ao ler o ficheiro.'))
    reader.readAsText(file)
  })
}

export function resetData(): AppData {
  const initial = createInitialData()
  saveData(initial)
  return initial
}
