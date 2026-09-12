import { methodShort } from '../types'
import type { PaymentEntry } from '../types'

const SIZE_CLASSES = {
  sm: 'h-5 w-5 text-[9px]',
  md: 'h-9 w-9 text-[11px]',
} as const

export function MonthChip({
  entry,
  size = 'sm',
  onClick,
}: {
  entry: PaymentEntry | undefined
  size?: keyof typeof SIZE_CLASSES
  onClick?: () => void
}) {
  const status = entry?.status ?? 'pending'
  const base = `flex items-center justify-center rounded-full font-bold shrink-0 ${SIZE_CLASSES[size]}`

  let classes = base
  let label = ''

  if (status === 'paid') {
    label = methodShort(entry?.method)
    classes += ' bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-400'
  } else if (status === 'exempt') {
    label = '·'
    classes += ' bg-black/[0.03] text-black/20 dark:bg-white/5 dark:text-white/20'
  } else {
    label = '!'
    classes += ' bg-brand-red/10 text-brand-red ring-1 ring-brand-red/25'
  }

  if (onClick) {
    classes += ' cursor-pointer active:scale-90 transition-transform'
    return (
      <button type="button" onClick={onClick} className={classes}>
        {label}
      </button>
    )
  }

  return (
    <span className={classes} aria-hidden="true">
      {label}
    </span>
  )
}
