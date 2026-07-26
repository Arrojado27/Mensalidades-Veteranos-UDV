import type { ExpenseItem, MonthKey, Player, PaymentEntry, SeasonData } from '../types'
import { SEASON_MONTHS } from '../types'

/**
 * Notação compacta usada para transcrever o mapa de mensalidades 2025/26:
 * 'MB' = pago por Multibanco, 'E' = pago em numerário (€),
 * '.' = por pagar, 'x' = isento/não aplicável (fora do grupo nesse mês).
 * A ordem segue sempre SEASON_MONTHS (Set..Jun).
 */
type Token = 'MB' | 'E' | '.' | 'x'

function buildPayments(
  tokens: Token[],
  overrides?: Partial<Record<MonthKey, Partial<PaymentEntry>>>,
): Player['payments'] {
  const payments: Player['payments'] = {}
  SEASON_MONTHS.forEach((m, i) => {
    const t = tokens[i]
    let entry: PaymentEntry
    if (t === 'MB') entry = { status: 'paid', method: 'mb' }
    else if (t === 'E') entry = { status: 'paid', method: 'cash' }
    else if (t === 'x') entry = { status: 'exempt' }
    else entry = { status: 'pending' }
    if (overrides?.[m.key]) entry = { ...entry, ...overrides[m.key] }
    payments[m.key] = entry
  })
  return payments
}

let idCounter = 0
function nextId(prefix: string) {
  idCounter += 1
  return `${prefix}-${idCounter}`
}

function player(
  name: string,
  tokens: Token[],
  opts?: { active?: boolean; overrides?: Partial<Record<MonthKey, Partial<PaymentEntry>>> },
): Player {
  return {
    id: nextId('player'),
    name,
    active: opts?.active ?? true,
    payments: buildPayments(tokens, opts?.overrides),
  }
}

