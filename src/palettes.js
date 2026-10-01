/**
 * The four 550C phosphor schemes, and the mapping from them onto DSH's
 * `--dsw-*` token ladder.
 *
 * The animation's own palette is the authority here, not a designer's
 * reinterpretation of it: every primitive below is copied from the port
 * (`src/assets.js` in dsh-550c-boot defines `--amber/#e8a020`, `--bg/#050403`,
 * `--text/#d8c090`, …) or from that port's opt-in scheme blocks in
 * `src/enhance.js`. The skin exists so the chat UI reads as the same machine as
 * the splash, which only works if both halves resolve the same literals.
 *
 * Geometry of the mapping, i.e. why this is a *ladder* and not 200 literals:
 *
 *   surfaces   bg-base → the animation's `--bg`; layer-1 → `--bg-panel`;
 *              layer-2 → `--bg-win`; everything else is a mix between those
 *              three and the accent, so a new scheme is 20 numbers, not 200.
 *   ink        label-primary → `--text`; secondary/tertiary/caption/dimmed walk
 *              down a ramp to `--text-dim` and `--text-faint`. These are the
 *              only values where legibility wins over fidelity: the port's
 *              `--text-faint` (#4a3f28) is a *decorative* colour in the splash
 *              (it draws 1px rules), and using it for UI captions drops under
 *              3:1 contrast, so captions sit one step brighter.
 *   accent     brand-primary and the whole interactive/border ladder derive
 *              from `--amber`, which is what makes hover, focus, the send
 *              button and the active nav item all glow the same colour.
 *   state      error/success/warn reuse the port's `--red` / `--green`, so a
 *              failed tool call and the splash's red phase-banner agree.
 *
 * Two constraints from the host side (`dsh-client-ui-layout`'s ThemePresenter):
 * a registered theme's `tokens` is a flat `name → string` map — NOT the
 * `{light, dark}` pair shape `theme.overrideTokens` wants — and the presenter
 * writes its own snapshot to `<body>` on every apply, removing whatever it
 * recorded last time. The ladder therefore does NOT ride on the theme service:
 * it is written as a stylesheet rule, `html[data-550c] body { … }`, which is why
 * these values outrank the app's own `body` declarations and nothing can retract
 * them. See `applyLadder` in `src/client.js` for the full reasoning.
 *
 * The dark marker (`body[data-ds-dark-theme]`) is the one thing that CANNOT be
 * done this way, because it is an attribute and no stylesheet can set one. It is
 * re-asserted by `holdDarkMode` instead, and that matters here: DSH declares 213
 * custom properties only under that attribute, so with it missing every token
 * this ladder does not itself declare falls back to its light value.
 */

/** `#rrggbb` → `[r, g, b]`; tolerant of `#rgb` and any case. */
function channels(hex) {
  let body = hex.replace('#', '')
  if (body.length === 3) body = body[0] + body[0] + body[1] + body[1] + body[2] + body[2]
  return [parseInt(body.slice(0, 2), 16), parseInt(body.slice(2, 4), 16), parseInt(body.slice(4, 6), 16)]
}

/** The accent as `r,g,b`, for the glow recipes that need a raw triple. */
function rgbTriple(hex) {
  return channels(hex).join(',')
}

/** Accent at a given alpha, as `rgba(...)`. The workhorse for every tint. */
function alpha(hex, amount) {
  return 'rgba(' + rgbTriple(hex) + ',' + String(amount) + ')'
}

/** Linear mix of two hex colours; `amount` is how much of `b` lands in the result. */
function mix(a, b, amount) {
  const left = channels(a)
  const right = channels(b)
  const out = left.map((value, index) => Math.round(value + (right[index] - value) * amount))
  return '#' + out.map((value) => value.toString(16).padStart(2, '0')).join('')
}

/**
 * One scheme = the animation's primitives. `caption`/`secondary` are the two
 * values the port does not have an equivalent for (see the note above).
 *
 * @typedef {{ id: string, label: string, accent: string, accentBright: string,
 *   accentDim: string, bg: string, bgPanel: string, bgWin: string, sidebar: string,
 *   text: string, secondary: string, textDim: string, textFaint: string,
 *   red: string, redBright: string, green: string, cyan: string }} Scheme
 */

