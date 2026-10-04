#!/usr/bin/env node
/**
 * Screenshot + DOM probe driver for the 550C skin, over the DevTools protocol.
 *
 * A plain `--screenshot` run cannot test this skin: the skin's preferences live
 * in localStorage (and in the host-side state file), the first-run gates of a
 * fresh profile sit in front of the whole shell, and the interesting states are
 * "after this exact interaction". So this drives a real browser instead, at an
 * exact moment, with an exact set of preferences seeded first.
 *
 * Uses Node's global WebSocket (Node >= 22) — no dependencies, on purpose: the
 * whole point of this package is that it installs with nothing to build.
 *
 * Usage:
 *   node tools/shoot.mjs --url <url> [options]
 *
 *   --url     the running dsh web URL, token included          (required)
 *   --out     screenshot path             (default .verify/shots/<n>.png)
 *   --pre     JS run BEFORE the measured reload (seed localStorage here)
 *   --post    JS run after the wait, before the screenshot
 *   --wait    ms to wait after the reload (default 3000)
 *   --after   extra ms to wait after --post (default 0)
 *   --width   viewport width              (default 1600)
 *   --height  viewport height             (default 900)
 *   --port    CDP port                    (default 9334)
 *   --probe   also dump the DOM/token report (see PROBE below)
 *   --eval    evaluate an expression after --post and print its value, so a
 *             scenario can report findings without the --probe firehose
 *   --no-shot skip the screenshot (a pure interrogation run)
 *   --full    capture the full scroll height instead of the viewport
 *   --nogates do not try to dismiss the first-run onboarding gates
 *   --keep    leave the browser running (debugging)
 *   --hover   selector to park a real pointer on, so `:hover` styles can be
 *             photographed (no click: a click would change the state)
 *   --fresh   clear the browser profile first, so a rebuilt client bundle is
 *             actually fetched (see the note beside `profileDir`)
 *
 * `--pre` / `--post` carry JavaScript inline, which gets painful for anything
 * longer than one statement; `--prefile` / `--postfile` take the same script
 * from a .js file instead (read as an expression, so an IIFE is the usual
 * shape).
 *
 * PROBE is deliberately generic: it reports the live token ladder, the shell's
 * structural skeleton and every element that carries a data-* attribute, so the
 * skin can be written against what the app actually renders rather than against
 * a guess about it.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

const BROWSERS = [
  `${process.env['ProgramFiles(x86)']}\\Microsoft\\Edge\\Application\\msedge.exe`,
  `${process.env.ProgramFiles}\\Microsoft\\Edge\\Application\\msedge.exe`,
  `${process.env.ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env['ProgramFiles(x86)']}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\Application\\msedge.exe`,
]

/**
 * Parse `--key value` / `--flag` pairs.
 *
 * Advances by one and skips the value it consumed, rather than stepping two at
 * a time: with a fixed stride, any boolean flag followed by a value flag knocks
 * every later pair out of alignment and the run silently keeps its defaults.
 */
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
  console.error('shoot: --url is required (the running dsh web URL, token included)')
  process.exit(2)
}

/** `--prefile` / `--postfile` are the same scripts as `--pre` / `--post`, from disk. */
const scriptText = (inline, file) => {
  if (typeof inline === 'string') return inline
  if (typeof file === 'string') return readFileSync(resolve(root, file), 'utf8')
  return null
}
const preScript = scriptText(args.pre, args.prefile)
const postScript = scriptText(args.post, args.postfile)

const wait = Number(typeof args.wait === 'string' ? args.wait : 3000)
const after = Number(typeof args.after === 'string' ? args.after : 0)
const width = Number(typeof args.width === 'string' ? args.width : 1600)
const height = Number(typeof args.height === 'string' ? args.height : 900)
const port = Number(typeof args.port === 'string' ? args.port : 9334)
const outPath = resolve(root, typeof args.out === 'string' ? args.out : '.verify/shots/shot.png')
const profileDir = resolve(root, '.verify/browser-profile')

/**
 * `--fresh` throws the browser profile away first.
 *
 * NOT A CONVENIENCE — the default is a trap for anyone editing this plugin. The
 * client bundle is served from a URL whose `rev` is a per-process nonce, so a
 * rebuilt `lib/client.js` has the SAME url, and the response is
 * `max-age=31536000, immutable`. This profile persists between runs, so the
 * browser keeps serving the bundle it cached the first time and the edit under
 * test never arrives — which reads exactly like "my CSS change did nothing".
 *
 * `Page.reload({ignoreCache})` does not save you: the bundle is fetched by the
 * client module loader AFTER the document loads, so the reload flag has already
 * been consumed. Restarting the host works too, because that changes the nonce.
 */
if (args.fresh === true) {
  rmSync(profileDir, { recursive: true, force: true })
  console.log('shoot: cleared the browser profile (--fresh)')
}

