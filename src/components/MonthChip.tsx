import { methodShort } from '../types'
import type { PaymentEntry } from '../types'

const SIZE_CLASSES = {
  sm: 'h-[22px] min-w-[22px] px-1 text-[9px]',
  md: 'h-10 min-w-10 px-2 text-[12px]',
} as const

export function MonthChip({
  entry,
  size = 'sm',
  onClick,
  label,
}: {
  entry: PaymentEntry | undefined
  size?: keyof typeof SIZE_CLASSES
  onClick?: () => void
  label?: string
}) {
  const status = entry?.status ?? 'pending'
  const base = `inline-flex shrink-0 items-center justify-center rounded-xl font-bold ${SIZE_CLASSES[size]}`

  let classes = base
  let text = ''

  if (status === 'paid') {
    text = methodShort(entry?.method)
    classes += ' bg-ok-soft text-ok ring-1 ring-ok/25'
  } else if (status === 'exempt') {
    text = '·'
    classes += ' bg-ink/[0.04] text-subtle ring-1 ring-line'
  } else {
    text = '!'
    classes += ' bg-brand-red/10 text-brand-red ring-1 ring-brand-red/25'
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={`${classes} transition-transform active:scale-90`}
      >
        {text}
      </button>
    )
  }

  return (
    <span className={classes} aria-hidden="true">
      {text}
    </span>
  )
}
