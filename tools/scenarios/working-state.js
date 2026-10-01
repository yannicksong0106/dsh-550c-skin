/**
 * Scenario: does the mark enter its loading state when the agent works?
 *
 * The web profile has no API key, so a real run cannot be triggered here. What
 * this proves is the WIRING: that the app's own working markers — the exact
 * selectors read out of the app's source — flip the mark into its loading state
 * and back, and that the loading state is a different animation from the idle
 * one, travelling in reading order.
 *
 * Injecting the marker is honest here because the marker is the app's, not ours:
 * `data-streaming` is on the assistant markdown root and `data-state="running"`
 * on the reasoning row, both confirmed in the shipped client bundle.
 */
;(() => {
  const report = { steps: [] }
  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

  const head = () => document.querySelector('.c-console-head')
  const litCells = () => Array.from(document.querySelectorAll('.c-cell[data-lit="1"]'))

  const sample = (label) => {
    const cells = litCells()
    const style = cells.length === 0 ? null : getComputedStyle(cells[0])
    report.steps.push({
      at: label,
      workingAttr: head()?.hasAttribute('data-550c-working') ?? null,
      state: document.querySelector('.c-console-state')?.textContent ?? null,
      animation: style?.animationName ?? null,
      distinctDelays: new Set(cells.map((cell) => getComputedStyle(cell).animationDelay)).size,
      // The loading sweep must travel in READING order, so its phase must come
      // from `--seq` and not from `--col`.
      phaseFromSeq: cells.length === 0 ? null : getComputedStyle(cells[0]).getPropertyValue('--seq').trim(),
    })
  }

  async function main() {
    sample('idle')

    // The app's own streaming marker.
    const marker = document.createElement('div')
    marker.setAttribute('data-streaming', '')
    marker.style.display = 'none'
    document.body.appendChild(marker)
    await sleep(600)
    sample('while data-streaming is present')

    // And the other marker the app uses, on its own.
    marker.remove()
    const reasoning = document.createElement('div')
    reasoning.setAttribute('data-state', 'running')
    reasoning.style.display = 'none'
    document.body.appendChild(reasoning)
    await sleep(600)
    sample('while data-state="running" is present')

    reasoning.remove()
    await sleep(600)
    sample('after both are removed')

    document.body.setAttribute('data-working', JSON.stringify(report))
  }

  main().catch((error) => {
    report.error = String(error && error.message ? error.message : error)
    document.body.setAttribute('data-working', JSON.stringify(report))
  })
  return 'testing'
})()
