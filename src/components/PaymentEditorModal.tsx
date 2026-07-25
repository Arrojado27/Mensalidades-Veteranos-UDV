import { useState } from 'react'
import type { PaymentEntry, PaymentMethod, PaymentStatus } from '../types'

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
  const [status, setStatus] = useState<PaymentStatus>(entry?.status ?? 'pending')
  const [method, setMethod] = useState<PaymentMethod>(entry?.method ?? 'mb')
  const [amount, setAmount] = useState<string>(entry?.amount != null ? String(entry.amount) : '')
  const [note, setNote] = useState(entry?.note ?? '')

  function handleSave() {
    const parsedAmount = amount.trim() === '' ? undefined : Number(amount)
    const next: PaymentEntry = {
      status,
      ...(status === 'paid' ? { method, amount: parsedAmount } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    }
    onSave(next)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-[480px] rounded-t-3xl bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-2xl dark:bg-[#221f20]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-black/10 dark:bg-white/15" />
        <p className="text-[13px] font-medium text-black/50 dark:text-white/50">{monthLabel}</p>
        <h2 className="mb-4 text-lg font-bold text-black dark:text-white">{playerName}</h2>

        <div className="mb-4 grid grid-cols-3 gap-2">
          {(
            [
              ['paid', 'Pago'],
              ['pending', 'Por pagar'],
              ['exempt', 'Isento'],
            ] as [PaymentStatus, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setStatus(value)}
              className={`rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                status === value
                  ? 'bg-brand-red text-white'
                  : 'bg-black/[0.04] text-black/60 dark:bg-white/10 dark:text-white/60'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {status === 'paid' && (
          <div className="mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMethod('mb')}
                className={`rounded-xl py-2.5 text-sm font-semibold ${
                  method === 'mb'
                    ? 'bg-brand-gold/25 text-brand-gold-dark ring-1 ring-brand-gold/50'
                    : 'bg-black/[0.04] text-black/50 dark:bg-white/10 dark:text-white/50'
                }`}
              >
                Multibanco
              </button>
              <button
                onClick={() => setMethod('cash')}
                className={`rounded-xl py-2.5 text-sm font-semibold ${
                  method === 'cash'
                    ? 'bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/40'
                    : 'bg-black/[0.04] text-black/50 dark:bg-white/10 dark:text-white/50'
                }`}
              >
                Numerário (€)
              </button>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block text-black/50 dark:text-white/50">
                Valor pago (mensalidade: {fee}€)
              </span>
              <input
                type="number"
                inputMode="decimal"
                placeholder={String(fee)}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-[15px] outline-none focus:border-brand-red dark:border-white/15 dark:bg-white/5"
              />
            </label>
          </div>
        )}

        <label className="mb-5 block text-sm">
          <span className="mb-1 block text-black/50 dark:text-white/50">Nota (opcional)</span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex: pagamento parcial, extra para o jantar..."
            className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-[15px] outline-none focus:border-brand-red dark:border-white/15 dark:bg-white/5"
          />
        </label>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-black/[0.04] py-3 text-sm font-semibold text-black/60 dark:bg-white/10 dark:text-white/60"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 rounded-xl bg-brand-red py-3 text-sm font-semibold text-white shadow-sm active:bg-brand-red-dark"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
