/**
 * The layout contract, as a static check.
 *
 * The skin's promise is that it changes how DSH looks and never where anything
 * is. That promise is easiest to keep as an assertion about the stylesheet,
 * because the way it gets broken is always the same: someone adds a `padding`,
 * a `border`, a `width` or an `overflow` to a rule that targets one of DSH's own
 * elements, and the shell quietly moves.
 *
 * Two real regressions from this plugin's own development are encoded here:
 *
 *   `border`      on the composer card grew the whole input cluster by 2px
 *   `width`/`height` on `::-webkit-scrollbar` narrowed every scroll body by 2px
 *
 * SCOPE OF THE CHECK
 *
 * Only rules that can reach a DSH element are inspected — a selector that is
 * entirely the skin's own furniture (`.c-*`) is exempt, because the console
 * layer is free to size the nodes it created. Declarations inside a
 * `position:absolute` pseudo-element rule are exempt for the same reason:
 * an absolutely positioned box is out of flow and cannot move anything.
 *
 * `position: relative` is allowed everywhere (it anchors a decoration without
 * moving anything), and `outline` is preferred over `border` for the focus ring
 * precisely because it does not participate in the box model.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const css = readFileSync(resolve(root, 'src/skin.css'), 'utf8')

/** Properties that change the box model, flow, or text metrics of a DSH element. */
const FORBIDDEN = [
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'width',
  'min-width',
  'max-width',
  'height',
  'min-height',
  'max-height',
  'display',
  'flex',
  'flex-basis',
  'flex-grow',
  'flex-shrink',
  'flex-direction',
  'flex-wrap',
  'grid-template-columns',
  'grid-template-rows',
  'align-items',
  'justify-content',
  'gap',
  'row-gap',
  'column-gap',
  'box-sizing',
  'border',
  'border-width',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'overflow',
  'overflow-x',
  'overflow-y',
  'font-size',
  'line-height',
  'transform',
  'zoom',
  'inset',
  'top',
  'right',
  'bottom',
  'left',
  'order',
  'float',
  'vertical-align',
]

/**
 * Strip comments and split the sheet into `{ selector, body, at, exempt }`.
 *
 * At-rule blocks are walked into, so a rule nested inside `@media` is still
 * checked rather than skipped — the reduced-motion block is exactly where an
 * animation would be disabled, not where a layout would be added, but the check
 * should not have to assume that. Keyframe blocks are exempt: their "selectors"
 * are percentages and their declarations describe an animation, not a box.
 *
 * A rule may opt out of the layout check, but only by carrying an explicit
 * `layout-exempt:` marker in the comment immediately above it. The marker is the
 * point: an exemption has to be visible at the rule and justified in prose, so
 * this check cannot be satisfied by quietly widening it. There is currently
 * exactly one, and the reason is in that comment.
 */
function* rules(source, at = '') {
  const text = source
  const marker = /\/\*\*?([\s\S]*?)\*\//g
  const markers = []
  let match
  while ((match = marker.exec(text)) !== null) {
    if (match[1].includes('layout-exempt:')) markers.push(match.index)
  }

  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, (comment) => ' '.repeat(comment.length))
  let index = 0
  while (index < stripped.length) {
    const open = stripped.indexOf('{', index)
    if (open === -1) return
    const selector = stripped.slice(index, open).trim()
    let depth = 1
    let cursor = open + 1
    while (cursor < stripped.length && depth > 0) {
      if (stripped[cursor] === '{') depth += 1
      else if (stripped[cursor] === '}') depth -= 1
      cursor += 1
    }
    const body = stripped.slice(open + 1, cursor - 1)
    // The marker must sit between the previous rule's end and this selector.
    const exempt = markers.some((position) => position >= index && position < open)
    if (selector.startsWith('@')) {
      const nestedAt = /^@keyframes/.test(selector) || /^@keyframes/.test(at) ? '@keyframes' : at
      if (nestedAt !== '@keyframes') yield* rules(body, nestedAt)
    } else if (at !== '@keyframes') {
      yield { selector, body, exempt }
    }
    index = cursor
  }
}

/** Split a selector on top-level commas only — `:where(a, b)` is one selector. */
function selectorParts(selector) {
  const parts = []
  let depth = 0
  let current = ''
  for (const char of selector) {
    if (char === '(' || char === '[') depth += 1
    if (char === ')' || char === ']') depth -= 1
    if (char === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  if (current.trim() !== '') parts.push(current.trim())
  return parts
}

/** Parse `prop: value` pairs out of a rule body, ignoring nested blocks. */
function declarations(body) {
  const flat = body.replace(/[^{}]*\{[^}]*\}/g, '')
  return flat
    .split(';')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line) => {
      const colon = line.indexOf(':')
      return colon === -1
        ? { property: line, value: '' }
        : { property: line.slice(0, colon).trim().toLowerCase(), value: line.slice(colon + 1).trim() }
    })
}

