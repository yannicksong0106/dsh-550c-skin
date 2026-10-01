/**
 * dsh-550c-skin — browser half.
 *
 * The skin is a *theme*, not an overlay. DSH's theme service is the supported
 * way to repaint the whole client, and its presenter
 * (`dsh-client-ui-layout`'s ThemePresenter) writes every token a registered
 * theme declares as an inline custom property on `<body>` — so a full ladder
 * remap outranks the built-in dark palette with no `!important` and no fighting
 * the app for specificity.
 *
 * That gives a clean on/off switch for free: this plugin registers four themes
 * (one per phosphor scheme in src/palettes.js) and the structural layer in
 * src/skin.css is scoped to `html[data-550c]`, an attribute set only while one
 * of them is the ACTIVE theme. Choosing 深色 / 浅色 / 跟随系统 in Appearance
 * therefore turns the whole skin off without unloading anything, and there is
 * exactly one source of truth for "is the skin on".
 *
 * Three moving parts:
 *
 *   themes    registered into ctx.theme; their ids are the Appearance entries.
 *   skin      the stylesheet plus the design tokens it consumes, applied and
 *             retracted with the active theme.
 *   hud       the two telemetry rails and the CRT layer (src/hud.js), which are
 *             real DOM and so need an explicit lifetime.
 *
 * Everything the user can tune lives in localStorage rather than the settings
 * scope: it is presentation state owned wholly by this plugin, it must be
 * readable synchronously before the first paint (a theme change during boot
 * must not flash), and the boot splash stores its own preferences the same way.
 */

const React = require('react')

/** Where the user's skin preferences live; a JSON blob, not four keys. */
const PREFS_KEY = 'dsh-550c-skin:prefs'
/** The host's durable mirror of the same object (lib/index.js STATE_ROUTE). */
const STATE_ROUTE = '/dsh-550c-skin/state'
/** How long after the last change the durable write is coalesced. */
const PERSIST_DEBOUNCE_MS = 400

/** The built-in preferences DSH itself accepts, and the theme service persists. */
const BUILTIN_PREFERENCES = ['light', 'dark', 'system']
/** What 关闭 hands the UI back to when nothing better is known. */
const DEFAULT_BUILTIN = 'dark'

/** `<html>` attributes the stylesheet keys on. */
const ATTR = {
  skin: 'data-550c',
  atmosphere: 'data-550c-scan',
  vignette: 'data-550c-vig',
  mono: 'data-550c-mono',
  mark: 'data-550c-mark',
}

/** Setting ids for the host stylesheets, so a re-mount never doubles one. */
const STYLE_ID = 'dsh-550c-skin-style'
const LADDER_STYLE_ID = 'dsh-550c-skin-ladder'
const ROW_STYLE_ID = 'dsh-550c-skin-row-style'

const ATMOSPHERE_VALUES = ['full', 'scan', 'vignette', 'off']
const TOGGLE_VALUES = ['on', 'off']
const DEFAULT_PREFS = {
  scheme: 'off',
  atmosphere: 'full',
  mono: 'on',
  mark: 'on',
  builtin: DEFAULT_BUILTIN,
}

/** Whether a theme id is one of DSH's own preferences rather than one of ours. */
function isBuiltinPreference(id) {
  return BUILTIN_PREFERENCES.indexOf(id) >= 0
}

/** Narrow one persisted value, falling back when it is absent or unknown. */
function pickEnum(value, allowed, fallback) {
  return typeof value === 'string' && allowed.indexOf(value) >= 0 ? value : fallback
}

/**
 * The stored preferences, normalised.
 *
 * Read synchronously at module evaluation: a skin that is already selected has
 * to be re-asserted before the first paint of the app, and an async read would
 * let the stock palette flash first.
 */
function readPrefs() {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY)
    if (raw === null) return { ...DEFAULT_PREFS }
    const parsed = JSON.parse(raw)
    return {
      scheme: pickEnum(parsed?.scheme, ['off'].concat(SCHEMES.map((scheme) => scheme.id)), DEFAULT_PREFS.scheme),
      atmosphere: pickEnum(parsed?.atmosphere, ATMOSPHERE_VALUES, DEFAULT_PREFS.atmosphere),
      mono: pickEnum(parsed?.mono, TOGGLE_VALUES, DEFAULT_PREFS.mono),
      mark: pickEnum(parsed?.mark, TOGGLE_VALUES, DEFAULT_PREFS.mark),
      builtin: pickEnum(parsed?.builtin, BUILTIN_PREFERENCES, DEFAULT_PREFS.builtin),
    }
  } catch (error) {
    return { ...DEFAULT_PREFS }
  }
}

