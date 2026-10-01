/**
 * Throwaway: splice the stylesheet's section 10.
 *
 * The corner-mark rules are being replaced wholesale by the dialog-mark rules,
 * and that is a ~250-line contiguous block. Editing it by hand-matching the
 * whole block is error-prone; this reads the sheet, drops the lines between the
 * two section headers, and inserts the replacement from a file — with explicit
 * UTF-8 on both sides, because this file is full of CJK and the box's default
 * PowerShell encoding mangles it.
 *
 * Usage: node tools/splice-css.mjs <from-header> <to-header> <replacement-file>
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const [, , fromHeader, toHeader, replacementFile] = process.argv

if (fromHeader === undefined || toHeader === undefined || replacementFile === undefined) {
  console.error('usage: node tools/splice-css.mjs <from-header> <to-header> <replacement-file>')
  process.exit(2)
}

const sheetPath = resolve(root, 'src/skin.css')
const lines = readFileSync(sheetPath, 'utf8').split('\n')

const from = lines.findIndex((line) => line.includes(fromHeader))
const to = lines.findIndex((line) => line.includes(toHeader))
if (from === -1 || to === -1 || to <= from) {
  console.error(`splice: could not locate the range (from=${from}, to=${to})`)
  process.exit(1)
}

const replacement = readFileSync(resolve(root, replacementFile), 'utf8').replace(/\n$/, '').split('\n')
const next = [...lines.slice(0, from), ...replacement, '', ...lines.slice(to)]
writeFileSync(sheetPath, next.join('\n'), 'utf8')
console.log(`splice: replaced lines ${from + 1}..${to} with ${replacement.length} lines (was ${to - from})`)
