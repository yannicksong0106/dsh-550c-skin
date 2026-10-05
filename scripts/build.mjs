#!/usr/bin/env node
/**
 * Builds lib/client.js — the single browser module the client loader expects.
 *
 * No bundler and no build dependencies on purpose: the client loader hands the
 * module a `require` that resolves the externals a plugin may use (`react`),
 * and this script concatenates the plugin's own sources into that factory's
 * body — exactly the shape tsdown emits for the published client plugins under
 * $DSH_HOME/profiles/ *\/node_modules.
 *
 * Two things it does beyond concatenation, both of which exist because the
 * failure mode is silent rather than loud:
 *
 *   CSS inlining   src/skin.css is a real .css file (editor support, no
 *                  template-literal escaping rules) and is emitted as a JS
 *                  string constant. Every `<` is escaped to `\u003c`, because a
 *                  browser ends a <script> block at the first `</script`
 *                  wherever it appears — inside a string literal included.
 *   parse check    `new Script(out)` compiles the bundle without running it, so
 *                  a syntax error is a build failure here instead of a client
 *                  module that silently never loads.
 *
 * Order matters: palettes → stylesheet → crt → panel → dialog → client. All plain
 * top-level declarations, so concatenation is a valid module body.
 *
 * Usage: node scripts/build.mjs
 */
import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Script } from 'node:vm'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const PLUGIN_ID = 'dsh-550c-skin'

const read = (file) => readFileSync(resolve(root, file), 'utf8')

const version = JSON.parse(read('package.json')).version
if (typeof version !== 'string' || version === '') throw new Error('build: package.json has no version')

/** A JS string literal that can never terminate the surrounding <script> block. */
const literal = (text) => JSON.stringify(text).replace(/</g, '\\u003c')

const css = read('src/skin.css')

const parts = [
  read('src/palettes.js').trimEnd(),
  `/** src/skin.css, inlined: the style half of the skin. */\nconst SKIN_CSS = ${literal(css)};`,
  read('src/crt.js').trimEnd(),
  read('src/panel.js').trimEnd(),
  read('src/dialog.js').trimEnd(),
  read('src/client.js').trimEnd(),
]

const body = parts.map((part, index) => `//#region part ${index + 1}\n${part}\n//#endregion`).join('\n\n')

const out = `window.__ModuleLoader__.load({
\tid: ${JSON.stringify(PLUGIN_ID)},
\tfactory: (require) => {
\t\tvar module = { exports: {} };
\t\tvar exports = module.exports;
${body
  .split('\n')
  .map((line) => (line.length > 0 ? `\t\t${line}` : line))
  .join('\n')}
\t\treturn module.exports;
\t}
});
`

if (/<\/script/i.test(out)) throw new Error('build: output contains </script and would truncate in the browser')
if (/<!--/.test(out)) throw new Error('build: output contains <!-- and is unsafe in a script block')

try {
  new Script(out)
} catch (error) {
  throw new Error(`build: generated bundle does not parse — ${error.message}`)
}

/**
 * Write the bundle atomically: a temporary file in the same directory, then a
 * rename over the target.
 *
 * A PLAIN `writeFileSync` HERE IS A LIVE HAZARD, not a stylistic preference. The
 * plugin is `link:`-installed, so `lib/client.js` is served straight off this
 * working tree to any running DSH — and the Desktop app's bundle URL is immutable
 * under a per-process `rev`, which means a hard refresh re-reads this exact file
 * at whatever moment the user hits it. A build that truncates the file and then
 * writes it in chunks leaves a window in which a refresh loads HALF A BUNDLE.
 * The symptom is a half-alive skin: some surfaces styled, others missing, and
 * nothing in any log, because the client plugin simply throws while parsing.
 *
 * `rename` within one directory is atomic on both platforms Node targets
 * (MOVEFILE_REPLACE_EXISTING on Windows), so a reader sees either the previous
 * bundle or the new one and never a partial one. The host half already writes its
 * state file this way; the build is the one place that did not.
 */
const target = resolve(root, 'lib/client.js')
const temporary = `${target}.${process.pid}.tmp`
writeFileSync(temporary, out, { encoding: 'utf8', flag: 'wx' })
renameSync(temporary, target)

// Read it back and compare. `rename` guarantees the reader never sees a partial
// file; it does not guarantee the bytes landed, and this script is the only
// thing standing between a source edit and a running app.
if (readFileSync(target, 'utf8') !== out) {
  throw new Error('build: write verification failed — lib/client.js does not match the build output')
}

process.stdout.write(
  `build: wrote lib/client.js (${out.length} chars, ${css.length} of them CSS, v${version})\n`,
)
