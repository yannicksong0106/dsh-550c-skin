/**
 * Scenario: does typing in the composer make the meter move?
 *
 * This is a regression check for a real reported bug: with text only typed and
 * nothing sent, the throughput bar fluctuated and the mark began loading. The
 * cause was that the meter measured `[data-conversation-scroll]`, which CONTAINS
 * the composer — so every keystroke read as output.
 *
 * The check is deliberately end-to-end: it records the meter and the mark's state
 * before, then real typing happens (driven by `--type` through the browser's own
 * input pipeline), then it records again. Nothing sent, so nothing should move.
 *
 * @see tools/scenarios/tps-container.js for the containment evidence.
 */
;(() => {
  window.__typing = {
    before: null,
    after: null,
  }

  const sample = () => ({
    tps: document.querySelector('.c-tps-value')?.textContent ?? null,
    fill: document.querySelector('.c-tps-fill')?.style.width ?? null,
    level: document.querySelector('.c-tps')?.getAttribute('data-550c-level') ?? null,
    working: document.querySelector('.c-console-head')?.hasAttribute('data-550c-working') ?? null,
    state: document.querySelector('.c-console-state')?.textContent ?? null,
    markAnimation: (() => {
      const cell = document.querySelector('.c-cell[data-lit="1"]')
      return cell === null ? null : getComputedStyle(cell).animationName
    })(),
    // What the meter is reading, so a wrong container is visible as a number.
    measuredChars: (document.querySelector('[data-chat-flow]')?.textContent ?? '').length,
    composerChars: (document.querySelector('[data-composer-input]')?.textContent ?? '').length,
  })

  window.__typing.before = sample()
  // The `after` sample is taken by the eval, which runs after `--type`.
  window.__typingSample = sample
  return 'armed'
})()
