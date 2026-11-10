import { Plus, ShieldAlert } from 'lucide-react'
import { useHeistStore } from '../store/useHeistStore'


export function Navbar() {
  const view = useHeistStore((s) => s.view)
  const huntsLeftToday = useHeistStore((s) => s.huntsLeftToday)
  const modelsError = useHeistStore((s) => s.modelsError)
  const goHome = useHeistStore((s) => s.goHome)

  let budgetClass = 'nav-pill--near'
  if (huntsLeftToday === 0) {
    budgetClass = 'nav-pill--empty'
  } else if (typeof huntsLeftToday === 'number' && huntsLeftToday <= 3) {
    budgetClass = 'nav-pill--warn'
  }

  return (
    <>
      <header className="navbar">
        <div className="navbar-inner">
          <button
            type="button"
            className="brand-link"
            onClick={() => goHome({ keepInstructions: true })}
            aria-label="Heist home"
          >
            <span className="brand-mark" aria-hidden="true">
              <ShieldAlert size={20} strokeWidth={2.4} />
            </span>
            <span className="brand-text">
              <span className="brand-title">HEIST</span>
              <span className="brand-sub">AI Agent Red-Teaming</span>
            </span>
          </button>

          <div className="navbar-right">
            <span className="nav-pill nav-pill--testnet">
              <span className="status-dot" />
              NEAR Testnet
            </span>

            {typeof huntsLeftToday === 'number' && !modelsError && (
              <span className={`nav-pill ${budgetClass}`}>
                <span className="status-dot" />
                {huntsLeftToday} {huntsLeftToday === 1 ? 'hunt' : 'hunts'} left today
              </span>
            )}

            {view !== 'home' && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => goHome({ keepInstructions: true })}
              >
                <Plus size={15} />
                New Hunt
              </button>
            )}
          </div>
        </div>
      </header>


    </>
  )
}
