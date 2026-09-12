import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../components/Header'
import { useData } from '../lib/DataContext'
import {
  amountToInput,
  buildCarriedDebts,
  formatEuro,
  openDebts,
  parseAmount,
  seasonFinalBalance,
} from '../lib/calc'
import { exportBackup, importBackup, resetData, startYearFromLabel } from '../lib/storage'
import { THEME_OPTIONS, applyTheme, loadThemePreference, saveThemePreference } from '../lib/theme'
import type { ThemePreference } from '../lib/theme'

function nextSeasonLabel(startYear: number) {
  const next = startYear + 1
  return `${next}/${String(next + 1).slice(2)}`
}

export function Settings() {
  const { data, season, setData, setMonthlyFee, setDinnerFees, createSeason } = useData()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [feeInput, setFeeInput] = useState(amountToInput(season.monthlyFee))
  const [playerFeeInput, setPlayerFeeInput] = useState(amountToInput(season.dinnerPlayerFee))
  const [guestFeeInput, setGuestFeeInput] = useState(amountToInput(season.dinnerGuestFee))
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [showNewSeason, setShowNewSeason] = useState(false)
  const [newSeasonLabel, setNewSeasonLabel] = useState('')
  const [carryPlayers, setCarryPlayers] = useState(true)
  const [carryBalance, setCarryBalance] = useState(true)
  const [carryDebts, setCarryDebts] = useState(true)
  const [pinDraft, setPinDraft] = useState('')
  const [theme, setTheme] = useState<ThemePreference>(() => loadThemePreference())

  const pendingDebts = useMemo(() => buildCarriedDebts(season), [season])
  const pendingTotal = pendingDebts.reduce((sum, d) => sum + d.amount, 0)
  const finalBalance = useMemo(() => seasonFinalBalance(season), [season])
  const openDebtCount = openDebts(season).length

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    importBackup(file)
      .then((imported) => {
        setData(() => imported)
        setImportMsg('Backup importado com sucesso.')
      })
      .catch((err) => setImportMsg(err.message))
    e.target.value = ''
  }

  function openNewSeason() {
    setNewSeasonLabel(nextSeasonLabel(season.startYear))
    setCarryPlayers(true)
    setCarryBalance(true)
    setCarryDebts(true)
    setShowNewSeason(true)
  }

  function handleCreateSeason() {
    const label = newSeasonLabel.trim()
    if (!label) return
    createSeason({
      label,
      startYear: startYearFromLabel(label),
      monthlyFee: season.monthlyFee,
      dinnerPlayerFee: season.dinnerPlayerFee,
      dinnerGuestFee: season.dinnerGuestFee,
      carryPlayers,
      carryBalance,
      carryDebts,
    })
    setShowNewSeason(false)
    setNewSeasonLabel('')
  }

  return (
    <div className="flex flex-1 flex-col pb-4">
      <Header title="Definições" subtitle="Mensalidades Veteranos U.D.V." />

      <div className="flex flex-col gap-4 px-4 pt-4">
        <section className="rounded-2xl border border-black/[0.06] p-4 dark:border-white/10">
          <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-black/40 dark:text-white/40">
            Época atual
          </h2>
          {data.seasons.length > 1 && (
            <select
              value={data.currentSeasonId}
              onChange={(e) => setData((prev) => ({ ...prev, currentSeasonId: e.target.value }))}
              className="mb-3 w-full rounded-xl border border-black/10 px-3 py-2.5 text-[15px] dark:border-white/15 dark:bg-white/5"
            >
              {data.seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          )}
          <label className="block text-sm">
            <span className="mb-1 block text-black/50 dark:text-white/50">Valor da mensalidade</span>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={feeInput}
                onChange={(e) => setFeeInput(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-black/10 px-3 py-2.5 text-[15px] outline-none focus:border-brand-red dark:border-white/15 dark:bg-white/5"
              />
              <button
                onClick={() => {
                  const v = parseAmount(feeInput)
                  if (v != null && v > 0) setMonthlyFee(v)
                }}
                className="rounded-xl bg-brand-red px-4 text-sm font-semibold text-white"
              >
                Guardar
              </button>
            </div>
          </label>

          {!showNewSeason ? (
            <button
              onClick={openNewSeason}
              className="mt-3 w-full rounded-xl bg-black/[0.04] py-2.5 text-sm font-semibold text-black/60 dark:bg-white/10 dark:text-white/60"
            >
              Criar nova época
            </button>
          ) : (
            <div className="mt-3 rounded-xl bg-black/[0.03] p-3 dark:bg-white/5">
              <label className="mb-2 block text-sm">
                <span className="mb-1 block text-black/50 dark:text-white/50">Nome da época</span>
                <input
                  type="text"
                  value={newSeasonLabel}
                  onChange={(e) => setNewSeasonLabel(e.target.value)}
                  placeholder="Ex: 2026/27"
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-[14px] dark:border-white/15 dark:bg-white/5"
                />
                <span className="mt-1 block text-[11px] text-black/40 dark:text-white/40">
                  Arranca em setembro de {startYearFromLabel(newSeasonLabel || season.label)}.
                </span>
              </label>

              <label className="flex items-start gap-2 py-1.5 text-[13px]">
                <input
                  type="checkbox"
                  checked={carryPlayers}
                  onChange={(e) => setCarryPlayers(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#a41f24]"
                />
                <span>
                  Transportar os {season.players.filter((p) => p.active).length} jogadores ativos
                  (sem histórico de pagamentos)
                </span>
              </label>

              <label className="flex items-start gap-2 py-1.5 text-[13px]">
                <input
                  type="checkbox"
                  checked={carryBalance}
                  onChange={(e) => setCarryBalance(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#a41f24]"
                />
                <span>Começar com o saldo em caixa de {season.label}: {formatEuro(finalBalance)}</span>
              </label>

              <label className="flex items-start gap-2 py-1.5 text-[13px]">
                <input
                  type="checkbox"
                  checked={carryDebts}
                  onChange={(e) => setCarryDebts(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#a41f24]"
                />
                <span>
                  Transportar {pendingDebts.length} mensalidade{pendingDebts.length === 1 ? '' : 's'} em
                  atraso ({formatEuro(pendingTotal)}) para cobrar na nova época
                </span>
              </label>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setShowNewSeason(false)}
                  className="flex-1 rounded-lg bg-black/[0.05] py-2 text-sm font-semibold dark:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateSeason}
                  className="flex-1 rounded-lg bg-brand-red py-2 text-sm font-semibold text-white"
                >
                  Criar
                </button>
              </div>
              <p className="mt-2 text-[11px] text-black/40 dark:text-white/40">
                A época anterior fica guardada e podes voltar a ela a qualquer momento neste ecrã.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-black/[0.06] p-4 dark:border-white/10">
          <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-black/40 dark:text-white/40">
            Jantares
          </h2>
          <div className="flex gap-2">
            <label className="min-w-0 flex-1 text-sm">
              <span className="mb-1 block text-black/50 dark:text-white/50">€ jogador</span>
              <input
                type="text"
                inputMode="decimal"
                value={playerFeeInput}
                onChange={(e) => setPlayerFeeInput(e.target.value)}
                className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-[15px] outline-none focus:border-brand-red dark:border-white/15 dark:bg-white/5"
              />
            </label>
            <label className="min-w-0 flex-1 text-sm">
              <span className="mb-1 block text-black/50 dark:text-white/50">€ convidado</span>
              <input
                type="text"
                inputMode="decimal"
                value={guestFeeInput}
                onChange={(e) => setGuestFeeInput(e.target.value)}
                className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-[15px] outline-none focus:border-brand-red dark:border-white/15 dark:bg-white/5"
              />
            </label>
            <button
              onClick={() => {
                const playerFee = parseAmount(playerFeeInput)
                const guestFee = parseAmount(guestFeeInput)
                if (playerFee != null && guestFee != null && playerFee >= 0 && guestFee >= 0) {
                  setDinnerFees(playerFee, guestFee)
                }
              }}
              className="mt-[22px] h-[42px] shrink-0 rounded-xl bg-brand-red px-4 text-sm font-semibold text-white"
            >
              Guardar
            </button>
          </div>
          <p className="mt-2 text-[12px] text-black/40 dark:text-white/40">
            Valores usados nos jantares novos. Cada jantar guarda os preços praticados nessa data.
          </p>
        </section>

        <section className="rounded-2xl border border-black/[0.06] p-4 dark:border-white/10">
          <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-black/40 dark:text-white/40">
            Pagamentos em atraso
          </h2>
          <p className="mb-3 text-[13px] text-black/50 dark:text-white/50">
            {openDebtCount > 0
              ? `${openDebtCount} mensalidade${openDebtCount === 1 ? '' : 's'} de épocas anteriores por cobrar.`
              : 'Sem atrasados de épocas anteriores por cobrar.'}
          </p>
          <Link
            to="/atrasados"
            className="block rounded-xl bg-black/[0.04] py-2.5 text-center text-sm font-semibold text-black/60 dark:bg-white/10 dark:text-white/60"
          >
            Abrir atrasados
          </Link>
        </section>

        <section className="rounded-2xl border border-black/[0.06] p-4 dark:border-white/10">
          <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-black/40 dark:text-white/40">
            Aspeto
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => {
                  setTheme(key)
                  saveThemePreference(key)
                  applyTheme(key)
                }}
                className={`rounded-xl px-1 py-2.5 text-[13px] font-semibold ${
                  theme === key
                    ? 'bg-brand-red text-white'
                    : 'bg-black/[0.04] text-black/60 dark:bg-white/10 dark:text-white/60'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-black/40 dark:text-white/40">
            No automático, a app acompanha o modo claro/escuro do telemóvel.
          </p>
        </section>

        <section className="rounded-2xl border border-black/[0.06] p-4 dark:border-white/10">
          <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-black/40 dark:text-white/40">
            Segurança do acesso
          </h2>
          {data.pin ? (
            <div className="flex items-center justify-between">
              <span className="text-[14px]">Bloqueio por PIN ativo</span>
              <button
                onClick={() => setData((prev) => ({ ...prev, pin: undefined }))}
                className="text-sm font-semibold text-brand-red"
              >
                Desativar
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="tel"
                inputMode="numeric"
                maxLength={6}
                value={pinDraft}
                onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, ''))}
                placeholder="Criar PIN (4-6 dígitos)"
                className="min-w-0 flex-1 rounded-xl border border-black/10 px-3 py-2.5 text-[15px] outline-none focus:border-brand-red dark:border-white/15 dark:bg-white/5"
              />
              <button
                onClick={() => {
                  if (pinDraft.length >= 4) {
                    setData((prev) => ({ ...prev, pin: pinDraft }))
                    setPinDraft('')
                  }
                }}
                className="rounded-xl bg-brand-red px-4 text-sm font-semibold text-white"
              >
                Ativar
              </button>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-black/[0.06] p-4 dark:border-white/10">
          <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-black/40 dark:text-white/40">
            Relatórios
          </h2>
          <p className="mb-3 text-[13px] text-black/50 dark:text-white/50">
            Exporta o mapa de mensalidades, jantares, despesas e saldo para partilhar, imprimir ou
            continuar a trabalhar noutro programa.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => import('../lib/exportReports').then((m) => m.exportSeasonToExcel(season))}
              className="flex-1 rounded-xl bg-brand-red py-2.5 text-sm font-semibold text-white"
            >
              Excel (.xlsx)
            </button>
            <button
              onClick={() => import('../lib/exportReports').then((m) => m.exportSeasonToPDF(season))}
              className="flex-1 rounded-xl bg-black/[0.04] py-2.5 text-sm font-semibold text-black/60 dark:bg-white/10 dark:text-white/60"
            >
              PDF
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-black/[0.06] p-4 dark:border-white/10">
          <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-black/40 dark:text-white/40">
            Cópia de segurança
          </h2>
          <p className="mb-3 text-[13px] text-black/50 dark:text-white/50">
            Os dados ficam guardados apenas neste telemóvel. Faz um export regularmente para não
            perderes o histórico se trocares de aparelho.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => exportBackup(data)}
              className="flex-1 rounded-xl bg-brand-red py-2.5 text-sm font-semibold text-white"
            >
              Exportar backup
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 rounded-xl bg-black/[0.04] py-2.5 text-sm font-semibold text-black/60 dark:bg-white/10 dark:text-white/60"
            >
              Importar backup
            </button>
            <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImport} className="hidden" />
          </div>
          {importMsg && <p className="mt-2 text-[12px] text-black/50 dark:text-white/50">{importMsg}</p>}
        </section>

        <section className="rounded-2xl border border-red-200 p-4 dark:border-red-900/40">
          <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-brand-red">Zona perigosa</h2>
          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="w-full rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-brand-red dark:border-red-900/40"
            >
              Repor dados de origem
            </button>
          ) : (
            <div>
              <p className="mb-3 text-[13px] text-black/50 dark:text-white/50">
                Isto apaga tudo o que alteraste (incluindo épocas novas e jantares) e volta aos dados
                iniciais importados do documento. Confirmas?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmReset(false)}
                  className="flex-1 rounded-xl bg-black/[0.04] py-2.5 text-sm font-semibold dark:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const fresh = resetData()
                    setData(() => fresh)
                    setConfirmReset(false)
                  }}
                  className="flex-1 rounded-xl bg-brand-red py-2.5 text-sm font-semibold text-white"
                >
                  Repor tudo
                </button>
              </div>
            </div>
          )}
        </section>

        <p className="pb-2 text-center text-[11px] text-black/30 dark:text-white/30">
          Mensalidades Veteranos U.D.V. · dados guardados apenas neste dispositivo
        </p>
      </div>
    </div>
  )
}
