/**
 * Scenario: prove the rheostat REALLY sets the harness's reasoning effort.
 *
 * This is the claim that matters most about the control, and it cannot be
 * checked by looking at the console — the console could paint any label it
 * liked. The app's own state is the only authority.
 *
 * The evidence used is the harness's own effort label on the model trigger. The
 * skin HIDES that element (the rheostat replaces it), but hidden nodes still
 * hold their text, so `textContent` reads the app's real current level while the
 * user never sees it stated twice.
 *
 * The steps are ONE detent at a time with a long settle, deliberately. A version
 * that held the arrow key and read 400ms later reported levels nobody asked for,
 * and the cause could have been either the drive logic or the rapid changes
 * racing each other. Moving one step at a time separates those two questions: if
 * single steps land correctly, the drive is sound and only the coalescing of
 * rapid changes needs to be right.
 */
;(() => {
  const report = { steps: [] }
  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

  /** The app's own effort label — hidden by the skin, still authoritative. */
  const appEffort = () => {
    const node = document.querySelector('[class*="_7KE1Ra_triggerEffort"]')
    if (node === null) return null
    return { text: (node.textContent ?? '').trim(), display: getComputedStyle(node).display, inDom: true }
  }

  const press = (track, key) =>
    track.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))

  function probe(label) {
    report.steps.push({
      at: label,
      consoleShows: document.querySelector('.c-load-now')?.textContent ?? null,
      consolePct: document.querySelector('.c-load-read')?.getAttribute('data-550c-load') ?? null,
      appEffort: appEffort(),
    })
  }

  async function run(track) {
    probe('start')
    // Walk the ladder one detent at a time, top to bottom.
    for (const expected of ['轻载', '重载', '满载']) {
      press(track, 'ArrowRight')
      await sleep(2000)
      probe('one step -> expect ' + expected)
    }
    // And back down to the bottom.
    for (const expected of ['重载', '轻载', '空载']) {
      press(track, 'ArrowLeft')
      await sleep(2000)
      probe('one step -> expect ' + expected)
    }
    document.body.setAttribute('data-real', JSON.stringify(report))
  }

  /** Wait for the console, which mounts when the plugin applies. */
  async function main() {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const track = document.querySelector('.c-load-track')
      const trigger = document.querySelector('.c-load-trigger')
      if (track !== null && trigger !== null) {
        trigger.click()
        await run(track)
        return
      }
      await sleep(150)
    }
    document.body.setAttribute('data-real', JSON.stringify({ present: false }))
  }

  main().catch((error) => {
    report.error = String(error && error.message ? error.message : error)
    document.body.setAttribute('data-real', JSON.stringify(report))
  })
  return 'running'
})()
