import { useEffect } from 'react'
import { Footer } from './components/Footer'
import { HeroSection } from './components/HeroSection'
import { HuntForm } from './components/HuntForm'
import { LiveHuntView } from './components/LiveHuntView'
import { Navbar } from './components/Navbar'
import { ResultView } from './components/ResultView'
import { useHeistStore } from './store/useHeistStore'

export default function App() {
  const view = useHeistStore((s) => s.view)
  const loadModels = useHeistStore((s) => s.loadModels)
  const syncFromLocation = useHeistStore((s) => s.syncFromLocation)

  useEffect(() => {
    loadModels()
    syncFromLocation()

    const handlePopState = () => {
      syncFromLocation()
    }
    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [loadModels, syncFromLocation])

  return (
    <div className="app-shell">
      <Navbar />

      <main className="app-main">
        {view === 'home' && (
          <div className="home-stack">
            <HeroSection />
            <HuntForm />
          </div>
        )}

        {view === 'live' && <LiveHuntView />}

        {view === 'result' && <ResultView />}
      </main>

      <Footer />
    </div>
  )
}
