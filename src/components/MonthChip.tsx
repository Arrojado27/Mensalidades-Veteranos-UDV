import { methodShort } from '../types'
import type { PaymentEntry } from '../types'

const SIZE_CLASSES = {
  sm: 'h-[24px] min-w-[24px] px-1.5 text-[10px]',
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
    classes += ' bg-ok-soft text-ok ring-1 ring-ok/45'
  } else if (status === 'exempt') {
    text = '·'
    classes += ' bg-ink/[0.05] text-subtle ring-1 ring-line'
  } else {
    text = '!'
    classes += ' bg-danger-soft text-danger ring-1 ring-danger/45'
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
