import { AlertTriangle, CheckCircle2, Circle, ShieldAlert } from 'lucide-react'
import { useHeistStore } from '../store/useHeistStore'

export function StickyProgressHeader() {
  const huntId = useHeistStore((s) => s.huntId)
  const huntMode = useHeistStore((s) => s.huntMode)
  const huntStatus = useHeistStore((s) => s.huntStatus)
  const tacticOrder = useHeistStore((s) => s.tacticOrder)
  const tactics = useHeistStore((s) => s.tactics)

  const scrollToTactic = (key) => {
    const id = `scam-${key.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  let pillClass = 'live-state-pill--active'
  let pillLabel = huntStatus === 'queued' ? 'Queued' : 'Attacking Live'
  if (huntStatus === 'done') {
    pillClass = 'live-state-pill--done'
    pillLabel = 'Complete'
  } else if (huntStatus === 'error') {
    pillClass = 'live-state-pill--error'
    pillLabel = 'Error'
  }

  const modeBadge =
    huntMode === 'allowlist'
      ? `Allowlist · ${tacticOrder.length} Drain Scams`
      : `Open · ${tacticOrder.length} Steal Scams`

  return (
    <div className="sticky-tracker">
      <div className="tracker-top">
        <div className="tracker-id-group">
          {huntId && <span className="hunt-id-badge">HUNT #{huntId}</span>}
          <span className={`live-state-pill ${pillClass}`}>
            {(huntStatus === 'queued' || huntStatus === 'running') && (
              <span className="pulse-dot" />
            )}
            {pillLabel}
          </span>
          <span className="mode-pill">{modeBadge}</span>
        </div>

        <span className="tracker-note">
          A hunt takes a few minutes; you can leave this page open.
        </span>
      </div>

      <div
        className={`scam-stepper scam-stepper--${Math.min(Math.max(tacticOrder.length, 4), 5)}`}
        role="navigation"
        aria-label="Scam progress"
      >
        {tacticOrder.map((key) => {
          const entry = tactics[key]
          const status = entry?.status || 'pending'
          let statusClass = ''
          if (status === 'active') statusClass = 'stepper-item--active'
          if (status === 'blocked') statusClass = 'stepper-item--blocked'
          if (status === 'tricked') statusClass = 'stepper-item--tricked'
          if (status === 'robbed') statusClass = 'stepper-item--robbed'

          return (
            <button
              key={key}
              type="button"
              className={`stepper-item ${statusClass}`}
              onClick={() => scrollToTactic(key)}
            >
              <span className="stepper-label">{key}</span>
              {status === 'active' && <span className="pulse-dot" />}
              {status === 'blocked' && <CheckCircle2 size={15} />}
              {status === 'tricked' && <AlertTriangle size={15} />}
              {status === 'robbed' && <ShieldAlert size={15} />}
              {status === 'pending' && <Circle size={13} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