function writePrefs(next) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(next))
  } catch (error) {
    /* private mode: the choice simply does not persist here */
  }
}

/**
 * Mirror the preferences to the host, debounced.
 *
 * The host copy is the authoritative one — see lib/index.js for why browser
 * storage cannot be: DSH Desktop serves the GUI from a random port each launch,
 * and localStorage is scoped per origin including the port. Failures are
 * swallowed on purpose: a missing route or an offline host costs durability,
 * not the running skin.
 */
let persistTimer = null
function persist() {
  if (persistTimer !== null) window.clearTimeout(persistTimer)
  persistTimer = window.setTimeout(() => {
    persistTimer = null
    try {
      void fetch(STATE_ROUTE, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(prefs),
      }).catch(() => {})
    } catch (error) {
      /* no fetch (ancient host) — localStorage remains the only record */
    }
  }, PERSIST_DEBOUNCE_MS)
}

/**
 * Start from the durable record when the host has one; seed it when it does not.
 *
 * Best-effort by construction: no route, an offline host, a non-JSON answer and
 * a hostile payload all end in "keep what localStorage had", because a missing
 * durable record costs durability and nothing else.
 *
 * @param adopt - called with the normalised preferences when the host's copy
 *   differs from the local one; the caller owns applying them.
 */
function hydrate(adopt) {
  let request
  try {
    request = fetch(STATE_ROUTE, { headers: { accept: 'application/json' } })
  } catch (error) {
    return
  }
  request
    .then((response) => {
      debug('hydrate: status', response.status, response.ok)
      return response.ok ? response.json() : null
    })
    .then((payload) => {
      const stored = payload?.state
      debug('hydrate: stored =', JSON.stringify(stored ?? null), 'local =', JSON.stringify(prefs))
      if (stored === null || stored === undefined) {
        // First run on this host: publish whatever this browser already had, so
        // the two records agree from here on.
        persist()
        return
      }
      const next = {
        scheme: pickEnum(stored.scheme, ['off'].concat(SCHEMES.map((scheme) => scheme.id)), prefs.scheme),
        atmosphere: pickEnum(stored.atmosphere, ATMOSPHERE_VALUES, prefs.atmosphere),
        mono: pickEnum(stored.mono, TOGGLE_VALUES, prefs.mono),
        mark: pickEnum(stored.mark, TOGGLE_VALUES, prefs.mark),
        builtin: pickEnum(stored.builtin, BUILTIN_PREFERENCES, prefs.builtin),
      }
      if (JSON.stringify(next) === JSON.stringify(prefs)) {
        debug('hydrate: host and local agree, nothing to adopt')
        return
      }
      adopt(next)
    })
    .catch((error) => {
      debug('hydrate: failed —', error?.message ?? error)
    })
}

/** One bundled preference object, shared by every live surface of this module. */
let prefs = readPrefs()

/**
 * Opt-in tracing.
 *
 * This plugin's activation path is entirely event-driven, and its failure mode
 * is silent: the skin simply does not appear and nothing anywhere reports an
 * error. Setting `dsh-550c-skin:debug` to `1` in localStorage makes the plugin
 * narrate its own decisions, which turns "it does not work" into a readable
 * sequence — the theme service never said the theme changed, or it said so and
 * the choice was rewound a moment later.
 */
const DEBUG = (() => {
  try {
    return window.localStorage.getItem('dsh-550c-skin:debug') === '1'
  } catch (error) {
    return false
  }
})()

function debug(...args) {
  if (DEBUG) console.log('[550c-skin]', ...args)
}

/** Whether one atmosphere axis is on, from the single stored choice. */
function atmosphereOn(axis) {
  if (prefs.atmosphere === 'full') return true
  return prefs.atmosphere === axis
}

