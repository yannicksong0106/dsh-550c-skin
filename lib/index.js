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

import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { homedir } from 'node:os'
import { spawn } from 'node:child_process'

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
    // STRIP A BYTE-ORDER MARK FIRST. `readFileSync(path,'utf8')` keeps a leading
    // U+FEFF and `JSON.parse` rejects it, so a state file saved by anything that
    // emits a BOM — PowerShell's `Set-Content -Encoding utf8`, Notepad, most
    // Windows editors — parsed as nothing at all.
    //
    // The failure is not local. The client reads "the host has no record", takes
    // that for the first run on this host, and publishes its own defaults: a BOM
    // in this file SILENTLY RESET the saved scheme, atmosphere and panel to their
    // shipped values. PowerShell's own JSON parser tolerates a BOM, which is why
    // it hid for so long — the file looked fine to the same tool that wrote it.
    const text = readFileSync(stateFilePath(), 'utf8').replace(/^\uFEFF/, '')
    return sanitizeState(JSON.parse(text))
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

/* ══════════════════════════════════════════════════════════════════════════
   和 boot 一样走宿主代理，不直接打 registry：页面 CSP 严，宿主进程本来
   就能联网。先 npmmirror（国内快）后 npmjs（官方兜底），5 分钟缓存，
   6 秒查询超时、3 分钟执行超时。桌面端独占管理 desktop profile，
   所以那里只能提示去「设置 → 插件」里装，不会自己动手。
   ══════════════════════════════════════════════════════════════════════════ */

const VERSION_GLOBAL = '__dsh550cSkinVersion'
/** Painted under the splash's own --bg, so the handoff is invisible. */
const FIRST_FRAME_BG = '#050403'
/** Absolute ceiling (ms): past this the cover yields whatever is on the page. */
const FIRST_FRAME_MAX_MS = 12000
/** The splash's own :host z-index (src/client.js HOST_CSS) minus one. */
const FIRST_FRAME_Z = 2147482000

/**
 * Where the settings row's 检查更新 button gets its answer, and where its
 * 立即更新 button goes to actually install.
 *
 * Both run HERE, not in the page: the served document's CSP is restrictive and the
 * host process already owns outbound network access, so same-origin routes keep the
 * client free of cross-origin requests, CORS and CSP questions.
 *
 * The source is npm, not GitHub releases. Measured from this machine: the npmmirror
 * mirror answers in ~160 ms and registry.npmjs.org in ~2.1 s, so the mirror is tried
 * first and the official registry is the fallback — a China-side install gets the
 * fast one, everyone else silently gets the authoritative one.
 */
const PACKAGE_NAME = 'dsh-550c-skin'
/** 更新检查的路由（GET）。 */
const UPDATE_ROUTE = '/dsh-550c-skin/update'
const APPLY_ROUTE = '/dsh-550c-skin/update/apply'
const REGISTRIES = [
  { id: 'npmmirror', base: 'https://registry.npmmirror.com' },
  { id: 'npmjs', base: 'https://registry.npmjs.org' },
]
/** One upstream answer is reused for this long; the button is cheap to press. */
const UPDATE_TTL_MS = 5 * 60 * 1000
const UPDATE_TIMEOUT_MS = 6000
/** An install is slower than a lookup, and is killed rather than left running. */
const APPLY_TIMEOUT_MS = 180000
const APPLY_OUTPUT_LIMIT = 4000

/**
 * The running version, read from the package that is actually installed.
 *
 * Reading package.json beats a build-time constant: a linked working tree (the
 * maintainer's own install) and a tarball both report the truth, and the version
 * can never drift from the manifest a release was cut from.
 */
function packageVersion() {
  try {
    const url = new URL('../package.json', import.meta.url)
    return JSON.parse(readFileSync(url, 'utf8')).version ?? null
  } catch (error) {
    return null
  }
}

const VERSION = packageVersion()

/**
 * Compare two semver-ish versions. Returns 1 when `a` is newer, -1 when `b` is,
 * 0 when they are equal. Build metadata is ignored; a prerelease ranks below its
 * own release (`0.2.0-rc.1 < 0.2.0`), which is what decides "an update is out".
 */
