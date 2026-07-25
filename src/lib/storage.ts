import type { AppData } from '../types'
import { createSeedSeason } from '../data/seed'

const STORAGE_KEY = 'udv-veteranos-mensalidades-v1'

function createInitialData(): AppData {
  const season = createSeedSeason()
  return {
    version: 1,
    seasons: [season],
    currentSeasonId: season.id,
  }
}

export function loadData(): AppData {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const initial = createInitialData()
    saveData(initial)
    return initial
  }
  try {
    const parsed = JSON.parse(raw) as AppData
    if (!parsed.seasons || parsed.seasons.length === 0) {
      return createInitialData()
    }
    return parsed
  } catch {
    return createInitialData()
  }
}

export function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function exportBackup(data: AppData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `backup-mensalidades-udv-${date}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function importBackup(file: File): Promise<AppData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as AppData
        if (!parsed.seasons || !Array.isArray(parsed.seasons)) {
          reject(new Error('Ficheiro inválido: não parece ser um backup desta app.'))
          return
        }
        resolve(parsed)
      } catch {
        reject(new Error('Não foi possível ler o ficheiro. Confirma que é um backup .json válido.'))
      }
    }
    reader.onerror = () => reject(new Error('Erro ao ler o ficheiro.'))
    reader.readAsText(file)
  })
}

export function resetData(): AppData {
  const initial = createInitialData()
  saveData(initial)
  return initial
}
