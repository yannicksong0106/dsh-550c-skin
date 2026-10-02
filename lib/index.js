/**
 * Host half of dsh-550c-skin.
 *
 * The skin itself is entirely browser-side — four themes registered into the
 * client's theme service, a stylesheet, two telemetry rails. What a client
 * bundle cannot do for itself, and what this module exists for, is remember
 * which scheme the user chose.
 *
 * WHY THE CHOICE NEEDS A HOST AT ALL
 *
 * DSH's theme preference is deliberately closed: `THEME_PREFERENCES` is
 * `['light', 'dark', 'system']`, the settings scope validates against exactly
 * that union, and `ThemeRuntime.setTheme` only persists ids that pass
 * `isThemePreference` — so selecting a third-party theme works for the session
 * and is then dropped, while `adopt()` rewinds the in-memory preference to the
 * stored built-in on the next scope update. A third-party theme therefore has
 * to keep its own durable record and re-assert itself on every `theme/change`.
 *
 * localStorage is not good enough for that record on DSH Desktop, which serves
 * the GUI from a random loopback port on every launch: browser storage is
 * scoped per origin *and port*, so it starts empty every time. A file under the
 * DSH home is port-independent and survives restarts, which is why the choice
 * lives here and localStorage is demoted to a synchronous first-paint cache.
 *
 * The route is same-origin on purpose: the served document's CSP is
 * restrictive and the host process already owns the filesystem, so there is no
 * reason to put a cross-origin request in the client's boot path.
 *
 * @module dsh-550c-skin
 */

import { chmodSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { homedir } from 'node:os'

export const name = 'skin-550c'

/** The durable-state route, exact-matched; the client is its only caller. */
const STATE_ROUTE = '/dsh-550c-skin/state'
/** State file name under the DSH home. */
const STATE_FILENAME = '550c-skin-state.json'
/** A preference blob is tiny; anything larger is a malformed request. */
const STATE_BODY_LIMIT = 32768

/**
 * The scheme ids the host will accept, in the client's own order.
 *
 * Order is not used for validation, but keeping it identical to `src/palettes.js`
 * means the two halves cannot disagree about which scheme is the default — that
 * lives at the front of the list, and it is the one place a mismatch would be
 * invisible until someone noticed the skin starting on a different colour than
 * the settings row was offering.
 */
const SCHEMES = ['off', 'white', 'amber', 'green', 'cyan']
const ATMOSPHERES = ['full', 'scan', 'vignette', 'off']
/**
 * How much of the console's own furniture is drawn.
 *
 * Kept in step with `PANEL_VALUES` in `src/client.js`. This list is why the new
 * preference silently vanished on its first live run: the host is the source of
 * truth for a Desktop session (the port changes every launch, so browser storage
 * is empty), and `sanitizeState` drops any field it does not know. A preference
 * added on one side only reads back as `undefined`.
 */
const PANELS = ['full', 'sidebar', 'grid', 'off']
const TOGGLES = ['on', 'off']
const BUILTINS = ['light', 'dark', 'system']

/** Read one enum field, or the fallback when it is absent or unknown. */
function pick(value, allowed, fallback) {
  return typeof value === 'string' && allowed.indexOf(value) >= 0 ? value : fallback
}

/** A fully default state: skin off, effects at their shipped defaults. */
function defaultState() {
  return { version: 1, scheme: 'off', atmosphere: 'full', panel: 'full', mark: 'on', mono: 'on', builtin: 'dark' }
}

/**
 * Normalize arbitrary input (JSON from disk or the wire) into a valid state.
 *
 * Applied on both read and write, so a corrupt file or a hand-crafted payload
 * can never poison the plugin's settings: unknown fields fall back, and every
 * enum is checked against the same lists the client uses.
 */
function sanitizeState(input) {
  const state = defaultState()
  if (typeof input !== 'object' || input === null) return state
  state.scheme = pick(input.scheme, SCHEMES, state.scheme)
  state.atmosphere = pick(input.atmosphere, ATMOSPHERES, state.atmosphere)
  state.panel = pick(input.panel, PANELS, state.panel)
  // `hud` is the name this field had while the design still had a corner HUD. It
  // is still accepted so an existing state file keeps its setting instead of
  // resetting to the default, but it is written back under the client's own name:
  // the two halves disagreeing about a field name is silent — the client simply
  // never finds it — and it cost the `550C 标志` toggle its durability on Desktop,
  // where this record is the only one that survives a restart.
  state.mark = pick(input.mark ?? input.hud, TOGGLES, state.mark)
  state.mono = pick(input.mono, TOGGLES, state.mono)
  state.builtin = pick(input.builtin, BUILTINS, state.builtin)
  return state
}

/** DSH home: `$DSH_HOME` when the process was booted with one, else `~/.dsh`. */
function dshHome() {
  const configured = typeof process.env.DSH_HOME === 'string' ? process.env.DSH_HOME.trim() : ''
  return configured !== '' ? configured : join(homedir(), '.dsh')
}

function stateFilePath() {
  return join(dshHome(), STATE_FILENAME)
}

/** The stored state, or null when there is not one yet (or it is unreadable). */
function readState() {
  try {
    return sanitizeState(JSON.parse(readFileSync(stateFilePath(), 'utf8')))
  } catch (error) {
    return null
  }
}

/**
 * Write the state atomically: a temp file in a sibling directory, chmod to the
 * existing file's mode (or 0600), rename over the target, then verify the
 * read-back equals what was written.
 *
 * Atomic because the alternative is a half-written preferences file after a
 * crash, which reads as "the skin forgot my scheme" — the exact bug this file
 * exists to prevent. Verifying because a silent short write on a full disk is
 * not worth discovering later.
 */
function writeState(state) {
  const path = stateFilePath()
  const parent = dirname(path)
  mkdirSync(parent, { recursive: true })
  let mode = 384
  try {
    mode = statSync(path).mode & 511
  } catch (error) {
    /* no previous file: keep 0600 */
  }
  const content = JSON.stringify(sanitizeState(state), null, 2) + '\n'
  const tempDir = mkdtempSync(join(parent, basename(path) + '.tmp-'))
  const temporary = join(tempDir, basename(path))
  try {
    writeFileSync(temporary, content, { encoding: 'utf8', flag: 'wx' })
    chmodSync(temporary, mode)
    renameSync(temporary, path)
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
  if (readFileSync(path, 'utf8') !== content) throw new Error('550c-skin state: write verification failed: ' + path)
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(payload))
}

/** Drain a request body as UTF-8 text, refusing anything over the cap. */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let total = 0
    let settled = false
    req.on('data', (chunk) => {
      if (settled) return
      total += chunk.byteLength
      if (total > STATE_BODY_LIMIT) {
        settled = true
        reject(new Error('state write body too large'))
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (settled) return
      settled = true
      resolve(Buffer.concat(chunks).toString('utf8'))
    })
    req.on('error', (error) => {
      if (settled) return
      settled = true
      reject(error)
    })
  })
}

/** GET answers the stored state (null when there is not one yet). */
function handleGet(_req, res) {
  try {
    sendJson(res, 200, { ok: true, state: readState() })
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
  }
}

/** PUT validates and durably writes the state. */
async function handlePut(req, res) {
  let raw
  try {
    raw = await readBody(req)
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
    return
  }
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    sendJson(res, 400, { ok: false, error: 'invalid-json' })
    return
  }
  try {
    writeState(parsed)
    sendJson(res, 200, { ok: true })
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
  }
}

/**
 * Register the durable-state route.
 *
 * This is the whole host half. The skin itself is client-side — a token ladder,
 * a stylesheet and one overlay — and none of that has a host-side counterpart.
 *
 * @param ctx - the plugin context.
 */
export function apply(ctx) {
  // Optional injection, not a hard dependency: a profile whose HTTP carrier is
  // absent or renamed still gets the whole skin, it simply cannot persist the
  // choice across restarts — and localStorage covers that case on a fixed-port
  // install such as `dsh web`.
  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(
      () =>
        webCtx.webServer.register({
          kind: 'exact',
          path: STATE_ROUTE,
          handler: (req, res) => {
            if (req.method === 'PUT' || req.method === 'POST') void handlePut(req, res)
            else handleGet(req, res)
          },
        }),
      `skin-550c: ${STATE_ROUTE}`,
    )
  })
}