function compareVersions(a, b) {
  const parse = (value) => {
    const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(String(value ?? ''))
    return match === null ? null : { parts: [Number(match[1]), Number(match[2]), Number(match[3])], pre: match[4] ?? null }
  }
  const left = parse(a)
  const right = parse(b)
  if (left === null || right === null) return 0
  for (let index = 0; index < 3; index += 1) {
    if (left.parts[index] !== right.parts[index]) return left.parts[index] > right.parts[index] ? 1 : -1
  }
  if (left.pre === right.pre) return 0
  if (left.pre === null) return 1
  if (right.pre === null) return -1
  return left.pre > right.pre ? 1 : -1
}

/** The cached upstream answer, so repeated presses do not hammer the registry. */
let cachedRelease = null
let cachedAt = 0

async function latestFrom(base) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), UPDATE_TIMEOUT_MS)
  try {
    const response = await fetch(`${base}/${PACKAGE_NAME}/latest`, {
      headers: { accept: 'application/json', 'user-agent': 'dsh-550c-skin-update-check' },
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`${base} responded ${String(response.status)}`)
    const manifest = await response.json()
    const version = typeof manifest.version === 'string' ? manifest.version : null
    if (version === null) throw new Error(`${base} sent no version`)
    return { version, tarball: typeof manifest.dist?.tarball === 'string' ? manifest.dist.tarball : null }
  } finally {
    clearTimeout(timer)
  }
}

/** Mirror first, official registry second; the first one that answers wins. */
async function latestPublished() {
  if (cachedRelease !== null && Date.now() - cachedAt < UPDATE_TTL_MS) return cachedRelease
  const failures = []
  for (const registry of REGISTRIES) {
    try {
      const found = await latestFrom(registry.base)
      cachedRelease = { latest: found.version, tarball: found.tarball, source: registry.id }
      cachedAt = Date.now()
      return cachedRelease
    } catch (caught) {
      failures.push(`${registry.id}: ${caught instanceof Error ? caught.message : String(caught)}`)
    }
  }
  throw new Error(failures.join('; '))
}

/**
 * Which profile is running, and whether this plugin may install into it.
 *
 * `dsh plugin` refuses `desktop` outright — its check is literally
 * `profile.toLowerCase() === "desktop"` — because the Electron application owns
 * that profile. So the row offers the one-click install everywhere else and the
 * in-app instructions on the Desktop, where the app's own plugin manager is the
 * only thing allowed to touch it.
 */
function profileInfo() {
  const profile = typeof process.env.DSH_PROFILE === 'string' ? process.env.DSH_PROFILE : null
  if (profile === null || profile === '') {
    return { profile: null, canApply: false, reason: 'unknown-profile' }
  }
  if (profile.toLowerCase() === 'desktop') {
    return { profile, canApply: false, reason: 'desktop-profile' }
  }
  return { profile, canApply: true, reason: null }
}

/** The DSH CLI that owns profiles, located from the environment it was booted in. */
function cliEntry() {
  const candidates = [
    process.env.DSH_PROFILE_DIR === undefined ? null : `${process.env.DSH_PROFILE_DIR}/node_modules/@deepseek-ai/dsh/lib/bin.js`,
    process.env.DSH_HOME === undefined ? null : `${process.env.DSH_HOME}/profiles/node_modules/@deepseek-ai/dsh/lib/bin.js`,
    process.env.DSH_HOME === undefined ? null : `${process.env.DSH_HOME}/node_modules/@deepseek-ai/dsh/lib/bin.js`,
  ].filter((candidate) => candidate !== null)
  return candidates.find((candidate) => existsSync(candidate)) ?? null
}

/** The command an update runs. Pure, so the tests can pin the argv. */
function installCommand(profile) {
  return { file: process.execPath, args: [cliEntry() ?? '', 'plugin', '--profile', profile, 'add', `${PACKAGE_NAME}@latest`] }
}


async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

/**
 * GET /dsh-550c-skin/update ->
 *   { current, latest, state, source, tarball, package, profile, canApply, reason }
 *
 * `state` is the whole answer the row needs: 'current', 'outdated', or 'unknown'
 * when neither registry could be reached — the row then says so instead of
 * pretending to know.
 */
