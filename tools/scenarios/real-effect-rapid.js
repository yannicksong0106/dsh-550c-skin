/**
 * Scenario: does the rheostat survive RAPID changes?
 *
 * The single-step path is proven; this is the other one. Holding an arrow key
 * fires a change per step, and an earlier version started a drive per step —
 * three quick steps to `满载` left the harness on `Low`, a level nobody asked
 * for, because the drives fought over the same menus. Drives are now serialised
 * with a single pending target, so the intermediate levels should be skipped and
 * the harness should end on the one you stopped at.
 *
 * Checked against the harness's own effort label, never against the console's
 * own idea of what it set.
 */
;(() => {
  const report = { cases: [] }
  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

  const appLabel = () => (document.querySelector('[class*="_7KE1Ra_triggerEffort"]')?.textContent ?? '').trim()
  const consoleLabel = () => document.querySelector('.c-load-now')?.textContent ?? null

  const press = (track, key) =>
    track.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))

  async function run(track) {
    // Three rapid steps up from the bottom: expect to land on 满载 / Max.
    for (let index = 0; index < 3; index += 1) press(track, 'ArrowRight')
    await sleep(2500)
    report.cases.push({ at: '3x right at once', console: consoleLabel(), app: appLabel(), expect: 'Max' })

    // Four rapid steps back down: expect 空载 / Off.
    for (let index = 0; index < 4; index += 1) press(track, 'ArrowLeft')
    await sleep(2500)
    report.cases.push({ at: '4x left at once', console: consoleLabel(), app: appLabel(), expect: 'Off' })

    // Two rapid steps up: expect 重载 / High.
    for (let index = 0; index < 2; index += 1) press(track, 'ArrowRight')
    await sleep(2500)
    report.cases.push({ at: '2x right at once', console: consoleLabel(), app: appLabel(), expect: 'High' })

    document.body.setAttribute('data-rapid', JSON.stringify(report))
  }

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
    document.body.setAttribute('data-rapid', JSON.stringify({ present: false }))
  }

  main().catch((error) => {
    report.error = String(error && error.message ? error.message : error)
    document.body.setAttribute('data-rapid', JSON.stringify(report))
  })
  return 'running'
})()
