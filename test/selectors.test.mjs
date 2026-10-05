/**
 * Do the skin's selectors actually reach DSH's components?
 *
 * This is the gap the geometry and residue checks cannot close. Those prove the
 * skin does not move anything and does not linger; they say nothing about
 * whether `[class*="_bubble"]` matches the element DSH actually renders. A
 * stylesheet full of selectors that match nothing looks exactly like a
 * stylesheet that works, right up until someone opens a conversation.
 *
 * GROUND TRUTH
 *
 * The real class names are read out of the client packages installed under
 * `$DSH_HOME/profiles/node_modules/@deepseek-ai/*\/lib/client.js` — the same
 * files the running client loads. Every class there is a CSS-module name like
 * `Sixlwa_bubble`, so the local part after the hash is what a skin can rely on,
 * and this test is what says whether a given substring selector lands.
 *
 * The test SKIPS when DSH is not installed (a fresh clone, CI without a
 * harness), because a missing local install is not a skin defect. It never
 * fails for that reason — the same bargain dsh-550c-boot's harness makes.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const scope = join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'profiles', 'node_modules', '@deepseek-ai')

/**
 * The installed client packages' stylesheets and scripts.
 *
 * DSH's component styling lives in TWO places, and a skin has to target both:
 * each client plugin inlines its own CSS into `lib/client.js`, while the app's
 * own component styles (markdown, code blocks, tool output) ship in the
 * `dsh-web-frontend` dist stylesheet. Scanning only the packages misses `_shiki`
 * entirely — which is exactly what the first run of this check reported, and it
 * was the check that was wrong, not the selector.
 *
 * `withFileTypes` also reports a pnpm entry as a SYMLINK, not a directory, so
 * `isDirectory()` is false for every package in a real install and the scan
 * silently finds nothing. Entries are therefore resolved by following the link.
 */
function sourceFiles() {
  if (!existsSync(scope)) return null
  const files = []

  // Each plugin's inlined stylesheet.
  for (const entry of readdirSync(scope, { withFileTypes: true })) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue
    const directory = join(scope, entry.name)
    try {
      if (!statSync(directory).isDirectory()) continue
    } catch (error) {
      continue
    }
    const client = join(directory, 'lib', 'client.js')
    if (existsSync(client)) files.push(client)
  }

  // The frontend's own dist stylesheet.
  const dist = join(scope, 'dsh-web-frontend', 'dist', 'assets')
  if (existsSync(dist)) {
    for (const name of readdirSync(dist)) {
      if (name.endsWith('.css')) files.push(join(dist, name))
    }
  }

  return files
}

const files = sourceFiles()

/** Every CSS-module class name DSH ships, across both sources. */
function collectClassNames() {
  if (files === null || files.length === 0) return null
  const names = new Set()
  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    // A CSS-module name is `_<local>_<hash>` (sometimes with a further `_<line>`),
    // so the requirement is "an underscore-joined token", not "a token whose hash
    // begins with a letter".
    //
    // The earlier pattern demanded a letter right after the hash separator, and
    // that silently stopped matching when a DSH build produced
    // `_shiki_7gxqk_93` — hash starting with a DIGIT. The class was there in the
    // stylesheet the whole time; only the extractor could not see it, and the
    // failure surfaced as "the skin's `_shiki` selector matches nothing DSH
    // renders", which is exactly the wrong conclusion. Digits are allowed
    // anywhere in the token now.
    for (const match of source.matchAll(/\.([_A-Za-z][-_A-Za-z0-9]*_[_A-Za-z0-9-]+)/g)) {
      names.add(match[1])
    }
  }
  return names.size === 0 ? null : names
}

const classNames = collectClassNames()

/** Does a substring selector like `_bubble` land on at least one real class? */
function lands(localName) {
  for (const name of classNames) {
    if (name.endsWith(localName) || name.includes(localName)) return true
  }
  return false
}

/**
 * The local names the skin's stylesheet relies on, and what each one must hit.
 *
 * Only names whose absence would visibly break the skin are listed: a missing
 * hover rule is cosmetic, a missing composer rule is the whole input bay.
 */
const REQUIRED_HITS = [
  ['_composerSeat', 'the composer seat'],
  ['_composerStack', 'the composer stack'],
  ['_sidebarCol', 'the sidebar column'],
  ['_centerCol', 'the centre column'],
  ['_rightbarCol', 'the auxiliary column'],
  ['_frame', 'the app frame'],
  ['_projectRow', 'a workspace row'],
  ['_sessionRow', 'a session row'],
  ['_sectionLabel', 'a section label'],
  ['_triggerLabel', 'a scope trigger label'],
  ['_newSession', 'the new-session control'],
  ['_bubble', 'a message bubble'],
  ['_card', 'a card surface'],
  ['_markdown', 'a markdown body'],
  ['_shiki', 'a highlighted code block'],
  ['_placeholder', 'the composer placeholder'],
  ['_previewBadge', 'the preview badge'],
]

