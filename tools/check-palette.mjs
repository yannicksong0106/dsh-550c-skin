/**
 * Throwaway check: does the palette layer actually produce a ladder?
 *
 * The plugin's colour half is a pure function (`tokensFor`), so it can be
 * exercised without a browser — which is exactly what is needed when the live
 * page shows DSH's stock colours and the question is whether the map is empty,
 * the values are malformed, or the write never happens.
 *
 * Usage: node tools/check-palette.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createContext, runInContext } from 'node:vm'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

const source = readFileSync(resolve(root, 'src/palettes.js'), 'utf8')
const context = createContext({})
runInContext(
  source +
    `
    globalThis.__report = SCHEMES.map((scheme) => {
      const ladder = tokensFor(scheme)
      const skin = skinTokensFor(scheme)
      const values = Object.entries(ladder)
      return {
        id: scheme.id,
        ladderKeys: values.length,
        skinKeys: Object.keys(skin).length,
        bgBase: ladder['--dsw-alias-bg-base'],
        infoFill: ladder['--dsw-alias-button-info-fill'],
        labelPrimary: ladder['--dsw-alias-label-primary'],
        // Values that are not strings, or that carry NaN, are the two ways a
        // generated ladder goes wrong silently.
        nonStrings: values.filter(([, value]) => typeof value !== 'string').map(([name]) => name),
        nan: values.filter(([, value]) => String(value).includes('NaN')).map(([name, value]) => name + '=' + value),
        empty: values.filter(([, value]) => String(value) === '').map(([name]) => name),
      }
    })
  `,
  context,
)

console.log(JSON.stringify(context.__report, null, 2))
