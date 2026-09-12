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
 * Doze tons bem separados no círculo cromático. O jogador fica sempre com o
 * mesmo, para se distinguir na lista sem ser preciso ler as iniciais.
 */
const AVATAR_HUES = [4, 28, 45, 72, 110, 150, 172, 195, 220, 258, 290, 325]

function hueForName(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 100000
  }
  return AVATAR_HUES[hash % AVATAR_HUES.length]
}

/** Iniciais do jogador, com cor própria, no lugar de uma fotografia. */
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
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
      className={`avatar flex shrink-0 items-center justify-center rounded-full font-bold tracking-wide ${box}`}
      style={{ '--avatar-h': hueForName(name) } as React.CSSProperties}
    >
      {initials}
    </span>
  )
}
