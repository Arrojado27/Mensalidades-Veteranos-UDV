import { useState } from 'react'
import { amountToInput, parseAmount } from '../lib/calc'

/**
 * Campo de euros que aceita vírgula decimal (4072,73). Guarda o texto tal como é
 * escrito e só devolve o número quando este é válido, para não apagar o que se
 * está a escrever a meio (ex: "12,").
 */
export function MoneyInput({
  value,
  onChange,
  placeholder,
  className,
  ariaLabel,
}: {
  value: number | undefined
  onChange: (value: number | undefined) => void
  placeholder?: string
  className?: string
  ariaLabel?: string
}) {
  const [text, setText] = useState(() => amountToInput(value))

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d.,]/g, '')
        setText(raw)
        onChange(parseAmount(raw))
      }}
      className={className}
    />
  )
}