/** @type {Scheme[]} */
const SCHEMES = [
  {
    id: 'white',
    label: '白',
    // P4 white/grey phosphor: the port's `data-scheme="white"` block.
    //
    // FIRST in this list, and therefore the default: the schemes are ordered the
    // way the settings row offers them, and the one at the front is the one the
    // skin starts on.
    accent: '#c9c9c9',
    accentBright: '#ffffff',
    accentDim: '#4a4a4a',
    bg: '#010101',
    bgPanel: '#070707',
    bgWin: '#0c0c0c',
    sidebar: '#040404',
    text: '#c0c0c0',
    secondary: '#9a9a9a',
    textDim: '#7a7a7a',
    textFaint: '#3d3d3d',
    red: '#ff5a5a',
    redBright: '#ff8f8f',
    green: '#dcdcdc',
    cyan: '#d0d0d0',
  },
  {
    id: 'amber',
    label: '琥珀',
    // COOL BASE, AMBER ACCENT.
    //
    // This was all-amber — warm sand text on warm near-black — and it read muddy
    // and dated. The problem was not the amber itself but that every colour sat
    // on the same hue: large areas of one warm tone flatten into brown, and
    // nothing stands out because nothing contrasts.
    //
    // So the base and the ink went cool (a blue-black ground, cool off-white
    // text) and the amber was kept for what it is actually good at: the mark,
    // the load meter, warnings, emphasis. The machine identity survives — the
    // splash is still amber — while the surface it sits on stops competing with
    // it. The accent values are unchanged, so anything tuned against them still
    // holds.
    accent: '#e8a020',
    accentBright: '#ffc043',
    accentDim: '#8a5e10',
    bg: '#04060a',
    bgPanel: '#070b12',
    bgWin: '#0a0f18',
    sidebar: '#050810',
    text: '#c8d4e2',
    secondary: '#94a3b8',
    textDim: '#5f6d80',
    textFaint: '#333d4d',
    red: '#f0654a',
    redBright: '#ff8a6a',
    green: '#7fd18a',
    cyan: '#4fd1c5',
  },
  {
    id: 'green',
    label: '绿',
    // P1 green phosphor, lifted from the port's own `data-scheme="green"` block.
    accent: '#4ad46a',
    accentBright: '#a6ffbb',
    accentDim: '#1d5a2c',
    bg: '#010601',
    bgPanel: '#041007',
    bgWin: '#06160c',
    sidebar: '#030b05',
    text: '#8fe0a4',
    secondary: '#6fbc84',
    textDim: '#4e8a5e',
    textFaint: '#27452f',
    red: '#ff7043',
    redBright: '#ffa07a',
    green: '#a6ffbb',
    cyan: '#7fe0d0',
  },
  {
    id: 'cyan',
    label: '青',
    // Cold cyan phosphor: the port's `data-scheme="cyan"` block.
    accent: '#3fc8dc',
    accentBright: '#a6f0ff',
    accentDim: '#17515e',
    bg: '#010608',
    bgPanel: '#041013',
    bgWin: '#06161a',
    sidebar: '#030b0e',
    text: '#8fd4e2',
    secondary: '#6aaec0',
    textDim: '#4d8291',
    textFaint: '#26454e',
    red: '#ff5c7a',
    redBright: '#ff8fa3',
    green: '#7ff0d0',
    cyan: '#a6f0ff',
  },
]

/** The theme ids this plugin registers, in the order Appearance shows them. */
const THEME_PREFIX = '550c-'

/**
 * The scheme the skin starts on.
 *
 * Taken from the front of the list rather than written out again, so the default
 * and the first option in the settings row can never drift apart — the kind of
 * mismatch that makes "the default" mean two different things depending on where
 * you look.
 */
const DEFAULT_SCHEME = SCHEMES[0].id

/** How a scheme is addressed everywhere else: `550c-amber`. */
function themeId(scheme) {
  return THEME_PREFIX + scheme.id
}

