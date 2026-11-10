const RAW_BASE_URL =
  import.meta.env.VITE_HEIST_API ||
  import.meta.env.NEXT_PUBLIC_HEIST_API ||
  'http://localhost:8080'

export const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, '')

export class HeistApiError extends Error {
  constructor(message, status = 0, code = '') {
    super(message)
    this.name = 'HeistApiError'
    this.status = status
    this.code = code
  }
}

async function parseErrorResponse(response) {
  let serverMessage = ''
  let serverCode = ''
  try {
    const data = await response.json()
    if (data && typeof data.error === 'string' && data.error.trim()) {
      serverMessage = data.error.trim()
    }
    if (data && typeof data.code === 'string' && data.code.trim()) {
      serverCode = data.code.trim()
    }
  } catch {
    // Ignore non-JSON error bodies and fall back to status-based messages.
  }

  if (serverMessage) {
    return new HeistApiError(serverMessage, response.status, serverCode)
  }

  const fallbackByStatus = {
    400: 'Invalid input. Check your instructions, allowlist, or selected model.',
    401: 'Access code is missing or incorrect.',
    415: 'Request payload must be JSON.',
    429: "Daily hunt limit or today's server budget has been reached.",
    503: 'Heist server is currently busy or setup is incomplete. Try again shortly.',
  }

  return new HeistApiError(
    fallbackByStatus[response.status] || `Request failed with status ${response.status}.`,
    response.status,
    serverCode,
  )
}

async function requestJson(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, options)
  } catch {
    throw new HeistApiError("Can't reach the Heist server", 0)
  }

  if (!response.ok) {
    throw await parseErrorResponse(response)
  }

  return response.json()
}

let modelsEndpointMissing = false

export function fetchHealth() {
  return requestJson('/health', { method: 'GET' })
}

const DEFAULT_AGENT_MODEL = 'google/gemini-2.5-flash-lite'

async function fetchModelsFromHealth() {
  const health = await fetchHealth()
  const agentModel = health?.agentModel || DEFAULT_AGENT_MODEL
  const modelList = [agentModel]
  return {
    models: modelList,
    default: agentModel,
    accessCodeRequired: false,
    huntsLeftToday: null,
    missing: Array.isArray(health?.missing) ? health.missing : [],
    creditsExhausted: Boolean(health?.creditsExhausted),
    ok: Boolean(health?.ok),
  }
}

export async function fetchModels() {
  if (modelsEndpointMissing) {
    return fetchModelsFromHealth()
  }
  try {
    return await requestJson('/models', { method: 'GET' })
  } catch (err) {
    if (err instanceof HeistApiError && err.status === 404) {
      modelsEndpointMissing = true
      return fetchModelsFromHealth()
    }
    throw err
  }
}

export function startHunt(payload) {
  return requestJson('/hunt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export function fetchHuntResult(id) {
  return requestJson(`/hunt/${encodeURIComponent(id)}`, { method: 'GET' })
}

export function resolveApiUrl(pathOrUrl) {
  if (!pathOrUrl) return API_BASE_URL
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  const normalizedPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  return `${API_BASE_URL}${normalizedPath}`
}

