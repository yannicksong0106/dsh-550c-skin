#!/usr/bin/env node
/**
 * The layout contract, measured on a running DSH.
 *
 * The static check in test/layout-contract.test.mjs catches the obvious way to
 * break the contract — a layout property written into the stylesheet. This
 * catches everything else: cascade interactions, browser box-model behaviour,
 * and anything a future DSH build does differently. It measures the shell with
 * the skin off and with the skin on, and fails if a single landmark moved.
 *
 * The skin's preferences live in the host's state file, so the script flips it
 * between runs and restores whatever it found.
 *
 * Usage:
 *   node tools/check-geometry.mjs --url <dsh web url with token>
 *   node tools/check-geometry.mjs --url <url> --scheme amber
 *
 * Options:
 *   --url      the running dsh web URL, token included   (required)
 *   --scheme   which scheme to test the skin in          (default amber)
 *   --media    prefers-color-scheme to emulate           (default dark)
 *   --keep     leave the temporary state files behind
 */
import { spawn } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i]
    if (!key.startsWith('--')) continue
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) {
      out[key.slice(2)] = true
      continue
    }
    out[key.slice(2)] = next
    i += 1
  }
  return out
}

const args = parseArgs(process.argv.slice(2))
if (typeof args.url !== 'string') {
  console.error('geometry: --url is required (a running `dsh web` URL, token included)')
  process.exit(2)
}

const scheme = typeof args.scheme === 'string' ? args.scheme : 'amber'
const media = typeof args.media === 'string' ? args.media : 'dark'
const statePath = join(process.env.DSH_HOME || join(homedir(), '.dsh'), '550c-skin-state.json')
const previousState = existsSync(statePath) ? readFileSync(statePath, 'utf8') : null

/** Run the shoot tool and pull the JSON the rects scenario wrote onto <body>. */
function measure(label, state) {
  writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n', 'utf8')
  const result = spawn(
    process.execPath,
    [
      resolve(root, 'tools/shoot.mjs'),
      '--url', args.url,
      '--no-shot',
      '--media', media,
      '--pre', "localStorage.setItem('dsh-550c-boot:mode','off')",
      '--postfile', 'tools/scenarios/rects.js',
      '--wait', '4200',
      '--after', '400',
      '--eval', "document.body.getAttribute('data-rects')",
    ],
    { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  let stdout = ''
  let stderr = ''
  result.stdout.on('data', (chunk) => (stdout += chunk))
  result.stderr.on('data', (chunk) => (stderr += chunk))
  return new Promise((done, fail) => {
    result.on('close', () => {
      const line = stdout.split(/\r?\n/).find((candidate) => candidate.trim().startsWith('{"root"'))
      if (line === undefined) {
        fail(new Error(`${label}: could not read geometry.\n${stderr || stdout}`))
        return
      }
      try {
        done(JSON.parse(line.trim()))
      } catch (error) {
        fail(new Error(`${label}: geometry was not JSON: ${line.slice(0, 200)}`))
      }
    })
  })
}

function compare(stock, skinned) {
  const keys = Object.keys(stock).filter((key) => !key.startsWith('__'))
  const moved = []
  for (const key of keys) {
    const a = JSON.stringify(stock[key])
    const b = JSON.stringify(skinned[key])
    if (a !== b) moved.push(`  ${key}\n    off: ${a}\n    on : ${b}`)
  }
  return { keys, moved }
}

async function main() {
  const stock = await measure('skin off', { scheme: 'off' })
  const skinned = await measure(`skin on (${scheme})`, { scheme, atmosphere: 'full', mono: 'on' })
  const proportional = await measure(`skin on (${scheme}, no monospace)`, {
    scheme,
    atmosphere: 'full',
    mono: 'off',
  })

  console.log(`landmarks measured: ${Object.keys(stock).filter((key) => !key.startsWith('__')).length}`)
  console.log(`body metrics, skin off: ${JSON.stringify(stock.__body)}`)

  let failed = false

  const mono = compare(stock, skinned)
  if (mono.moved.length === 0) {
    console.log(`PASS  skin on (monospace): identical across ${mono.keys.length} landmarks`)
  } else {
    failed = true
    console.log(`FAIL  skin on (monospace): ${mono.moved.length} landmarks moved`)
    console.log(mono.moved.join('\n'))
  }

  const prop = compare(stock, proportional)
  if (prop.moved.length === 0) {
    console.log(`PASS  skin on (proportional font): identical across ${prop.keys.length} landmarks`)
  } else {
    failed = true
    console.log(`FAIL  skin on (proportional font): ${prop.moved.length} landmarks moved`)
    console.log(prop.moved.join('\n'))
  }

  if (previousState !== null) writeFileSync(statePath, previousState, 'utf8')
  else writeFileSync(statePath, JSON.stringify({ scheme: 'off' }, null, 2) + '\n', 'utf8')
  if (args.keep !== true) {
    /* the state file is restored either way; --keep only documents intent */
  }

  process.exit(failed ? 1 : 0)
}

main().catch((error) => {
  if (previousState !== null) writeFileSync(statePath, previousState, 'utf8')
  console.error('geometry failed:', error.message)
  process.exit(1)
})
