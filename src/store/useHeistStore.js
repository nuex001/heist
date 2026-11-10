import { create } from 'zustand'
import {
  fetchHuntResult,
  fetchModels,
  resolveApiUrl,
  startHunt,
} from '../api/heistApi'
import {
  DRAIN_SCAMS,
  EXAMPLE_INSTRUCTIONS,
  MAX_ALLOWLIST_ITEMS,
  NEAR_ACCOUNT_REGEX,
  SCAMS,
  getScamKind,
  normalizeTacticName,
} from '../constants/scams'

let activeEventSource = null

function closeActiveEventSource() {
  if (activeEventSource) {
    activeEventSource.close()
    activeEventSource = null
  }
}

function createInitialTactics(scamList = SCAMS) {
  const map = {}
  for (const scam of scamList) {
    const key = normalizeTacticName(scam.key || scam.name)
    map[key] = {
      name: key,
      kind: scam.kind || getScamKind(key),
      how: scam.how || scam.description || null,
      status: 'pending', // 'pending' | 'active' | 'blocked' | 'tricked' | 'robbed'
      turns: [],
      skips: [],
      activeStep: null,
      lost: 0,
      fix: null,
    }
  }
  return map
}

function ensureTacticEntry(tactics, rawName, extra = {}) {
  const name = normalizeTacticName(rawName)
  if (!name) return { name: '', tactics }
  if (tactics[name]) {
    if (extra.kind || extra.how) {
      return {
        name,
        tactics: {
          ...tactics,
          [name]: {
            ...tactics[name],
            kind: extra.kind || tactics[name].kind,
            how: extra.how || tactics[name].how,
          },
        },
      }
    }
    return { name, tactics }
  }
  return {
    name,
    tactics: {
      ...tactics,
      [name]: {
        name,
        kind: extra.kind || getScamKind(name),
        how: extra.how || null,
        status: 'pending',
        turns: [],
        skips: [],
        activeStep: null,
        lost: 0,
        fix: null,
      },
    },
  }
}

function getInitialHuntState(mode = 'open') {
  const list = mode === 'allowlist' ? DRAIN_SCAMS : SCAMS
  return {
    huntMode: mode,
    huntStatus: 'idle',
    statusMessage: '',
    wallet: null,
    tacticOrder: list.map((s) => s.key),
    tactics: createInitialTactics(list),
    tacticsCount: list.length,
    score: null,
    robbedBy: [],
    trickedBy: [],
    lostNear: 0,
    fixes: [],
    attacker: null,
    attackerModel: null,
    agentModel: null,
    huntError: null,
    huntErrorCode: null,
    resultLoading: false,
    resultLoadError: null,
    resultLoadErrorCode: null,
    autoScroll: true,
  }
}

function parseRoutePath(pathname) {
  const resultMatch = pathname.match(/^\/results\/([^/]+)\/?$/)
  if (resultMatch) {
    return { view: 'result', id: decodeURIComponent(resultMatch[1]) }
  }
  const huntMatch = pathname.match(/^\/hunt\/([^/]+)\/?$/)
  if (huntMatch) {
    return { view: 'live', id: decodeURIComponent(huntMatch[1]) }
  }
  return { view: 'home', id: null }
}

function pushUrl(path, replace = false) {
  if (typeof window === 'undefined') return
  if (window.location.pathname === path) return
  if (replace) {
    window.history.replaceState({}, '', path)
  } else {
    window.history.pushState({}, '', path)
  }
}

