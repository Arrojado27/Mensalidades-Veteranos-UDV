import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../components/Header'
import { ConfirmDialog, Sheet } from '../components/Sheet'
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
import type { CloudVersion } from '../lib/cloud'
import type { AppData } from '../types'

/** O suficiente para se reconhecer uma cópia sem a abrir. */
function versionSummary(snapshot: AppData) {
  const current =
    snapshot.seasons.find((s) => s.id === snapshot.currentSeasonId) ?? snapshot.seasons[0]
  if (!current) return 'Sem épocas'
  const owed = openDebts(current).reduce((sum, d) => sum + d.amount, 0)
  return `${current.label} · ${current.players.length} jogadores · saldo ${formatEuro(
    seasonFinalBalance(current),
  )} · ${formatEuro(owed)} por cobrar`
}

function nextSeasonLabel(startYear: number) {
  const next = startYear + 1
  return `${next}/${String(next + 1).slice(2)}`
}

export function Settings() {
  const { data, season, setData, setMonthlyFee, setDinnerFees, createSeason, cloud, cloudActions } =
    useData()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [feeInput, setFeeInput] = useState(amountToInput(season.monthlyFee))
  const [playerFeeInput, setPlayerFeeInput] = useState(amountToInput(season.dinnerPlayerFee))
  const [guestFeeInput, setGuestFeeInput] = useState(amountToInput(season.dinnerGuestFee))
  const [childFeeInput, setChildFeeInput] = useState(amountToInput(season.dinnerChildFee))
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [showNewSeason, setShowNewSeason] = useState(false)
  const [newSeasonLabel, setNewSeasonLabel] = useState('')
  const [carryPlayers, setCarryPlayers] = useState(true)
  const [carryBalance, setCarryBalance] = useState(true)
  const [carryDebts, setCarryDebts] = useState(true)
  const [pinDraft, setPinDraft] = useState('')
  const [theme, setTheme] = useState<ThemePreference>(() => loadThemePreference())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [versions, setVersions] = useState<CloudVersion[] | null>(null)
  const [versionsError, setVersionsError] = useState<string | null>(null)
  const [restoring, setRestoring] = useState<CloudVersion | null>(null)

  function openVersions() {
    setShowVersions(true)
    setVersions(null)
    setVersionsError(null)
    cloudActions
      .listVersions()
      .then(setVersions)
      .catch((err: { code?: string }) => {
        setVersions([])
        setVersionsError(
          err?.code === 'permission-denied'
            ? 'Falta publicar as regras novas do Firestore para as cópias poderem ser lidas.'
            : 'Não foi possível ler as cópias guardadas.',
        )
      })
  }

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
      dinnerChildFee: season.dinnerChildFee,
      carryPlayers,
      carryBalance,
      carryDebts,
    })
    setShowNewSeason(false)
    setNewSeasonLabel('')
  }

  const carryOptions: [boolean, (v: boolean) => void, string][] = [
    [
      carryPlayers,
      setCarryPlayers,
      `Transportar os ${season.players.filter((p) => p.active).length} jogadores ativos (sem histórico de pagamentos)`,
    ],
    [carryBalance, setCarryBalance, `Começar com o saldo de ${season.label}: ${formatEuro(finalBalance)}`],
    [
      carryDebts,
      setCarryDebts,
      `Transportar ${pendingDebts.length} mensalidade${pendingDebts.length === 1 ? '' : 's'} em atraso (${formatEuro(pendingTotal)})`,
    ],
  ]

  return (
    <div className="flex flex-1 flex-col">
      <Header title="Definições" subtitle="Mensalidades Veteranos U.D.V." badge={season.label} />

      <div className="flex flex-col gap-3.5 px-4 pt-4">
        <section className="card card-glass p-4">
          <h2 className="section-title mb-3">Época</h2>
          {data.seasons.length > 1 && (
            <label className="mb-3 block">
              <span className="label">Época a ver</span>
              <select
                value={data.currentSeasonId}
                onChange={(e) => setData((prev) => ({ ...prev, currentSeasonId: e.target.value }))}
                className="field"
              >
                {data.seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block">
            <span className="label">Valor da mensalidade</span>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={feeInput}
                onChange={(e) => setFeeInput(e.target.value)}
                className="field min-w-0 flex-1"
              />
              <button
                onClick={() => {
                  const v = parseAmount(feeInput)
                  if (v != null && v > 0) setMonthlyFee(v)
                }}
                className="btn btn-primary shrink-0"
              >
                Guardar
              </button>
            </div>
          </label>
          <button onClick={openNewSeason} className="btn btn-soft mt-3 w-full">
            Criar nova época
          </button>
        </section>

        <section className="card card-glass p-4">
          <h2 className="section-title mb-3">Jantares</h2>
          <div className="grid grid-cols-3 gap-2">
            {([
              ['€ jogador', playerFeeInput, setPlayerFeeInput],
              ['€ convidado', guestFeeInput, setGuestFeeInput],
              ['€ criança', childFeeInput, setChildFeeInput],
            ] as const).map(([label, value, setValue]) => (
              <label key={label} className="min-w-0">
                <span className="label">{label}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="field"
                />
              </label>
            ))}
          </div>
          <button
            onClick={() => {
              const playerFee = parseAmount(playerFeeInput)
              const guestFee = parseAmount(guestFeeInput)
              const childFee = parseAmount(childFeeInput)
              if (
                playerFee != null &&
                guestFee != null &&
                childFee != null &&
                playerFee >= 0 &&
                guestFee >= 0 &&
                childFee >= 0
              ) {
                setDinnerFees(playerFee, guestFee, childFee)
              }
            }}
            className="btn btn-primary mt-2 w-full"
          >
            Guardar
          </button>
          <p className="mt-2 text-[12px] text-subtle">
            Valores usados nos jantares novos. Cada jantar guarda os preços praticados nessa data.
          </p>
        </section>

        <section className="card card-glass p-4">
          <h2 className="section-title mb-2">Pagamentos em atraso</h2>
          <p className="mb-3 text-[13px] text-muted">
            {openDebtCount > 0
              ? `${openDebtCount} mensalidade${openDebtCount === 1 ? '' : 's'} de épocas anteriores por cobrar.`
              : 'Sem atrasados de épocas anteriores por cobrar.'}
          </p>
          <Link to="/atrasados" className="btn btn-soft w-full">
            Abrir atrasados
          </Link>
        </section>

        <section className="card card-glass p-4">
          <h2 className="section-title mb-3">Aspeto</h2>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => {
                  setTheme(key)
                  saveThemePreference(key)
                  applyTheme(key)
                }}
                className={`btn px-1 text-[13px] ${theme === key ? 'btn-primary' : 'btn-soft text-muted'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-subtle">
            No automático, a app acompanha o modo claro/escuro do telemóvel.
          </p>
        </section>

        <section className="card card-glass p-4">
          <h2 className="section-title mb-3">Segurança do acesso</h2>
          {data.pin ? (
            <div className="flex items-center justify-between">
              <span className="text-[14px]">Bloqueio por PIN ativo</span>
              <button
                onClick={() => setData((prev) => ({ ...prev, pin: undefined }))}
                className="text-[13px] font-semibold text-danger"
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
                className="field min-w-0 flex-1"
              />
              <button
                onClick={() => {
                  if (pinDraft.length >= 4) {
                    setData((prev) => ({ ...prev, pin: pinDraft }))
                    setPinDraft('')
                  }
                }}
                className="btn btn-primary shrink-0"
              >
                Ativar
              </button>
            </div>
          )}
        </section>

        <section className="card card-glass p-4">
          <h2 className="section-title mb-2">Relatórios</h2>
          <p className="mb-3 text-[13px] text-muted">
            Exporta o mapa de mensalidades, jantares, despesas e saldo para partilhar ou imprimir.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => import('../lib/exportReports').then((m) => m.exportSeasonToExcel(season))}
              className="btn btn-primary flex-1"
            >
              Excel (.xlsx)
            </button>
            <button
              onClick={() => import('../lib/exportReports').then((m) => m.exportSeasonToPDF(season))}
              className="btn btn-soft flex-1"
            >
              PDF
            </button>
          </div>
        </section>

        {cloud.ready && (
          <section className="card card-glass p-4">
            <h2 className="section-title mb-2">Sincronização</h2>
            {cloud.email ? (
              <>
                <p className="text-[13px] text-muted">
                  Ligado como <span className="font-semibold text-ink">{cloud.email}</span>.
                </p>
                <p className="mt-1 text-[12px] text-subtle">
                  {cloud.status === 'saving'
                    ? 'A guardar...'
                    : cloud.status === 'error'
                      ? cloud.error
                      : cloud.lastSync
                        ? `Guardado na nuvem às ${cloud.lastSync.toLocaleTimeString('pt-PT', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}`
                        : 'A ligar...'}
                </p>
                <button onClick={openVersions} className="btn btn-soft mt-3 w-full">
                  Cópias guardadas na nuvem
                </button>
                <p className="mt-2 text-[12px] leading-relaxed text-subtle">
                  A app guarda as últimas 20 cópias, uma de dez em dez minutos de utilização, mais
                  uma sempre que se escolhe entre a nuvem e o aparelho. Dá para voltar a qualquer
                  uma delas.
                </p>
                <button
                  onClick={() => void cloudActions.signOut()}
                  className="btn btn-soft mt-3 w-full"
                >
                  Terminar sessão neste aparelho
                </button>
              </>
            ) : (
              <>
                <p className="mb-3 text-[13px] leading-relaxed text-muted">
                  Entra com a tua conta para os dados ficarem guardados fora do telemóvel e
                  acompanharem qualquer aparelho onde entres.
                </p>
                <label className="mb-2 block">
                  <span className="label">Email</span>
                  <input
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="field"
                  />
                </label>
                <label className="mb-3 block">
                  <span className="label">Palavra-passe</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field"
                  />
                </label>
                <button
                  disabled={signingIn || !email || !password}
                  onClick={() => {
                    setSigningIn(true)
                    cloudActions
                      .signIn(email, password)
                      .then(() => setPassword(''))
                      .catch(() => {})
                      .finally(() => setSigningIn(false))
                  }}
                  className="btn btn-primary w-full disabled:opacity-50"
                >
                  {signingIn ? 'A entrar...' : 'Entrar'}
                </button>
                {cloud.error && <p className="mt-2 text-[12px] text-danger">{cloud.error}</p>}
              </>
            )}
          </section>
        )}

        <section className="card card-glass p-4">
          <h2 className="section-title mb-2">Cópia de segurança</h2>
          <p className="mb-3 text-[13px] leading-relaxed text-muted">
            Os dados ficam guardados apenas neste telemóvel. Faz um export regularmente para não
            perderes o histórico se trocares de aparelho.
          </p>
          <div className="flex gap-2">
            <button onClick={() => exportBackup(data)} className="btn btn-primary flex-1">
              Exportar backup
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="btn btn-soft flex-1">
              Importar backup
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImport}
              className="hidden"
            />
          </div>
          {importMsg && <p className="mt-2 text-[12px] text-muted">{importMsg}</p>}
        </section>

        <section className="card card-glass border-brand-red/25 p-4">
          <h2 className="section-title mb-3 text-danger">Zona perigosa</h2>
          <button onClick={() => setConfirmReset(true)} className="btn btn-danger w-full">
            Repor dados de origem
          </button>
        </section>

        <p className="pb-2 text-center text-[11px] text-subtle">
          Mensalidades Veteranos U.D.V. · dados guardados apenas neste dispositivo
        </p>
      </div>

      {showNewSeason && (
        <Sheet
          title="Criar nova época"
          subtitle="A época anterior fica guardada e podes voltar a ela quando quiseres."
          onClose={() => setShowNewSeason(false)}
          footer={
            <>
              <button onClick={() => setShowNewSeason(false)} className="btn btn-soft flex-1">
                Cancelar
              </button>
              <button onClick={handleCreateSeason} className="btn btn-primary flex-1">
                Criar
              </button>
            </>
          }
        >
          <label className="block">
            <span className="label">Nome da época</span>
            <input
              type="text"
              value={newSeasonLabel}
              onChange={(e) => setNewSeasonLabel(e.target.value)}
              placeholder="Ex: 2026/27"
              className="field"
            />
            <span className="mt-1.5 block text-[12px] text-subtle">
              Arranca em setembro de {startYearFromLabel(newSeasonLabel || season.label)}.
            </span>
          </label>

          <div className="mt-3 flex flex-col gap-2">
            {carryOptions.map(([checked, setChecked, label]) => (
              <label
                key={label}
                className={`flex items-start gap-2.5 rounded-2xl px-3 py-2.5 text-[13px] leading-snug transition-colors ${
                  checked ? 'bg-brand-red/[0.07]' : 'bg-ink/[0.03]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#a41f24]"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </Sheet>
      )}

      {cloud.conflict && (
        <Sheet
          title="Há dados na nuvem e neste telemóvel"
          subtitle="Escolhe quais ficam. O outro lado é substituído — nada é apagado sem esta escolha."
          onClose={() => {}}
          footer={
            <>
              <button onClick={() => cloudActions.keepLocal()} className="btn btn-soft flex-1">
                Ficam os deste telemóvel
              </button>
              <button onClick={() => cloudActions.keepCloud()} className="btn btn-primary flex-1">
                Ficam os da nuvem
              </button>
            </>
          }
        >
          <div className="flex flex-col gap-2">
            <div className="card-flat p-3">
              <p className="text-[12px] font-semibold text-subtle">NA NUVEM</p>
              <p className="mt-1 text-[13px]">
                {cloud.conflict.data.seasons.length} época
                {cloud.conflict.data.seasons.length === 1 ? '' : 's'} ·{' '}
                {cloud.conflict.data.seasons.reduce((n, s) => n + s.players.length, 0)} jogadores
              </p>
              <p className="text-[12px] text-subtle">
                {cloud.conflict.updatedAt
                  ? `Guardado a ${cloud.conflict.updatedAt.toLocaleString('pt-PT')}`
                  : 'Sem data'}
                {cloud.conflict.device ? ` · ${cloud.conflict.device}` : ''}
              </p>
            </div>
            <div className="card-flat p-3">
              <p className="text-[12px] font-semibold text-subtle">NESTE TELEMÓVEL</p>
              <p className="mt-1 text-[13px]">
                {data.seasons.length} época{data.seasons.length === 1 ? '' : 's'} ·{' '}
                {data.seasons.reduce((n, s) => n + s.players.length, 0)} jogadores
              </p>
            </div>
          </div>
        </Sheet>
      )}

      {showVersions && (
        <Sheet
          title="Cópias guardadas"
          subtitle="Voltar a um estado anterior dos dados"
          onClose={() => setShowVersions(false)}
          scroll
        >
          {versions === null ? (
            <p className="py-6 text-center text-[13px] text-muted">A ler as cópias...</p>
          ) : versionsError ? (
            <p className="py-6 text-center text-[13px] text-danger">{versionsError}</p>
          ) : versions.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted">
              Ainda não há cópias. A primeira é guardada na próxima gravação.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {versions.map((v) => (
                <li key={v.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold">
                      {v.savedAt
                        ? v.savedAt.toLocaleString('pt-PT', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Sem data'}
                      {v.device ? ` · ${v.device}` : ''}
                    </p>
                    <p className="mt-0.5 text-[12px] text-muted">{versionSummary(v.data)}</p>
                    {v.reason && <p className="text-[11px] text-subtle">{v.reason}</p>}
                  </div>
                  <button
                    onClick={() => setRestoring(v)}
                    className="btn btn-soft shrink-0 px-3 py-1.5 text-[12px]"
                  >
                    Repor
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Sheet>
      )}

      {restoring && (
        <ConfirmDialog
          title="Voltar a esta cópia?"
          description={`Os dados passam a ser os de ${
            restoring.savedAt ? restoring.savedAt.toLocaleString('pt-PT') : 'esta cópia'
          } — ${versionSummary(
            restoring.data,
          )}. O estado atual fica guardado como cópia, por isso dá para voltar atrás.`}
          confirmLabel="Repor"
          onClose={() => setRestoring(null)}
          onConfirm={() => {
            void cloudActions.restoreVersion(restoring)
            setRestoring(null)
            setShowVersions(false)
          }}
        />
      )}

      {confirmReset && (
        <ConfirmDialog
          title="Repor dados de origem?"
          description="Isto apaga tudo o que alteraste — épocas novas, jantares e atrasados incluídos — e volta aos dados iniciais importados do documento."
          confirmLabel="Repor tudo"
          onClose={() => setConfirmReset(false)}
          onConfirm={() => {
            const fresh = resetData()
            setData(() => fresh)
            setConfirmReset(false)
          }}
        />
      )}
    </div>
  )
}
