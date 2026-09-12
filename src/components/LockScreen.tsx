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
    <div className="app-header flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
      <img src={logo} alt="U.D.V." className="h-24 w-24 drop-shadow-lg" />
      <div>
        <h1 className="text-[20px] font-bold tracking-tight">Veteranos U.D.V.</h1>
        <p className="mt-1 text-sm text-white/70">Introduz o PIN para aceder</p>
      </div>
      <form onSubmit={handleSubmit} className="flex w-full max-w-[240px] flex-col gap-3">
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
          className="rounded-2xl border border-white/25 bg-white/10 px-4 py-3.5 text-center text-2xl tracking-[0.4em] text-white outline-none backdrop-blur placeholder:text-white/40 focus:border-white/60"
          placeholder="····"
        />
        {error && <p className="text-sm text-white/90">PIN incorreto, tenta novamente.</p>}
        <button type="submit" className="btn bg-white py-3.5 text-brand-red">
          Entrar
        </button>
      </form>
    </div>
  )
}
