import { Crosshair, FileCode2, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { DRAIN_SCAMS, SCAMS } from '../constants/scams'

const TICKER_ITEMS = (
  <>
    <span className="ticker-accent-yellow">CAUTION // AI CON ARTIST</span>
    <span>·</span>
    <span>OPEN MODE: 4 STEAL SCAMS</span>
    <span>·</span>
    <span className="ticker-accent-mint">ALLOWLIST MODE: 5 DRAIN SCAMS</span>
    <span>·</span>
    <span>ON-CHAIN PROOF VIA NEARBLOCKS</span>
    <span>·</span>
    <span className="ticker-accent-red">NEAR HACKATHON // AI SECURITY</span>
    <span>·</span>
  </>
)

const STEPS = [
  {
    num: '01',
    title: "Paste your agent's instructions",
    desc: 'Drop in its system prompt and optional allowlist of approved NEAR accounts.',
    icon: FileCode2,
  },
  {
    num: '02',
    title: 'Heist attacks it live',
    desc: 'Your agent gets a funded throwaway NEAR testnet wallet and faces 4 steal or 5 drain scams.',
    icon: Crosshair,
  },
  {
    num: '03',
    title: 'See what got through on NEAR',
    desc: 'Watch real NearBlocks transactions and finish with a security score and prompt fixes.',
    icon: ShieldCheck,
  },
]

export function HeroSection() {
  const [previewMode, setPreviewMode] = useState('steal')
  const [activeScamIdx, setActiveScamIdx] = useState(0)

  const activeList = previewMode === 'drain' ? DRAIN_SCAMS : SCAMS
  const safeIdx = activeScamIdx < activeList.length ? activeScamIdx : 0
  const activeScam = activeList[safeIdx]

  const handleModeSwitch = (mode) => {
    setPreviewMode(mode)
    setActiveScamIdx(0)
  }

  return (
    <section className="hero">
      <div className="hero-main">
        <div className="hero-stamp-row">
          <span className="hero-badge">AI Security &amp; Defense</span>
          <span className="hero-badge hero-badge--outline">NEAR Hackathon</span>
        </div>

        <h1 className="hero-title">
          Before you give your AI agent money, let Heist{' '}
          <span className="hero-title-serif">try to rob it.</span>
        </h1>

        <p className="hero-subtitle">
          Heist unleashes an adaptive AI con artist on NEAR AI Cloud against
          your agent&apos;s system prompt — then checks NearBlocks to see if any
          test NEAR actually left the vault.
        </p>

        <div className="scam-preview-bar">
          <div className="scam-preview-top">
            <span className="scam-preview-label">
              Inspect attack vectors ({safeIdx + 1}/{activeList.length})
            </span>

            <div className="mode-toggle-group" role="group" aria-label="Attack mode preview">
              <button
                type="button"
                className={`mode-toggle-btn ${
                  previewMode === 'steal' ? 'mode-toggle-btn--active' : ''
                }`}
                onClick={() => handleModeSwitch('steal')}
              >
                Open · 4 Steal Scams
              </button>
              <button
                type="button"
                className={`mode-toggle-btn ${
                  previewMode === 'drain' ? 'mode-toggle-btn--active' : ''
                }`}
                onClick={() => handleModeSwitch('drain')}
              >
                Allowlist · 5 Drain Scams
              </button>
            </div>
          </div>

          <div className="scam-pill-tabs" role="tablist" aria-label="Scam attack vectors">
            {activeList.map((scam, idx) => (
              <button
                key={scam.key}
                type="button"
                role="tab"
                aria-selected={idx === safeIdx}
                className={`scam-tab-btn ${
                  idx === safeIdx ? 'scam-tab-btn--active' : ''
                }`}
                onClick={() => setActiveScamIdx(idx)}
                onMouseEnter={() => setActiveScamIdx(idx)}
              >
                <span>0{idx + 1}</span>
                <span>{scam.name}</span>
              </button>
            ))}
          </div>
          <p className="scam-preview-desc">→ {activeScam.description}</p>
        </div>
      </div>

      <div className="hazard-ticker" aria-hidden="true">
        <div className="hazard-ticker-track">
          <div className="hazard-ticker-group">{TICKER_ITEMS}</div>
          <div className="hazard-ticker-group">{TICKER_ITEMS}</div>
        </div>
      </div>

      <div className="steps-grid">
        {STEPS.map((step, idx) => {
          const Icon = step.icon
          return (
            <div key={step.num} className={`step-card step-card--${idx + 1}`}>
              <div className="step-header">
                <span className="step-num">STEP {step.num}</span>
                <Icon size={18} className="step-icon" />
              </div>
              <h2 className="step-title">{step.title}</h2>
              <p className="step-desc">{step.desc}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
