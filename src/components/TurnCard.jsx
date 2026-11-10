import {
  AlertOctagon,
  AlertTriangle,
  Bot,
  BrainCircuit,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  Skull,
  Verified,
  Wallet,
} from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

function ProofChip({ proof }) {
  const [pinned, setPinned] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [copiedSig, setCopiedSig] = useState(false)
  const wrapperRef = useRef(null)

  const open = pinned || hovered

  useEffect(() => {
    if (!pinned) return
    const handleOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setPinned(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setPinned(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [pinned])

  if (!proof) return null

  const kindLabel =
    proof.signature_kind === 'provider_tee'
      ? 'provider_tee — Signed inside a secure TEE chip'
      : proof.signature_kind === 'gateway'
        ? "gateway — Signed by NEAR AI's gateway"
        : proof.signature_kind || 'Verified signature'

  const handleCopyProof = async () => {
    const text = [
      `signature_kind: ${proof.signature_kind || ''}`,
      `signing_address: ${proof.signing_address || ''}`,
      `signature: ${proof.signature || ''}`,
    ].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopiedSig(true)
      setTimeout(() => setCopiedSig(false), 1800)
    } catch {
      // Clipboard blocked
    }
  }

  return (
    <div
      className="proof-wrapper"
      ref={wrapperRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        className="proof-chip"
        aria-expanded={open}
        onClick={() => setPinned((prev) => !prev)}
      >
        <Verified size={13} />
        Signed by NEAR AI
      </button>

      {open && (
        <div className="proof-popover" role="dialog" aria-label="NEAR AI Signature Proof">
          <div className="proof-popover-header">
            <span className="proof-popover-title">NEAR AI Cryptographic Proof</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleCopyProof}
            >
              {copiedSig ? <Check size={12} /> : <Copy size={12} />}
              {copiedSig ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="proof-field">
            <span className="proof-field-label">Signature Kind</span>
            <span className="proof-kind-desc">{kindLabel}</span>
          </div>

          {proof.signing_address && (
            <div className="proof-field">
              <span className="proof-field-label">Signing Address</span>
              <code className="proof-field-val">{proof.signing_address}</code>
            </div>
          )}

          {proof.signature && (
            <div className="proof-field">
              <span className="proof-field-label">Signature</span>
              <code className="proof-field-val">{proof.signature}</code>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CollapsibleMessage({ text }) {
  const [expanded, setExpanded] = useState(false)
  const [canCollapse, setCanCollapse] = useState(false)
  const textRef = useRef(null)

  useLayoutEffect(() => {
    const el = textRef.current
    if (!el || expanded) return
    const overflow = el.scrollHeight > el.clientHeight + 2
    setCanCollapse(overflow)
  }, [text, expanded])

  return (
    <>
      <p
        ref={textRef}
        className={`chat-message-text ${
          !expanded ? 'chat-message-text--collapsed' : ''
        }`}
      >
        {text || ''}
      </p>
      {canCollapse && (
        <button
          type="button"
          className="show-more-btn"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </>
  )
}

export function TurnCard({ turn }) {
  const isRobbed = turn.outcome === 'robbed' || Boolean(turn.robbed)
  const isTricked =
    !isRobbed && (turn.outcome === 'tricked' || Boolean(turn.tricked))
  const paidOther =
    !isRobbed && !isTricked && (Boolean(turn.tx) || Boolean(turn.paidTo))

  const amountLabel = turn.amount ? `${turn.amount} NEAR` : '0.1 NEAR'

  return (
    <article
      className={`turn-card ${
        isRobbed ? 'turn-card--robbed' : isTricked ? 'turn-card--tricked' : ''
      }`}
    >
      <div className="turn-meta-bar">
        <span className="turn-num">Exchange #{turn.turn}</span>
        {turn.proof && <ProofChip proof={turn.proof} />}
      </div>

      {turn.thought && (
        <div className="attacker-thought">
          <BrainCircuit size={15} className="attacker-thought-icon" />
          <div>
            <span className="attacker-thought-label">Attacker thinks:</span>
            <span>{turn.thought}</span>
          </div>
        </div>
      )}

      <div className="chat-exchange">
        <div className="chat-row chat-row--attacker">
          <div className="chat-bubble chat-bubble--attacker">
            <span className="chat-sender chat-sender--attacker">
              <Skull size={12} />
              Heist Attacker
            </span>
            <CollapsibleMessage text={turn.message} />
          </div>
        </div>

        <div className="chat-row chat-row--agent">
          <div className="chat-bubble chat-bubble--agent">
            <span className="chat-sender chat-sender--agent">
              <Bot size={12} />
              Your Agent
            </span>
            <CollapsibleMessage text={turn.reply} />
          </div>
        </div>
      </div>

      <div className="turn-outcome-row">
        <div className="result-badge-group">
          {isRobbed ? (
            <span className="result-badge result-badge--robbed">
              <AlertOctagon size={14} />
              ROBBED: {amountLabel} stolen
              {turn.paidTo ? ` → ${turn.paidTo}` : ''}
            </span>
          ) : isTricked ? (
            <span className="result-badge result-badge--tricked">
              <AlertTriangle size={14} />
              TRICKED: Paid {amountLabel}
              {turn.paidTo ? ` to ${turn.paidTo}` : ' (drained)'}
            </span>
          ) : paidOther ? (
            <span className="result-badge result-badge--paid-other">
              <Wallet size={14} />
              Paid {turn.amount ? `${turn.amount} NEAR` : 'payment'}
              {turn.paidTo ? ` to ${turn.paidTo}` : ' someone else'}
            </span>
          ) : (
            <span className="result-badge result-badge--blocked">
              <ShieldCheck size={14} />
              Blocked
            </span>
          )}

          {turn.txUrl && (
            <a
              href={turn.txUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="tx-link"
            >
              View transaction
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
    </article>
  )
}
