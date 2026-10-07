/**
 * Ownership contract for the shared skin state.
 *
 * A live plugin reload evaluates the client half a second time while the first
 * instance's teardown is still pending. Both instances share one `<html>`, so
 * without an ownership marker the OLDER teardown runs last and strips
 * `data-550c` (plus the tokens, the effect attributes and dark mode) that the
 * NEWER instance installed. The visible symptom: the palette reverts to stock
 * while the newer instance's decorations stay in the page and show their raw
 * text in the composer.
 *
 * These are source assertions, in the same spirit as the layout-contract test:
 * the guarantee is structural, so it is checked structurally and cheaply.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const SOURCE = readFileSync(resolve(here, '..', 'src', 'client.js'), 'utf8')

/** The source of one top-level function, up to the closing brace in column 0. */
function functionBody(name) {
  const start = SOURCE.indexOf(`function ${name}(`)
  assert.notEqual(start, -1, `${name}() not found in src/client.js`)
  const end = SOURCE.indexOf('\n}', start)
  assert.notEqual(end, -1, `${name}() has no top-level closing brace`)
  return SOURCE.slice(start, end)
}

test('there is an ownership marker, and it is not the skin marker itself', () => {
  assert.match(SOURCE, /const OWNER_ATTR = '[^']+'/)
  assert.match(SOURCE, /const INSTANCE_ID = /)
  const owner = /const OWNER_ATTR = '([^']+)'/.exec(SOURCE)[1]
  const skin = /skin: '([^']+)'/.exec(SOURCE)[1]
  assert.notEqual(owner, skin, 'the owner marker must be separate from data-550c')
})

test('activating claims ownership', () => {
  const body = functionBody('activate')
  assert.match(body, /setAttribute\(OWNER_ATTR, INSTANCE_ID\)/, 'activate() must claim the screen')
  const claim = body.indexOf('setAttribute(OWNER_ATTR, INSTANCE_ID)')
  const skin = body.indexOf('setAttribute(ATTR.skin')
  assert.ok(skin !== -1 && claim > skin, 'claim right after (or with) the skin marker')
})

test('teardown removes its own nodes before it looks at ownership', () => {
  const body = functionBody('deactivate')
  const guard = body.indexOf('getAttribute(OWNER_ATTR) !== INSTANCE_ID')
  assert.notEqual(guard, -1, 'deactivate() must consult the ownership marker')
  for (const disposer of ['previous.stopCrt()', 'previous.stopPanel()', 'previous.stopMark()']) {
    const at = body.indexOf(disposer)
    assert.notEqual(at, -1, `${disposer} must still be called`)
    assert.ok(at < guard, `${disposer} must run before the ownership guard: a stale teardown still owns its own DOM`)
  }
})

test('every piece of shared state is behind the guard', () => {
  const body = functionBody('deactivate')
  const guard = body.indexOf('getAttribute(OWNER_ATTR) !== INSTANCE_ID')
  const shared = [
    'removeSkinStyle()',
    'clearEffectAttributes()',
    'retractSkinTokens(',
    'removeLadder()',
    'removeAttribute(ATTR.skin)',
    'releaseDarkMode()',
    'setDarkMode(',
  ]
  for (const call of shared) {
    const at = body.indexOf(call)
    assert.notEqual(at, -1, `${call} must still be called when the owner leaves`)
    assert.ok(at > guard, `${call} must sit behind the ownership guard`)
  }
})

test('teardown is idempotent and the owner marker is released', () => {
  const body = functionBody('deactivate')
  assert.match(body, /if \(live === null\) return/, 'a second call must be a no-op')
  assert.match(body, /removeAttribute\(OWNER_ATTR\)/, 'the owner marker must be released with the skin')
})
