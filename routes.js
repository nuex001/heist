// HEIST routes.
//
//   GET  /health              is the server configured? (?ai=1 also tests the NEAR AI key)
//   POST /hunt                start a hunt: { "instructions": "...", "allowlist": ["shop.testnet"] }
//   GET  /hunt/:id/events     live progress (Server-Sent Events; use EventSource in the browser)
//   GET  /hunt/:id            status + final result
//
// Hunts run one at a time (they share the bank account and the NEAR AI credits); extra ones queue.
// Every error is { "error": "<message>", "code": "<CODE>" } (HTTP) or { type: "error", code, message } (events).
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { Router } from 'express';
import { BANK, MODEL, checkAI, missingConfig, runHunt } from './heist.js';

const router = Router();
const DAILY_LIMIT = Number(process.env.DAILY_LIMIT ?? 3); // hunts per IP per day
const NEAR_ACCOUNT = /^(?=.{2,64}$)[a-z0-9]+([-_][a-z0-9]+)*(\.[a-z0-9]+([-_][a-z0-9]+)*)*$/;

const hunts = new Map(); // id → { id, status, spec, events, listeners, result, error }
const queue = [];
const usage = new Map(); // "ip|day" → hunts started
let busy = false;
let creditsOut = false; // set when NEAR AI says the credits are gone; new hunts are paused until they're back

// Errors caused by Heist's side (not the user's input): the user gets their daily try back.
const OUR_FAULT = new Set(['AI_CREDITS_EXHAUSTED', 'AI_KEY_INVALID', 'AI_MODEL_NOT_FOUND', 'AI_RATE_LIMITED', 'AI_TIMEOUT', 'AI_ERROR', 'WALLET_FAILED', 'CHAIN_ERROR', 'SERVER_ERROR']);
const fail = (res, status, code, error) => res.status(status).json({ error, code });

// Record an event and push it to everyone watching this hunt.
function emit(hunt, event) {
  hunt.events.push(event);
  // Also print to the server terminal, so you can see exactly where a hunt is.
  const what = event.type === 'turn' ? `${event.outcome.toUpperCase()}${event.paidTo ? ` (${event.amount} NEAR → ${event.paidTo})` : ''} · ${String(event.reply).slice(0, 80)}`
    : event.type === 'done' ? `score ${event.score}` : (event.message ?? event.name ?? event.account ?? '');
  console.log(`[${hunt.id}] ${event.type}${event.tactic ? ` · ${event.tactic}` : ''}${event.turn ? ` · turn ${event.turn}` : ''} · ${what}`);
  for (const res of hunt.listeners) res.write(`data: ${JSON.stringify(event)}\n\n`);
}

// Run queued hunts one by one.
async function work() {
  if (busy || !queue.length) return;
  busy = true;
  const hunt = queue.shift();
  hunt.status = 'running';
  try {
    hunt.result = await runHunt(hunt.id, hunt.spec, event => emit(hunt, event));
    hunt.status = 'done';
    await mkdir('reports', { recursive: true });
    await writeFile(`reports/${hunt.id}.json`, JSON.stringify({ id: hunt.id, at: new Date().toISOString(), ...hunt.spec, ...hunt.result }, null, 2));
  } catch (err) {
    const code = err.code ?? 'SERVER_ERROR';
    hunt.status = 'error';
    hunt.error = err.message;
    hunt.code = code;
    if (code === 'AI_CREDITS_EXHAUSTED') creditsOut = true;
    if (OUR_FAULT.has(code)) usage.set(hunt.ipKey, Math.max(0, (usage.get(hunt.ipKey) ?? 1) - 1)); // give the try back
    emit(hunt, { type: 'error', code, message: err.message });
  }
  for (const res of hunt.listeners) res.end();
  hunt.listeners.clear();
  busy = false;
  work();
}