/** The design tokens this plugin writes on <html> for its own stylesheet. */
function applySkinTokens(scheme) {
  const root = document.documentElement
  for (const [name, value] of Object.entries(skinTokensFor(scheme))) root.style.setProperty(name, value)
  // The CRT's two strength knobs live here rather than in the stylesheet so the
  // whole palette, atmosphere included, comes out of one scheme record.
  root.style.setProperty('--c-scan-strength', '0.5')
  root.style.setProperty('--c-vig-strength', '0.7')
}

function retractSkinTokens(scheme) {
  const root = document.documentElement
  for (const name of Object.keys(skinTokensFor(scheme))) root.style.removeProperty(name)
  for (const name of ['--c-scan-strength', '--c-vig-strength']) root.style.removeProperty(name)
}

/** The effect switches, as attributes on <html>: presentation, not state. */
function applyEffectAttributes() {
  const root = document.documentElement
  root.setAttribute(ATTR.atmosphere, atmosphereOn('scan') ? 'on' : 'off')
  root.setAttribute(ATTR.vignette, atmosphereOn('vignette') ? 'on' : 'off')
  root.setAttribute(ATTR.mono, prefs.mono)
  root.setAttribute(ATTR.mark, prefs.mark)
}

function clearEffectAttributes() {
  const root = document.documentElement
  root.removeAttribute(ATTR.atmosphere)
  root.removeAttribute(ATTR.vignette)
  root.removeAttribute(ATTR.mono)
  root.removeAttribute(ATTR.mark)
}