const browser = BROWSERS.find((candidate) => existsSync(candidate))
if (browser === undefined) {
  console.error('shoot: no Edge/Chrome found')
  process.exit(2)
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms))

/** Minimal CDP client: one socket, id-matched replies, event fan-out. */
function connect(wsUrl) {
  return new Promise((ready, fail) => {
    const socket = new WebSocket(wsUrl)
    const pending = new Map()
    const listeners = new Set()
    let nextId = 0
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      if (message.id !== undefined) {
        const entry = pending.get(message.id)
        if (entry === undefined) return
        pending.delete(message.id)
        if (message.error) entry.reject(new Error(JSON.stringify(message.error)))
        else entry.resolve(message.result)
        return
      }
      for (const listener of listeners) listener(message)
    })
    socket.addEventListener('error', fail)
    socket.addEventListener('open', () =>
      ready({
        send(method, params) {
          const id = ++nextId
          return new Promise((res, rej) => {
            pending.set(id, { resolve: res, reject: rej })
            socket.send(JSON.stringify({ id, method, params: params ?? {} }))
          })
        },
        on(listener) {
          listeners.add(listener)
        },
        close() {
          socket.close()
        },
      }),
    )
  })
}

const PROBE = `(() => {
  const style = getComputedStyle(document.documentElement);
  const bodyStyle = getComputedStyle(document.body);
  const tokens = {};
  // Every custom property the app actually defines, read from BOTH roots: the
  // app puts the token ladder on :root and sometimes re-declares on body.
  const collect = (source, computed) => {
    for (const name of computed) {
      if (!name.startsWith('--')) continue;
      const value = computed.getPropertyValue(name).trim();
      if (value === '') continue;
      if (tokens[name] === undefined) tokens[name] = { value, from: source };
    }
  };
  collect('root', style);
  collect('body', bodyStyle);

  // Structural skeleton: the app's own tree, three levels deep, minus the parts
  // that are per-message noise.
  const label = (el) => {
    const cls = typeof el.className === 'string' && el.className !== '' ? '.' + el.className.trim().split(/\\s+/).join('.') : '';
    const data = Array.from(el.attributes)
      .filter((a) => a.name.startsWith('data-'))
      .map((a) => '[' + a.name + (a.value === '' ? '' : '=' + JSON.stringify(a.value)) + ']')
      .join('');
    const role = el.getAttribute('role') === null ? '' : '[role=' + el.getAttribute('role') + ']';
    return el.tagName.toLowerCase() + cls + data + role;
  };
  const skeleton = (el, depth) => {
    if (el === null || depth > 3) return null;
    const kids = Array.from(el.children).map((child) => skeleton(child, depth + 1)).filter(Boolean);
    return { sel: label(el), kids };
  };
  const tree = skeleton(document.body, 0);

  // Every distinct data-* attribute in the document, with a count and a sample
  // value: this is the only class-name-independent hook a skin can rely on.
  const dataAttrs = {};
  for (const el of document.querySelectorAll('*')) {
    for (const attr of el.attributes) {
      if (!attr.name.startsWith('data-')) continue;
      const entry = dataAttrs[attr.name] ?? (dataAttrs[attr.name] = { count: 0, samples: [] });
      entry.count += 1;
      if (entry.samples.length < 4 && !entry.samples.includes(attr.value)) entry.samples.push(attr.value);
    }
  }

  // Class-name census: every class token, with a count. CSS-module hashes are
  // visible here, which is how a skin decides whether a substring match is safe.
  const classes = {};
  for (const el of document.querySelectorAll('*')) {
    const raw = typeof el.className === 'string' ? el.className : '';
    for (const name of raw.split(/\\s+/)) {
      if (name === '') continue;
      classes[name] = (classes[name] ?? 0) + 1;
    }
  }

  return {
    url: location.href,
    dark: document.body.hasAttribute('data-ds-dark-theme'),
    colorScheme: document.documentElement.style.colorScheme,
    rootAttrs: Object.fromEntries(Array.from(document.documentElement.attributes).map((a) => [a.name, a.value])),
    bodyAttrs: Object.fromEntries(Array.from(document.body.attributes).map((a) => [a.name, a.value])),
    tokens,
    tree,
    dataAttrs,
    classes,
    counts: {
      elements: document.querySelectorAll('*').length,
      styleSheets: document.styleSheets.length,
      injected: document.querySelectorAll('style[id]').length,
    },
  };
})()`

function printTree(node, indent = '') {
  if (node === null) return
  console.log(indent + node.sel)
  for (const kid of node.kids) printTree(kid, indent + '  ')
}

