/**
 * The palette layer's invariants.
 *
 * `tokensFor` is the whole colour half of the skin, and it is a pure function —
 * so it can be checked without a browser, which is what makes these assertions
 * cheap enough to run on every commit. Each one corresponds to a way the
 * generated ladder has actually gone wrong or could:
 *
 *   an empty or truncated map     the skin then paints nothing of DSH
 *   a non-string or NaN value     `setProperty` accepts it and the token
 *                                 silently produces no colour
 *   a missing scheme primitive    `mix(undefined, …)` yields `#NaNNaNNaN`
 *   two schemes sharing an id     `theme.register` throws on the duplicate
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

const context = createContext({})
runInContext(
  readFileSync(resolve(root, 'src/palettes.js'), 'utf8') +
    `
    globalThis.__p = {
      schemes: SCHEMES,
      defaultScheme: DEFAULT_SCHEME,
      themeId,
      schemeOfTheme,
      tokensFor,
      skinTokensFor,
    }
  `,
  context,
)
const p = context.__p

/** The tokens a skin MUST reach: the surfaces and ink of the shell itself. */
const REQUIRED = [
  '--dsw-alias-bg-base',
  '--dsw-alias-bg-layer-1',
  '--dsw-alias-bg-layer-2',
  '--dsw-alias-bg-overlay',
  '--dsw-specific-sidebar-fill',
  '--dsw-alias-label-primary',
  '--dsw-alias-label-secondary',
  '--dsw-alias-label-tertiary',
  '--dsw-alias-border-l1',
  '--dsw-alias-border-l2',
  '--dsw-alias-brand-primary',
  '--dsw-alias-button-primary-fill',
  '--dsw-alias-state-error-primary',
  '--dsw-alias-state-success-primary',
  '--dsw-specific-bubble',
  '--dsw-specific-input-major',
  '--shiki-token-keyword',
  '--shiki-token-string',
]

test('four schemes, unique ids, unique theme ids', () => {
  assert.equal(p.schemes.length, 4)
  const ids = p.schemes.map((scheme) => scheme.id)
  assert.equal(new Set(ids).size, ids.length, 'scheme ids must be unique')
  const themeIds = p.schemes.map((scheme) => p.themeId(scheme))
  assert.equal(new Set(themeIds).size, themeIds.length, 'registered theme ids must be unique')
  for (const id of themeIds) assert.match(id, /^550c-[a-z]+$/)
})

test('the default scheme is white, and is the one the row offers first', () => {
  // "Default" is a real property with one definition, not a comment: the scheme
  // at the front of the list is the one the skin starts on, and this pins it so
  // the row's first option and the default cannot drift apart.
  assert.equal(p.defaultScheme, 'white', 'the default scheme must be white')
  assert.equal(p.schemes[0].id, p.defaultScheme, 'the default must be the first scheme offered')

  // And the host half must accept it in the same order, or a stored default would
  // be rejected on load and the skin would come back on a different colour than
  // it left.
  const host = readFileSync(resolve(root, 'lib/index.js'), 'utf8')
  const list = host.match(/const SCHEMES = \[([^\]]*)\]/)
  assert.ok(list !== null, 'the host must declare its accepted schemes')
  const accepted = list[1]
    .split(',')
    .map((entry) => entry.trim().replace(/^'|'$/g, ''))
    .filter(Boolean)
  for (const scheme of p.schemes) {
    assert.ok(accepted.includes(scheme.id), `the host must accept the scheme "${scheme.id}"`)
  }
  assert.equal(accepted[0], 'off', 'the host list starts with the off switch')
  assert.equal(accepted[1], p.defaultScheme, 'the host must list the default first, after "off"')
})

test('every scheme resolves to a complete, well-formed ladder', () => {
  for (const scheme of p.schemes) {
    const ladder = p.tokensFor(scheme)
    const entries = Object.entries(ladder)
    assert.ok(entries.length >= 120, `${scheme.id}: expected a full ladder, got ${entries.length}`)

    for (const [name, value] of entries) {
      assert.match(name, /^--[a-z0-9-]+$/, `${scheme.id}: bad token name ${name}`)
      assert.equal(typeof value, 'string', `${scheme.id}: ${name} is not a string`)
      assert.notEqual(value, '', `${scheme.id}: ${name} is empty`)
      assert.ok(!value.includes('NaN'), `${scheme.id}: ${name} resolved to ${value}`)
      assert.ok(!value.includes('undefined'), `${scheme.id}: ${name} resolved to ${value}`)
    }
  }
})

test('every scheme reaches the shell surfaces and ink', () => {
  for (const scheme of p.schemes) {
    const ladder = p.tokensFor(scheme)
    for (const name of REQUIRED) {
      assert.ok(name in ladder, `${scheme.id}: ladder is missing ${name}`)
    }
  }
})

