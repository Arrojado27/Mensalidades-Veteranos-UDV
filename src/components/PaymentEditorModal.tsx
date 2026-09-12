import { useState } from 'react'
import { Sheet } from './Sheet'
import { amountToInput, parseAmount } from '../lib/calc'
import { PAYMENT_METHODS } from '../types'
import type { PaymentEntry, PaymentMethod, PaymentStatus } from '../types'

const STATUS_OPTIONS: [PaymentStatus, string][] = [
  ['paid', 'Pago'],
  ['pending', 'Por pagar'],
  ['exempt', 'Isento'],
]

const METHOD_ACTIVE_CLASSES: Record<PaymentMethod, string> = {
  mb: 'bg-brand-gold/25 text-brand-gold-dark ring-1 ring-brand-gold/50',
  transfer: 'bg-sky-500/15 text-sky-700 ring-1 ring-sky-500/40 dark:text-sky-400',
  cash: 'bg-ok-soft text-ok ring-1 ring-ok/40',
}

export function PaymentEditorModal({
  playerName,
  monthLabel,
  fee,
  entry,
  onSave,
  onClose,
}: {
  playerName: string
  monthLabel: string
  fee: number
  entry: PaymentEntry | undefined
  onSave: (entry: PaymentEntry) => void
  onClose: () => void
}) {
  // Abre-se este painel para registar um pagamento, por isso "Pago" vem escolhido;
  // um mês já marcado como isento mantém-se como está.
  const [status, setStatus] = useState<PaymentStatus>(
    entry?.status === 'exempt' ? 'exempt' : 'paid',
  )
  const [method, setMethod] = useState<PaymentMethod>(entry?.method ?? 'mb')
  const [amount, setAmount] = useState<string>(amountToInput(entry?.amount))
  const [note, setNote] = useState(entry?.note ?? '')

  function handleSave() {
    const parsedAmount = parseAmount(amount)
    const next: PaymentEntry = {
      status,
      ...(status === 'paid' ? { method, amount: parsedAmount } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    }
    onSave(next)
  }

  return (
    <Sheet
      title={playerName}
      subtitle={monthLabel}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="btn btn-soft flex-1">
            Cancelar
          </button>
          <button onClick={handleSave} className="btn btn-primary flex-1">
            Guardar
          </button>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-2">
        {STATUS_OPTIONS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setStatus(value)}
            className={`btn ${
              status === value
                ? value === 'paid'
                  ? 'bg-ok-soft text-ok ring-1 ring-ok/40'
                  : value === 'pending'
                    ? 'bg-danger-soft text-danger ring-1 ring-brand-red/30'
                    : 'btn-soft ring-1 ring-line'
                : 'btn-soft text-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {status === 'paid' && (
        <div className="mt-4 space-y-3">
          <div>
            <span className="label">Como pagou</span>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setMethod(key)}
                  className={`btn px-1 text-[12px] ${
                    method === key ? METHOD_ACTIVE_CLASSES[key] : 'btn-soft text-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="label">Valor pago (mensalidade: {fee}€)</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder={String(fee)}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="field"
            />
          </label>
        </div>
      )}

      <label className="mt-4 block">
        <span className="label">Nota (opcional)</span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ex: pagamento parcial, extra para o jantar..."
          className="field"
        />
      </label>
    </Sheet>
  )
}