/** True when this rule only ever paints the skin's own furniture. */
function isSkinOwn(selector) {
  // Every comma-separated part must be about `.c-*` nodes; a selector that
  // mixes furniture and app elements is treated as reaching the app.
  return selector
    .split(',')
    .every((part) => /\.c-[a-z-]+/.test(part) && !/\[data-550c-pane\]|\[class\*=|\[role=|^html\[data-550c\]\s*:where/.test(part))
}

test('no rule that can reach a DSH element sets a layout property', () => {
  const violations = []
  for (const { selector, body, exempt } of rules(css)) {
    if (exempt) continue
    if (isSkinOwn(selector)) continue
    const declarations_ = declarations(body)
    const positioned = declarations_.some(
      (item) => item.property === 'position' && item.value === 'absolute',
    )
    const pseudo = /::?(before|after|placeholder|selection|first-line)\b/.test(selector)
    // An absolutely positioned pseudo-element is out of flow: it can be sized
    // and offset freely without moving anything.
    if (positioned && pseudo) continue

    for (const { property, value } of declarations_) {
      if (!FORBIDDEN.includes(property)) continue
      // `position: relative` and the offsets that go with an absolute
      // decoration are the two documented exceptions.
      if (property === 'position') continue
      if (pseudo && positioned) continue
      violations.push(`${selector} { ${property}: ${value} }`)
    }
  }
  assert.deepEqual(violations, [], 'these rules would change DSH layout:\n  ' + violations.join('\n  '))
})

test('every layout exemption is marked and counted', () => {
  // Exemptions are allowed, but only explicit ones — and the count is pinned so
  // adding one is a deliberate act that shows up in review rather than a quiet
  // widening of the check.
  //
  // Two exemptions exist, and both are named here on purpose:
  //   1. the composer's block cursor, the one decoration in text flow;
  //   2. hiding the harness's own effort picker, which the dialog box's rheostat
  //      replaces — a layout property on a DSH node, confined to the one region
  //      this pass is authorised to restructure.
  const exempt = [...rules(css)].filter((rule) => rule.exempt)
  assert.equal(exempt.length, 2, 'expected exactly two marked exemptions')
  const selectors = exempt.map((rule) => rule.selector).join('\n')
  assert.match(selectors, /_placeholder/, 'the cursor exemption must still be present')
  assert.match(selectors, /_7KE1Ra_triggerEffort/, 'the effort-picker exemption must still be present')
  for (const rule of exempt) {
    // An exemption must be for a pseudo-element or a hidden node, never for a
    // real element that is expected to keep its box.
    assert.ok(
      /::?[a-z-]+/.test(rule.selector) || /display:\s*none/.test(rule.body),
      'an exempted rule must be a pseudo-element or a display:none rule',
    )
  }
})

test('borders are never added to a DSH element (they grow the box)', () => {
  // Called out separately from FORBIDDEN because it is the regression this
  // plugin actually shipped once, and the fix is always the same: an inset
  // box-shadow paints the identical line without touching the box model.
  const offenders = []
  for (const { selector, body } of rules(css)) {
    if (isSkinOwn(selector)) continue
    if (/::?(before|after)/.test(selector)) continue
    for (const { property, value } of declarations(body)) {
      if (!property.startsWith('border')) continue
      // Recolouring an existing border is fine; changing its width or adding a
      // whole border is not.
      if (property.endsWith('color')) continue
      if (property === 'border-radius' || property === 'border-collapse' || property === 'border-spacing') continue
      offenders.push(`${selector} { ${property}: ${value} }`)
    }
  }
  assert.deepEqual(offenders, [], 'added borders:\n  ' + offenders.join('\n  '))
})

test('the scrollbar is restyled but never resized', () => {
  // Scrollbar thickness feeds back into every `overflow:auto` container, so a
  // `width`/`height` here narrows the shell's content boxes.
  for (const { selector, body } of rules(css)) {
    if (!selector.includes('scrollbar')) continue
    for (const { property } of declarations(body)) {
      assert.ok(
        !['width', 'height', 'border', 'border-width', 'margin', 'padding'].includes(property),
        `${selector} sets ${property}; scrollbar metrics are layout-affecting`,
      )
    }
  }
})

test('the stylesheet is fully scoped to the skin attribute', () => {
  // A rule that is not under `html[data-550c]` would survive the skin being
  // switched off — the one way this plugin could leave residue.
  const unscoped = []
  for (const { selector } of rules(css)) {
    for (const part of selectorParts(selector)) {
      if (part === '') continue
      // The skin's own furniture is created only while the skin is on, so its
      // classes are self-scoping.
      if (/\.c-[a-z-]+/.test(part)) continue
      if (part.startsWith('html[data-550c]')) continue
      unscoped.push(part)
    }
  }
  assert.deepEqual(unscoped, [], 'scoped selectors required for:\n  ' + unscoped.join('\n  '))
})
