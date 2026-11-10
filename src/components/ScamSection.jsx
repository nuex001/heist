import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  SkipForward,
} from 'lucide-react'
import { getScamDescription } from '../constants/scams'
import { TurnCard } from './TurnCard'

export function ScamSection({ index, tacticData }) {
  const { name, kind, how, status, turns, skips, activeStep, lost } = tacticData
  const description = getScamDescription(name, how)
  const sectionId = `scam-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  let statusLabel = 'Pending'
  if (status === 'active') statusLabel = 'In progress'
  if (status === 'blocked') statusLabel = 'Held'
  if (status === 'tricked') statusLabel = 'Tricked'
  if (status === 'robbed') statusLabel = 'Robbed'

  // Merge turns and skips by turn number so they appear in chronological order
  const timelineItems = [
    ...turns.map((turn) => ({ kind: 'turn', order: turn.turn || 0, data: turn })),
    ...skips.map((skip) => ({ kind: 'skip', order: skip.turn || 0, data: skip })),
  ].sort((a, b) => a.order - b.order)

  return (
    <section
      id={sectionId}
      className={`scam-section scam-section--${status}`}
    >
      <div className="scam-section-header">
        <div className="scam-title-wrap">
          <div className="scam-title-row">
            <span className="scam-index">0{index + 1}</span>
            <h3 className="scam-title">{name}</h3>
            {kind && (
              <span className={`scam-kind-tag scam-kind-tag--${kind}`}>
                {kind}
              </span>
            )}
          </div>
          <p className="scam-desc">{description}</p>
        </div>

        <div className="scam-status-group">
          {typeof lost === 'number' && lost > 0 && (
            <span className="lost-pill">-{lost} NEAR</span>
          )}
          <span className={`scam-status-tag scam-status-tag--${status}`}>
            {status === 'active' && <span className="pulse-dot" />}
            {status === 'blocked' && <CheckCircle2 size={13} />}
            {status === 'tricked' && <AlertTriangle size={13} />}
            {status === 'robbed' && <ShieldAlert size={13} />}
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="scam-body">
        {timelineItems.length === 0 && !activeStep && status === 'pending' && (
          <div className="scam-empty-pending">
            Waiting for previous scam scenarios to finish...
          </div>
        )}

        {timelineItems.map((item, idx) =>
          item.kind === 'turn' ? (
            <TurnCard key={`turn-${item.data.turn}-${idx}`} turn={item.data} />
          ) : (
            <div key={`skip-${item.data.turn}-${idx}`} className="skip-line">
              <SkipForward size={14} />
              <span>{item.data.message}</span>
            </div>
          ),
        )}

        {activeStep && (
          <div className="step-indicator" role="status" aria-live="polite">
            <div className="step-indicator-left">
              <span className="typing-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <span>{activeStep.message}</span>
            </div>

            {activeStep.txUrl && (
              <a
                href={activeStep.txUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="tx-link"
              >
                View transaction
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
