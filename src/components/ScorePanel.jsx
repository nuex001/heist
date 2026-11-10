import {
  Check,
  Copy,
  Link2,
  RotateCcw,
  Share2,
  ShieldCheck,
  Wrench,
} from 'lucide-react'
import { useState } from 'react'
import { formatModelName } from '../constants/scams'
import { useHeistStore } from '../store/useHeistStore'

export function ScorePanel() {
  const huntId = useHeistStore((s) => s.huntId)
  const huntMode = useHeistStore((s) => s.huntMode)
  const tacticsCount = useHeistStore((s) => s.tacticsCount)
  const tacticOrder = useHeistStore((s) => s.tacticOrder)
  const score = useHeistStore((s) => s.score)
  const robbedBy = useHeistStore((s) => s.robbedBy)
  const trickedBy = useHeistStore((s) => s.trickedBy)
  const lostNear = useHeistStore((s) => s.lostNear)
  const fixes = useHeistStore((s) => s.fixes)
  const agentModel = useHeistStore((s) => s.agentModel)
  const attackerModel = useHeistStore((s) => s.attackerModel)
  const goHome = useHeistStore((s) => s.goHome)

  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedAllFixes, setCopiedAllFixes] = useState(false)
  const [copiedFixIdx, setCopiedFixIdx] = useState(null)

  const numericScore = typeof score === 'number' ? score : 0
  const totalScams = tacticsCount || tacticOrder.length || 4

  let tier = 'red'
  if (numericScore >= 75) tier = 'green'
  else if (numericScore >= 40) tier = 'amber'

  let verdict = `Held against all ${totalScams} scams`
  if (robbedBy.length > 0 && trickedBy.length > 0) {
    verdict = `Robbed by ${robbedBy.length} & tricked by ${trickedBy.length} of ${totalScams} scams`
  } else if (robbedBy.length > 0) {
    verdict = `Robbed by ${robbedBy.length} of ${totalScams} scams: ${robbedBy.join(', ')}`
  } else if (trickedBy.length > 0) {
    verdict = `Tricked by ${trickedBy.length} of ${totalScams} scams: ${trickedBy.join(', ')}`
  }

  const radius = 46
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (numericScore / 100) * circumference

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/results/${huntId}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      // Clipboard blocked
    }
  }

  const handleCopyAllFixes = async () => {
    const text = fixes
      .map((item, idx) => `${idx + 1}. [${item.tactic}] ${item.fix}`)
      .join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopiedAllFixes(true)
      setTimeout(() => setCopiedAllFixes(false), 2000)
    } catch {
      // Clipboard blocked
    }
  }

  const handleCopySingleFix = async (item, idx) => {
    try {
      await navigator.clipboard.writeText(`[${item.tactic}] ${item.fix}`)
      setCopiedFixIdx(idx)
      setTimeout(() => setCopiedFixIdx(null), 1800)
    } catch {
      // Clipboard blocked
    }
  }

  const shareText = encodeURIComponent(
    `My AI agent scored ${numericScore}/100 on Heist, an AI that tries to rob AI agents. Built for #NEARHackathon @NEARProtocol`,
  )
  const shareUrl = `https://twitter.com/intent/tweet?text=${shareText}`

  return (
    <section className="score-panel" aria-label="Final security score">
      <div className="score-hero">
        <div className="score-left">
          <div className="score-ring-wrap">
            <svg className="score-ring-svg" viewBox="0 0 112 112" aria-hidden="true">
              <circle className="score-ring-track" cx="56" cy="56" r={radius} />
              <circle
                className={`score-ring-progress score-ring-progress--${tier}`}
                cx="56"
                cy="56"
                r={radius}
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <div className="score-number-overlay">
              <span className={`score-value score-value--${tier}`}>
                {numericScore}
              </span>
              <span className="score-denom">/ 100</span>
            </div>
          </div>

          <div className="score-verdict-block">
            <span className="score-eyebrow">Heist Security Report · #{huntId}</span>
            <h1 className="score-verdict-title">{verdict}</h1>

            <div className="score-meta-chips">
              <span className="meta-chip">
                {huntMode === 'allowlist'
                  ? `Allowlist · ${totalScams} Drain Scams`
                  : `Open · ${totalScams} Steal Scams`}
              </span>
              <span
                className={`meta-chip ${
                  lostNear > 0 ? 'meta-chip--lost' : 'meta-chip--safe'
                }`}
              >
                {lostNear > 0 ? `Lost: ${lostNear} NEAR` : '0 NEAR lost'}
              </span>
              {agentModel && (
                <span className="meta-chip">
                  Agent: {formatModelName(agentModel)}
                </span>
              )}
              {attackerModel && (
                <span className="meta-chip">
                  Attacker: {formatModelName(attackerModel)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="score-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCopyLink}
          >
            {copiedLink ? <Check size={15} /> : <Link2 size={15} />}
            {copiedLink ? 'Link copied' : 'Copy report link'}
          </button>

          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            <Share2 size={15} />
            Share on X
          </a>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => goHome({ keepInstructions: true })}
          >
            <RotateCcw size={15} />
            Hunt again
          </button>
        </div>
      </div>

      <div className="fixes-section">
        <div className="fixes-header">
          <h2 className="fixes-title">
            <Wrench size={17} />
            Recommended Prompt Fixes
          </h2>

          {fixes.length > 0 && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleCopyAllFixes}
            >
              {copiedAllFixes ? <Check size={14} /> : <Copy size={14} />}
              {copiedAllFixes ? 'Copied checklist' : 'Copy all fixes'}
            </button>
          )}
        </div>

        {fixes.length === 0 ? (
          <div className="fixes-clean-card">
            <ShieldCheck size={18} />
            <span>
              Your agent held against every scam — no prompt vulnerabilities were
              exploited.
            </span>
          </div>
        ) : (
          <div className="fixes-list">
            {fixes.map((item, idx) => (
              <div key={`${item.tactic}-${idx}`} className="fix-item">
                <div className="fix-item-body">
                  <span className="fix-tactic-badge">{item.tactic}</span>
                  <p className="fix-text">{item.fix}</p>
                </div>

                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleCopySingleFix(item, idx)}
                  aria-label={`Copy fix for ${item.tactic}`}
                >
                  {copiedFixIdx === idx ? <Check size={14} /> : <Copy size={14} />}
                  {copiedFixIdx === idx ? 'Copied' : 'Copy'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
