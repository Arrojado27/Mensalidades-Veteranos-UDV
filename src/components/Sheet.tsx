import type { ReactNode } from 'react'

/**
 * Painel que sobe de baixo — o padrão usado em toda a app para criar ou editar
 * qualquer coisa. Fecha ao tocar fora.
 */
export function Sheet({
  title,
  subtitle,
  onClose,
  children,
  footer,
  scroll = false,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  scroll?: boolean
}) {
  return (
    <div
      className="scrim fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`sheet flex flex-col p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] ${
          scroll ? 'max-h-[82vh]' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 shrink-0 rounded-full bg-ink/15" />
        <h2 className="shrink-0 text-[17px] font-bold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 shrink-0 text-[13px] text-muted">{subtitle}</p>}
        <div className={`mt-4 ${scroll ? 'min-h-0 flex-1 overflow-y-auto' : ''}`}>{children}</div>
        {footer && <div className="mt-4 flex shrink-0 gap-2">{footer}</div>}
      </div>
    </div>
  )
}

/** Diálogo central, para confirmar ações destrutivas. */
export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Confirmar',
  onConfirm,
  onClose,
}: {
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <div
      className="scrim fixed inset-0 z-50 flex items-center justify-center p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="card card-glass w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[16px] font-bold tracking-tight">{title}</h2>
        <p className="mt-2 mb-5 text-[13px] leading-relaxed text-muted">{description}</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn btn-soft flex-1">
            Cancelar
          </button>
          <button onClick={onConfirm} className="btn btn-primary flex-1">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