/** The scheme id behind a theme id, or null when the theme is not ours. */
function schemeOfTheme(id) {
  if (typeof id !== 'string' || !id.startsWith(THEME_PREFIX)) return null
  const found = SCHEMES.find((scheme) => themeId(scheme) === id)
  return found === undefined ? null : found
}

/**
 * Build the complete `--dsw-*` ladder for one scheme.
 *
 * Deliberately NOT included: the font composites (`--dsw-font-*`), shadows
 * (`--dsw-shadow-*`), elevations and `--dsw-mask-blur`. Those are not colours,
 * the presenter would happily overwrite them, and a skin has no business
 * changing the app's type scale or elevation geometry — the CRT treatment is
 * applied as CSS in `skin.css` where it belongs.
 *
 * @param {Scheme} scheme - the scheme to resolve.
 * @returns {Record<string, string>} token name → CSS value.
 */
function tokensFor(scheme) {
  const { accent, accentBright, accentDim, bg, bgPanel, bgWin, sidebar, text, secondary, textDim, textFaint, red, redBright, green, cyan } = scheme
  const black = '#000000'
  /** A raised surface: a step up from `bgWin`, tinted with the accent. */
  const surface = mix(bgWin, accent, 0.07)
  /** The "chrome" fill the splash uses for its fake window title bars. */
  const chrome = mix(bgPanel, accent, 0.1)

  return {
    /* ── surfaces ─────────────────────────────────────────────────────── */
    '--dsw-alias-bg-base': bg,
    '--dsw-alias-bg-layer-1': bgPanel,
    '--dsw-alias-bg-layer-2': bgWin,
    '--dsw-alias-bg-layer-3': surface,
    '--dsw-alias-bg-overlay': chrome,
    '--dsw-alias-bg-module-platform': surface,
    '--dsw-alias-bg-multi-select': mix(bgPanel, accent, 0.05),
    '--dsw-alias-bg-skeleton': alpha(accent, 0.08),
    '--dsw-alias-bg-mask-1': alpha(black, 0.62),
    '--dsw-alias-bg-mask-2': alpha(black, 0.3),
    '--dsw-alias-bg-mask-3': alpha(black, 0.52),
    '--dsw-alias-bg-mask-drop': alpha(mix(bg, black, 0.4), 0.72),
    '--dsw-alias-bg-mask-photo': alpha(black, 0.88),
    '--dsw-specific-sidebar-fill': sidebar,
    '--dsw-specific-bubble': mix(bgWin, accent, 0.05),
    '--dsw-specific-bubble-highlight': chrome,
    '--dsw-specific-input-major': bgWin,
    '--dsw-specific-login-input': sidebar,
    '--dsw-specific-menu': chrome,
    // THE MENU MATERIAL IS A DIFFERENT TOKEN FROM `--dsw-specific-menu`, and
    // missing it is what made every dropdown read as frosted glass.
    //
    // `MenuSurface.module.css` paints the anchored menus — the model picker, the
    // permission picker, 打开方式 — with `--dsw-menu-surface-fill`, not with
    // `--dsw-specific-menu`; that one is for the larger panels. DSH ships the
    // fill as a *translucent* tint (`#f8f9fa94` light, `#43454a73` dark) because
    // its own menus are meant to blur what is behind them, so leaving it unmapped
    // put a near-white 58% wash over the console and let `blur(40px)
    // saturate(150%)` turn it milky.
    //
    // Nearly opaque, because a console panel is a surface and not a window: at
    // 0.97 the backdrop filter has nothing left to show through, so the same
    // value also neutralises the blur without having to fight the filter token.
    '--dsw-menu-surface-fill': alpha(chrome, 0.97),
    // The sticky group heading inside a scrolling menu: it has to occlude the
    // rows sliding under it, so it is the same material as the menu itself.
    '--dsw-alias-menu-group-header-fill': alpha(chrome, 0.97),
    '--dsw-specific-selector': chrome,
    '--dsw-specific-tip': chrome,
    '--dsw-specific-sidebar-nav-item-hover': alpha(accent, 0.08),
    '--dsw-specific-sidebar-nav-item-active': alpha(accent, 0.16),
    '--dsw-specific-sidebar-nav-item-active-accent': chrome,
    '--dsw-alias-toast-bg': chrome,
    '--dsw-alias-tooltip-bg': chrome,
    '--dsw-alias-markdown-code-block': mix(bg, black, 0.35),
    '--dsw-alias-markdown-code-block-banner': chrome,
    '--dsw-alias-markdown-code-segment-selected': surface,
    '--dsw-alias-markdown-code-segment-unselected': mix(bg, black, 0.35),
    '--dsw-alias-markdown-inline-code': chrome,
    '--dsw-alias-markdown-placeholder': mix(bgPanel, accent, 0.05),
    '--dsw-alias-markdown-tag': bgWin,
    '--dsw-alias-markdown-citation': surface,

    /* ── ink ──────────────────────────────────────────────────────────── */
    '--dsw-alias-label-primary': text,
    '--dsw-alias-label-primary-bluish': text,
    '--dsw-alias-label-primary-dimmed': secondary,
    '--dsw-alias-label-secondary': secondary,
    '--dsw-alias-label-tertiary': textDim,
    '--dsw-alias-label-caption': mix(textDim, textFaint, 0.35),
    '--dsw-alias-label-dimmed': textFaint,
    // Text drawn ON a primary (accent-filled) control: the phosphor black.
    '--dsw-alias-label-primary-foreground': bg,
    '--dsw-alias-label-primary-inverted': chrome,
    '--dsw-alias-brand-text': text,
    '--dsw-alias-link': accentBright,

    /* ── accent and interaction ───────────────────────────────────────── */
    '--dsw-alias-brand-primary': accent,
    '--dsw-alias-brand-primary-invert': text,
    '--dsw-alias-brand-primary-new-colorprimary-new-color': accent,
    '--dsw-alias-interactive-bg-hover': alpha(accent, 0.1),
    '--dsw-alias-interactive-bg-active': alpha(accent, 0.18),
    '--dsw-alias-interactive-bg-hover-solid': surface,
    '--dsw-alias-interactive-bg-hover-accent': alpha(accent, 0.26),
    '--dsw-alias-interactive-bg-hover-danger': alpha(red, 0.16),

    /* ── controls ─────────────────────────────────────────────────────── */
    '--dsw-alias-button-primary-fill': accent,
    '--dsw-alias-button-primary-hover': accentBright,
    '--dsw-alias-button-primary-dimmed': accentDim,
    '--dsw-alias-button-contrast-fill': text,
    '--dsw-alias-button-elevated-fill': chrome,
    '--dsw-alias-button-floating-fill': surface,
    '--dsw-alias-button-floating-hover': chrome,
    '--dsw-alias-button-ghost-active-border': alpha(accent, 0.55),
    '--dsw-alias-button-ghost-active-fill': alpha(accent, 0.16),
    '--dsw-alias-button-ghost-active-hover': alpha(accent, 0.26),
    '--dsw-alias-button-info-fill': accent,
    '--dsw-alias-button-info-hover': accentBright,
    '--dsw-alias-button-tool-bar-fill': alpha(accent, 0.14),
    '--dsw-alias-button-tool-bar-fill-invisible': alpha(accent, 0.06),
    '--dsw-alias-button-tool-bar-hover': alpha(accent, 0.24),

    /* ── activity: the running readout, and the think fade ────────────────
       The app already shimmers its running line; it just shimmers it in DSH's
       own blue. `.EvIC1a_running` sets `color: var(--dsw-alias-label-deep-diving)`
       and rebinds the shared sweep to `--dsw-alias-label-deep-diving-shimmer`, so
       owning those two tokens makes `深度求索中` read out in the scheme's phosphor
       with a brighter sweep — using the app's own mechanism rather than painting
       over the text with a gradient of our own.

       These are also dark-only tokens in DSH's sheets, so while the dark marker
       was missing they were resolving to their light values as well. */
    '--dsw-alias-label-deep-diving': accent,
    '--dsw-alias-label-deep-diving-shimmer': accentBright,
    // The shared overlay for every other shimmering row (tool titles, etc.).
    '--dsw-alias-label-shimmer': alpha(accentBright, 0.5),

    /* The reasoning block's own fade, top-down, into whatever surface it sits
       on. DSH's light value is white and its dark value is a neutral `#151517`;
       both are wrong for a console, and this was one of the visible symptoms of
       the missing dark marker — a white wash at the top of the 思考 row. */
    '--dsw-linear-gradient-think': 'linear-gradient(180deg, ' + bg + ' 20.19%, ' + alpha(bg, 0) + ' 100%)',
    '--dsw-linear-think-select':
      'linear-gradient(180deg, ' +
      mix(bg, accent, 0.06) +
      ' 20.19%, ' +
      alpha(mix(bg, accent, 0.06), 0) +
      ' 100%)',

    /* ── borders ──────────────────────────────────────────────────────────
       Deliberately close to invisible.

       This ladder is what draws the app's OWN 1px rules — every card edge,
       field outline and divider in the settings pages comes from here, not from
       anything this skin adds. The first version set them at 0.14–0.42, which
       put a visible amber rectangle around everything and is exactly the boxed
       look that had to go.

       A rectangle is a box however thin you draw it, so separation is left to
       the surface ladder (`bgBase` → `bgPanel` → `bgWin`) and these only supply
       the faintest possible definition. `l4` keeps enough presence to still read
       as emphasis where the app means emphasis. */
    '--dsw-alias-border-l1': alpha(accent, 0.05),
    '--dsw-alias-border-l2': alpha(accent, 0.09),
    '--dsw-alias-border-l2-darkmode-thin': alpha(accent, 0.04),
    '--dsw-alias-border-l3': alpha(accent, 0.13),
    '--dsw-alias-border-l4': alpha(accent, 0.18),
    '--dsw-alias-border-inverted': alpha(accent, 0.05),
    '--dsw-alias-border-inverted2': alpha(accent, 0.08),

    /* ── scrollbars: character-cell rails, not grey pills ─────────────── */
    '--dsw-alias-scrollbar-bg-l1': alpha(accent, 0.22),
    '--dsw-alias-scrollbar-bg-l2': alpha(accent, 0.34),
    '--dsw-alias-scrollbar-hover-l1': alpha(accent, 0.42),
    '--dsw-alias-scrollbar-hover-l2': alpha(accent, 0.55),

    /* ── state: the splash's own red/green, so both halves agree ──────── */
    '--dsw-alias-state-error-primary': red,
    '--dsw-alias-state-error-secondary': redBright,
    '--dsw-alias-state-success-primary': green,
    '--dsw-alias-state-success-secondary': mix(green, text, 0.35),
    '--dsw-alias-state-success-tertiary': mix(bg, green, 0.14),
    '--dsw-alias-state-warn-primary': accent,
    '--dsw-alias-state-warn-secondary': accentBright,
    '--dsw-alias-state-warn-tertiary': mix(bg, accent, 0.14),
    '--dsw-alias-state-warn-label': accentBright,
    '--dsw-alias-state-business-primary': accent,
    '--dsw-alias-state-business-tertiary': mix(bg, accent, 0.16),
    '--dsw-alias-state-idle-primary': textDim,

    /* ── syntax highlighting ──────────────────────────────────────────── */
    '--shiki-background': mix(bg, black, 0.35),
    '--shiki-foreground': text,
    '--shiki-token-comment': textDim,
    '--shiki-token-constant': accentBright,
    '--shiki-token-function': cyan,
    '--shiki-token-keyword': accent,
    '--shiki-token-link': accentBright,
    '--shiki-token-parameter': mix(accent, red, 0.35),
    '--shiki-token-punctuation': mix(textDim, text, 0.3),
    '--shiki-token-string': green,
    '--shiki-token-string-expression': mix(green, text, 0.3),

    /* ── decorative ramps ─────────────────────────────────────────────────
       The static ramp is a raw palette, not semantics, but the app does paint
       with it (selection rings, badges, the Appearance cubes). Re-pointing the
       families that actually appear in the dark UI keeps those details on the
       phosphor instead of leaving stray blues in a terminal. */
    '--dsw-static-neutral-bluish-400': textDim,
    '--dsw-static-neutral-bluish-500': mix(textDim, textFaint, 0.4),
    '--dsw-static-neutral-bluish-600': mix(textDim, textFaint, 0.6),
    '--dsw-static-neutral-bluish-700': textFaint,
    '--dsw-static-neutral-bluish-800': surface,
    '--dsw-static-neutral-bluish-850': bgWin,
    '--dsw-static-neutral-bluish-875': mix(bgWin, accent, 0.06),
    '--dsw-static-neutral-bluish-900': sidebar,
    '--dsw-static-neutral-bluish-950': bg,
    '--dsw-static-neutral-bluish-1000': black,
    '--dsw-static-deepseek-300': mix(accent, text, 0.45),
    '--dsw-static-deepseek-400': accentBright,
    '--dsw-static-deepseek-450': accent,
    '--dsw-static-deepseek-500': accent,
    '--dsw-static-deepseek-600': accentDim,
    '--dsw-static-deepseek-700-delete': mix(accentDim, bg, 0.35),
    '--dsw-static-deepseek-800': mix(accentDim, bg, 0.6),
    '--dsw-static-deepseek-900': mix(bg, accent, 0.1),
    '--dsw-static-blue-400': cyan,
    '--dsw-static-blue-450': cyan,
    '--dsw-static-blue-500': mix(cyan, bg, 0.25),
    '--dsw-static-green-400': green,
    '--dsw-static-green-500': green,
    '--dsw-static-green-900': mix(bg, green, 0.14),
    '--dsw-static-red-400': red,
    '--dsw-static-red-500': red,
    '--dsw-static-red-600': mix(red, bg, 0.2),
    '--dsw-static-red-900': mix(bg, red, 0.16),
    '--dsw-static-amber-400': accent,
    '--dsw-static-amber-500': accent,
    '--dsw-static-amber-600': accentDim,
    '--dsw-static-amber-900': mix(bg, accent, 0.14),
  }
}

