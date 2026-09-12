import type { ReactNode } from 'react'
import logo from '../assets/udv-logo.png'

/** Cabeçalho de topo de ecrã. `badge` serve para um dado sempre à mão (mês, época). */
export function Header({
  title,
  subtitle,
  badge,
  onBack,
}: {
  title: string
  subtitle?: string
  badge?: ReactNode
  onBack?: () => void
}) {
  return (
    <header className="app-header flex items-center gap-3 px-4 pb-5 pt-[calc(env(safe-area-inset-top)+16px)]">
      {onBack ? (
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-xl leading-none"
        >
          ‹
        </button>
      ) : (
        <img src={logo} alt="U.D.V." className="h-11 w-11 shrink-0 drop-shadow-sm" />
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[18px] font-bold leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="truncate text-[12px] text-white/75">{subtitle}</p>}
      </div>
      {badge && (
        <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold ring-1 ring-white/20">
          {badge}
        </span>
      )}
    </header>
  )
}

/** Número em destaque, em grelha de 2 ou 3. */
export function StatTile({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string
  value: string
  hint?: string
  tone?: 'neutral' | 'ok' | 'alert'
}) {
  const toneClass =
    tone === 'ok' ? 'text-ok' : tone === 'alert' ? 'text-brand-red' : 'text-ink'
  return (
    <div className="card px-3.5 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-subtle">{label}</p>
      <p className={`mt-0.5 text-[19px] font-bold tracking-tight ${toneClass}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] leading-tight text-subtle">{hint}</p>}
    </div>
  )
}