test('the four schemes are actually different palettes', () => {
  const seen = new Map()
  for (const scheme of p.schemes) {
    const ladder = p.tokensFor(scheme)
    const key = ladder['--dsw-alias-bg-base'] + '/' + ladder['--dsw-alias-brand-primary']
    assert.ok(!seen.has(key), `${scheme.id} shares its base and accent with ${seen.get(key)}`)
    seen.set(key, scheme.id)
  }
})

test('ink is legible against the surface it sits on', () => {
  /** WCAG relative luminance, for the contrast assertion below. */
  const luminance = (hex) => {
    const parts = hex.replace('#', '').match(/../g).map((pair) => parseInt(pair, 16) / 255)
    const [r, g, b] = parts.map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const contrast = (a, b) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
  }

  for (const scheme of p.schemes) {
    const ladder = p.tokensFor(scheme)
    const base = ladder['--dsw-alias-bg-base']
    const layer = ladder['--dsw-alias-bg-layer-1']
    // Body text must clear WCAG AA for normal text on both surfaces. Captions and
    // the faint rules are deliberately below this and are not asserted: the
    // author's own `--text-faint` is a decorative colour in the splash, and the
    // skin only uses it for 1px rules.
    assert.ok(contrast(ladder['--dsw-alias-label-primary'], base) >= 4.5, `${scheme.id}: primary ink on base`)
    assert.ok(contrast(ladder['--dsw-alias-label-primary'], layer) >= 4.5, `${scheme.id}: primary ink on layer-1`)
    assert.ok(contrast(ladder['--dsw-alias-label-secondary'], base) >= 4.5, `${scheme.id}: secondary ink on base`)
  }
})

test('the skin tokens cover the CRT and the type stack', () => {
  for (const scheme of p.schemes) {
    const tokens = p.skinTokensFor(scheme)
    for (const name of ['--c-amber', '--c-bg', '--c-text', '--c-glow-rgb', '--c-mono', '--c-rule']) {
      assert.ok(name in tokens, `${scheme.id}: skin tokens missing ${name}`)
    }
    assert.match(tokens['--c-glow-rgb'], /^\d+,\d+,\d+$/, `${scheme.id}: glow must be a raw r,g,b triple`)
  }
})

test('the elevated surfaces and the activity label are owned by the skin', () => {
  // These four are not colour preferences, they are the difference between the
  // skin being finished and the app's own light-theme defaults showing through.
  // Every one of them was missing until a live page was read back:
  //
  //   `--dsw-menu-surface-fill`            menus paint THIS, not `--dsw-specific-menu`
  //   `--dsw-alias-menu-group-header-fill` the sticky heading inside a menu
  //   `--dsw-alias-label-deep-diving`      the colour of `深度求索中`
  //   `--dsw-linear-gradient-think`        the 思考 block's fade
  //
  // A menu that falls back to DSH's value gets `#f8f9fa94` — a near-white 58%
  // wash — because the fill is translucent and its light half is what resolves
  // when the dark marker is absent. Pinned here so it cannot go missing again.
  const REQUIRED = [
    '--dsw-menu-surface-fill',
    '--dsw-alias-menu-group-header-fill',
    '--dsw-alias-label-deep-diving',
    '--dsw-alias-label-deep-diving-shimmer',
    '--dsw-linear-gradient-think',
    '--dsw-linear-think-select',
  ]
  for (const scheme of p.schemes) {
    const ladder = p.tokensFor(scheme)
    for (const name of REQUIRED) {
      assert.ok(name in ladder, `${scheme.id}: ladder is missing ${name}`)
      assert.ok(typeof ladder[name] === 'string' && ladder[name] !== '', `${scheme.id}: ${name} is empty`)
      assert.ok(!/NaN|undefined/.test(ladder[name]), `${scheme.id}: ${name} is malformed: ${ladder[name]}`)
    }
    // The menu material has to be effectively opaque, or the backdrop filter it
    // sits under shows the page through it and the panel goes milky again.
    const fill = ladder['--dsw-menu-surface-fill'].match(/^rgba\(\d+,\d+,\d+,([\d.]+)\)$/)
    assert.ok(fill !== null, `${scheme.id}: menu fill must be an rgba() tint, got ${ladder['--dsw-menu-surface-fill']}`)
    assert.ok(Number(fill[1]) >= 0.9, `${scheme.id}: menu fill is only ${fill[1]} opaque; the panel will read as glass`)

    // The activity label is the accent and its sweep is the bright accent, which
    // is what makes the running line read as this machine rather than as DSH's blue.
    assert.equal(ladder['--dsw-alias-label-deep-diving'], scheme.accent, `${scheme.id}: activity label must be the accent`)
    assert.equal(
      ladder['--dsw-alias-label-deep-diving-shimmer'],
      scheme.accentBright,
      `${scheme.id}: activity sweep must be the bright accent`,
    )
  }
})

test('schemeOfTheme maps only this plugin ids', () => {
  assert.equal(p.schemeOfTheme('550c-amber').id, 'amber')
  assert.equal(p.schemeOfTheme('dark'), null)
  assert.equal(p.schemeOfTheme('catppuccin-mocha'), null)
  assert.equal(p.schemeOfTheme(undefined), null)
})
