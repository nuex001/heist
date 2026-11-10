import {
  AlertTriangle,
  Cpu,
  Crosshair,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { useState } from 'react'
import {
  MAX_ALLOWLIST_ITEMS,
  MAX_INSTRUCTIONS_LEN,
  MIN_INSTRUCTIONS_LEN,
  formatModelName,
} from '../constants/scams'
import { useHeistStore } from '../store/useHeistStore'

export function HuntForm() {
  const models = useHeistStore((s) => s.models)
  const accessCodeRequired = useHeistStore((s) => s.accessCodeRequired)
  const huntsLeftToday = useHeistStore((s) => s.huntsLeftToday)
  const modelsLoading = useHeistStore((s) => s.modelsLoading)
  const modelsError = useHeistStore((s) => s.modelsError)
  const loadModels = useHeistStore((s) => s.loadModels)

  const instructions = useHeistStore((s) => s.instructions)
  const allowlist = useHeistStore((s) => s.allowlist)
  const selectedModel = useHeistStore((s) => s.selectedModel)
  const accessCode = useHeistStore((s) => s.accessCode)
  const submitting = useHeistStore((s) => s.submitting)
  const submitError = useHeistStore((s) => s.submitError)
  const submitErrorCode = useHeistStore((s) => s.submitErrorCode)

  const setInstructions = useHeistStore((s) => s.setInstructions)
  const useExampleInstructions = useHeistStore((s) => s.useExampleInstructions)
  const addAllowlistEntry = useHeistStore((s) => s.addAllowlistEntry)
  const removeAllowlistEntry = useHeistStore((s) => s.removeAllowlistEntry)
  const setSelectedModel = useHeistStore((s) => s.setSelectedModel)
  const setAccessCode = useHeistStore((s) => s.setAccessCode)
  const clearSubmitError = useHeistStore((s) => s.clearSubmitError)
  const submitHunt = useHeistStore((s) => s.submitHunt)

  const [chipDraft, setChipDraft] = useState('')
  const [chipError, setChipError] = useState('')

  const trimmedLen = instructions.trim().length
  const isTooShort = trimmedLen > 0 && trimmedLen < MIN_INSTRUCTIONS_LEN
  const isTooLong = trimmedLen > MAX_INSTRUCTIONS_LEN
  const isValidLength =
    trimmedLen >= MIN_INSTRUCTIONS_LEN && trimmedLen <= MAX_INSTRUCTIONS_LEN
  const budgetExhausted = huntsLeftToday === 0

  const handleAddChip = (raw) => {
    const value = (raw ?? chipDraft).trim()
    if (!value) return
    const result = addAllowlistEntry(value)
    if (result.ok) {
      setChipDraft('')
      setChipError('')
    } else if (result.error) {
      setChipError(result.error)
    }
  }

  const handleChipKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault()
      handleAddChip()
    } else if (e.key === 'Backspace' && !chipDraft && allowlist.length > 0) {
      removeAllowlistEntry(allowlist[allowlist.length - 1])
      setChipError('')
    }
  }

  const handleChipPaste = (e) => {
    const text = e.clipboardData.getData('text')
    if (text && /[\s,]/.test(text)) {
      e.preventDefault()
      const parts = text.split(/[\s,]+/).filter(Boolean)
      for (const part of parts) {
        const res = addAllowlistEntry(part)
        if (!res.ok && res.error) {
          setChipError(res.error)
          break
        }
      }
      setChipDraft('')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (chipDraft.trim()) {
      const res = addAllowlistEntry(chipDraft)
      if (!res.ok && res.error) {
        setChipError(res.error)
        return
      }
      setChipDraft('')
      setChipError('')
    }
    submitHunt()
  }

  const canSubmit =
    !submitting &&
    !budgetExhausted &&
    isValidLength &&
    (!accessCodeRequired || accessCode.trim().length > 0)

  return (
    <form className="hunt-console" onSubmit={handleSubmit} noValidate>
      <div className="console-header">
        <div className="console-header-left">
          <span className="console-dots" aria-hidden="true">
            <span className="console-dot console-dot--red" />
            <span className="console-dot console-dot--amber" />
            <span className="console-dot console-dot--green" />
          </span>
          <span className="console-title">Target Agent Configuration</span>
        </div>
        <span className="console-status-tag">READY FOR BREACH</span>
      </div>

      <div className="console-body">
        {modelsError && (
          <div className="alert alert--error" role="alert">
            <div className="alert-content">
              <AlertTriangle size={17} className="alert-icon" />
              <div>
                <strong>Server connection issue:</strong> {modelsError}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={loadModels}
              disabled={modelsLoading}
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        )}

        {budgetExhausted && (
          <div className="alert alert--warning" role="status">
            <div className="alert-content">
              <AlertTriangle size={17} className="alert-icon" />
              <span>Heist has used today&apos;s budget. Try again tomorrow.</span>
            </div>
          </div>
        )}

        {submitError && (
          <div className="alert alert--error" role="alert">
            <div className="alert-content">
              <AlertTriangle size={17} className="alert-icon" />
              <span>
                {submitErrorCode && (
                  <code className="error-code-tag">[{submitErrorCode}]</code>
                )}{' '}
                {submitError}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={clearSubmitError}
              aria-label="Dismiss error"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* System Prompt */}
        <div className="field-group">
          <div className="field-label-row">
            <label htmlFor="agent-instructions" className="field-label">
              Agent Instructions (System Prompt)
            </label>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={useExampleInstructions}
            >
              <Sparkles size={14} />
              Use example
            </button>
          </div>

          <textarea
            id="agent-instructions"
            className={`prompt-textarea ${
              isTooShort || isTooLong ? 'prompt-textarea--invalid' : ''
            }`}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Paste your AI agent's system prompt, rules, spending limits, and approved behavior..."
            maxLength={4500}
            required
          />

          <div className="textarea-footer">
            <span className="field-hint">
              Minimum {MIN_INSTRUCTIONS_LEN} characters. Never paste real private
              keys.
            </span>
            <span
              className={`char-counter ${
                isValidLength
                  ? 'char-counter--valid'
                  : isTooShort || isTooLong
                    ? 'char-counter--error'
                    : ''
              }`}
            >
              {trimmedLen} / {MAX_INSTRUCTIONS_LEN}
            </span>
          </div>
        </div>

        {/* Allowlist */}
        <div className="field-group">
          <div className="field-label-row">
            <label htmlFor="allowlist-input" className="field-label">
              Approved Payee Allowlist
              <span className="field-optional">
                (optional · {allowlist.length}/{MAX_ALLOWLIST_ITEMS})
              </span>
            </label>
          </div>

          <div className="chip-input-box">
            {allowlist.map((account) => (
              <span key={account} className="chip">
                <span>{account}</span>
                <button
                  type="button"
                  className="chip-remove"
                  onClick={() => removeAllowlistEntry(account)}
                  aria-label={`Remove ${account}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}

            <input
              id="allowlist-input"
              type="text"
              className="chip-text-input"
              value={chipDraft}
              onChange={(e) => {
                setChipDraft(e.target.value)
                if (chipError) setChipError('')
              }}
              onKeyDown={handleChipKeyDown}
              onPaste={handleChipPaste}
              placeholder={
                allowlist.length >= MAX_ALLOWLIST_ITEMS
                  ? 'Allowlist full (10 max)'
                  : 'e.g. shop.testnet (press Enter)'
              }
              disabled={allowlist.length >= MAX_ALLOWLIST_ITEMS}
            />

            {chipDraft.trim() && (
              <button
                type="button"
                className="chip-add-btn"
                onClick={() => handleAddChip()}
              >
                Add
              </button>
            )}
          </div>

          {chipError ? (
            <span className="field-error-text">{chipError}</span>
          ) : allowlist.length > 0 ? (
            <div className="allowlist-mode-note">
              <strong>Allowlist mode active:</strong> Since your wallet blocks
              unknown payees, Heist will run <strong>5 drain scams</strong>{' '}
              (overbilling, double-paying, fake limit raises, planted rules,
              piecemeal drain) against your approved accounts. Each account must
              exist on NEAR testnet.
            </div>
          ) : (
            <p className="field-hint">
              NEAR testnet accounts your agent is permitted to pay. Leave empty
              for 4 steal scams, or add approved payees to test 5 drain scams.
            </p>
          )}
        </div>

        {/* Model + Access Code */}
        <div
          className={`config-grid ${
            accessCodeRequired ? '' : 'config-grid--single'
          }`}
        >
          <div className="field-group">
            <label htmlFor="agent-model" className="field-label">
              <Cpu size={15} />
              Agent Model
            </label>
            <select
              id="agent-model"
              className="select-control"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={modelsLoading || models.length === 0}
            >
              {models.length === 0 ? (
                <option value="">
                  {modelsLoading ? 'Loading models...' : 'No models available'}
                </option>
              ) : (
                models.map((modelId) => (
                  <option key={modelId} value={modelId}>
                    {formatModelName(modelId)} ({modelId})
                  </option>
                ))
              )}
            </select>
            {selectedModel && (
              <span className="model-raw-hint">
                Model ID: <code>{selectedModel}</code>
              </span>
            )}
          </div>

          {accessCodeRequired && (
            <div className="field-group">
              <label htmlFor="access-code" className="field-label">
                <KeyRound size={15} />
                Access Code
              </label>
              <input
                id="access-code"
                type="password"
                className="text-control"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Enter hackathon access code"
                autoComplete="off"
                required
              />
              <span className="field-hint">
                Required by this Heist server instance.
              </span>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="console-footer">
          <div className="console-safety-note">
            <ShieldCheck size={16} />
            <span>
              No wallet connection needed — Heist creates a throwaway testnet
              wallet for you.
            </span>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg hunt-submit-btn"
            disabled={!canSubmit}
          >
            {submitting ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Launching Hunt...
              </>
            ) : (
              <>
                <Crosshair size={18} />
                Hunt
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  )
}