async function main() {
  mkdirSync(profileDir, { recursive: true })
  const child = spawn(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-features=Translate,MediaRouter',
      '--hide-scrollbars',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profileDir}`,
      `--window-size=${width},${height}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  )
  const cleanup = () => {
    try {
      child.kill()
    } catch (error) {
      /* already gone */
    }
  }

  try {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      try {
        await fetch(`http://127.0.0.1:${port}/json/version`)
        break
      } catch (error) {
        await sleep(250)
      }
    }
    const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json())
    const cdp = await connect(target.webSocketDebuggerUrl)

    const logs = []
    cdp.on((message) => {
      if (message.method === 'Runtime.consoleAPICalled') {
        logs.push(`[${message.params.type}] ` + message.params.args.map((a) => a.value ?? a.description ?? a.type).join(' '))
      }
      if (message.method === 'Log.entryAdded') logs.push(`[log:${message.params.entry.level}] ${message.params.entry.text}`)
      // An exception thrown inside a plugin's event listener is exactly the kind
      // of failure that leaves no other trace: no console line, just a control
      // that silently stops responding to events.
      if (message.method === 'Runtime.exceptionThrown') {
        const details = message.params.exceptionDetails
        logs.push(`[exception] ${details.exception?.description ?? details.text}`)
      }
    })

    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')
    await cdp.send('Log.enable')
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    })

    // Emulated before the first navigation, so the app boots resolving the
    // `system` theme preference to this scheme: the headless default is light,
    // and a skin that only exists in dark has to be able to ask for dark.
    if (typeof args.media === 'string') {
      await cdp.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-color-scheme', value: args.media }],
      })
    }

    const evaluate = async (expression) => {
      const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
      if (result.exceptionDetails !== undefined) {
        throw new Error('page threw: ' + JSON.stringify(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text))
      }
      return result.result?.value
    }

    /**
     * Move the pointer onto an element and leave it there.
     *
     * `:hover` follows the real pointer position, so a synthesised `mouseover`
     * does nothing and there is no way to photograph a hover style without moving
     * the pointer. Deliberately no press, unlike `realClick`: clicking a sidebar
     * row CHANGES the selection, so the row would no longer be in the state under
     * test.
     *
     * The move is dispatched twice, at the element's centre and a few pixels away
     * first, because a `mouseMoved` to the position the pointer already occupies
     * produces no new hit test in Chromium and `:hover` would never apply.
     *
     * @param selector - CSS selector for the element to hover.
     */
    const realMove = async (selector) => {
      const point = await evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (el === null) return null;
        el.scrollIntoView({ block: 'center' });
        const rect = el.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`)
      if (point === null) {
        console.log(`hover: nothing matches ${selector}`)
        return false
      }
      const x = Math.round(point.x)
      const y = Math.round(point.y)
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x - 3, y: y - 3, button: 'none', buttons: 0 })
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0 })
      return true
    }

    /**
     * Click a real mouse, through the browser's own input pipeline.
     *
     * `element.click()` and hand-dispatched PointerEvents are both untrusted, and
     * an untrusted event is one the page is free to ignore — which is exactly how
     * a probe ends up reporting "the sidebar is broken" for the skinned AND the
     * unskinned app. `Input.dispatchMouseEvent` goes in at the same place a
     * physical mouse does, so the app cannot tell the difference.
     *
     * @param selector - CSS selector for the element to click.
     */
    const realClick = async (selector) => {
      const point = await evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (el === null) return null;
        el.scrollIntoView({ block: 'center' });
        const rect = el.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`)
      if (point === null) {
        console.log(`realclick: nothing matches ${selector}`)
        return false
      }
      const at = { x: Math.round(point.x), y: Math.round(point.y), button: 'left', clickCount: 1 }
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...at, buttons: 0 })
      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...at, buttons: 1 })
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...at, buttons: 0 })
      return true
    }

    /**
     * Type into whatever is focused, through the browser's own input pipeline.
     *
     * Used to reproduce the reported bug faithfully: typing in the composer is
     * what made the throughput meter move, and a synthetic `value` assignment
     * would not have produced the same input events the app reacts to.
     *
     * @param selector - CSS selector for the field to focus first.
     * @param text - the text to insert.
     */
    const typeInto = async (selector, text) => {
      const focused = await evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (el === null) return false;
        el.focus();
        return document.activeElement === el || el.contains(document.activeElement);
      })()`)
      if (focused !== true) {
        console.log(`type: could not focus ${selector}`)
        return false
      }
      await cdp.send('Input.insertText', { text })
      return true
    }

    // A fresh browser-profile chains onboarding gates (beta notice → API key …),
    // each painting in front of the whole shell, so the skin cannot be seen —
    // and the plugin's own settings row does not exist — until they are gone.
    const dismissGates = async () => {
      let clicked = 0
      for (let round = 0; round < 10; round += 1) {
        const result = await evaluate(`(() => {
          const labels = ['继续', '稍后配置', '跳过', '我知道了', '知道了', '开始使用', 'Skip', 'Later', 'Continue', 'Got it', 'OK'];
          const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
          const gate = buttons.find((b) => labels.includes((b.textContent || '').trim()));
          if (gate === undefined) return 'none';
          const label = (gate.textContent || '').trim();
          gate.click();
          return label;
        })()`)
        if (result === 'none') break
        clicked += 1
        await sleep(600)
      }
      return clicked
    }

    // 1. Land on the origin so localStorage is addressable at all.
    await cdp.send('Page.navigate', { url: args.url })
    await sleep(1800)

    if (args.nogates !== true) await dismissGates()

    // 2. Seed whatever the scenario needs, then measure from a clean reload.
    if (preScript !== null) await evaluate(preScript)
    await cdp.send('Page.reload', { ignoreCache: true })
    await sleep(1200)
    if (args.nogates !== true) await dismissGates()
    await sleep(wait)

    if (postScript !== null) {
      await evaluate(postScript)
      if (after > 0) await sleep(after)
    }

    // A trusted click, after the scenario has captured its "before" state.
    if (typeof args.realclick === 'string') {
      await realClick(args.realclick)
      if (after > 0) await sleep(after)
    }

    // A trusted HOVER: the pointer is moved onto the element and left there.
    //
    // `:hover` is driven by the real pointer position, so a synthesised
    // `mouseover` event does nothing — there is no way to photograph a hover
    // style without moving the pointer. Deliberately no press, unlike realClick,
    // because clicking a sidebar row CHANGES the selection and the row would no
    // longer be in the state under test.
    if (typeof args.hover === 'string') {
      await realMove(args.hover)
      if (after > 0) await sleep(after)
    }

    // Real typing, also after the "before" state has been captured.
    if (typeof args.type === 'string') {
      const target = typeof args['type-into'] === 'string' ? args['type-into'] : '[data-composer-input]'
      await typeInto(target, args.type)
      if (after > 0) await sleep(after)
    }

    // A scenario that only reports has no reason to pay for a full-page raster.
    if (args['no-shot'] !== true) {
      const shot = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: args.full === true,
      })
      mkdirSync(dirname(outPath), { recursive: true })
      writeFileSync(outPath, Buffer.from(shot.data, 'base64'))
    }

    let evaled = null
    // `--evalfile` exists because passing a selector-bearing expression through a
    // shell is a losing game: PowerShell 5.1 strips embedded double quotes when
    // handing an argument to a native command, so `querySelector("[class*=x]")`
    // arrives as a bare array literal and the page throws a syntax error that
    // looks like a page bug. Reading the expression from a file removes the shell
    // from the equation entirely.
    const evalExpression =
      typeof args.evalfile === 'string' ? readFileSync(resolve(root, args.evalfile), 'utf8') : args.eval
    if (typeof evalExpression === 'string') {
      evaled = await evaluate(evalExpression)
      console.log('--- eval ---')
      console.log(typeof evaled === 'string' ? evaled : JSON.stringify(evaled, null, 2))
    }

    let probe = null
    if (args.probe === true) {
      probe = await evaluate(PROBE)
      printTree(probe.tree)
      console.log('\n--- root attributes ---')
      console.log(JSON.stringify(probe.rootAttrs))
      console.log('--- body attributes ---')
      console.log(JSON.stringify(probe.bodyAttrs))
      console.log(`--- tokens (${Object.keys(probe.tokens).length}) ---`)
      for (const [name, entry] of Object.entries(probe.tokens)) console.log(`${name} = ${entry.value}   <${entry.from}>`)
      console.log(`--- data-* attributes (${Object.keys(probe.dataAttrs).length}) ---`)
      for (const [name, entry] of Object.entries(probe.dataAttrs)) {
        console.log(`${name}  x${entry.count}   ${JSON.stringify(entry.samples)}`)
      }
      console.log(`--- classes (${Object.keys(probe.classes).length}) ---`)
      const sorted = Object.entries(probe.classes).sort((a, b) => b[1] - a[1])
      for (const [name, count] of sorted) console.log(`${name}  x${count}`)
      console.log('--- counts ---')
      console.log(JSON.stringify(probe.counts))
    }

    console.log(
      JSON.stringify(
        { screenshot: args['no-shot'] === true ? null : outPath, wait, logs: logs.slice(-40), probe: probe === null ? null : { ...probe, tree: undefined, classes: undefined, tokens: undefined, dataAttrs: undefined } },
        null,
        2,
      ),
    )
    if (args.keep !== true) cdp.close()
  } finally {
    if (args.keep !== true) cleanup()
  }
}

main().catch((error) => {
  console.error('shoot failed:', error)
  process.exit(1)
})