const players: Player[] = [
  player('Júlio Alvadia', ['MB', 'MB', 'E', 'E', 'E', 'E', 'MB', 'MB', '.', '.']),
  player('Carlos Fernandes', ['MB', 'MB', 'MB', 'MB', 'MB', 'MB', 'MB', 'MB', 'MB', 'MB'], {
    overrides: { jun: { amount: 120, note: 'Mensalidade + 100€ extra' } },
  }),
  player('Marco Batista', ['E', 'E', 'E', 'E', 'E', 'E', 'MB', 'MB', '.', '.']),
  player('Fanã', ['E', 'MB', 'MB', 'E', 'E', 'MB', 'MB', 'MB', 'E', 'E']),
  player('Hugo Santos', ['E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E']),
  player('Mourato', ['E', 'E', 'E', '.', '.', '.', '.', '.', '.', '.']),
  player('L.Grilo', ['E', 'E', 'MB', 'E', 'MB', 'MB', 'E', 'E', 'MB', 'MB']),
  player('R.Grilo', ['E', 'E', 'MB', 'E', 'MB', 'MB', 'E', 'E', 'MB', 'MB']),
  player('Ivo Lalim', ['MB', 'E', 'E', 'E', 'MB', '.', '.', '.', '.', '.']),
  player('Ima', ['E', 'E', 'E', 'MB', '.', 'MB', 'MB', 'MB', 'E', '.']),
  player('Dudu', ['E', 'MB', 'MB', 'MB', 'E', 'MB', 'MB', '.', '.', '.']),
  player('Pica', ['E', 'E', 'E', 'E', 'MB', 'E', 'E', 'MB', 'E', 'E']),
  player('Ganso', ['E', 'MB', 'MB', 'E', 'E', 'MB', 'MB', 'E', 'E', 'E']),
  player('Moisão', ['E', 'E', 'E', 'E', 'E', 'MB', 'MB', 'MB', '.', '.']),
  player('L.Baptista', ['E', 'E', 'E', 'E', 'E', 'E', 'E', 'MB', 'E', 'E']),
  player('Queirós', ['MB', 'MB', 'MB', 'MB', 'E', '.', '.', '.', '.', '.']),
  player('Chaves', ['E', 'MB', 'E', 'E', 'E', 'E', 'E', 'MB', 'MB', 'MB']),
  player('Hugo', ['E', 'MB', 'E', 'E', '.', '.', '.', '.', '.', '.']),
  player('Arrojado', ['MB', 'MB', 'E', 'E', 'E', 'E', 'E', 'E', 'E', '.']),
  player('César Baptista', ['E', 'E', 'MB', 'E', 'MB', 'MB', 'MB', 'MB', 'MB', '.']),
  player('T.Pedrosa', ['E', 'E', 'MB', 'E', 'E', 'E', 'MB', 'E', 'E', 'E']),
  player('Lança', ['E', 'E', 'MB', 'E', 'MB', 'MB', 'MB', 'MB', '.', '.']),
  player('Castro', ['MB', 'MB', 'MB', 'MB', 'MB', 'MB', '.', '.', '.', '.']),
  player('Elves Brito', ['MB', 'MB', 'E', 'E', 'MB', '.', '.', '.', '.', '.']),
  player('Vicente', ['MB', 'MB', 'MB', 'MB', 'MB', 'MB', 'MB', 'MB', 'E', '.']),
  player('Carlos Lopes', ['E', 'E', 'E', 'E', 'E', 'MB', 'MB', 'MB', '.', '.']),
  player('Carlos Landim (Pi)', ['E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E']),
  player('Trinca', ['MB', 'MB', 'E', 'MB', 'MB', 'E', 'MB', 'MB', 'E', 'MB']),
  player('A.Rocha', ['MB', 'MB', 'MB', 'MB', 'MB', 'MB', 'MB', 'MB', 'MB', 'MB']),
  player('Cortes', ['E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', '.']),
  player('Nelsinho', ['E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E']),
  player('Angel', ['E', 'E', 'E', 'E', 'E', '.', '.', '.', '.', '.']),
  player('Gustavo Oliveira', ['E', 'E', 'E', 'E', 'E', 'E', 'E', 'MB', 'MB', 'E'], {
    overrides: { jun: { amount: 40, note: 'Mensalidade + 20€ extra' } },
  }),
  player('Armando Sá', ['x', 'x', 'x', 'x', 'x', '.', '.', '.', '.', '.'], { active: false }),
  player('Rui Caneira', ['MB', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E']),
  player('Ramos', ['x', 'x', 'x', 'x', '.', '.', '.', '.', '.', '.'], { active: false }),
  player('Russo', ['E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E']),
  player('Barquinha', ['E', 'E', 'E', 'E', 'E', 'E', 'MB', '.', '.', '.']),
  player('Alberto', ['MB', 'MB', 'MB', 'E', 'E', 'E', 'MB', 'MB', 'MB', 'E']),
  player('Filipe Marques', ['MB', 'MB', 'MB', 'MB', 'MB', 'MB', 'MB', 'MB', 'E', 'E']),
  player('Rodrigo Guti', ['x', 'E', 'MB', 'MB', 'E', 'MB', 'MB', 'MB', 'E', 'MB']),
  player('Teixeira', ['x', 'x', 'x', 'E', 'E', '.', '.', '.', '.', '.'], {
    overrides: { dez: { amount: 10, note: 'Pagamento parcial (10€ de 20€)' } },
  }),
]

function expense(month: MonthKey, description: string, amount: number): ExpenseItem {
  return { id: nextId('expense'), month, description, amount }
}

const expenses: ExpenseItem[] = [
  expense('dez', 'Jantar 6/12', 400),
  expense('dez', 'Jantar 27/12', 30),
  expense('jan', 'Jantares', 450),
  expense('jan', '2 bolas', 63),
  expense('fev', 'Jantares', 450),
  expense('fev', 'Mala de primeiros socorros', 15),
  expense('fev', 'Árbitro', 10),
  expense('mar', 'Jantares', 260),
  expense('mar', 'Coletes', 38),
  expense('abr', 'Jantares', 350),
  expense('abr', 'Torneio Alenquer', 30),
  expense('jun', 'Jantares', 450),
  expense('jun', 'Árbitro', 50),
]

// Saldo TRANSITADO para cada mês (saldo real confirmado no documento original,
// menos as receitas/despesas desse mês) — ver computeLedgerBalance em calc.ts.
// Saldo a fim do mês, tal como no documento original: dez 2940, jan 3127,
// fev 3112, mar 3194, abr 3825, mai 3945, jun 4085.
const confirmedBalances: Partial<Record<MonthKey, number>> = {
  dez: 2600,
  jan: 2900,
  fev: 2927,
  mar: 2852,
  abr: 3605,
  mai: 3445,
  jun: 4065,
}

export function createSeedSeason(): SeasonData {
  return {
    id: 'season-2025-26',
    label: '2025/26',
    monthlyFee: 20,
    openingBalance: 0,
    players,
    expenses,
    confirmedBalances,
  }
}
