import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { amountForEntry, computeLedgerBalance, formatEuro, monthExpensesTotal } from './calc'
import { SEASON_MONTHS } from '../types'
import type { SeasonData } from '../types'

function cellLabel(season: SeasonData, playerId: string, monthKey: (typeof SEASON_MONTHS)[number]['key']) {
  const player = season.players.find((p) => p.id === playerId)
  const entry = player?.payments[monthKey]
  if (!entry || entry.status === 'pending') return ''
  if (entry.status === 'exempt') return '-'
  const label = entry.method === 'mb' ? 'MB' : '€'
  const amount = amountForEntry(entry.status, entry.amount, season.monthlyFee)
  if (entry.amount != null && entry.amount !== season.monthlyFee) {
    return `${label} (${amount}€)`
  }
  return label
}

function playerTotal(season: SeasonData, playerId: string) {
  return SEASON_MONTHS.reduce((sum, m) => {
    const player = season.players.find((p) => p.id === playerId)
    const entry = player?.payments[m.key]
    return sum + amountForEntry(entry?.status ?? 'pending', entry?.amount, season.monthlyFee)
  }, 0)
}

function fileNameBase(season: SeasonData) {
  const date = new Date().toISOString().slice(0, 10)
  const seasonSlug = season.label.replace(/\//g, '-')
  return `mensalidades-udv-${seasonSlug}-${date}`
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function exportSeasonToExcel(season: SeasonData) {
  const players = [...season.players].sort((a, b) => a.name.localeCompare(b.name, 'pt'))

  const mensalidadesRows = players.map((p) => {
    const row: Record<string, string | number> = { Jogador: p.name }
    for (const m of SEASON_MONTHS) {
      row[`${m.label} ${m.year}`] = cellLabel(season, p.id, m.key)
    }
    row['Total pago (€)'] = playerTotal(season, p.id)
    row['No grupo'] = p.active ? 'Sim' : 'Não'
    return row
  })

  const despesasRows = season.expenses
    .slice()
    .sort((a, b) => SEASON_MONTHS.findIndex((m) => m.key === a.month) - SEASON_MONTHS.findIndex((m) => m.key === b.month))
    .map((e) => {
      const m = SEASON_MONTHS.find((mm) => mm.key === e.month)!
      return { Mês: `${m.label} ${m.year}`, Descrição: e.description, 'Valor (€)': e.amount }
    })

  const saldoRows = SEASON_MONTHS.map((m) => ({
    Mês: `${m.label} ${m.year}`,
    'Despesas do mês (€)': monthExpensesTotal(season, m.key),
    'Saldo em caixa (€)': computeLedgerBalance(season, m.key),
    Ajustado: season.confirmedBalances[m.key] !== undefined ? 'Sim' : 'Não',
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mensalidadesRows), 'Mensalidades')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(despesasRows), 'Despesas')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(saldoRows), 'Saldo')

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  download(new Blob([out], { type: 'application/octet-stream' }), `${fileNameBase(season)}.xlsx`)
}

export function exportSeasonToPDF(season: SeasonData) {
  const players = [...season.players].sort((a, b) => a.name.localeCompare(b.name, 'pt'))
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const brandRed: [number, number, number] = [164, 31, 36]

  doc.setFontSize(16)
  doc.setTextColor(...brandRed)
  doc.text(`Veteranos U.D.V. — Mapa de Mensalidades ${season.label}`, 40, 40)
  doc.setFontSize(9)
  doc.setTextColor(90)
  doc.text(`Mensalidade: ${formatEuro(season.monthlyFee)}/mês  ·  Gerado a ${new Date().toLocaleDateString('pt-PT')}`, 40, 56)

  autoTable(doc, {
    startY: 70,
    head: [['Jogador', ...SEASON_MONTHS.map((m) => `${m.label}`), 'Total (€)']],
    body: players.map((p) => [
      p.name + (p.active ? '' : ' (saiu)'),
      ...SEASON_MONTHS.map((m) => cellLabel(season, p.id, m.key)),
      playerTotal(season, p.id).toString(),
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: brandRed, textColor: 255 },
    columnStyles: { 0: { cellWidth: 110 } },
  })

  doc.addPage()
  doc.setFontSize(16)
  doc.setTextColor(...brandRed)
  doc.text('Despesas & Saldo', 40, 40)

  const despesasBody = season.expenses
    .slice()
    .sort((a, b) => SEASON_MONTHS.findIndex((m) => m.key === a.month) - SEASON_MONTHS.findIndex((m) => m.key === b.month))
    .map((e) => {
      const m = SEASON_MONTHS.find((mm) => mm.key === e.month)!
      return [`${m.label} ${m.year}`, e.description, formatEuro(e.amount)]
    })

  autoTable(doc, {
    startY: 60,
    head: [['Mês', 'Descrição', 'Valor']],
    body: despesasBody,
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: brandRed, textColor: 255 },
    tableWidth: 300,
  })

  const saldoBody = SEASON_MONTHS.map((m) => [
    `${m.label} ${m.year}`,
    formatEuro(monthExpensesTotal(season, m.key)),
    formatEuro(computeLedgerBalance(season, m.key)),
    season.confirmedBalances[m.key] !== undefined ? 'Ajustado' : 'Automático',
  ])

  const afterDespesasY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

  autoTable(doc, {
    startY: afterDespesasY + 30,
    head: [['Mês', 'Despesas do mês', 'Saldo em caixa', '']],
    body: saldoBody,
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: brandRed, textColor: 255 },
    tableWidth: 340,
  })

  doc.save(`${fileNameBase(season)}.pdf`)
}
