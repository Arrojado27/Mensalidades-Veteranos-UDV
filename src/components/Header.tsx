import logo from '../assets/udv-logo.png'

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="flex items-center gap-3 bg-brand-red px-4 pb-4 pt-[calc(env(safe-area-inset-top)+16px)] text-white">
      <img src={logo} alt="U.D.V." className="h-11 w-11 drop-shadow-sm" />
      <div className="min-w-0">
        <h1 className="truncate text-[17px] font-bold leading-tight">{title}</h1>
        {subtitle && <p className="truncate text-[12px] text-white/80">{subtitle}</p>}
      </div>
    </header>
  )
}
