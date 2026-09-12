import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import {
  amountForEntry,
  attendeeFee,
  computeLedgerBalance,
  debtsIncomeForMonth,
  dinnersCostForMonth,
  dinnersIncomeForMonth,
  formatDinnerDate,
  formatEuro,
  monthExpensesTotal,
  monthLabel,
  monthOutflowTotal,
  seasonMonths,
  sortedDinners,
  summarizeDinner,
  summarizeMonth,
} from './calc'
import { MONTH_KEYS, methodLabel, methodShort } from '../types'
import type { MonthKey, SeasonData } from '../types'

function cellLabel(season: SeasonData, playerId: string, monthKey: MonthKey) {
  const player = season.players.find((p) => p.id === playerId)
  const entry = player?.payments[monthKey]
  if (!entry || entry.status === 'pending') return ''
  if (entry.status === 'exempt') return '-'
  const label = methodShort(entry.method)
  const amount = amountForEntry(entry.status, entry.amount, season.monthlyFee)
  if (entry.amount != null && entry.amount !== season.monthlyFee) {
    return `${label} (${amount}€)`
  }
  return label
}

function playerTotal(season: SeasonData, playerId: string) {
  return MONTH_KEYS.reduce((sum, key) => {
    const player = season.players.find((p) => p.id === playerId)
    const entry = player?.payments[key]
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
  const months = seasonMonths(season)

  const mensalidadesRows = players.map((p) => {
    const row: Record<string, string | number> = { Jogador: p.name }
    for (const m of months) {
      row[`${m.label} ${m.year}`] = cellLabel(season, p.id, m.key)
    }
    row['Total pago (€)'] = playerTotal(season, p.id)
    row['No grupo'] = p.active ? 'Sim' : 'Não'
    return row
  })

  const despesasRows = season.expenses
    .slice()
    .sort((a, b) => MONTH_KEYS.indexOf(a.month) - MONTH_KEYS.indexOf(b.month))
    .map((e) => ({
      Mês: monthLabel(season, e.month),
      Descrição: e.description,
      'Valor (€)': e.amount,
    }))

  const jantaresRows = sortedDinners(season).flatMap((d) => {
    const s = summarizeDinner(d)
    const header = {
      Data: formatDinnerDate(d.date),
      Adversário: d.opponent,
      Quem: `— ${s.players} jogadores + ${s.guests} convidados —`,
      Tipo: '',
      'A pagar (€)': s.expected,
      Pago: `${s.received}€ recebidos`,
      Método: d.cost != null ? `custo ${d.cost}€` : '',
    }
    const rows = [...d.attendees]
      .sort((a, b) => a.name.localeCompare(b.name, 'pt'))
      .map((a) => ({
        Data: formatDinnerDate(d.date),
        Adversário: d.opponent,
        Quem: a.name,
        Tipo: a.kind === 'guest' ? 'Convidado' : 'Jogador',
        'A pagar (€)': attendeeFee(d, a),
        Pago: a.paid ? 'Sim' : 'Não',
        Método: a.paid ? methodLabel(a.method) : '',
      }))
    return [header, ...rows]
  })

  const atrasadosRows = season.carriedDebts.map((d) => ({
    Jogador: d.playerName,
    'Mês em falta': d.monthLabel,
    'Época de origem': d.fromSeasonLabel,
    'Valor (€)': d.amount,
    Estado: d.settled ? `Pago (${monthLabel(season, d.settled.month)})` : 'Por cobrar',
    'Recebido (€)': d.settled?.amount ?? '',
  }))

  const saldoRows = months.map((m) => ({
    Mês: `${m.label} ${m.year}`,
    'Mensalidades (€)': summarizeMonth(season, m.key).totalReceived,
    'Jantares recebidos (€)': dinnersIncomeForMonth(season, m.key),
    'Atrasados cobrados (€)': debtsIncomeForMonth(season, m.key),
    'Despesas (€)': monthExpensesTotal(season, m.key),
    'Custo jantares (€)': dinnersCostForMonth(season, m.key),
    'Saldo em caixa (€)': computeLedgerBalance(season, m.key),
    Ajustado: season.confirmedBalances[m.key] !== undefined ? 'Sim' : 'Não',
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mensalidadesRows), 'Mensalidades')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(despesasRows), 'Despesas')
  if (jantaresRows.length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(jantaresRows), 'Jantares')
  }
  if (atrasadosRows.length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(atrasadosRows), 'Atrasados')
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(saldoRows), 'Saldo')

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  download(new Blob([out], { type: 'application/octet-stream' }), `${fileNameBase(season)}.xlsx`)
}

