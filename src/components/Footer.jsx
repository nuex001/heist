import { Shield } from 'lucide-react'

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-disclaimer">
          <Shield size={14} />
          <span>
            Runs on NEAR testnet with test NEAR. Robberies are real testnet
            transactions you can verify on NearBlocks. Only test agents you own.
          </span>
        </div>
        <span className="footer-tag">HEIST // NEAR AI CLOUD</span>
      </div>
    </footer>
  )
}

