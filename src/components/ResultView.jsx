import { AlertTriangle, RotateCcw } from 'lucide-react'
import { useHeistStore } from '../store/useHeistStore'
import { ScamSection } from './ScamSection'
import { ScorePanel } from './ScorePanel'
import { WalletCard } from './WalletCard'

export function ResultView() {
  const huntId = useHeistStore((s) => s.huntId)
  const resultLoading = useHeistStore((s) => s.resultLoading)
  const resultLoadError = useHeistStore((s) => s.resultLoadError)
  const resultLoadErrorCode = useHeistStore((s) => s.resultLoadErrorCode)
  const huntStatus = useHeistStore((s) => s.huntStatus)
  const huntError = useHeistStore((s) => s.huntError)
  const huntErrorCode = useHeistStore((s) => s.huntErrorCode)
  const wallet = useHeistStore((s) => s.wallet)
  const tacticOrder = useHeistStore((s) => s.tacticOrder)
  const tactics = useHeistStore((s) => s.tactics)
  const loadHuntById = useHeistStore((s) => s.loadHuntById)
  const goHome = useHeistStore((s) => s.goHome)

  if (resultLoading) {
    return (
      <div className="hunt-stack">
        <div className="alert">
          <div className="alert-content">
            <span className="spinner" aria-hidden="true" />
            <span>Loading report #{huntId}...</span>
          </div>
        </div>
      </div>
    )
  }

  if (resultLoadError) {
    return (
      <div className="hunt-stack">
        <div className="alert alert--error" role="alert">
          <div className="alert-content">
            <AlertTriangle size={18} className="alert-icon" />
            <div>
              <strong>Could not load report:</strong>{' '}
              {resultLoadErrorCode && (
                <code className="error-code-tag">[{resultLoadErrorCode}]</code>
              )}{' '}
              {resultLoadError}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
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
              Back home
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (huntStatus === 'error') {
    return (
      <div className="hunt-stack">
        <div className="alert alert--error" role="alert">
          <div className="alert-content">
            <AlertTriangle size={18} className="alert-icon" />
            <div>
              <strong>Hunt #{huntId} failed:</strong>{' '}
              {huntErrorCode && (
                <code className="error-code-tag">[{huntErrorCode}]</code>
              )}{' '}
              {huntError}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => goHome({ keepInstructions: true })}
          >
            <RotateCcw size={14} />
            {huntErrorCode === 'PAYEE_NOT_FOUND' ? 'Edit allowlist' : 'Try again'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="hunt-stack">
      <ScorePanel />

      <WalletCard wallet={wallet} />

      <div className="transcript-heading-row">
        <h2 className="transcript-heading">Full Attack Transcript</h2>
      </div>

      {tacticOrder.map((key, idx) => {
        const entry = tactics[key]
        if (!entry) return null
        return <ScamSection key={key} index={idx} tacticData={entry} />
      })}
    </div>
  )
}

