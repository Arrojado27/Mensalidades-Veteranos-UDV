import { useState } from 'react'
import logo from '../assets/udv-logo.png'

export function LockScreen({ pin, onUnlock }: { pin: string; onUnlock: () => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (value === pin) {
      onUnlock()
    } else {
      setError(true)
      setValue('')
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 bg-brand-red px-8 text-center text-white">
      <img src={logo} alt="U.D.V." className="h-20 w-20" />
      <div>
        <h1 className="text-lg font-bold">Veteranos U.D.V.</h1>
        <p className="text-sm text-white/70">Introduz o PIN para aceder</p>
      </div>
      <form onSubmit={handleSubmit} className="flex w-full max-w-[220px] flex-col gap-3">
        <input
          autoFocus
          type="tel"
          inputMode="numeric"
          maxLength={6}
          value={value}
          onChange={(e) => {
            setError(false)
            setValue(e.target.value.replace(/\D/g, ''))
          }}
          className="rounded-xl border-2 border-white/30 bg-white/10 px-4 py-3 text-center text-2xl tracking-[0.4em] text-white outline-none placeholder:text-white/40"
          placeholder="····"
        />
        {error && <p className="text-sm text-white/90">PIN incorreto, tenta novamente.</p>}
        <button type="submit" className="rounded-xl bg-white py-3 text-sm font-semibold text-brand-red">
          Entrar
        </button>
      </form>
    </div>
  )
}
