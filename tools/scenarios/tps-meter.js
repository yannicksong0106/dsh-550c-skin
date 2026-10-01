/**
 * Scenario: does the throughput meter tell the truth in all three of its states?
 *
 * The header used to derive its own number from DOM growth, and that number
 * disagreed with the session row under the composer by an order of magnitude —
 * which is what was reported, twice. It now has two sources and one rule:
 *
 *   1. while a turn is in flight, show THE APP'S OWN figure, so the header and
 *      `[data-composer-stats]` cannot disagree;
 *   2. at rest, show nothing. The app's figure is a SESSION average: it still
 *      read `243.0 / busy` under a READY header after a turn had FAILED, which
 *      looks exactly like a machine that is still working;
 *   3. when the app's row is absent, fall back to the growth estimate, prefixed
 *      `~` so an estimate never passes for a measurement.
 *
 * The turn marker is INJECTED rather than waited for: `[data-chat-running]` is the
 * app's real attribute (the row that prints `深度求索中，用时 41秒`), and a web
 * profile is not always running a turn. This is the same technique the
 * working-state work used for the same reason.
 *
 * State 3 is not exercised here. Reaching it needs `[data-composer-stats]` gone,
 * and that node belongs to React — detaching it to prove a two-line branch risks
 * a render error that would be a worse problem than the branch is worth.
 */
;(async () => {
  const meter = () => ({
    value: document.querySelector('.c-tps-value')?.textContent ?? null,
    fill: document.querySelector('.c-tps-fill')?.style.width ?? null,
    level: document.querySelector('.c-tps')?.getAttribute('data-550c-level') ?? null,
    source: document.querySelector('.c-tps')?.getAttribute('data-550c-source') ?? null,
    state: document.querySelector('.c-console-state')?.textContent ?? null,
    working: document.querySelector('.c-console-head')?.hasAttribute('data-550c-working') ?? null,
  })

  const appRate = () => {
    const host = document.querySelector('[data-composer-stats]')
    if (host === null) return null
    const button = host.querySelector('button') ?? host
    const label = button.getAttribute('aria-label') ?? button.textContent ?? ''
    const match = label.match(/([\d.]+)\s*tok\/s/)
    return match === null ? null : Number(match[1])
  }

  const resting = meter()
  const reported = appRate()

  const injected = document.createElement('div')
  injected.setAttribute('data-chat-running', '')
  injected.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px'
  document.body.appendChild(injected)
  await new Promise((done) => setTimeout(done, 900))
  const running = meter()

  injected.remove()
  // Long enough for the 1.2s hold that stops the mark flickering between chunks.
  await new Promise((done) => setTimeout(done, 1800))
  const settled = meter()

  const agrees = reported !== null && running.value === reported.toFixed(1)

  document.body.setAttribute(
    'data-tps',
    JSON.stringify({
      appRate: reported,
      resting,
      running,
      settled,
      // The assertions, as booleans, so a reader does not have to compare by eye.
      checks: {
        'at rest: no number, empty rail, idle': resting.value === '--' && resting.fill === '0%' && resting.level === 'idle',
        'at rest: not marked as working': resting.working === false,
        'running: header equals the app figure': agrees,
        'running: marked as working': running.working === true && running.state === 'RUNNING',
        'running: the gauge moves': running.fill !== '0%' && running.level !== 'idle',
        'settled: back to rest': settled.value === '--' && settled.fill === '0%' && settled.working === false,
      },
      verdict: null,
    }),
  )

  const probe = JSON.parse(document.body.getAttribute('data-tps'))
  probe.verdict = Object.values(probe.checks).every(Boolean) ? 'PASS' : 'FAIL'
  document.body.setAttribute('data-tps', JSON.stringify(probe))
  return 'ok'
})()
