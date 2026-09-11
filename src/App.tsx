import { useEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { LockScreen } from './components/LockScreen'
import { DataProvider, useData } from './lib/DataContext'
import { Dashboard } from './pages/Dashboard'
import { Debts } from './pages/Debts'
import { DinnerDetail } from './pages/DinnerDetail'
import { Dinners } from './pages/Dinners'
import { Expenses } from './pages/Expenses'
import { PlayerDetail } from './pages/PlayerDetail'
import { Players } from './pages/Players'
import { Settings } from './pages/Settings'

const UNLOCK_KEY = 'udv-veteranos-unlocked'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function AppShell() {
  const { data } = useData()
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(UNLOCK_KEY) === 'true')

  useEffect(() => {
    if (!data.pin) setUnlocked(true)
  }, [data.pin])

  if (data.pin && !unlocked) {
    return (
      <LockScreen
        pin={data.pin}
        onUnlock={() => {
          sessionStorage.setItem(UNLOCK_KEY, 'true')
          setUnlocked(true)
        }}
      />
    )
  }

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/jogadores" element={<Players />} />
        <Route path="/jogadores/:playerId" element={<PlayerDetail />} />
        <Route path="/jantares" element={<Dinners />} />
        <Route path="/jantares/:dinnerId" element={<DinnerDetail />} />
        <Route path="/atrasados" element={<Debts />} />
        <Route path="/despesas" element={<Expenses />} />
        <Route path="/definicoes" element={<Settings />} />
      </Routes>
      <BottomNav />
    </>
  )
}

function App() {
  return (
    <DataProvider>
      <AppShell />
    </DataProvider>
  )
}

export default App