export const useHeistStore = create((set, get) => ({
  // Models & Server Budget
  models: [],
  defaultModel: '',
  accessCodeRequired: false,
  huntsLeftToday: null,
  modelsLoading: false,
  modelsError: null,

  // Form Inputs
  instructions: '',
  allowlist: [],
  selectedModel: '',
  accessCode: '',
  submitting: false,
  submitError: null,
  submitErrorCode: null,

  // Navigation & Active Hunt
  view: 'home', // 'home' | 'live' | 'result'
  huntId: null,
  ...getInitialHuntState(),

  // Actions: Config
  loadModels: async () => {
    set({ modelsLoading: true, modelsError: null })
    try {
      const data = await fetchModels()
      const models = Array.isArray(data.models) ? data.models : []
      const defaultModel = data.default || models[0] || ''
      const currentSelected = get().selectedModel
      const nextSelected =
        currentSelected && models.includes(currentSelected) ? currentSelected : defaultModel

      const missingConfigMsg =
        Array.isArray(data.missing) && data.missing.length > 0
          ? `Server setup is incomplete: ${data.missing.join(', ')}`
          : data.creditsExhausted
            ? 'Server NEAR AI credits are exhausted.'
            : null

      set({
        models,
        defaultModel,
        selectedModel: nextSelected,
        accessCodeRequired: Boolean(data.accessCodeRequired),
        huntsLeftToday:
          typeof data.huntsLeftToday === 'number' ? data.huntsLeftToday : null,
        modelsLoading: false,
        modelsError: missingConfigMsg,
      })
    } catch (err) {
      set({
        modelsLoading: false,
        modelsError: err?.message || "Can't reach the Heist server",
      })
    }
  },

  // Actions: Form
  setInstructions: (instructions) => set({ instructions, submitError: null }),

  useExampleInstructions: () =>
    set({ instructions: EXAMPLE_INSTRUCTIONS, submitError: null }),

  addAllowlistEntry: (rawValue) => {
    const normalized = String(rawValue || '').trim().toLowerCase()
    if (!normalized) {
      return { ok: false, error: '' }
    }

    const { allowlist } = get()
    if (allowlist.length >= MAX_ALLOWLIST_ITEMS) {
      return {
        ok: false,
        error: `Maximum of ${MAX_ALLOWLIST_ITEMS} allowlist accounts reached.`,
      }
    }

    if (!NEAR_ACCOUNT_REGEX.test(normalized)) {
      return {
        ok: false,
        error: 'Enter a valid NEAR account name (e.g. shop.testnet).',
      }
    }

    if (allowlist.includes(normalized)) {
      return { ok: false, error: `"${normalized}" is already in the allowlist.` }
    }

    set({ allowlist: [...allowlist, normalized], submitError: null })
    return { ok: true, error: '' }
  },

  removeAllowlistEntry: (account) =>
    set((state) => ({
      allowlist: state.allowlist.filter((item) => item !== account),
      submitError: null,
    })),

  setSelectedModel: (selectedModel) => set({ selectedModel, submitError: null }),

  setAccessCode: (accessCode) => set({ accessCode, submitError: null }),

  clearSubmitError: () => set({ submitError: null }),

  setAutoScroll: (autoScroll) => set({ autoScroll }),

  // Actions: Navigation
  goHome: ({ keepInstructions = true, updateUrl = true } = {}) => {
    closeActiveEventSource()
    if (updateUrl) pushUrl('/')
    set((state) => ({
      view: 'home',
      huntId: null,
      submitting: false,
      submitError: null,
      instructions: keepInstructions ? state.instructions : '',
      ...getInitialHuntState(),
    }))
  },

  syncFromLocation: () => {
    if (typeof window === 'undefined') return
    const route = parseRoutePath(window.location.pathname)
    if (route.view === 'home') {
      closeActiveEventSource()
      set({
        view: 'home',
        huntId: null,
        ...getInitialHuntState(),
      })
      return
    }
    if (route.id) {
      get().loadHuntById(route.id)
    }
  },

  // Actions: Start Hunt
  submitHunt: async () => {
    const {
      instructions,
      allowlist,
      selectedModel,
      accessCode,
      accessCodeRequired,
      huntsLeftToday,
    } = get()

    if (huntsLeftToday === 0) {
      set({ submitError: "Heist has used today's budget. Try again tomorrow." })
      return
    }

    const trimmed = instructions.trim()
    if (trimmed.length < 10 || trimmed.length > 4000) {
      set({
        submitError: 'Instructions must be between 10 and 4000 characters.',
      })
      return
    }

    if (accessCodeRequired && !accessCode.trim()) {
      set({ submitError: 'Access code is required.' })
      return
    }

    const payload = {
      instructions: trimmed,
    }
    if (allowlist.length > 0) {
      payload.allowlist = allowlist
    }
    if (selectedModel) {
      payload.model = selectedModel
    }
    if (accessCodeRequired) {
      payload.accessCode = accessCode.trim()
    }

    set({ submitting: true, submitError: null, submitErrorCode: null })

    try {
      const response = await startHunt(payload)
      const id = response.id
      const eventsUrl = response.eventsUrl || `/hunt/${id}/events`
      const initialMode = allowlist.length > 0 ? 'allowlist' : 'open'

      pushUrl(`/hunt/${id}`)
      set({
        submitting: false,
        submitError: null,
        submitErrorCode: null,
        view: 'live',
        huntId: id,
        ...getInitialHuntState(initialMode),
        huntStatus: response.status || 'queued',
        statusMessage: 'Connecting to Heist live stream...',
      })

      get().openEventsStream(id, eventsUrl)
    } catch (err) {
      set({
        submitting: false,
        submitError: err?.message || "Can't reach the Heist server",
        submitErrorCode: err?.code || null,
      })
    }
  },

  // Actions: Load Hunt Result or Resume Live Hunt
  loadHuntById: async (id) => {
    closeActiveEventSource()
    set({
      view: 'result',
      huntId: id,
      ...getInitialHuntState(),
      resultLoading: true,
      resultLoadError: null,
    })

    try {
      const data = await fetchHuntResult(id)

      if (data.status === 'queued' || data.status === 'running') {
        set({
          view: 'live',
          huntId: id,
          ...getInitialHuntState(),
          huntStatus: data.status,
          statusMessage: 'Resuming live hunt stream...',
        })
        get().openEventsStream(id, data.eventsUrl || `/hunt/${id}/events`)
        return
      }

      if (data.status === 'error') {
        set({
          view: 'result',
          huntId: id,
          resultLoading: false,
          huntStatus: 'error',
          huntError: data.error || 'This hunt ended with an error.',
          huntErrorCode: data.code || null,
        })
        return
      }

      // Done state: hydrate full results into the same tactic map
      const hasDrain = Array.isArray(data.results) && data.results.some((r) => r.kind === 'drain')
      const huntMode = hasDrain ? 'allowlist' : 'open'
      let tactics = Array.isArray(data.results) && data.results.length > 0
        ? {}
        : createInitialTactics(huntMode === 'allowlist' ? DRAIN_SCAMS : SCAMS)
      const tacticOrder =
        Array.isArray(data.results) && data.results.length > 0
          ? []
          : (huntMode === 'allowlist' ? DRAIN_SCAMS : SCAMS).map((s) => s.key)

      const normalizedRobbedBy = (data.robbedBy || []).map(normalizeTacticName)
      const normalizedTrickedBy = (data.trickedBy || []).map(normalizeTacticName)

      if (Array.isArray(data.results)) {
        for (const item of data.results) {
          const ensured = ensureTacticEntry(tactics, item.tactic, {
            kind: item.kind,
          })
          tactics = ensured.tactics
          const key = ensured.name
          if (key && !tacticOrder.includes(key)) {
            tacticOrder.push(key)
          }
          if (key) {
            const turns = Array.isArray(item.turns)
              ? [...item.turns].sort((a, b) => (a.turn || 0) - (b.turn || 0))
              : []
            let status = 'blocked'
            if (item.outcome === 'robbed' || item.robbed) status = 'robbed'
            else if (item.outcome === 'tricked' || item.tricked) status = 'tricked'

            tactics[key] = {
              name: key,
              kind: item.kind || getScamKind(key),
              how: tactics[key]?.how || null,
              status,
              turns,
              skips: [],
              activeStep: null,
              lost: typeof item.lost === 'number' ? item.lost : 0,
              fix: item.fix || null,
            }
          }
        }
      }

      for (const key of normalizedRobbedBy) {
        if (tactics[key]) {
          tactics[key] = { ...tactics[key], status: 'robbed' }
        }
      }
      for (const key of normalizedTrickedBy) {
        if (tactics[key] && tactics[key].status !== 'robbed') {
          tactics[key] = { ...tactics[key], status: 'tricked' }
        }
      }

      const normalizedWallet =
        typeof data.wallet === 'string'
          ? {
              account: data.wallet,
              url: `https://testnet.nearblocks.io/address/${encodeURIComponent(data.wallet)}`,
              funded: '1 NEAR',
            }
          : data.wallet || null

      set({
        view: 'result',
        huntId: id,
        resultLoading: false,
        resultLoadError: null,
        resultLoadErrorCode: null,
        huntMode,
        huntStatus: 'done',
        tacticsCount:
          typeof data.tactics === 'number' ? data.tactics : tacticOrder.length,
        score: typeof data.score === 'number' ? data.score : 0,
        wallet: normalizedWallet,
        attacker: data.attacker || null,
        attackerModel: data.attackerModel || null,
        agentModel: data.agentModel || null,
        robbedBy: normalizedRobbedBy,
        trickedBy: normalizedTrickedBy,
        lostNear: typeof data.lostNear === 'number' ? data.lostNear : 0,
        fixes: Array.isArray(data.fixes) ? data.fixes : [],
        tacticOrder,
        tactics,
      })
    } catch (err) {
      set({
        view: 'result',
        huntId: id,
        resultLoading: false,
        resultLoadError: err?.message || "Can't reach the Heist server",
        resultLoadErrorCode: err?.code || null,
      })
    }
  },

  // Actions: SSE Stream
  openEventsStream: (id, eventsUrl) => {
    closeActiveEventSource()

    const url = resolveApiUrl(eventsUrl || `/hunt/${id}/events`)
    const es = new EventSource(url)
    activeEventSource = es

    let openCount = 0
    let errorCountBeforeOpen = 0
    let streamClosedCleanly = false

    es.onopen = () => {
      openCount += 1
      errorCountBeforeOpen = 0

      // If EventSource reconnected after dropping mid-stream, rebuild the log from scratch
      // because the server replays every past event before streaming new ones.
      if (openCount > 1) {
        set((state) => ({
          ...getInitialHuntState(state.huntMode),
          huntStatus: 'running',
          statusMessage: 'Reconnected — rebuilding live log...',
        }))
      }
    }

    es.onmessage = (event) => {
      if (activeEventSource !== es) return

      let payload
      try {
        payload = JSON.parse(event.data)
      } catch {
        return
      }

      if (!payload || !payload.type) return

      if (payload.type === 'status') {
        const msg = payload.message || ''
        const isQueued = /^queued/i.test(msg)
        set((state) => ({
          statusMessage: msg,
          huntStatus:
            state.huntStatus === 'done' || state.huntStatus === 'error'
              ? state.huntStatus
              : isQueued
                ? 'queued'
                : 'running',
        }))
        return
      }

      if (payload.type === 'wallet') {
        set({
          huntStatus: 'running',
          wallet: {
            account: payload.account,
            url: payload.url,
            funded: payload.funded,
          },
        })
        return
      }

      if (payload.type === 'plan') {
        const mode = payload.mode === 'allowlist' ? 'allowlist' : 'open'
        const plannedTactics = Array.isArray(payload.tactics) ? payload.tactics : []
        if (plannedTactics.length > 0) {
          set({
            huntMode: mode,
            huntStatus: 'running',
            tacticOrder: plannedTactics.map((t) => normalizeTacticName(t.name)),
            tactics: createInitialTactics(plannedTactics),
            tacticsCount: plannedTactics.length,
          })
        } else {
          set({ huntMode: mode, huntStatus: 'running' })
        }
        return
      }

      if (payload.type === 'tactic') {
        set((state) => {
          const ensured = ensureTacticEntry(state.tactics, payload.name, {
            kind: payload.kind,
          })
          const key = ensured.name
          const nextTactics = { ...ensured.tactics }
          const nextOrder = state.tacticOrder.includes(key)
            ? state.tacticOrder
            : [...state.tacticOrder, key]

          // Any previously active tactic that wasn't robbed/tricked is now blocked
          for (const existingKey of Object.keys(nextTactics)) {
            const entry = nextTactics[existingKey]
            if (existingKey !== key && entry.status === 'active') {
              nextTactics[existingKey] = {
                ...entry,
                status: 'blocked',
                activeStep: null,
              }
            } else if (existingKey !== key && entry.activeStep) {
              nextTactics[existingKey] = {
                ...entry,
                activeStep: null,
              }
            }
          }

          if (key && nextTactics[key]) {
            const currentStatus = nextTactics[key].status
            nextTactics[key] = {
              ...nextTactics[key],
              kind: payload.kind || nextTactics[key].kind,
              status:
                currentStatus === 'robbed' || currentStatus === 'tricked'
                  ? currentStatus
                  : 'active',
            }
          }

          return {
            huntStatus: 'running',
            tacticOrder: nextOrder,
            tactics: nextTactics,
          }
        })
        return
      }

      if (payload.type === 'step') {
        set((state) => {
          const ensured = ensureTacticEntry(state.tactics, payload.tactic)
          const key = ensured.name
          if (!key) return {}
          const nextTactics = { ...ensured.tactics }
          const current = nextTactics[key]
          nextTactics[key] = {
            ...current,
            status: current.status === 'pending' ? 'active' : current.status,
            activeStep: {
              turn: payload.turn,
              message: payload.message,
              txUrl: payload.txUrl || null,
            },
          }
          return {
            huntStatus: 'running',
            tactics: nextTactics,
          }
        })
        return
      }

      if (payload.type === 'turn') {
        set((state) => {
          const ensured = ensureTacticEntry(state.tactics, payload.tactic, {
            kind: payload.kind,
          })
          const key = ensured.name
          if (!key) return {}
          const nextTactics = { ...ensured.tactics }
          const current = nextTactics[key]

          const outcome =
            payload.outcome ||
            (payload.robbed ? 'robbed' : payload.tricked ? 'tricked' : 'blocked')

          const turnObj = {
            tactic: key,
            kind: payload.kind || current.kind,
            turn: payload.turn,
            thought: payload.thought,
            message: payload.message,
            reply: payload.reply,
            outcome,
            robbed: outcome === 'robbed' || Boolean(payload.robbed),
            tricked: outcome === 'tricked' || Boolean(payload.tricked),
            paidTo: payload.paidTo || null,
            amount: typeof payload.amount === 'number' ? payload.amount : 0,
            tx: payload.tx || null,
            txUrl: payload.txUrl || null,
            proof: payload.proof || null,
          }

          const existingIdx = current.turns.findIndex(
            (t) => t.turn === turnObj.turn,
          )
          const nextTurns =
            existingIdx >= 0
              ? current.turns.map((t, i) => (i === existingIdx ? turnObj : t))
              : [...current.turns, turnObj].sort(
                  (a, b) => (a.turn || 0) - (b.turn || 0),
                )

          let nextStatus = current.status === 'pending' ? 'active' : current.status
          if (turnObj.robbed) nextStatus = 'robbed'
          else if (turnObj.tricked && nextStatus !== 'robbed') nextStatus = 'tricked'

          const nextLost = nextTurns.reduce((sum, t) => {
            if (t.robbed || (current.kind === 'drain' && t.paidTo)) {
              return sum + (t.amount || 0)
            }
            return sum
          }, 0)

          nextTactics[key] = {
            ...current,
            status: nextStatus,
            turns: nextTurns,
            lost: Number(nextLost.toFixed(4)),
            activeStep: null,
          }

          return {
            huntStatus: 'running',
            tactics: nextTactics,
          }
        })
        return
      }

      if (payload.type === 'skip') {
        set((state) => {
          const ensured = ensureTacticEntry(state.tactics, payload.tactic)
          const key = ensured.name
          if (!key) return {}
          const nextTactics = { ...ensured.tactics }
          const current = nextTactics[key]
          const skipObj = {
            turn: payload.turn,
            message:
              payload.message ||
              `Turn ${payload.turn} skipped: the attacker didn't answer properly`,
          }
          const alreadyExists = current.skips.some(
            (s) => s.turn === skipObj.turn,
          )
          nextTactics[key] = {
            ...current,
            activeStep: null,
            skips: alreadyExists ? current.skips : [...current.skips, skipObj],
          }
          return { tactics: nextTactics }
        })
        return
      }

      if (payload.type === 'done') {
        streamClosedCleanly = true
        es.close()
        if (activeEventSource === es) {
          activeEventSource = null
        }

        const robbedBy = Array.isArray(payload.robbedBy)
          ? payload.robbedBy.map(normalizeTacticName)
          : []
        const trickedBy = Array.isArray(payload.trickedBy)
          ? payload.trickedBy.map(normalizeTacticName)
          : []
        const fixes = Array.isArray(payload.fixes) ? payload.fixes : []

        set((state) => {
          const nextTactics = { ...state.tactics }
          for (const key of Object.keys(nextTactics)) {
            const entry = nextTactics[key]
            const isRobbed = robbedBy.includes(key) || entry.status === 'robbed'
            const isTricked =
              !isRobbed && (trickedBy.includes(key) || entry.status === 'tricked')
            nextTactics[key] = {
              ...entry,
              status: isRobbed ? 'robbed' : isTricked ? 'tricked' : 'blocked',
              activeStep: null,
            }
          }
          return {
            view: 'result',
            huntStatus: 'done',
            tacticsCount:
              typeof payload.tactics === 'number'
                ? payload.tactics
                : state.tacticOrder.length,
            score: typeof payload.score === 'number' ? payload.score : 0,
            robbedBy,
            trickedBy,
            lostNear: typeof payload.lostNear === 'number' ? payload.lostNear : 0,
            fixes,
            tactics: nextTactics,
            statusMessage: 'Hunt complete.',
          }
        })

        pushUrl(`/results/${id}`, true)

        // Silently refresh daily remaining count
        fetchModels()
          .then((data) => {
            if (typeof data.huntsLeftToday === 'number') {
              set({ huntsLeftToday: data.huntsLeftToday })
            }
          })
          .catch(() => {})
        return
      }

      if (payload.type === 'error') {
        streamClosedCleanly = true
        es.close()
        if (activeEventSource === es) {
          activeEventSource = null
        }

        set((state) => {
          const nextTactics = { ...state.tactics }
          for (const key of Object.keys(nextTactics)) {
            if (nextTactics[key].activeStep) {
              nextTactics[key] = { ...nextTactics[key], activeStep: null }
            }
          }
          return {
            huntStatus: 'error',
            huntError: payload.message || 'The hunt failed.',
            huntErrorCode: payload.code || null,
            tactics: nextTactics,
          }
        })
      }
    }

    es.onerror = () => {
      if (streamClosedCleanly || activeEventSource !== es) return
      if (openCount === 0) {
        errorCountBeforeOpen += 1
        if (errorCountBeforeOpen >= 3) {
          es.close()
          if (activeEventSource === es) {
            activeEventSource = null
          }
          set({
            huntStatus: 'error',
            huntError: "Can't reach the Heist server event stream.",
            huntErrorCode: 'NETWORK_ERROR',
          })
        }
      }
    }
  },
}))

