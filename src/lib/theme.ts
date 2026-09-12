export type ThemePreference = 'system' | 'light' | 'dark'

export const THEME_OPTIONS: { key: ThemePreference; label: string }[] = [
  { key: 'system', label: 'Automático' },
  { key: 'light', label: 'Claro' },
  { key: 'dark', label: 'Escuro' },
]

/** Chave própria (fora do AppData) para o tema poder ser aplicado antes do React arrancar. */
const THEME_KEY = 'udv-veteranos-tema'

export function loadThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    // localStorage bloqueado (ex: navegação privada) — fica no automático.
  }
  return 'system'
}

export function saveThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(THEME_KEY, preference)
  } catch {
    // Sem persistência, o tema vale só para esta sessão.
  }
}

function systemPrefersDark(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return preference
}

export function applyTheme(preference: ThemePreference) {
  document.documentElement.dataset.theme = resolveTheme(preference)
}

/**
 * Aplica o tema guardado e passa a seguir o sistema enquanto a escolha for
 * "Automático". O mesmo é feito por um script no index.html, que corre antes do
 * primeiro desenho para não haver um flash branco ao abrir a app no escuro.
 */
export function initTheme() {
  applyTheme(loadThemePreference())
  if (typeof matchMedia !== 'function') return
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (loadThemePreference() === 'system') applyTheme('system')
  })
}