export function exportSeasonToPDF(season: SeasonData) {
  const players = [...season.players].sort((a, b) => a.name.localeCompare(b.name, 'pt'))
  const months = seasonMonths(season)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const brandRed: [number, number, number] = [164, 31, 36]

  function lastY() {
    return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  }

  doc.setFontSize(16)
  doc.setTextColor(...brandRed)
  doc.text(`Veteranos U.D.V. — Mapa de Mensalidades ${season.label}`, 40, 40)
  doc.setFontSize(9)
  doc.setTextColor(90)
  doc.text(
    `Mensalidade: ${formatEuro(season.monthlyFee)}/mês  ·  Jantar: ${formatEuro(season.dinnerPlayerFee)} jogador / ${formatEuro(season.dinnerGuestFee)} convidado  ·  Gerado a ${new Date().toLocaleDateString('pt-PT')}`,
    40,
    56,
  )
  doc.text('Legenda: T = Transferência (inclui Multibanco) · € = Numerário · - = Isento', 40, 68)

  autoTable(doc, {
    startY: 82,
    head: [['Jogador', ...months.map((m) => m.label), 'Total (€)']],
    body: players.map((p) => [
      p.name + (p.active ? '' : ' (saiu)'),
      ...months.map((m) => cellLabel(season, p.id, m.key)),
      playerTotal(season, p.id).toString(),
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: brandRed, textColor: 255 },
    columnStyles: { 0: { cellWidth: 110 } },
  })

  const dinners = sortedDinners(season)
  if (dinners.length > 0) {
    doc.addPage()
    doc.setFontSize(16)
    doc.setTextColor(...brandRed)
    doc.text('Jantares', 40, 40)

    autoTable(doc, {
      startY: 60,
      head: [['Data', 'Adversário', 'Jogadores', 'Convidados', 'A receber', 'Recebido', 'Em falta', 'Custo']],
      body: dinners.map((d) => {
        const s = summarizeDinner(d)
        return [
          formatDinnerDate(d.date),
          d.opponent,
          String(s.players),
          String(s.guests),
          formatEuro(s.expected),
          formatEuro(s.received),
          formatEuro(s.missing),
          d.cost != null ? formatEuro(d.cost) : '—',
        ]
      }),
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: brandRed, textColor: 255 },
    })

    for (const d of dinners) {
      const attendees = [...d.attendees].sort((a, b) => a.name.localeCompare(b.name, 'pt'))
      if (attendees.length === 0) continue
      autoTable(doc, {
        startY: lastY() + 22,
        head: [[`${formatDinnerDate(d.date)} · vs ${d.opponent || 'adversário'}`, 'Tipo', 'Valor', 'Pagou']],
        body: attendees.map((a) => [
          a.name,
          a.kind === 'guest' ? 'Convidado' : 'Jogador',
          formatEuro(attendeeFee(d, a)),
          a.paid ? `Sim (${methodLabel(a.method).toLowerCase()})` : 'Não',
        ]),
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: brandRed, textColor: 255 },
        tableWidth: 420,
      })
    }
  }

  if (season.carriedDebts.length > 0) {
    doc.addPage()
    doc.setFontSize(16)
    doc.setTextColor(...brandRed)
    doc.text('Pagamentos em atraso de épocas anteriores', 40, 40)

    autoTable(doc, {
      startY: 60,
      head: [['Jogador', 'Mês em falta', 'Época', 'Valor', 'Estado']],
      body: season.carriedDebts.map((d) => [
        d.playerName,
        d.monthLabel,
        d.fromSeasonLabel,
        formatEuro(d.amount),
        d.settled ? `Pago em ${monthLabel(season, d.settled.month)}` : 'Por cobrar',
      ]),
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: brandRed, textColor: 255 },
      tableWidth: 500,
    })
  }

  doc.addPage()
  doc.setFontSize(16)
  doc.setTextColor(...brandRed)
  doc.text('Despesas & Saldo', 40, 40)

  const despesasBody = season.expenses
    .slice()
    .sort((a, b) => MONTH_KEYS.indexOf(a.month) - MONTH_KEYS.indexOf(b.month))
    .map((e) => [monthLabel(season, e.month), e.description, formatEuro(e.amount)])

  autoTable(doc, {
    startY: 60,
    head: [['Mês', 'Descrição', 'Valor']],
    body: despesasBody,
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: brandRed, textColor: 255 },
    tableWidth: 300,
  })

  const saldoBody = months.map((m) => [
    `${m.label} ${m.year}`,
    formatEuro(
      summarizeMonth(season, m.key).totalReceived +
        dinnersIncomeForMonth(season, m.key) +
        debtsIncomeForMonth(season, m.key),
    ),
    formatEuro(monthOutflowTotal(season, m.key)),
    formatEuro(computeLedgerBalance(season, m.key)),
    season.confirmedBalances[m.key] !== undefined ? 'Ajustado' : 'Automático',
  ])

  autoTable(doc, {
    startY: lastY() + 30,
    head: [['Mês', 'Entradas', 'Saídas', 'Saldo em caixa', '']],
    body: saldoBody,
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: brandRed, textColor: 255 },
    tableWidth: 420,
  })

  doc.save(`${fileNameBase(season)}.pdf`)
}
