import { AlertTriangle, ArrowDown, Radio, RotateCcw } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useHeistStore } from '../store/useHeistStore'
import { ScamSection } from './ScamSection'
import { StickyProgressHeader } from './StickyProgressHeader'
import { WalletCard } from './WalletCard'

export function LiveHuntView() {
  const huntId = useHeistStore((s) => s.huntId)
  const huntStatus = useHeistStore((s) => s.huntStatus)
  const statusMessage = useHeistStore((s) => s.statusMessage)
  const wallet = useHeistStore((s) => s.wallet)
  const tacticOrder = useHeistStore((s) => s.tacticOrder)
  const tactics = useHeistStore((s) => s.tactics)
  const huntError = useHeistStore((s) => s.huntError)
  const huntErrorCode = useHeistStore((s) => s.huntErrorCode)
  const autoScroll = useHeistStore((s) => s.autoScroll)
  const setAutoScroll = useHeistStore((s) => s.setAutoScroll)
  const loadHuntById = useHeistStore((s) => s.loadHuntById)
  const goHome = useHeistStore((s) => s.goHome)

  const feedEndRef = useRef(null)
  const lastScrollYRef = useRef(typeof window !== 'undefined' ? window.scrollY : 0)

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY
      const docHeight = document.documentElement.scrollHeight
      const nearBottom = docHeight - (currentY + window.innerHeight) < 90

      if (currentY < lastScrollYRef.current - 12 && !nearBottom) {
        setAutoScroll(false)
      } else if (nearBottom && !autoScroll) {
        setAutoScroll(true)
      }
      lastScrollYRef.current = currentY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [autoScroll, setAutoScroll])

  useEffect(() => {
    if (!autoScroll) return
    if (huntStatus !== 'queued' && huntStatus !== 'running') return
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [tactics, statusMessage, wallet, autoScroll, huntStatus])

  const handleJumpLatest = () => {
    setAutoScroll(true)
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }

  return (
    <div className="hunt-stack">
      <StickyProgressHeader />

      {statusMessage && (
        <div className="status-telemetry">
          <Radio size={14} />
          <span>{statusMessage}</span>
        </div>
      )}

      {huntError && (
        <div className="alert alert--error" role="alert">
          <div className="alert-content">
            <AlertTriangle size={18} className="alert-icon" />
            <div>
              <strong>Hunt error:</strong>{' '}
              {huntErrorCode && (
                <code className="error-code-tag">[{huntErrorCode}]</code>
              )}{' '}
              {huntError}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {huntErrorCode === 'PAYEE_NOT_FOUND' ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => goHome({ keepInstructions: true })}
              >
                Edit allowlist
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => loadHuntById(huntId)}
                >
                  <RotateCcw size={14} />
                  Try again
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => goHome({ keepInstructions: true })}
                >
                  Edit prompt
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <WalletCard wallet={wallet} />

      {tacticOrder.map((key, idx) => {
        const entry = tactics[key]
        if (!entry) return null
        return <ScamSection key={key} index={idx} tacticData={entry} />
      })}

      <div ref={feedEndRef} />

      {!autoScroll && (huntStatus === 'queued' || huntStatus === 'running') && (
        <button
          type="button"
          className="jump-latest-btn"
          onClick={handleJumpLatest}
        >
          <ArrowDown size={14} />
          Resume live scroll
        </button>
      )}
    </div>
  )
}