// GET /health checks .env; GET /health?ai=1 also makes a tiny NEAR AI call to test the key and model.
router.get('/health', async (req, res) => {
  const missing = missingConfig();
  const ai = req.query.ai ? await checkAI() : undefined;
  res.json({ ok: missing.length === 0 && (ai?.ok ?? true) && !creditsOut, missing, ai, creditsExhausted: creditsOut, model: MODEL, bank: BANK, queued: queue.length });
});

router.post('/hunt', async (req, res) => {
  const missing = missingConfig();
  if (missing.length) {
    return fail(res, 503, 'SETUP_INCOMPLETE', `Server setup is incomplete: ${missing.join(', ')}`);
  }
  // Credits ran out earlier: check again (a tiny call) in case they've been topped up since.
  if (creditsOut) {
    const check = await checkAI();
    if (check.ok) creditsOut = false;
    else return fail(res, 503, check.code ?? 'AI_CREDITS_EXHAUSTED', check.error);
  }
  if (!req.is('application/json')) {
    return fail(res, 415, 'NOT_JSON', 'Send the body as JSON with the header Content-Type: application/json');
  }
  if (typeof req.body?.instructions !== 'string') {
    return fail(res, 400, 'INVALID_INPUT', 'Missing "instructions". Send { "instructions": "your agent\'s instructions", "allowlist": [] }');
  }
  const instructions = String(req.body?.instructions ?? '').trim();
  const rawList = Array.isArray(req.body?.allowlist) ? req.body.allowlist : [];
  const allowlist = [...new Set(rawList.map(a => String(a).trim().toLowerCase()).filter(Boolean))];

  if (instructions.length < 10 || instructions.length > 4000) {
    return fail(res, 400, 'INVALID_INPUT', 'instructions must be 10 to 4000 characters');
  }
  if (allowlist.length > 10 || !allowlist.every(a => NEAR_ACCOUNT.test(a))) {
    return fail(res, 400, 'INVALID_INPUT', 'allowlist must be up to 10 valid NEAR account names');
  }

  const key = `${req.ip}|${new Date().toISOString().slice(0, 10)}`;
  if ((usage.get(key) ?? 0) >= DAILY_LIMIT) {
    return fail(res, 429, 'RATE_LIMITED', `You've used your ${DAILY_LIMIT} hunts for today. Try again tomorrow.`);
  }
  usage.set(key, (usage.get(key) ?? 0) + 1);

  const id = randomBytes(4).toString('hex');
  const hunt = { id, status: 'queued', spec: { instructions, allowlist }, ipKey: key, events: [], listeners: new Set() };
  hunts.set(id, hunt);
  queue.push(hunt);
  emit(hunt, { type: 'status', message: busy ? `Queued (position ${queue.length})` : 'Starting' });
  work();

  res.status(202).json({ id, status: hunt.status, eventsUrl: `/hunt/${id}/events`, resultUrl: `/hunt/${id}` });
});

router.get('/hunt/:id/events', (req, res) => {
  const hunt = hunts.get(req.params.id);
  if (!hunt) return fail(res, 404, 'NOT_FOUND', 'Hunt not found');

  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  for (const event of hunt.events) res.write(`data: ${JSON.stringify(event)}\n\n`); // replay what already happened
  if (hunt.status === 'done' || hunt.status === 'error') return res.end();

  hunt.listeners.add(res);
  // Keep-alive comment every 15 s so browsers and proxies don't drop a quiet stream.
  const ping = setInterval(() => res.write(': ping\n\n'), 15_000);
  req.on('close', () => { clearInterval(ping); hunt.listeners.delete(res); });
});

router.get('/hunt/:id', (req, res) => {
  const hunt = hunts.get(req.params.id);
  if (!hunt) return fail(res, 404, 'NOT_FOUND', 'Hunt not found');
  res.json({ id: hunt.id, status: hunt.status, error: hunt.error, code: hunt.code, ...(hunt.result ?? {}) });
});

export default router;
