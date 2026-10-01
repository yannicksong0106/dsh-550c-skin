window.__ModuleLoader__.load({
	id: "dsh-550c-skin",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		//#region part 1
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
		 * `{light, dark}` pair shape `theme.overrideTokens` wants — and every entry is
		 * written as an INLINE custom property on `<body>`, which is why these values
		 * win over the stylesheet-defined dark ladder without any `!important`.
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
		    id: 'amber',
		    label: '琥珀',
		    // The author's own CRT palette: the default, and the one the splash plays in.
		    accent: '#e8a020',
		    accentBright: '#ffc043',
		    accentDim: '#8a5e10',
		    bg: '#050403',
		    bgPanel: '#0a0805',
		    bgWin: '#0d0a06',
		    sidebar: '#080604',
		    text: '#d8c090',
		    secondary: '#b39a63',
		    textDim: '#8a7248',
		    textFaint: '#4a3f28',
		    red: '#e05030',
		    redBright: '#ff7050',
		    green: '#b8c840',
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
		  {
		    id: 'white',
		    label: '白',
		    // P4 white/grey phosphor: the port's `data-scheme="white"` block.
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
		]

		/** The theme ids this plugin registers, in the order Appearance shows them. */
		const THEME_PREFIX = '550c-'

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

		    /* ── borders: the 1px amber rules the splash draws everywhere ─────── */
		    '--dsw-alias-border-l1': alpha(accent, 0.14),
		    '--dsw-alias-border-l2': alpha(accent, 0.24),
		    '--dsw-alias-border-l2-darkmode-thin': alpha(accent, 0.12),
		    '--dsw-alias-border-l3': alpha(accent, 0.34),
		    '--dsw-alias-border-l4': alpha(accent, 0.42),
		    '--dsw-alias-border-inverted': alpha(accent, 0.14),
		    '--dsw-alias-border-inverted2': alpha(accent, 0.2),

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
		//#endregion

		//#region part 2
		/** src/skin.css, inlined: the style half of the skin. */
		const SKIN_CSS = "/* ═══════════════════════════════════════════════════════════════════════════\n   550C · DSH skin — the style layer\n\n   Everything here is scoped to `html[data-550c]`, which the client half sets\n   only while this plugin's skin is switched on; switching it off in 设置 → 通用\n   removes the whole layer and cannot leave anything behind.\n\n   THE ONE RULE THIS FILE FOLLOWS\n\n   It changes how DSH looks, never where anything is. No padding, margin, size,\n   display, flex or offset is set on any of the app's own elements, so the shell\n   composes exactly as DSH composed it and every control keeps the hit target\n   and the geometry its authors designed. What changes is colour (the `--dsw-*`\n   ladder is written by the client half out of src/palettes.js), type, rules,\n   corners, glow, and a set of absolutely-positioned decorations.\n\n   Decorations are the one place geometry is touched at all: they are\n   `position:absolute` pseudo-elements with `pointer-events:none`, which paint\n   inside a box without contributing to layout. `position:relative` is set only\n   where one needs an anchor, and never with an offset, so nothing moves.\n\n   Class selectors use the CSS-module LOCAL name via `[class*=\"_name\"]`: the\n   hash in front of it (`pI_x6G_frame`, `hHd-Xa_root`) changes between DSH\n   builds, the local name does not. Names generic enough to collide across\n   modules (`_root`, `_row`, `_title`) are not used bare.\n   ═══════════════════════════════════════════════════════════════════════════ */\n\n/* ── 1. TYPE ─────────────────────────────────────────────────────────────── */\n\n/* The splash's Windows fixed-pitch pair: Cascadia Mono for Latin, NSimSun for\n   CJK — fixed-pitch per glyph, which is what makes mixed text line up. The\n   opt-out exists because a fully monospaced UI is a strong opinion.\n   Font sizes are deliberately NOT touched: changing them would reflow DSH's\n   own layout, and this layer does not do that. */\nhtml[data-550c]:not([data-550c-mono='off']) {\n  --dsw-font-family: var(--c-mono);\n  --ds-font-family-code: var(--c-mono);\n}\n\nhtml[data-550c] {\n  -webkit-font-smoothing: antialiased;\n}\n\nhtml[data-550c] ::selection {\n  background: rgba(var(--c-glow-rgb), 0.28);\n  color: var(--c-text);\n}\n\n/* DSH's own small labels — section headers, scope triggers, panel seats — take\n   the tracked uppercase treatment the splash uses for machine labels. */\nhtml[data-550c] :where([class*='_sectionLabel'], [class*='_seatLabel'], [class*='_triggerLabel'], [class*='_sectionHeader']) {\n  letter-spacing: 0.1em;\n}\n\n/* A leading tick on section headers, drawn as a decoration. */\nhtml[data-550c] :where([class*='_sectionLabel'])::before {\n  content: '▚ ';\n  color: var(--c-amber-d);\n}\n\n/* ── 2. SURFACES ─────────────────────────────────────────────────────────── */\n\n/* A CRT has no rounded plastic. Circles must survive — avatars, status dots and\n   the send button are drawn round, and squaring them reads as broken rather\n   than retro — so the square-corner pass is limited to boxy controls. */\nhtml[data-550c] :where(button, [role='button'], [role='tab'], input, textarea, select, [role='dialog'], [role='menu'], [role='listbox']) {\n  border-radius: 2px;\n}\n\nhtml[data-550c] :where([class*='_card'], [class*='_panel'], [class*='_bubble'], [class*='_popover'], [class*='_tooltip'], [class*='_toast'], [class*='_input'], [class*='_menu']) {\n  border-radius: 2px;\n}\n\n/* DSH's raised surfaces get the splash's own panel treatment: a phosphor rule\n   and a faint inward bloom instead of a drop shadow, because a CRT does not\n   cast one.\n\n   The rule is an INSET BOX-SHADOW, never a border. A border is part of the box\n   model: adding one grows the element by its width on both axes and pushes\n   everything around it, which this layer must not do. An inset shadow paints\n   the identical 1px line inside the box's own edge and contributes nothing to\n   layout. Verified by tools/scenarios/rects.js — see the geometry diff in\n   docs/VERIFICATION.md. */\nhtml[data-550c] :where([class*='_card'], [class*='_bubble'], [class*='_popover'], [class*='_menu'], [class*='_tooltip'], [class*='_toast'], [role='dialog']) {\n  box-shadow: inset 0 0 0 1px rgba(var(--c-glow-rgb), 0.24), inset 0 0 26px rgba(var(--c-glow-rgb), 0.035);\n}\n\nhtml[data-550c] :where([data-dockkit-surface], [class*='_surface']) {\n  box-shadow: inset 0 0 0 1px rgba(var(--c-glow-rgb), 0.16);\n}\n\n/* Instrument corners: eight one-pixel gradients — two per corner — which is the\n   only way to get crisp brackets that survive any box size and never fight the\n   element's own border. Painted by a pseudo-element, so a box of any kind can\n   carry them without a single layout consequence. */\nhtml[data-550c] :where([class*='_card'], [class*='_bubble'], [role='dialog']) {\n  position: relative;\n}\n\nhtml[data-550c] :where([class*='_card'], [class*='_bubble'], [role='dialog'])::after {\n  content: '';\n  position: absolute;\n  inset: 0;\n  pointer-events: none;\n  background-image: linear-gradient(var(--c-amber) 0 0), linear-gradient(var(--c-amber) 0 0),\n    linear-gradient(var(--c-amber) 0 0), linear-gradient(var(--c-amber) 0 0),\n    linear-gradient(var(--c-amber) 0 0), linear-gradient(var(--c-amber) 0 0),\n    linear-gradient(var(--c-amber) 0 0), linear-gradient(var(--c-amber) 0 0);\n  background-size: 9px 1px, 1px 9px, 9px 1px, 1px 9px, 9px 1px, 1px 9px, 9px 1px, 1px 9px;\n  background-position: 0 0, 0 0, 100% 0, 100% 0, 0 100%, 0 100%, 100% 100%, 100% 100%;\n  background-repeat: no-repeat;\n  opacity: 0.8;\n}\n\n/* ── 3. CONTROLS ─────────────────────────────────────────────────────────── */\n\n/* Primary actions glow instead of casting: the accent fill plus the splash's own\n   button bloom. */\nhtml[data-550c] :where([class*='_primary']) {\n  box-shadow: 0 0 14px rgba(var(--c-glow-rgb), 0.22);\n}\n\nhtml[data-550c] :where(button, [role='button']):hover {\n  box-shadow: 0 0 12px rgba(var(--c-glow-rgb), 0.18);\n}\n\n/* Focus is a phosphor ring, not a browser outline. `outline` is used rather than\n   a border so focus never changes a box's size. */\nhtml[data-550c] :focus-visible {\n  outline: 1px solid var(--c-amber);\n  outline-offset: 1px;\n  box-shadow: 0 0 12px rgba(var(--c-glow-rgb), 0.35);\n}\n\n/* The new-session button is the console's power switch. Painted with an inset\n   ring rather than a border, for the reason in §2. */\nhtml[data-550c] :where([class*='_newSession']) {\n  box-shadow: inset 0 0 0 1px rgba(var(--c-glow-rgb), 0.42), inset 0 0 18px rgba(var(--c-glow-rgb), 0.08);\n}\n\n/* Selected rows carry the accent rule the splash puts on an active window title.\n   An inset shadow, so the row keeps its box. */\nhtml[data-550c] :where([class*='_sessionRow'], [class*='_projectRow'], [class*='_folder'])[class*='_selected'],\nhtml[data-550c] :where([class*='_folderActive']) {\n  box-shadow: inset 2px 0 0 0 var(--c-amber);\n}\n\n/* ── 4. THE COMPOSER ─────────────────────────────────────────────────────── */\n\n/* The composer is the console's input bay. The ring is an inset shadow, not a\n   border: the composer's height is its textarea's, and a border here would grow\n   the whole input cluster by two pixels. */\nhtml[data-550c] [data-composer-card] {\n  background: var(--c-bg-win);\n  box-shadow: inset 0 0 0 1px rgba(var(--c-glow-rgb), 0.42), inset 0 0 30px rgba(var(--c-glow-rgb), 0.06),\n    0 0 22px rgba(var(--c-glow-rgb), 0.08);\n}\n\n/* The composer's own copy follows the same 等宽 switch as everything else.\n   It is gated deliberately rather than always-on: the workspace seat sizes\n   itself against the composer's text metrics, so a font swap here narrows that\n   seat by two pixels. With the switch off the skin's geometry is byte-identical\n   to stock DSH; with it on, the only difference left anywhere is text metrics,\n   which is what choosing a different typeface means. */\nhtml[data-550c]:not([data-550c-mono='off']) [data-composer-input] {\n  font-family: var(--c-mono);\n}\n\nhtml[data-550c] [data-composer-card] {\n  caret-color: var(--c-amber);\n}\n\n/* A block cursor parked at the end of an EMPTY composer — the one place a caret\n   glyph is stable, because an empty editor has one line and no flow to disturb.\n   The real caret still works; it just also blinks in phosphor.\n\n   layout-exempt: this is the single decoration in the whole layer that sits IN\n   TEXT FLOW rather than out of it. It has to be inline-block with a width to be\n   visible at all, so unlike every other rule here it does occupy space — the\n   width of one glyph plus 3px, after the placeholder's last character. That is\n   bounded and invisible in practice (the composer is hundreds of pixels wider\n   than its placeholder), but it is a real exception, so it is marked and\n   counted by test/layout-contract.test.mjs rather than hidden. Verified by\n   tools/scenarios/rects.js, which measures the placeholder's box for exactly\n   this reason. */\nhtml[data-550c] [data-composer-input] :where([class*='_placeholder'])::after,\nhtml[data-550c] [data-composer-placeholder]::after {\n  content: '';\n  display: inline-block;\n  width: 0.55em;\n  height: 1.05em;\n  margin-left: 3px;\n  vertical-align: -0.18em;\n  background: var(--c-amber);\n  opacity: 0.75;\n  animation: c-blink 1.06s steps(1) infinite;\n}\n\nhtml[data-550c]:not([data-550c-mono='off']) [data-composer-card] :where([class*='_trigger'], [class*='_triggerLabel'], [class*='_modes']) {\n  font-family: var(--c-mono);\n  letter-spacing: 0.04em;\n}\n\n/* ── 5. TRANSCRIPT, MARKDOWN, CODE ───────────────────────────────────────── */\n\nhtml[data-550c] :where([class*='_markdown'], article, [class*='_md']) :where(h1, h2, h3) {\n  color: var(--c-amber-b);\n  text-shadow: var(--c-glow-text);\n  letter-spacing: 0.02em;\n}\n\nhtml[data-550c] :where([class*='_markdown'], article, [class*='_md']) h2::before {\n  content: '▸ ';\n  color: var(--c-amber-d);\n}\n\nhtml[data-550c] :where([class*='_markdown'], article, [class*='_md']) a {\n  color: var(--c-amber-b);\n  text-decoration-color: var(--c-amber-d);\n  text-underline-offset: 2px;\n}\n\nhtml[data-550c] :where([class*='_shiki'], [class*='_markdown']) :where(pre, code) {\n  border-radius: 2px;\n}\n\nhtml[data-550c] :where(pre, [class*='_shiki']) {\n  box-shadow: inset 0 0 0 1px rgba(var(--c-glow-rgb), 0.24), inset 0 0 24px rgba(var(--c-glow-rgb), 0.04);\n}\n\nhtml[data-550c] :where([class*='_markdown'], article) :where(th, td) {\n  border-color: rgba(var(--c-glow-rgb), 0.24);\n}\n\nhtml[data-550c] :where([class*='_markdown'], article) th {\n  color: var(--c-amber);\n  letter-spacing: 0.06em;\n}\n\n/* Blockquotes keep whatever border the app gave them and are only recoloured —\n   widening a border would reflow the quote's text. The accent strip is drawn as\n   an inset shadow so it reads as the splash's note strip either way. */\nhtml[data-550c] :where([class*='_markdown'], article) blockquote {\n  border-left-color: var(--c-amber-d);\n  background: rgba(var(--c-glow-rgb), 0.05);\n  box-shadow: inset 2px 0 0 0 var(--c-amber-d);\n}\n\n/* ── 6. RUNNING WORK AS CHARACTER CELLS ──────────────────────────────────── */\n\n/* A tool call that is still running gets the splash's cell bar as an advancing\n   underline, rather than a smooth web progress bar. Decorated, not resized. */\nhtml[data-550c] :where([data-state='running'], [data-running], [class*='_running']) {\n  position: relative;\n}\n\nhtml[data-550c] :where([data-state='running'], [data-running], [class*='_running'])::after {\n  content: '';\n  position: absolute;\n  left: 0;\n  right: 0;\n  bottom: 0;\n  height: 3px;\n  pointer-events: none;\n  background-image: repeating-linear-gradient(90deg, var(--c-amber) 0 4px, transparent 4px 7px);\n  opacity: 0.5;\n  animation: c-cells 1.2s linear infinite;\n}\n\n@keyframes c-cells {\n  from {\n    background-position-x: 0;\n  }\n  to {\n    background-position-x: 7px;\n  }\n}\n\n/* ── 7. SCROLLBARS AS RAILS ──────────────────────────────────────────────── */\n\n/* Appearance only. The scrollbar's THICKNESS is a layout property: the app's\n   scroll bodies are `overflow:auto`, so a wider scrollbar narrows their content\n   box and shifts everything inside by the difference. An earlier draft set\n   `width:10px` here and moved the composer cluster by two pixels — caught by\n   tools/scenarios/rects.js. Colour, corner and thumb inset are free; size is\n   not, so the platform's own width is left alone. */\nhtml[data-550c] ::-webkit-scrollbar-track {\n  background: rgba(var(--c-glow-rgb), 0.05);\n}\n\nhtml[data-550c] ::-webkit-scrollbar-thumb {\n  border-radius: 0;\n  background-clip: padding-box;\n}\n\nhtml[data-550c] ::-webkit-scrollbar-corner {\n  background: transparent;\n}\n\nhtml[data-550c] {\n  scrollbar-color: var(--dsw-alias-scrollbar-bg-l1) transparent;\n}\n\n/* ── 8. ATMOSPHERE ───────────────────────────────────────────────────────── */\n\n/* One overlay carries every atmospheric effect, so they switch as a unit and can\n   never intercept a click. It sits above the app (2147480000) but below the boot\n   splash (2147482000), so a splash playing over a skinned UI stays clean. */\nhtml[data-550c] .c-crt,\nhtml[data-550c] .c-crt * {\n  pointer-events: none !important;\n  /* The darwin base sheet turns direct body children into no-drag regions;\n     `initial` takes this overlay out of that computation rather than turning\n     the whole top of the window into a drag handle. */\n  -webkit-app-region: initial !important;\n}\n\nhtml[data-550c] .c-crt {\n  position: fixed;\n  inset: 0;\n  z-index: 2147480000;\n  overflow: hidden;\n}\n\n/* Scanlines: a 3px period at very low alpha. The alpha is load-bearing —\n   anything above ~0.2 turns 12px CJK into mush. */\nhtml[data-550c] .c-crt .c-scan {\n  position: absolute;\n  inset: 0;\n  background: repeating-linear-gradient(180deg, rgba(0, 0, 0, 0.32) 0 1px, rgba(0, 0, 0, 0) 1px 3px);\n  opacity: var(--c-scan-strength, 0.5);\n}\n\n/* The rolling refresh band a CRT shows: one soft bright bar, very slow. */\nhtml[data-550c] .c-crt .c-roll {\n  position: absolute;\n  left: 0;\n  right: 0;\n  height: 28vh;\n  background: linear-gradient(\n    180deg,\n    rgba(var(--c-glow-rgb), 0) 0%,\n    rgba(var(--c-glow-rgb), 0.035) 50%,\n    rgba(var(--c-glow-rgb), 0) 100%\n  );\n  animation: c-roll 9s linear infinite;\n}\n\n@keyframes c-roll {\n  from {\n    top: -30vh;\n  }\n  to {\n    top: 100vh;\n  }\n}\n\n/* Vignette: the tube's corner falloff. */\nhtml[data-550c] .c-crt .c-vig {\n  position: absolute;\n  inset: 0;\n  background: radial-gradient(ellipse 78% 78% at 50% 50%, rgba(0, 0, 0, 0) 55%, rgba(0, 0, 0, 0.42) 100%);\n  opacity: var(--c-vig-strength, 0.7);\n}\n\n/* A barely-there global flicker. Stepped, not smooth: a smooth sine reads as a\n   rendering bug, a stepped one reads as a phosphor. */\nhtml[data-550c] .c-crt .c-flicker {\n  position: absolute;\n  inset: 0;\n  background: rgba(var(--c-glow-rgb), 0.012);\n  animation: c-flick 4.7s steps(1) infinite;\n}\n\n@keyframes c-flick {\n  0%,\n  96% {\n    opacity: 0;\n  }\n  96.5% {\n    opacity: 1;\n  }\n  97% {\n    opacity: 0;\n  }\n  98.2% {\n    opacity: 1;\n  }\n  98.6% {\n    opacity: 0;\n  }\n  100% {\n    opacity: 0;\n  }\n}\n\n/* The bloom: a soft accent wash from the top of the tube, which is what makes\n   the palette feel emissive rather than merely dark. */\nhtml[data-550c] .c-crt .c-bloom {\n  position: absolute;\n  inset: 0;\n  background: radial-gradient(ellipse 60% 40% at 50% 0%, rgba(var(--c-glow-rgb), 0.06), rgba(var(--c-glow-rgb), 0) 70%);\n}\n\n/* The prompt cursor: a blinking block at the end of the transcript, which is\n   where the splash's log ends too. */\nhtml[data-550c] .c-cursor::after {\n  content: '';\n  display: inline-block;\n  width: 0.62em;\n  height: 1em;\n  margin-left: 2px;\n  vertical-align: -0.16em;\n  background: var(--c-amber);\n  box-shadow: 0 0 7px rgba(var(--c-glow-rgb), 0.6);\n  animation: c-blink 1.06s steps(1) infinite;\n}\n\n/* The ● REC beat, for the session activity dot the sidebar already draws. */\nhtml[data-550c] .c-rec > s {\n  animation: c-blink 1.06s steps(1) infinite;\n}\n\n@keyframes c-blink {\n  0%,\n  50% {\n    opacity: 1;\n  }\n  50.01%,\n  100% {\n    opacity: 0.12;\n  }\n}\n\n/* ── 9. EFFECT SWITCHES ──────────────────────────────────────────────────── */\n\nhtml[data-550c][data-550c-scan='off'] .c-crt .c-scan,\nhtml[data-550c][data-550c-scan='off'] .c-crt .c-roll,\nhtml[data-550c][data-550c-scan='off'] .c-crt .c-flicker,\nhtml[data-550c][data-550c-vig='off'] .c-crt .c-vig,\nhtml[data-550c][data-550c-vig='off'] .c-crt .c-bloom {\n  display: none;\n}\n\n/* ── 10. THE DIALOG BOX, REBUILT AS A CONSOLE ────────────────────────────── */\n\n/* THE ONE AUTHORISED LAYOUT EXCEPTION.\n\n   Everything else in this sheet is forbidden from changing DSH's geometry, and\n   test/layout-contract.test.mjs enforces that. The dialog box is deliberately\n   different: this pass gives it a header band (the animated mark and the rate\n   meter, top left), a terminal input, and a control row where the compute-load\n   rheostat abuts the model selector. The composer card therefore gets taller,\n   and the geometry check knows it — it asserts that nothing OUTSIDE the composer\n   moves, and reports the composer region separately instead of pretending it is\n   fixed.\n\n   THE STYLE, AND WHAT IT IS NOT\n\n   An earlier pass drew this like a dot-matrix terminal: `█`/`·` text, 1px\n   right-angled brackets, character-cell bars. It read as a 1980s compiler and\n   clashed with DSH, whose surfaces are soft, rounded and quiet.\n\n   So the rule for everything below is LIGHT, NOT LINES. Where the old pass put a\n   border it now puts a gradient or a glow; where it put square corners it puts\n   the app's own radii; where it put a row of characters it puts a rail with a\n   luminous fill. The console still reads as a machine — but as a machine that\n   belongs to this application. */\n\nhtml[data-550c] .c-console-head {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  box-sizing: border-box;\n  padding: 0 6px 9px;\n  font-family: var(--c-mono);\n  font-size: 10px;\n  line-height: 1;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n  color: var(--c-text-dim);\n  user-select: none;\n}\n\n/* The mark is NOT framed, and it is not text. It is a grid of cells whose empty\n   positions are invisible, so the logotype reads as lettering rather than as a\n   dot matrix — the difference between depicting a machine and emulating its\n   display hardware. */\nhtml[data-550c] .c-mark {\n  --cell: 3px;\n  display: grid;\n  grid-template-columns: repeat(var(--cols), var(--cell));\n  gap: 1px;\n  flex: none;\n  /* A slow breathing glow on the whole mark, on top of the per-cell shimmer. */\n  animation: c-mark-breathe 5.2s ease-in-out infinite;\n}\n\nhtml[data-550c] .c-cell {\n  width: var(--cell);\n  height: var(--cell);\n  border-radius: 0.5px;\n  background: transparent;\n}\n\n/* Only lit cells are drawn. `data-lit` is set by the boot sequence, one cell at\n   a time, so the mark writes itself out and then stays. */\nhtml[data-550c] .c-cell[data-lit='1'] {\n  background: var(--c-amber);\n  box-shadow: 0 0 4px rgba(var(--c-glow-rgb), 0.7);\n  /* The phase is per COLUMN, so the light travels across the mark as a wave\n     instead of the whole thing blinking. This is what makes it dynamic. */\n  animation: c-mark-shimmer 2.6s ease-in-out infinite;\n  animation-delay: calc(var(--col) * 65ms);\n}\n\n@keyframes c-mark-shimmer {\n  0%,\n  100% {\n    opacity: 0.62;\n    box-shadow: 0 0 3px rgba(var(--c-glow-rgb), 0.45);\n  }\n  45% {\n    opacity: 1;\n    box-shadow: 0 0 9px rgba(var(--c-glow-rgb), 0.95);\n  }\n}\n\n@keyframes c-mark-breathe {\n  0%,\n  100% {\n    filter: brightness(0.94);\n  }\n  50% {\n    filter: brightness(1.12);\n  }\n}\n\n/* ── the rate meter, in the header right after the mark ──────────────────── */\n\n/* A RATE gauge, not a progress bar: it shows how fast the machine is writing at\n   this moment, and falls back to nothing when output stops. A hairline rail with\n   a luminous fill, and it takes the header's spare width — a meter too short to\n   separate a quiet answer from a fast one is not a meter. */\nhtml[data-550c] .c-tps {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  flex: 1 1 auto;\n  min-width: 0;\n}\n\nhtml[data-550c] .c-tps-rail {\n  position: relative;\n  flex: 1 1 auto;\n  min-width: 0;\n  height: 5px;\n  border-radius: 999px;\n  /* An inset well rather than a flat line: the rail has to read as a channel the\n     light travels along, or the meter looks like a rule on the page. */\n  background: rgba(var(--c-glow-rgb), 0.1);\n  box-shadow: inset 0 0 0 1px rgba(var(--c-glow-rgb), 0.13);\n  overflow: hidden;\n}\n\n/* A slow highlight that travels the empty rail while nothing is being written.\n   A gauge sitting at zero should still look powered — and this is the same\n   travelling light as the mark's shimmer, so the two read as one instrument. */\nhtml[data-550c] .c-tps-rail::after {\n  content: '';\n  position: absolute;\n  inset: 0;\n  border-radius: 999px;\n  background: linear-gradient(90deg, transparent, rgba(var(--c-glow-rgb), 0.5), transparent);\n  background-size: 34% 100%;\n  background-repeat: no-repeat;\n  animation: c-tps-scan 3.4s ease-in-out infinite;\n  transition: opacity 0.4s linear;\n}\n\n/* Once there is real output the scan gets out of the way: the fill is the\n   reading, and a second moving light would compete with it. */\nhtml[data-550c] .c-tps[data-550c-level='busy'] .c-tps-rail::after,\nhtml[data-550c] .c-tps[data-550c-level='hot'] .c-tps-rail::after {\n  opacity: 0;\n}\n\n@keyframes c-tps-scan {\n  0% {\n    background-position: -40% 0;\n  }\n  100% {\n    background-position: 140% 0;\n  }\n}\n\nhtml[data-550c] .c-tps-fill {\n  position: relative;\n  z-index: 1;\n  width: 0;\n  height: 100%;\n  border-radius: 999px;\n  background: linear-gradient(90deg, rgba(var(--c-glow-rgb), 0.5), var(--c-amber));\n  /* A short ease, not a linear snap: the reading should settle, not twitch. */\n  transition: width 0.28s ease-out, background 0.3s linear;\n}\n\nhtml[data-550c] .c-tps-value {\n  flex: none;\n  min-width: 6ch;\n  color: var(--c-text-faint);\n  font-variant-numeric: tabular-nums;\n  text-align: right;\n  transition: color 0.3s linear;\n}\n\nhtml[data-550c] .c-tps-unit {\n  flex: none;\n  color: var(--c-text-faint);\n  letter-spacing: 0.1em;\n}\n\n/* The pressure ladder: quiet → busy → hot. Colour carries the meaning. */\nhtml[data-550c] .c-tps[data-550c-level='busy'] .c-tps-fill {\n  background: linear-gradient(90deg, rgba(var(--c-glow-rgb), 0.55), var(--c-amber), var(--c-amber-b));\n}\n\nhtml[data-550c] .c-tps[data-550c-level='busy'] .c-tps-value {\n  color: var(--c-amber);\n}\n\nhtml[data-550c] .c-tps[data-550c-level='hot'] .c-tps-fill {\n  background: linear-gradient(90deg, var(--c-amber), var(--c-amber-b), var(--c-amber-b));\n  box-shadow: 0 0 10px rgba(var(--c-glow-rgb), 0.8);\n}\n\nhtml[data-550c] .c-tps[data-550c-level='hot'] .c-tps-value {\n  color: var(--c-amber-b);\n  text-shadow: var(--c-glow-text);\n}\n\nhtml[data-550c] .c-console-session {\n  flex: none;\n  color: var(--c-text-faint);\n  font-variant-numeric: tabular-nums;\n  opacity: 0.75;\n}\n\nhtml[data-550c] .c-console-state {\n  flex: none;\n  color: var(--c-amber-b);\n  letter-spacing: 0.24em;\n  text-shadow: var(--c-glow-text);\n}\n\n/* ── the compute-load rheostat, immediately left of the model selector ───── */\n\nhtml[data-550c] .c-rig-load {\n  position: relative;\n  flex: none;\n}\n\n/* A soft pill, not a boxed button: it sits among the app's own rounded controls\n   and should look like one of them. */\nhtml[data-550c] .c-load-trigger {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  box-sizing: border-box;\n  padding: 4px 10px;\n  border: 0;\n  border-radius: 999px;\n  background: rgba(var(--c-glow-rgb), 0.07);\n  color: var(--c-text-dim);\n  font: inherit;\n  font-size: 10px;\n  letter-spacing: 0.12em;\n  text-transform: uppercase;\n  cursor: pointer;\n  transition: background 0.2s ease, color 0.2s ease;\n}\n\nhtml[data-550c] .c-load-trigger:hover {\n  background: rgba(var(--c-glow-rgb), 0.16);\n}\n\nhtml[data-550c] .c-load-now {\n  color: var(--c-amber);\n  transition: color 0.25s linear, text-shadow 0.25s linear;\n}\n\n/* The panel: rounded, glowing, no hard frame. */\nhtml[data-550c] .c-load-panel {\n  position: absolute;\n  bottom: calc(100% + 10px);\n  left: 50%;\n  z-index: 40;\n  box-sizing: border-box;\n  width: 252px;\n  padding: 12px 14px 11px;\n  transform: translateX(-50%);\n  border-radius: 12px;\n  background: var(--c-bg-win);\n  box-shadow: 0 0 0 1px rgba(var(--c-glow-rgb), 0.22), inset 0 0 26px rgba(var(--c-glow-rgb), 0.07),\n    0 12px 34px rgba(0, 0, 0, 0.62);\n  font-family: var(--c-mono);\n  font-size: 10px;\n  letter-spacing: 0.14em;\n  text-transform: uppercase;\n  transition: box-shadow 0.3s linear;\n}\n\nhtml[data-550c] .c-load-head {\n  display: flex;\n  align-items: baseline;\n  justify-content: space-between;\n  gap: 8px;\n  padding-bottom: 9px;\n  margin-bottom: 12px;\n  /* A fading rule instead of a border: the line dissolves at its ends, so it\n     reads as a hairline of light rather than the edge of a box. */\n  background-image: linear-gradient(90deg, transparent, rgba(var(--c-glow-rgb), 0.34), transparent);\n  background-size: 100% 1px;\n  background-position: 0 100%;\n  background-repeat: no-repeat;\n}\n\nhtml[data-550c] .c-load-title {\n  color: var(--c-text-dim);\n}\n\n/* THE READING ABOVE THE SLIDER. The point of the control: the figure and its\n   colour say how loaded the machine is, and they change as the fader moves. The\n   percentage is authored by the client half as a data attribute so the\n   stylesheet can scale the glow without re-rendering anything. */\nhtml[data-550c] .c-load-read {\n  color: var(--c-amber);\n  font-variant-numeric: tabular-nums;\n  letter-spacing: 0.18em;\n  text-shadow: var(--c-glow-text);\n  transition: color 0.25s linear, text-shadow 0.25s linear;\n}\n\nhtml[data-550c] .c-load-read::after {\n  content: ' / ' attr(data-550c-load) '%';\n  color: var(--c-text-dim);\n  text-shadow: none;\n}\n\n/* The fader. A rheostat, not a web range input: a visible rail, a chunky thumb\n   and the detents the harness actually has. */\nhtml[data-550c] .c-load-track {\n  position: relative;\n  height: 22px;\n  cursor: pointer;\n  touch-action: none;\n}\n\nhtml[data-550c] .c-load-track::before {\n  content: '';\n  position: absolute;\n  left: 0;\n  right: 0;\n  top: 50%;\n  height: 4px;\n  transform: translateY(-50%);\n  border-radius: 999px;\n  background: rgba(var(--c-glow-rgb), 0.16);\n}\n\n/* THE MOVING FRAME. The filled span is a gradient that runs cool → hot, so the\n   colour under the thumb is literally the load you have dialled in, and the\n   gradient stretches as the thumb travels. */\nhtml[data-550c] .c-load-fill {\n  position: absolute;\n  left: 0;\n  top: 50%;\n  height: 4px;\n  transform: translateY(-50%);\n  border-radius: 999px;\n  background: linear-gradient(90deg, var(--c-cyan), var(--c-amber) 55%, var(--c-amber-b));\n  box-shadow: 0 0 12px rgba(var(--c-glow-rgb), 0.5);\n  transition: width 0.12s linear, background 0.3s linear;\n  pointer-events: none;\n}\n\nhtml[data-550c] .c-load-thumb {\n  position: absolute;\n  top: 50%;\n  width: 10px;\n  height: 10px;\n  border-radius: 999px;\n  transform: translate(-50%, -50%);\n  background: var(--c-amber-b);\n  box-shadow: 0 0 10px rgba(var(--c-glow-rgb), 0.85), 0 0 0 3px rgba(var(--c-glow-rgb), 0.12);\n  transition: left 0.12s linear, background 0.3s linear, box-shadow 0.3s linear;\n  pointer-events: none;\n}\n\nhtml[data-550c] .c-load-track:focus-visible {\n  outline: 1px solid var(--c-amber);\n  outline-offset: 4px;\n  border-radius: 999px;\n}\n\n/* The detent labels under the rail, the current one lit. */\nhtml[data-550c] .c-load-ticks {\n  display: flex;\n  justify-content: space-between;\n  gap: 4px;\n  margin-top: 9px;\n}\n\nhtml[data-550c] .c-load-tick {\n  color: var(--c-text-faint);\n  font-size: 9px;\n  letter-spacing: 0.1em;\n  transition: color 0.25s linear, text-shadow 0.25s linear;\n}\n\nhtml[data-550c] .c-load-tick.is-on {\n  color: var(--c-amber);\n  text-shadow: var(--c-glow-text);\n}\n\n/* ── the load ladder ─────────────────────────────────────────────────────── */\n\n/* As the fader climbs the whole control heats up — reading, fill, thumb and\n   trigger together — and the top detent pulses. The pulse is on the READING,\n   because that is where the eye is while dragging. */\nhtml[data-550c] .c-load-panel[data-550c-level='low'] .c-load-read,\nhtml[data-550c] .c-load-panel[data-550c-level='low'] .c-load-thumb {\n  color: var(--c-cyan);\n  background-color: var(--c-cyan);\n  text-shadow: 0 0 6px currentColor;\n}\n\nhtml[data-550c] .c-load-panel[data-550c-level='mid'] .c-load-read,\nhtml[data-550c] .c-load-panel[data-550c-level='mid'] .c-load-thumb {\n  color: var(--c-amber);\n  background-color: var(--c-amber);\n}\n\nhtml[data-550c] .c-load-panel[data-550c-level='high'] .c-load-read,\nhtml[data-550c] .c-load-panel[data-550c-level='high'] .c-load-thumb {\n  color: var(--c-amber-b);\n  background-color: var(--c-amber-b);\n  text-shadow: var(--c-glow-strong);\n}\n\nhtml[data-550c] .c-load-panel[data-550c-level='max'] .c-load-read,\nhtml[data-550c] .c-load-panel[data-550c-level='max'] .c-load-thumb {\n  color: var(--c-red);\n  background-color: var(--c-red);\n}\n\nhtml[data-550c] .c-load-panel[data-550c-level='max'] .c-load-read {\n  text-shadow: 0 0 10px currentColor;\n  animation: c-load-alarm 0.9s steps(1) infinite;\n}\n\nhtml[data-550c] .c-load-panel[data-550c-level='max'] .c-load-fill {\n  background: linear-gradient(90deg, var(--c-amber), var(--c-red));\n  box-shadow: 0 0 14px color-mix(in srgb, var(--c-red) 60%, transparent);\n}\n\n/* The trigger carries the same ladder, one step cooler, so the control row shows\n   the load without opening anything. */\nhtml[data-550c] .c-rig-load[data-550c-level='low'] .c-load-now {\n  color: var(--c-cyan);\n}\n\nhtml[data-550c] .c-rig-load[data-550c-level='mid'] .c-load-now {\n  color: var(--c-amber);\n}\n\nhtml[data-550c] .c-rig-load[data-550c-level='high'] .c-load-now {\n  color: var(--c-amber-b);\n  text-shadow: var(--c-glow-text);\n}\n\nhtml[data-550c] .c-rig-load[data-550c-level='max'] .c-load-now {\n  color: var(--c-red);\n  text-shadow: 0 0 8px currentColor;\n  animation: c-load-alarm 0.9s steps(1) infinite;\n}\n\n@keyframes c-load-alarm {\n  0%,\n  55% {\n    opacity: 1;\n  }\n  55.01%,\n  100% {\n    opacity: 0.35;\n  }\n}\n\n/* At full load the panel's own light goes hot, so the control reads as stressed\n   from the outside in. */\nhtml[data-550c] .c-load-panel[data-550c-level='max'] {\n  box-shadow: 0 0 0 1px color-mix(in srgb, var(--c-red) 55%, transparent), inset 0 0 26px rgba(var(--c-glow-rgb), 0.07),\n    0 12px 34px rgba(0, 0, 0, 0.62);\n}\n\n/* ── the effort picker the rheostat replaces ─────────────────────────────── */\n\n/* The harness offers reasoning effort inside the model dropdown. The rheostat\n   takes that over, so the dropdown's copy is hidden — two controls for one\n   setting is worse than either alone.\n\n   Hidden, never removed: the option buttons inside are exactly what the console\n   clicks to set the level for real, and a `display:none` button is still\n   clickable. The suffix on the model trigger goes too, because the rheostat now\n   states the level and saying it twice reads as two different settings.\n\n   layout-exempt: this rule hides one of the app's OWN nodes, which is a layout\n   property on a DSH element and therefore a genuine exception to this sheet's\n   rule. It is confined to the dialog box — the one region this pass is\n   authorised to restructure — and it is marked and counted by\n   test/layout-contract.test.mjs rather than buried inside a widened check. */\nhtml[data-550c] [data-550c-effort],\nhtml[data-550c] [class*='_7KE1Ra_triggerEffort'] {\n  display: none !important;\n}\n\n/* Its own switch, so the console can be turned off without turning off the skin. */\nhtml[data-550c][data-550c-mark='off'] .c-console-head,\nhtml[data-550c][data-550c-mark='off'] .c-rig-load {\n  display: none;\n}\n\n/* ── 11. REDUCED MOTION ──────────────────────────────────────────────────── */\n\n@media (prefers-reduced-motion: reduce) {\n  html[data-550c] .c-crt .c-roll,\n  html[data-550c] .c-crt .c-flicker,\n  html[data-550c] .c-crt .c-bloom,\n  html[data-550c] .c-cursor::after,\n  html[data-550c] .c-rec > s,\n  html[data-550c] [data-composer-placeholder]::after,\n  html[data-550c] .c-load-panel[data-550c-level='max'] .c-load-read,\n  html[data-550c] .c-rig-load[data-550c-level='max'] .c-load-now,\n  html[data-550c] .c-mark,\n  html[data-550c] .c-cell[data-lit='1'],\n  html[data-550c] .c-tps-rail::after,\n  html[data-550c] :where([data-state='running'], [data-running])::after {\n    animation: none;\n  }\n  html[data-550c] .c-crt .c-flicker {\n    display: none;\n  }\n}\n";
		//#endregion

		//#region part 3
		/**
		 * The CRT atmosphere layer.
		 *
		 * One absolutely-positioned, `pointer-events:none` element carries every
		 * atmospheric effect the skin adds — scanlines, the rolling refresh band, the
		 * vignette, the phosphor bloom and a stepped flicker. It is added to `<body>`
		 * and covers the viewport, so it is the one thing here that touches the DOM
		 * outside a stylesheet; everything else the skin does is CSS on the app's own
		 * elements.
		 *
		 * WHY ONE LAYER AND NOT PSEUDO-ELEMENTS
		 *
		 * `html::before` is already spoken for — dsh-550c-boot's first-frame cover uses
		 * it, and the splash's own stage uses `#final::before`. A dedicated node cannot
		 * collide with either, and it can be switched off as a unit by a single
		 * attribute on `<html>`.
		 *
		 * The layer sits above the app (z-index 2147480000) but deliberately below the
		 * boot splash (2147482000), so a splash playing over a skinned UI stays clean.
		 *
		 * @param options.effects - which axes to include, from the stored preferences.
		 * @returns a disposer that removes the layer.
		 */
		function mountCrt() {
		  const crt = document.createElement('div')
		  crt.className = 'c-crt'
		  crt.setAttribute('aria-hidden', 'true')
		  for (const layer of ['c-bloom', 'c-scan', 'c-roll', 'c-vig', 'c-flicker']) {
		    const element = document.createElement('i')
		    element.className = layer
		    crt.appendChild(element)
		  }
		  document.body.appendChild(crt)
		  return function stop() {
		    crt.remove()
		  }
		}
		//#endregion

		//#region part 4
		/**
		 * The composer, rebuilt as a 550C console.
		 *
		 * WHAT THIS RESTRUCTURES
		 *
		 * The dialog box becomes three bands inside the existing card:
		 *
		 *   ┌──────────────────────────────────────────────────────────┐
		 *   │ ███ 550C ══════════════════ 42.1 t/s      SESSION · READY │  header: the animated mark, then the rate
		 *   ├──────────────────────────────────────────────────────────┤
		 *   │  描述你想要构建的内容…                                     │  the app's own input, terminal-styled
		 *   ├──────────────────────────────────────────────────────────┤
		 *   │ [+] [⏻] [完全权限]                    [算力荷载 重载] [model ▾] [↑] │  controls; the rheostat abuts the model
		 *   └──────────────────────────────────────────────────────────┘
		 *
		 * The mark and the meter share the header because they are both readouts of the
		 * same machine, and because the bar belongs under the mark it is measuring —
		 * that is how an instrument panel is actually laid out.
		 *
		 * THE LOOK
		 *
		 * Deliberately NOT a dot matrix and NOT a boxed panel. An earlier pass rendered
		 * the logotype as `█`/`·` text inside 1px right-angled brackets, which read as a
		 * 1980s compiler and clashed with the rest of DSH, whose surfaces are soft and
		 * round. The mark is now a grid of cells with the empty ones invisible, the
		 * meter is a glowing hairline rail rather than a row of characters, and the
		 * frames are gone in favour of light: no border around the mark, gradients
		 * instead of hard rules, and radii that match the app's own.
		 *
		 * This is the ONE place the skin changes layout, and it is a deliberate,
		 * authorised exception to its own rule: the rest of the shell still may not move
		 * a pixel, and tools/check-geometry.mjs still enforces that. The composer's
		 * height changes here because the point of this pass is to give the dialog box a
		 * header band and an instrument band — see docs/DESIGN.md.
		 *
		 * HOW IT INTERVENES
		 *
		 * The card is rendered by another plugin's React component, so nothing here
		 * wraps or reimplements it. Two nodes are injected — a header as the card's
		 * first child, and the rheostat immediately to the left of the model selector —
		 * and a MutationObserver re-attaches them if a re-render drops them. The app's
		 * own input, buttons, model selector and send control are left exactly where
		 * they are.
		 *
		 * THE RHEOSTAT REPLACES THE APP'S EFFORT PICKER
		 *
		 * The harness offers reasoning effort inside the model dropdown. This console
		 * moves that control out: the dropdown's effort group is marked and hidden, and
		 * the rheostat is the only place the setting appears. It is not a decoration —
		 * choosing a detent really sets the harness's own effort level, by driving the
		 * app's option button, which is the only route a third-party plugin has (there
		 * is no service for model or effort selection).
		 *
		 * THE TPS READING
		 *
		 * Measured, not decorative. It samples how fast the transcript's text is
		 * actually growing and converts with the harness's own density heuristic (four
		 * characters per token, the same constant `dsh-token-meter` prices text with).
		 *
		 * The provider's reported `outputTokens` is NOT the right source for a live bar:
		 * usage settles once per attempt, so a bar driven by it would jump in steps
		 * rather than move while a long answer streams. Rendered growth is continuous,
		 * which is what a throughput meter is for. The figure is labelled TPS and is an
		 * estimate of output rate — the docs say so too.
		 */

		/* ── the mark, as block glyphs ───────────────────────────────────────────── */

		/**
		 * A 4x5 cell font for the three glyphs the logo needs.
		 *
		 * Five rows is the smallest height that still reads as `550C`; the shapes are
		 * authored as cells so the mark is drawn in the same units as the console text
		 * around it, which is what gives it a pixel quality rather than merely making it
		 * small.
		 */
		const CONSOLE_GLYPHS = {
		  '5': ['████', '█···', '███·', '···█', '████'],
		  '0': ['·██·', '█··█', '█··█', '█··█', '·██·'],
		  C: ['·███', '█···', '█···', '█···', '·███'],
		}

		/** `550C` on five rows, one blank column between glyphs. */
		function consoleLogoRows() {
		  const order = ['5', '5', '0', 'C']
		  return Array.from({ length: 5 }, (_, row) => order.map((glyph) => CONSOLE_GLYPHS[glyph][row]).join(' '))
		}

		/** Milliseconds per logo cell while the mark writes itself out. */
		const LOGO_STEP_MS = 14

		/* ── the throughput meter ────────────────────────────────────────────────── */

		/** The harness's own text density: four characters per token. */
		const CHARS_PER_TOKEN = 4
		/** How much output history the rate is averaged over. */
		const RATE_WINDOW_MS = 2500
		/** Sampling period for the meter. */
		const RATE_TICK_MS = 250
		/** The rate that fills the bar completely, in tokens per second. */
		const TPS_FULL_SCALE = 120

		/* ── the rheostat ────────────────────────────────────────────────────────── */

		/**
		 * The four detents, in the app's own order.
		 *
		 * The ids are the harness's (`default`, `low`, `high`, `max` — the same values
		 * its reasoning levels use), and the labels are what this console calls them.
		 * The reading above the slider is a load figure because that is what the control
		 * actually trades: more reasoning effort is more compute spent per answer.
		 */
		const LOAD_STOPS = [
		  { id: 'default', label: '自适应', load: 0.25 },
		  { id: 'low', label: '轻载', load: 0.45 },
		  { id: 'high', label: '重载', load: 0.75 },
		  { id: 'max', label: '满载', load: 1 },
		]

		/**
		 * Mount the console inside the composer.
		 *
		 * @returns a disposer that stops every timer, disconnects the observer and
		 *   removes both injected nodes.
		 */
		function mountDialogConsole() {
		  /* ── the header band ───────────────────────────────────────────────── */

		  const header = document.createElement('div')
		  header.className = 'c-console-head'
		  header.setAttribute('aria-hidden', 'true')

		  /* The mark is a grid of CELLS, not a block of text.
		   *
		   * Rendering the logo as a `<pre>` of `█` and `·` made the empty cells visible
		   * as a dot matrix, which is what made the whole thing read like a 1980s
		   * compiler: a dot matrix is a display technology, and this machine is not
		   * being emulated, it is being depicted. As cells, the empty ones are simply
		   * invisible and the mark reads as a clean piece of lettering — and every lit
		   * cell can carry its own animation delay, which is what makes the mark move. */
		  const mark = document.createElement('div')
		  mark.className = 'c-mark'
		  const markCells = []

		  /** Build the cell grid for `550C`; returns nothing, fills `markCells`. */
		  function buildMark() {
		    const rows = consoleLogoRows()
		    mark.style.setProperty('--cols', String(rows[0].length))
		    mark.replaceChildren()
		    markCells.length = 0
		    for (let row = 0; row < rows.length; row += 1) {
		      for (let column = 0; column < rows[row].length; column += 1) {
		        const cell = document.createElement('span')
		        cell.className = 'c-cell'
		        // The column drives the shimmer's phase, so the mark pulses as a wave
		        // travelling across it rather than blinking as a block.
		        cell.style.setProperty('--col', String(column))
		        cell.dataset.on = rows[row][column] === '█' ? '1' : '0'
		        mark.appendChild(cell)
		        markCells.push(cell)
		      }
		    }
		  }

		  /* ── the throughput bar, in the header, right after the mark ───────── */

		  /* The meter lives beside the mark rather than in its own band: both are
		     readouts of the same machine, and a bar under the mark's own name is how an
		     instrument panel is actually laid out. The bar is long because a meter too
		     short to separate a quiet answer from a fast one is not a meter — and it
		     shows RATE, not progress, so it has no business looking like a progress
		     bar: a hairline rail with a glowing fill. */
		  const tps = document.createElement('div')
		  tps.className = 'c-tps'
		  const tpsRail = document.createElement('div')
		  tpsRail.className = 'c-tps-rail'
		  const tpsFill = document.createElement('div')
		  tpsFill.className = 'c-tps-fill'
		  tpsRail.appendChild(tpsFill)
		  const tpsValue = document.createElement('span')
		  tpsValue.className = 'c-tps-value'
		  tpsValue.textContent = '--'
		  const tpsUnit = document.createElement('span')
		  tpsUnit.className = 'c-tps-unit'
		  tpsUnit.textContent = 't/s'
		  tps.append(tpsRail, tpsValue, tpsUnit)

		  const session = document.createElement('span')
		  session.className = 'c-console-session'
		  session.textContent = 'SESSION 0x' + Math.random().toString(16).slice(2, 10).toUpperCase()
		  const state = document.createElement('span')
		  state.className = 'c-console-state'
		  state.textContent = 'BOOT'

		  // No wordmark: the mark above IS the name, and setting `550C` in type next to
		  // a 550C logotype says the same thing twice.
		  header.append(mark, tps, session, state)

		  /* ── the compute-load rheostat ─────────────────────────────────────── */

		  /* The control, not the readout: it belongs with the app's own controls, and it
		     sits immediately to the LEFT of the model selector because the two describe
		     the same thing — which model, and how hard it is being driven. */
		  const load = document.createElement('div')
		  load.className = 'c-rig-load'
		  const loadTrigger = document.createElement('button')
		  loadTrigger.type = 'button'
		  loadTrigger.className = 'c-load-trigger'
		  const loadKey = document.createElement('span')
		  loadKey.className = 'c-rig-key'
		  loadKey.textContent = '算力荷载'
		  const loadNow = document.createElement('span')
		  loadNow.className = 'c-load-now'
		  loadTrigger.append(loadKey, loadNow)

		  const panel = document.createElement('div')
		  panel.className = 'c-load-panel'
		  panel.hidden = true
		  const panelHead = document.createElement('div')
		  panelHead.className = 'c-load-head'
		  const panelTitle = document.createElement('span')
		  panelTitle.className = 'c-load-title'
		  panelTitle.textContent = '算力荷载'
		  const panelRead = document.createElement('span')
		  panelRead.className = 'c-load-read'
		  panelHead.append(panelTitle, panelRead)

		  const track = document.createElement('div')
		  track.className = 'c-load-track'
		  track.setAttribute('role', 'slider')
		  track.setAttribute('aria-label', '算力荷载')
		  track.setAttribute('aria-valuemin', '0')
		  track.setAttribute('aria-valuemax', String(LOAD_STOPS.length - 1))
		  const fill = document.createElement('div')
		  fill.className = 'c-load-fill'
		  const thumb = document.createElement('div')
		  thumb.className = 'c-load-thumb'
		  track.append(fill, thumb)

		  const ticks = document.createElement('div')
		  ticks.className = 'c-load-ticks'

		  panel.append(panelHead, track, ticks)
		  load.append(loadTrigger, panel)

		  /* ── attachment ────────────────────────────────────────────────────── */

		  let cancelled = false
		  const card = () => document.querySelector('[data-composer-card]')
		  /** The app's trailing group, which the row pushes to its right edge. */
		  const trailingGroup = (host) => host.querySelector('[class*="_trailing"]')

		  /**
		   * The trailing group's direct child that CONTAINS the model selector.
		   *
		   * The rheostat goes immediately before this, which is what makes it abut the
		   * model control. The model's own root class is not a direct child of the
		   * trailing group — it sits inside an unclassed wrapper — so anchoring on the
		   * root class directly made the check fail and the insertion fell back to a
		   * card-level append, landing the control at the bottom of the dialog box.
		   * Walking up to the group's own child is what makes the anchor reliable
		   * without depending on wrapper class names the app is free to change.
		   */
		  function modelAnchor(host) {
		    const trailing = trailingGroup(host)
		    const model = host.querySelector('[class*="_7KE1Ra_root"]')
		    if (trailing === null || model === null) return null
		    let node = model
		    while (node.parentElement !== null && node.parentElement !== trailing) node = node.parentElement
		    return node.parentElement === trailing ? node : null
		  }

		  /**
		   * Mark the app's own reasoning-effort group so the stylesheet can hide it.
		   *
		   * The rheostat REPLACES that control, so it must not also be offered in the
		   * model dropdown — two controls for one setting is worse than either alone.
		   * The group is only hidden, never removed: the option buttons inside it are
		   * exactly what `applyToApp` clicks to set the level for real, and a
		   * `display:none` button is still clickable.
		   */
		  function markEffortGroup() {
		    const keywords = ['思考', '推理', '努力', 'Effort', 'Reasoning', 'Thinking']
		    for (const group of document.querySelectorAll('[class*="_7KE1Ra_group"]')) {
		      if (group.hasAttribute('data-550c-effort')) continue
		      const title = (group.querySelector('[class*="_groupTitle"]')?.textContent ?? '').trim()
		      if (title === '') continue
		      if (keywords.some((keyword) => title.includes(keyword))) group.setAttribute('data-550c-effort', '')
		    }
		  }

		  function attach() {
		    const host = card()
		    if (host === null) return false

		    // Header first: the band above the input. It carries the mark and the
		    // throughput bar, so there is no separate meter row to place.
		    if (header.parentElement !== host) host.insertBefore(header, host.firstChild)

		    // The rheostat immediately to the left of the model selector, inside the
		    // app's own trailing group — adjacent to the control it belongs with, rather
		    // than floating in the middle of the row.
		    const anchor = modelAnchor(host)
		    if (anchor !== null) {
		      if (load.parentElement !== anchor.parentElement || load.nextElementSibling !== anchor) {
		        anchor.parentElement.insertBefore(load, anchor)
		      }
		      // Butt it right up against the model control. The group's own flex gap is
		      // what holds the app's controls apart, and it applies to the rheostat too;
		      // cancelling it on THIS element is the one way to close the seam without
		      // setting a layout property on an element the app owns. The gap is read
		      // rather than hard-coded, so a change to the app's spacing follows.
		      const gap = getComputedStyle(anchor.parentElement).columnGap
		      load.style.marginRight = gap === 'normal' || gap === '' ? '0' : '-' + gap
		    } else if (load.parentElement !== host) {
		      host.appendChild(load)
		    }

		    markEffortGroup()
		    return true
		  }

		  const observer = new MutationObserver(() => {
		    if (!cancelled) attach()
		  })
		  observer.observe(document.body, { childList: true, subtree: true })
		  attach()

		  /* ── the throughput meter ──────────────────────────────────────────── */

		  const transcript = () => document.querySelector('[data-conversation-scroll]')
		  /** Rolling (timestamp, cumulative characters) samples. */
		  let samples = []
		  let lastChars = 0

		  /** Count the transcript's visible characters — the thing that grows as text streams. */
		  function transcriptChars() {
		    const node = transcript()
		    return node === null ? 0 : (node.textContent ?? '').length
		  }

		  /**
		   * Paint the meter for one rate.
		   *
		   * The parameter is named `rate`, not `tpsValue`: the element above is
		   * `tpsValue`, and a parameter of the same name shadowed it — so the write went
		   * onto a number primitive and was silently discarded. The bar kept working
		   * (its element was not shadowed), which is exactly how that bug hides.
		   */
		  function renderTps(rate) {
		    const fraction = Math.max(0, Math.min(1, rate / TPS_FULL_SCALE))
		    // The rail is a RATE gauge, not a progress bar: the fill is how fast the
		    // machine is writing right now, so it falls back on its own when output
		    // stops. A short transition keeps it from looking like a level that jumps.
		    tpsFill.style.width = (fraction * 100).toFixed(1) + '%'
		    tpsValue.textContent = rate < 0.05 ? '--' : rate.toFixed(1)
		    tps.setAttribute('data-550c-level', rate >= TPS_FULL_SCALE * 0.7 ? 'hot' : rate >= TPS_FULL_SCALE * 0.3 ? 'busy' : 'idle')
		  }

		  function tickTps() {
		    if (cancelled) return
		    const now = Date.now()
		    const total = transcriptChars()
		    samples.push({ at: now, chars: total })
		    while (samples.length > 1 && now - samples[0].at > RATE_WINDOW_MS) samples.shift()

		    const oldest = samples[0]
		    const elapsed = (now - oldest.at) / 1000
		    const grown = total - oldest.chars
		    // A shrinking transcript means a session switch or a re-render, not negative
		    // throughput: reset the window instead of reporting nonsense.
		    if (grown < 0) {
		      samples = [{ at: now, chars: total }]
		      renderTps(0)
		      return
		    }
		    const rate = elapsed < 0.4 ? 0 : grown / elapsed
		    renderTps(rate / CHARS_PER_TOKEN)
		  }

		  // The meter is driven by observed growth, so it needs no cooperation from the
		  // app and keeps working through any renderer change.
		  const tpsTimer = window.setInterval(tickTps, RATE_TICK_MS)
		  lastChars = transcriptChars()

		  /* ── the rheostat ──────────────────────────────────────────────────── */

		  let index = 0

		  /** Paint the panel, the track, the trigger and the readout for one detent. */
		  function paint() {
		    const stop = LOAD_STOPS[index]
		    const fraction = stop.load

		    loadNow.textContent = stop.label
		    panelRead.textContent = stop.label
		    // The reading carries the load as a percentage as well as a name: the name is
		    // the detent, the figure is what the detent costs.
		    panelRead.setAttribute('data-550c-load', String(Math.round(fraction * 100)))

		    fill.style.width = Math.round(fraction * 100) + '%'
		    thumb.style.left = Math.round(fraction * 100) + '%'
		    // The level attribute is what the stylesheet keys the colour ladder and the
		    // pulse off, so "how loaded is it" is expressed once, in the DOM, and the
		    // CSS owns every visual consequence.
		    const level = fraction >= 0.9 ? 'max' : fraction >= 0.6 ? 'high' : fraction >= 0.4 ? 'mid' : 'low'
		    for (const node of [load, panel, track]) node.setAttribute('data-550c-level', level)

		    // Detent ticks: the one you are on is marked, so the control reads as a
		    // stepped rheostat rather than a continuous fader.
		    ticks.replaceChildren()
		    for (let position = 0; position < LOAD_STOPS.length; position += 1) {
		      const tick = document.createElement('span')
		      tick.className = 'c-load-tick' + (position === index ? ' is-on' : '')
		      tick.textContent = LOAD_STOPS[position].label
		      ticks.appendChild(tick)
		    }
		  }

		  /**
		   * True while the console is driving the app's own dropdown.
		   *
		   * Applying a level means clicking the app's effort option, and the app closes
		   * its dropdown on an outside click — which is a click on the document, which
		   * is also what dismisses this console's panel. Without this guard, setting a
		   * level slammed the panel shut under the user's hand.
		   */
		  let driving = false

		  /**
		   * Apply the chosen level to the app's own reasoning-effort control.
		   *
		   * There is no service for this — the harness exposes model and effort
		   * selection only through its own dropdown, and its options are plain buttons.
		   * So the console drives that control the way a user would: open the trigger,
		   * click the option matching the level, and let the app do the rest. Best-effort
		   * by design: if the shape has changed, the console still reads correctly, it
		   * simply cannot set the value.
		   *
		   * @returns whether an option was found and clicked.
		   */
		  function applyToApp(stop) {
		    const trigger = document.querySelector('[class*="_7KE1Ra_trigger"]')
		    if (trigger === null) return false
		    driving = true
		    try {
		      trigger.click()
		      let clicked = false
		      const options = document.querySelectorAll('[class*="_7KE1Ra_"] button, [role="menuitem"]')
		      for (const option of options) {
		        const text = (option.textContent ?? '').trim()
		        if (text === '') continue
		        // Match the harness's own names for the level, in either language.
		        const wanted = {
		          default: ['默认', 'Default', '自适应'],
		          low: ['低', 'Low', '轻载'],
		          high: ['高', 'High', '重载'],
		          max: ['最高', 'Max', '满载'],
		        }[stop.id] ?? []
		        if (wanted.some((candidate) => text.includes(candidate))) {
		          option.click()
		          clicked = true
		          break
		        }
		      }
		      // Close the app's dropdown either way: leaving it open would cover the
		      // composer. The guard keeps this from also dismissing our own panel.
		      document.body.click()
		      return clicked
		    } finally {
		      driving = false
		    }
		  }

		  function select(next, apply) {
		    index = Math.max(0, Math.min(LOAD_STOPS.length - 1, next))
		    paint()
		    if (apply === true) applyToApp(LOAD_STOPS[index])
		  }

		  loadTrigger.addEventListener('click', (event) => {
		    event.stopPropagation()
		    panel.hidden = !panel.hidden
		    if (!panel.hidden) paint()
		  })

		  // Pointer handling on the track: press and drag, which is what a rheostat is.
		  // Snapping to detents on release keeps the control honest to the four levels
		  // the harness actually has.
		  const trackIndexAt = (clientX) => {
		    const rect = track.getBoundingClientRect()
		    if (rect.width === 0) return index
		    const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
		    // The detents sit at their own load positions, so pick the nearest one.
		    let best = 0
		    let bestDistance = Infinity
		    for (let position = 0; position < LOAD_STOPS.length; position += 1) {
		      const distance = Math.abs(LOAD_STOPS[position].load - fraction)
		      if (distance < bestDistance) {
		        bestDistance = distance
		        best = position
		      }
		    }
		    return best
		  }

		  track.addEventListener('pointerdown', (event) => {
		    event.preventDefault()
		    track.setPointerCapture(event.pointerId)
		    select(trackIndexAt(event.clientX), false)
		  })
		  track.addEventListener('pointermove', (event) => {
		    if (!track.hasPointerCapture(event.pointerId)) return
		    select(trackIndexAt(event.clientX), false)
		  })
		  track.addEventListener('pointerup', (event) => {
		    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId)
		    select(trackIndexAt(event.clientX), true)
		  })

		  // Keyboard, so the control is not mouse-only.
		  track.tabIndex = 0
		  track.addEventListener('keydown', (event) => {
		    if (event.key === 'ArrowLeft') {
		      event.preventDefault()
		      select(index - 1, true)
		    }
		    if (event.key === 'ArrowRight') {
		      event.preventDefault()
		      select(index + 1, true)
		    }
		  })

		  // Dismiss the panel by clicking anywhere else — but not when the click is part
		  // of driving the app's dropdown, and not when it is inside the console itself.
		  const onDocumentClick = (event) => {
		    if (driving) return
		    if (event.target instanceof Element && (load.contains(event.target) || event.target === track)) return
		    if (!panel.hidden) panel.hidden = true
		  }
		  document.addEventListener('click', onDocumentClick)

		  paint()

		  /* ── the boot ──────────────────────────────────────────────────────── */

		  /** Await a step, cancellably. Keys on disposal only — never on connectivity. */
		  const sleep = (ms) =>
		    new Promise((resolve) => {
		      const timer = window.setTimeout(resolve, ms)
		      if (cancelled) {
		        window.clearTimeout(timer)
		        resolve()
		      }
		    })

		  async function boot() {
		    // Wait for the shell to render a composer; the sequence is short and
		    // starting it into a detached node would waste the whole thing.
		    for (let attempt = 0; attempt < 80; attempt += 1) {
		      if (cancelled) return
		      if (attach()) break
		      await sleep(120)
		    }
		    if (cancelled) return

		    // The mark writes itself out cell by cell, then keeps moving. The write is
		    // the boot beat; the shimmer that follows is what stops a finished logotype
		    // from looking like a sticker.
		    buildMark()
		    const lit = markCells.filter((cell) => cell.dataset.on === '1')
		    for (const cell of lit) {
		      if (cancelled) return
		      cell.setAttribute('data-lit', '1')
		      await sleep(LOGO_STEP_MS)
		    }
		    state.textContent = 'READY'
		  }

		  boot().catch(() => {
		    /* a disposed console has nothing left to report */
		  })

		  return function stop() {
		    cancelled = true
		    window.clearInterval(tpsTimer)
		    observer.disconnect()
		    document.removeEventListener('click', onDocumentClick)
		    // The meter lives inside the header, so removing the header takes it too.
		    header.remove()
		    load.remove()
		    // The marker is on the app's own node, so it has to be taken back off —
		    // leaving it would keep the effort group hidden after the skin is gone.
		    for (const group of document.querySelectorAll('[data-550c-effort]')) {
		      group.removeAttribute('data-550c-effort')
		    }
		    void lastChars
		  }
		}
		//#endregion

		//#region part 5
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
		//#endregion
		return module.exports;
	}
});