function ensureSkinStyle() {
  if (document.getElementById(STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = SKIN_CSS
  document.head.appendChild(style)
}

function removeSkinStyle() {
  const existing = document.getElementById(STYLE_ID)
  if (existing !== null) existing.remove()
}

/**
 * The live skin.
 *
 * OWNED BY THIS PLUGIN, NOT BY THE THEME SERVICE.
 *
 * The obvious design — treat "the active theme is one of ours" as the on/off
 * switch — does not survive contact with the host. `ThemeRuntime.adopt()` runs
 * on every settings-scope update and rewinds `preference` from a third-party id
 * back to the stored built-in, which is a *closed* union of `light | dark |
 * system`. The result is a rewind/re-assert cycle on every scope publish, and
 * an activation driven by it tears the HUD down and rebuilds it each time.
 *
 * So the switch is `prefs.scheme`, this plugin's own durable choice, and the
 * theme service is used for exactly two things: registering the four themes so
 * the Appearance panel can list them, and being asked to select one so that
 * panel highlights the right entry. Everything the skin *paints* — the token
 * ladder, dark mode, the stylesheet, the rails — it paints itself.
 *
 * That also makes the paint path deterministic. Relying on the presenter
 * (`dsh-client-ui-layout`) to project the registered tokens onto the document
 * left the UI half-skinned: the presenter applied the initial built-in snapshot
 * and the rewind's snapshots, and whether it ever applied one of ours depended
 * on event ordering that a skin has no business depending on.
 */
let live = null

/** The body attribute selecting DSH's own dark base palette. */
const DARK_ATTRIBUTE = 'data-ds-dark-theme'

/** The theme service, kept for handing dark mode back correctly on teardown. */
let themeService = null

/**
 * Project one scheme onto the document.
 *
 * Writes the `--dsw-*` ladder as inline custom properties on `<body>` — the
 * same projection `ui-layout`'s ThemePresenter performs for a registered theme
 * — and takes ownership of dark mode, because the skin's surfaces are dark by
 * construction and the app's ink must agree with them.
 *
 * Idempotent per scheme: re-entering with the same id only republishes the
 * values, so a scheme switch is the only thing that remounts the furniture.
 */
function activate(scheme) {
  if (live !== null && live.scheme.id === scheme.id) {
    debug('activate: refresh', scheme.id)
    applySkinTokens(scheme)
    applyLadder(scheme)
    return
  }
  debug('activate', scheme.id)
  deactivate()

  const root = document.documentElement
  root.setAttribute(ATTR.skin, scheme.id)
  applySkinTokens(scheme)
  applyEffectAttributes()
  ensureSkinStyle()
  applyLadder(scheme)
  setDarkMode(true)

  live = {
    scheme: scheme,
    stopCrt: mountCrt(),
    // The dialog mark writes itself out inside the composer and then stays as a
    // standing READY readout. Mounted after the tokens so its first painted
    // frame already has the scheme's colours.
    stopMark: prefs.mark === 'on' ? mountDialogConsole() : null,
  }
}

/**
 * Project one scheme's token ladder onto the document.
 *
 * The ladder goes into a STYLESHEET, not into inline custom properties — which
 * is not the obvious choice, and the reason is worth writing down.
 *
 * `ui-layout`'s ThemePresenter owns `<body>`'s inline custom properties: on
 * every `theme/change` it removes every name it recorded from the previous
 * apply and writes the new snapshot's. Because DSH rewinds a third-party theme
 * preference to the stored built-in on each settings update (see the activation
 * effect), the sequence with an inline ladder is:
 *
 *   1. this plugin writes 134 properties on <body>;
 *   2. it asks for its own theme, the presenter applies that snapshot and
 *      *records those 134 names as its own*;
 *   3. the settings scope rewinds to the built-in, the presenter applies the
 *      built-in (which carries no tokens) and dutifully removes all 134.
 *
 * The result is a UI wearing the skin's own `--c-*` rules while every DSH
 * component keeps its stock colours — which looks close enough to correct that
 * it went unnoticed until the tokens were read back out of the page.
 *
 * A scoped stylesheet rule has none of those semantics: nothing else writes to
 * it, so nothing else can retract it.
 */
function applyLadder(scheme) {
  const declarations = Object.entries(tokensFor(scheme))
    .map(([name, value]) => name + ':' + value)
    .join(';')
  let style = document.getElementById(LADDER_STYLE_ID)
  if (style === null) {
    style = document.createElement('style')
    style.id = LADDER_STYLE_ID
    document.head.appendChild(style)
  }
  style.textContent = 'html[' + ATTR.skin + '] body{' + declarations + '}'
}

function removeLadder() {
  const style = document.getElementById(LADDER_STYLE_ID)
  if (style !== null) style.remove()
}

/**
 * Dark mode, as the presenter defines it: the root `color-scheme` plus the body
 * attribute that selects the dark half of every token stylesheet.
 *
 * Handing it back is not optional. A user whose real preference is light, and
 * who then turns the skin off, must get a light UI — not a light palette
 * force-fed the dark attribute by whatever they just disabled.
 */
function setDarkMode(dark) {
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  if (document.body === null) return
  if (dark) document.body.setAttribute(DARK_ATTRIBUTE, '')
  else document.body.removeAttribute(DARK_ATTRIBUTE)
}

function deactivate() {
  if (live === null) return
  debug('deactivate', live.scheme.id)
  const previous = live
  live = null
  if (previous.stopCrt !== null) previous.stopCrt()
  if (previous.stopMark !== null) previous.stopMark()
  removeSkinStyle()
  clearEffectAttributes()
  retractSkinTokens(previous.scheme)
  removeLadder()
  document.documentElement.removeAttribute(ATTR.skin)
  // Hand the palette back to whatever the theme service is now resolving, which
  // is what the presenter would have written had this skin never existed.
  const active = themeService === null ? null : themeService.getTheme().active
  if (active !== null) setDarkMode(active.colorScheme === 'dark')
}

/** Put the skin where the stored scheme says it should be, without touching the theme service. */
function syncSkin() {
  if (prefs.scheme === 'off') {
    deactivate()
    return
  }
  const scheme = SCHEMES.find((candidate) => candidate.id === prefs.scheme)
  if (scheme === undefined) deactivate()
  else activate(scheme)
}

/**
 * Re-publish the effect switches and repair whatever a preference change
 * invalidated.
 *
 * Most axes are pure CSS — they key off attributes on `<html>`, so rewriting the
 * attributes is the whole job. The corner mark is the exception: it is real DOM
 * with a running sequence, so its toggle has to mount or dispose it, and
 * remounting restarts the boot, which is the honest behaviour for "show the
 * mark" (you asked for the animation; you get the animation).
 */
function republish() {
  if (live === null) return
  applyEffectAttributes()

  const wantsMark = prefs.mark === 'on'
  if (live.stopMark !== null && !wantsMark) {
    live.stopMark()
    live.stopMark = null
  } else if (live.stopMark === null && wantsMark) {
    live.stopMark = mountDialogConsole()
  }
}

/* ── settings rows ───────────────────────────────────────────────────────── */

/** Row chrome, in DSH tokens so it matches whichever theme is active. */
const ROW_CSS = `
.dsh550c-skin-row{display:flex;align-items:center;gap:16px;padding:10px 0;flex-wrap:wrap}
.dsh550c-skin-row-text{flex:1;min-width:220px}
.dsh550c-skin-row-title{font-size:13px;line-height:1.5;color:var(--dsw-alias-label-primary,#191919)}
.dsh550c-skin-row-desc{margin-top:2px;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary,#666)}
.dsh550c-skin-row-ctrl{display:flex;align-items:center;gap:8px}
.dsh550c-skin-seg{display:inline-flex;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.35));border-radius:3px;overflow:hidden}
.dsh550c-skin-seg button{border:0;background:transparent;color:var(--dsw-alias-label-secondary,#666);font-family:inherit;font-size:12.5px;line-height:1.4;padding:5px 12px;cursor:pointer}
.dsh550c-skin-seg button+button{border-left:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.35))}
.dsh550c-skin-seg button:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.14))}
.dsh550c-skin-seg button.on{background:var(--dsw-alias-brand-primary,#4d6bfe);color:var(--dsw-alias-label-primary-foreground,#fff)}
`

function ensureRowStyle() {
  if (document.getElementById(ROW_STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = ROW_STYLE_ID
  style.textContent = ROW_CSS
  document.head.appendChild(style)
}

/** A labelled segmented control, the shape the General panel already uses. */
function SegmentRow(props) {
  React.useEffect(() => {
    ensureRowStyle()
  }, [])
  return React.createElement(
    'div',
    { className: 'dsh550c-skin-row' },
    React.createElement(
      'div',
      { className: 'dsh550c-skin-row-text' },
      React.createElement('div', { className: 'dsh550c-skin-row-title' }, props.title),
      props.note === undefined ? null : React.createElement('div', { className: 'dsh550c-skin-row-desc' }, props.note),
    ),
    React.createElement(
      'div',
      { className: 'dsh550c-skin-row-ctrl' },
      React.createElement(
        'div',
        { className: 'dsh550c-skin-seg' },
        props.options.map((option) =>
          React.createElement(
            'button',
            {
              key: option.value,
              type: 'button',
              className: props.value === option.value ? 'on' : '',
              onClick: () => props.onChoose(option.value),
            },
            option.label,
          ),
        ),
      ),
    ),
  )
}

/**
 * The scheme row: where a user turns the skin on, changes phosphor, or hands
 * the UI back to stock DSH.
 *
 * It drives `ctx.theme.setTheme` rather than a private flag, so the Appearance
 * cubes, this row and the live skin can never disagree — and the theme
 * preference is durable through DSH's own settings scope, including across the
 * Desktop's per-launch port churn where localStorage would not be.
 */
function SkinRow(props) {
  const [current, setCurrent] = React.useState(() => props.readTheme())
  React.useEffect(() => {
    ensureRowStyle()
    return props.onThemeChange(setCurrent)
  }, [])

  const options = [{ value: 'off', label: '关闭' }].concat(
    SCHEMES.map((scheme) => ({ value: scheme.id, label: scheme.label })),
  )

  return React.createElement(SegmentRow, {
    title: '550C 皮肤',
    note: '把 DSH 换成 550C 控制台配色：磷光四色、扫描线与暗角、等宽字体、方块光标。只改外观，不改 DSH 的布局。关闭即回到 DSH 深色主题。',
    value: current,
    options: options,
    onChoose: (value) => {
      props.choose(value)
      setCurrent(value)
    },
  })
}

/** The atmosphere row: how much CRT to show. */
function AtmosphereRow() {
  const [value, setValue] = React.useState(() => prefs.atmosphere)
  return React.createElement(SegmentRow, {
    title: 'CRT 气氛',
    note: '扫描线、暗角、磷光辉光与极轻微的闪烁。默认强度是照着 12px 中文的可读性调的。',
    value: value,
    options: [
      { value: 'full', label: '全部' },
      { value: 'scan', label: '仅扫描线' },
      { value: 'vignette', label: '仅暗角' },
      { value: 'off', label: '关闭' },
    ],
    onChoose: (next) => {
      prefs = { ...prefs, atmosphere: next }
      writePrefs(prefs)
      setValue(next)
      republish()
    },
  })
}

/** The furniture row: the corner mark, and whether the UI goes monospace. */
function FurnitureRow() {
  const [mark, setMark] = React.useState(() => prefs.mark)
  const [mono, setMono] = React.useState(() => prefs.mono)
  const choose = (key, next, setter) => {
    prefs = { ...prefs, [key]: next }
    writePrefs(prefs)
    setter(next)
    republish()
  }
  return React.createElement(
    'div',
    { className: 'dsh550c-skin-row' },
    React.createElement(
      'div',
      { className: 'dsh550c-skin-row-text' },
      React.createElement('div', { className: 'dsh550c-skin-row-title' }, '控制台外观'),
      React.createElement(
        'div',
        { className: 'dsh550c-skin-row-desc' },
        '对话框里的 550C 标志：像素字逐格写出，再逐字打出开机那两行，跑完留在输入框中间当状态读数。等宽套用动画那套 Cascadia Mono + 新宋体。',
      ),
    ),
    React.createElement(
      'div',
      { className: 'dsh550c-skin-row-ctrl' },
      React.createElement(
        'div',
        { className: 'dsh550c-skin-seg' },
        React.createElement(
          'button',
          {
            type: 'button',
            className: mark === 'on' ? 'on' : '',
            onClick: () => choose('mark', mark === 'on' ? 'off' : 'on', setMark),
          },
          '550C 标志',
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            className: mono === 'on' ? 'on' : '',
            onClick: () => choose('mono', mono === 'on' ? 'off' : 'on', setMono),
          },
          '等宽',
        ),
      ),
    ),
  )
}

/**
 * Register the four themes, mount the skin for whichever of them is active, and
 * publish the settings rows.
 *
 * Slot names are literal on purpose: the injector reads `register()` calls
 * statically and cannot follow a constant.
 *
 * @param ctx - the client plugin context.
 */
function apply(ctx) {
  const theme = ctx.theme
  debug('apply: prefs at load =', JSON.stringify(prefs))

  // Registration first: the activation effect below must already be able to
  // resolve one of our ids, or a user who left 550C selected would boot into
  // stock dark for the one frame before the service caught up.
  ctx.effect(
    () => {
      const disposers = SCHEMES.map((scheme) =>
        theme.register({
          id: themeId(scheme),
          colorScheme: 'dark',
          tokens: tokensFor(scheme),
        }),
      )
      return () => {
        for (const dispose of disposers) dispose()
      }
    },
    'dsh-550c-skin: theme registration',
  )

  /**
   * Keep the skin selected, against a service that will not remember it.
   *
   * DSH's theme preference is a closed union — `light | dark | system` — and
   * `ThemeRuntime.setTheme` persists only ids that pass that check. Selecting
   * one of our themes therefore works for the session and is then *rewound*:
   * `adopt()` fires on every settings-scope update and restores
   * `this.preference` from the stored document, which turns the skin off again
   * a moment after it went on.
   *
   * So the stored scheme is re-asserted on every `theme/change`, and the
   * service's `setTheme` is wrapped for one reason: to tell a deliberate user
   * choice apart from that rewind. A call that arrives from outside this effect
   * is a user choosing a theme — either one of ours via the Appearance cubes,
   * or a built-in, which means "stop skinning my UI" and is recorded as such.
   */
  ctx.effect(
    () => {
      const originalSetTheme = theme.setTheme
      /** True only while this effect is the caller: the rewind is not a choice. */
      let reasserting = false
      /** The built-in the user last chose, so a rewind can be told from a pick. */
      let builtinPick = null

      /** The theme id the stored scheme resolves to, or null for skin-off. */
      const desiredId = () => {
        const scheme = SCHEMES.find((candidate) => candidate.id === prefs.scheme)
        return scheme === undefined ? null : themeId(scheme)
      }

      theme.setTheme = (id) => {
        const builtin = isBuiltinPreference(id)
        builtinPick = builtin ? id : null
        debug('setTheme called', id, reasserting ? '(by us)' : '(by the app)')
        if (!reasserting) {
          const scheme = builtin ? null : schemeOfTheme(id)
          if (builtin) prefs = { ...prefs, scheme: 'off', builtin: id }
          else if (scheme !== null) prefs = { ...prefs, scheme: scheme.id }
          else return originalSetTheme.call(theme, id)
          writePrefs(prefs)
          persist()
        }
        return originalSetTheme.call(theme, id)
      }

      const reassert = (id) => {
        reasserting = true
        try {
          theme.setTheme(id)
        } catch (error) {
          /* unregistered id: the registry was rebuilt around us */
        } finally {
          reasserting = false
        }
      }

      /**
       * Keep the Appearance panel pointed at the stored scheme.
       *
       * This is the only thing the theme service is still asked to do, and it is
       * deliberately *not* what turns the skin on: the scope rewinds third-party
       * preferences on every update, so treating the service's answer as the
       * switch would flap the whole skin. Here a rewind costs one `setTheme`
       * call and nothing visibly moves.
       */
      const enforce = () => {
        const wanted = desiredId()
        if (wanted === null) return
        const current = theme.getTheme().preference
        if (current === wanted) return
        // A built-in is in force because the user just chose it; that stands,
        // and the wrapped setTheme has already recorded the skin as off.
        if (builtinPick !== null && current === builtinPick) {
          debug('enforce: standing down, user picked', current)
          return
        }
        debug('enforce: re-asserting', wanted, 'over', current)
        reassert(wanted)
      }

      const onThemeChange = () => {
        debug('theme/change: active =', theme.getTheme().active.id, 'preference =', theme.getTheme().preference)
        enforce()
      }

      themeService = theme
      // Paint from the stored scheme immediately: waiting for a theme event
      // would leave the stock palette up until the service round-trips.
      syncSkin()
      enforce()
      const off = ctx.on('theme/change', onThemeChange)

      // The durable record wins over the localStorage cache once it arrives: on
      // DSH Desktop the cache is empty on every launch, because the GUI is
      // served from a fresh loopback port each time.
      let cancelled = false
      const adopt = (next) => {
        if (cancelled) return
        debug('adopt from host', JSON.stringify(next))
        prefs = next
        writePrefs(prefs)
        syncSkin()
        republish()
        enforce()
      }
      hydrate(adopt)

      return () => {
        cancelled = true
        off()
        theme.setTheme = originalSetTheme
        themeService = null
      }
    },
    'dsh-550c-skin: activation',
  )

  // Tearing the plugin down must leave stock DSH behind, whatever state the
  // user left it in — including the inline tokens, which nothing else retracts.
  ctx.effect(
    () => () => {
      deactivate()
      if (persistTimer !== null) window.clearTimeout(persistTimer)
    },
    'dsh-550c-skin: teardown',
  )

  /** The scheme this plugin has stored, whether or not the theme service agrees. */
  const currentScheme = () => prefs.scheme

  /**
   * Record a scheme and make it true.
   *
   * The theme service is told as well, so the Appearance panel highlights the
   * matching entry — but the paint happens here, in the same turn, so the skin
   * never waits on a service that is about to rewind itself.
   */
  const setScheme = (next) => {
    prefs = { ...prefs, scheme: next }
    writePrefs(prefs)
    persist()
    syncSkin()
    republish()
    if (next === 'off') theme.setTheme(prefs.builtin)
    else {
      const scheme = SCHEMES.find((candidate) => candidate.id === next)
      if (scheme !== undefined) theme.setTheme(themeId(scheme))
    }
  }

  ctx.slots.inject('settings.general.item', () =>
    ctx.slots.register(
      { name: 'settings.general.item', id: 'skin-550c', order: 26 },
      function ThemeRow() {
        return React.createElement(SkinRow, {
          readTheme: currentScheme,
          onThemeChange: (listener) =>
            ctx.on('theme/change', () => {
              listener(currentScheme())
            }),
          choose: setScheme,
        })
      },
    ),
  )

  ctx.slots.inject('settings.general.item', () =>
    ctx.slots.register({ name: 'settings.general.item', id: 'skin-550c-atmosphere', order: 27 }, AtmosphereRow),
  )
  ctx.slots.inject('settings.general.item', () =>
    ctx.slots.register({ name: 'settings.general.item', id: 'skin-550c-furniture', order: 28 }, FurnitureRow),
  )
}

exports.name = 'skin-550c'
exports.inject = ['theme', 'slots']
exports.apply = apply
