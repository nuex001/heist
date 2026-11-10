import { Check, Copy, ExternalLink, Wallet } from 'lucide-react'
import { useState } from 'react'

export function WalletCard({ wallet }) {
  const [copied, setCopied] = useState(false)

  if (!wallet || !wallet.account) return null

  const rawFunded = String(wallet.funded || '').trim()
  const balanceText = rawFunded
    ? /\bnear$/i.test(rawFunded)
      ? rawFunded
      : `${rawFunded} NEAR`
    : '1 NEAR'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(wallet.account)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard blocked
    }
  }

  return (
    <div className="wallet-card">
      <div className="wallet-info">
        <div className="wallet-icon-box" aria-hidden="true">
          <Wallet size={18} />
        </div>
        <div className="wallet-text">
          <span className="wallet-label">Your agent&apos;s throwaway testnet wallet</span>
          <div className="wallet-account-line">
            <span>{wallet.account}</span>
            <span>·</span>
            <span className="wallet-balance-pill">{balanceText}</span>
          </div>
        </div>
      </div>

      <div className="wallet-actions">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={handleCopy}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>

        {wallet.url && (
          <a
            href={wallet.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
          >
            NearBlocks
            <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  )
}