/**
 * The design tokens the skin's own stylesheet consumes.
 *
 * These are NOT `--dsw-*`: nothing in the app reads them, they exist so the
 * skin's CSS never repeats a literal and so switching scheme re-tints the CRT
 * furniture (scanlines, glow, HUD) along with the UI. Written as inline
 * properties on `<html>` by the client half.
 *
 * @param {Scheme} scheme - the active scheme.
 * @returns {Record<string, string>} property name → value.
 */
function skinTokensFor(scheme) {
  const { accent, accentBright, accentDim, bg, bgPanel, bgWin, sidebar, text, textDim, textFaint, red, green, cyan } = scheme
  const glow = rgbTriple(accent)
  return {
    '--c-amber': accent,
    '--c-amber-b': accentBright,
    '--c-amber-d': accentDim,
    '--c-bg': bg,
    '--c-bg-panel': bgPanel,
    '--c-bg-win': bgWin,
    '--c-sidebar': sidebar,
    '--c-text': text,
    '--c-text-dim': textDim,
    '--c-text-faint': textFaint,
    '--c-red': red,
    '--c-green': green,
    '--c-cyan': cyan,
    '--c-glow-rgb': glow,
    // The splash's own scalar recipes, so the UI's rules and glows are the
    // animation's rules and glows rather than lookalikes.
    '--c-rule': '1px solid ' + alpha(accent, 0.24),
    '--c-rule-strong': '1px solid ' + alpha(accent, 0.42),
    '--c-glow-text': '0 0 6px rgba(' + glow + ',.35)',
    '--c-glow-strong': '0 0 14px rgba(' + glow + ',.55)',
    '--c-glow-soft': '0 0 24px rgba(' + glow + ',.18)',
    '--c-mono': '"Cascadia Mono",Consolas,"NSimSun","新宋体","Microsoft YaHei UI",monospace',
  }
}