/**
 * The tokens the skin rewrites, checked against the ones DSH actually consumes.
 *
 * A remapped token that nothing reads is dead weight; this is what stops the
 * ladder from quietly drifting away from the product it was written against.
 */
const REQUIRED_TOKENS = [
  '--dsw-specific-bubble',
  '--dsw-specific-input-major',
  '--dsw-specific-sidebar-fill',
  '--dsw-alias-bg-base',
  '--dsw-alias-label-primary',
  '--dsw-alias-border-l1',
  '--dsw-alias-button-primary-fill',
]

test('every selector the skin depends on lands on a real DSH class', (t) => {
  if (classNames === null) {
    t.skip('DSH client packages are not installed under $DSH_HOME/profiles')
    return
  }
  const misses = REQUIRED_HITS.filter(([localName]) => !lands(localName)).map(
    ([localName, what]) => `${localName} (${what})`,
  )
  assert.deepEqual(misses, [], 'these selectors match nothing DSH renders:\n  ' + misses.join('\n  '))
})

test('the remapped tokens are ones DSH actually reads', (t) => {
  if (files === null || files.length === 0) {
    t.skip('DSH client packages are not installed under $DSH_HOME/profiles')
    return
  }
  // Read every var() reference the installed packages make.
  const consumed = new Set()
  for (const file of files) {
    for (const match of readFileSync(file, 'utf8').matchAll(/var\((--dsw-[a-z0-9-]+)/g)) {
      consumed.add(match[1])
    }
  }
  assert.ok(consumed.size > 50, `expected DSH to consume a large token ladder, saw ${consumed.size}`)
  const dead = REQUIRED_TOKENS.filter((name) => !consumed.has(name))
  assert.deepEqual(dead, [], 'these tokens are remapped but nothing reads them:\n  ' + dead.join('\n  '))
})

test('the settings rows live on this plugin own page, not the shared ledger', () => {
  // `settings.general.item` is the one ledger every feature package shares, and
  // the boot animation plugin already holds the same order triple there (26/27/28
  // — see the note in src/client.js). Equal orders tie, a stable sort leaves them
  // in registration order, and the live General page came out as two unrelated
  // plugins alternating row by row: 17 rows, 6 of them ours, interleaved.
  //
  // So the guard is not "the orders differ", it is "we are not in that ledger at
  // all". Comments are stripped first: the registration code explains the history
  // and therefore names the old slot.
  const client = readFileSync(new URL('../src/client.js', import.meta.url), 'utf8')
  const code = client.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')

  assert.equal(
    code.includes('settings.general.item'),
    false,
    'the skin must not inject into the shared General ledger — it has its own section',
  )
  assert.ok(code.includes("name: 'settings.section'"), 'the skin must register a settings page')
  assert.ok(code.includes("children: { 'settings.550c.item'"), 'its page must declare a child slot for its rows')
  for (const id of ['skin-550c', 'skin-550c-atmosphere', 'skin-550c-panel', 'skin-550c-furniture']) {
    assert.ok(code.includes(`id: '${id}'`), `row ${id} must be registered`)
  }
})

test('the skin never depends on a hashed class name', (t) => {
  if (classNames === null) {
    t.skip('DSH client packages are not installed under $DSH_HOME/profiles')
    return
  }
  // A hash is per-build. Matching one would work today and break on the next DSH
  // release — and worse, it breaks on a DIFFERENT BUILD of the same release.
  //
  // THIS CHECK MISSED THE BUG IT EXISTS FOR, twice over:
  //
  //   - it read only `src/skin.css`. The rheostat's drive lives in
  //     `src/dialog.js`, and every selector it uses carried a hash;
  //   - its hash extraction split on `_` from the front, so a class spelled
  //     `_7KE1Ra_triggerEffort` yielded the empty string and contributed no hash
  //     at all. The very shape the skin used was invisible to the check.
  //
  // The desktop app ships a different build from the web profile's node_modules
  // (`wq12jW_triggerEffort` versus `_7KE1Ra_triggerEffort`), which is how a
  // stylesheet and a drive that both passed every test did nothing at all there.
  const hashes = new Set()
  for (const name of classNames) {
    const bare = name.replace(/^_+/, '')
    const hash = bare.split('_')[0]
    if (/^[A-Za-z0-9+-]{4,}$/.test(hash) && /[A-Z0-9]/.test(hash)) hashes.add(hash)
  }

  const offenders = []
  for (const relative of ['../src/skin.css', '../src/dialog.js']) {
    const source = readFileSync(new URL(relative, import.meta.url), 'utf8')
    // Comments talk ABOUT the hashes — several of them exist to explain this very
    // bug — so they are stripped before the selectors are read.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')
    for (const match of code.matchAll(/\[class[*^$]?=\s*['"]([^'"]+)['"]/g)) {
      const needle = match[1].replace(/^\./, '')
      const bare = needle.replace(/^_+/, '')
      for (const hash of hashes) {
        if (bare.startsWith(hash)) offenders.push(relative + ': ' + needle)
      }
    }
  }
  assert.deepEqual(offenders, [], 'hashed class names in selectors:\n  ' + offenders.join('\n  '))
})