async function updateHandler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD' })
    res.end()
    return
  }
  const who = profileInfo()
  let found = null
  let error = null
  try {
    found = await latestPublished()
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught)
  }
  const latest = found?.latest ?? null
  const state =
    latest === null ? 'unknown' : VERSION === null ? 'unknown' : compareVersions(latest, VERSION) > 0 ? 'outdated' : 'current'
  sendJson(res, 200, {
    current: VERSION,
    latest,
    state,
    source: found?.source ?? null,
    tarball: found?.tarball ?? null,
    package: PACKAGE_NAME,
    url: `https://www.npmjs.com/package/${PACKAGE_NAME}`,
    profile: who.profile,
    canApply: who.canApply,
    reason: who.reason,
    error,
  })
}

/**
 * POST /dsh-550c-skin/update/apply -> { ok, output, restart, version }
 *
 * The update service: it runs the profile's own package manager through the DSH
 * CLI, which is the only supported way to change a profile's plugins, and reports
 * the CLI's output verbatim — including its refusal, which is how the Desktop's
 * app-managed profile answers. The caller has to ask for it explicitly; nothing
 * here runs on its own.
 */
async function applyHandler(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { allow: 'POST' })
    res.end()
    return
  }
  await readBody(req).catch(() => '')
  const who = profileInfo()
  if (!who.canApply) {
    sendJson(res, 409, {
      ok: false,
      reason: who.reason,
      profile: who.profile,
      hint:
        who.reason === 'desktop-profile'
          ? `桌面客户端独占管理 desktop profile，请在 设置 → 插件 里安装 ${PACKAGE_NAME}@latest，然后重启客户端。`
          : `无法确定当前 profile，请在插件管理器里安装 ${PACKAGE_NAME}@latest。`,
    })
    return
  }
  const entry = cliEntry()
  if (entry === null) {
    sendJson(res, 409, { ok: false, reason: 'no-cli', hint: `找不到 DSH CLI，请在插件管理器里安装 ${PACKAGE_NAME}@latest。` })
    return
  }
  const command = installCommand(who.profile)
  const result = await new Promise((resolve) => {
    const child = spawn(command.file, command.args, { cwd: process.env.DSH_PROFILE_DIR ?? undefined, windowsHide: true })
    let output = ''
    const collect = (chunk) => {
      if (output.length < APPLY_OUTPUT_LIMIT) output += chunk.toString('utf8')
    }
    child.stdout.on('data', collect)
    child.stderr.on('data', collect)
    const timer = setTimeout(() => {
      output += `\n[update] timed out after ${String(APPLY_TIMEOUT_MS)} ms`
      child.kill()
    }, APPLY_TIMEOUT_MS)
    child.on('error', (error) => {
      clearTimeout(timer)
      resolve({ code: null, output: `${output}\n${error.message}` })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ code, output })
    })
  })
  const ok = result.code === 0
  // The row normally checks first, which fills the cache; an apply that arrives on
  // its own looks the version up once more so the answer always names a version.
  const version = ok ? (cachedRelease?.latest ?? (await latestPublished().then((found) => found.latest).catch(() => null))) : null
  sendJson(res, ok ? 200 : 500, {
    ok,
    code: result.code,
    output: result.output.slice(0, APPLY_OUTPUT_LIMIT),
    profile: who.profile,
    package: PACKAGE_NAME,
    restart: ok,
    version,
    hint: ok
      ? '更新完成，重启客户端生效。'
      : `更新失败。也可以在插件管理器里安装 ${PACKAGE_NAME}@latest。`,
  })
}


function sendJson(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(payload))
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
  // 把「已装版本」注入页面：设置行读 window.__dsh550cSkinVersion 显示出来。
  // 与 boot 同名的做法 —— 早于脚本行，设置行渲染时就能读到。
  ctx.on('webserver/index-inject', (table) => {
    if (VERSION !== null) table.push({ kind: 'global', name: VERSION_GLOBAL, value: VERSION })
  })
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
    // 检查更新 / 一键更新：与 dsh-550c-boot 同样的两条路由，客户端只跟这里说话。
    // 查询先 npmmirror 后 npmjs（宿主进程联网，绕开页面 CSP），5 分钟缓存。
    webCtx.effect(
      () =>
        webCtx.webServer.register(
          { kind: 'exact', path: UPDATE_ROUTE, handler: updateHandler },
          'skin-550c: GET update',
        ),
      'skin-550c: update route',
    )
    webCtx.effect(
      () =>
        webCtx.webServer.register(
          { kind: 'exact', path: APPLY_ROUTE, handler: applyHandler },
          'skin-550c: POST update/apply',
        ),
      'skin-550c: update apply route',
    )
  })
}
