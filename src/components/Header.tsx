import type { ReactNode } from 'react'
import logo from '../assets/udv-logo.png'

/** Cabeçalho de topo de ecrã, sobre o fundo da app. */
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
    <header className="app-header flex items-center gap-3 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+14px)]">
      {onBack ? (
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] text-xl leading-none text-muted"
        >
          ‹
        </button>
      ) : (
        <img src={logo} alt="U.D.V." className="h-10 w-10 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[19px] font-bold leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="truncate text-[12px] text-muted">{subtitle}</p>}
      </div>
      {badge && (
        <span className="card shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold">
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
  const toneClass = tone === 'ok' ? 'text-ok' : tone === 'alert' ? 'text-danger' : 'text-ink'
  return (
    <div className="card card-glass px-3.5 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-subtle">{label}</p>
      <p className={`mt-0.5 text-[19px] font-bold tracking-tight ${toneClass}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] leading-tight text-subtle">{hint}</p>}
    </div>
  )
}

/**
 * Cinco variantes tiradas da paleta do clube — vermelho e dourado, cada um cheio
 * ou esbatido, mais um neutro.
 */
const AVATAR_VARIANTS = ['avatar-1', 'avatar-2', 'avatar-3', 'avatar-4', 'avatar-5']

/**
 * Iniciais do jogador, no lugar de uma fotografia. A cor vem da posição na
 * lista, para dois nomes seguidos nunca saírem iguais.
 */
export function Avatar({
  name,
  index = 0,
  size = 'md',
}: {
  name: string
  index?: number
  size?: 'sm' | 'md'
}) {
  // Primeira letra do primeiro nome e do apelido. Trata os nomes abreviados do
  // mapa ("A.Rocha" -> AR) e ignora alcunhas entre parênteses.
  const parts = name
    .trim()
    .split(/[\s.]+/)
    .filter((part) => part && !part.startsWith('('))
  const initials = (
    parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '?').slice(0, 2)
  ).toUpperCase()
  const box = size === 'sm' ? 'h-9 w-9 text-[12px]' : 'h-10 w-10 text-[13px]'
  return (
    <span
      className={`avatar ${AVATAR_VARIANTS[index % AVATAR_VARIANTS.length]} flex shrink-0 items-center justify-center rounded-full font-bold tracking-wide ${box}`}
    >
      {initials}
    </span>
  )
}
