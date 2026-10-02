/**
 * Scenario: prove the rheostat really sets the harness's reasoning effort — and
 * that it starts out telling the truth.
 *
 * This is the claim that matters most about the control, and it cannot be checked
 * by looking at the console: the console could paint any label it liked. The
 * app's own state is the only authority.
 *
 * The evidence is the harness's own effort label on the model trigger. The skin
 * HIDES that node (the fader replaces it), but a hidden node still holds its
 * text, so `textContent` reads the app's real level while the user never sees it
 * stated twice.
 *
 * TWO CLAIMS, and the first one was false until recently:
 *
 *   1. the fader STARTS at the level the app is actually at. It used to start at
 *      index 0 and never look, so a page that loaded with the harness at `Max`
 *      still showed 空载 — a control reporting a level the machine is not at,
 *      which reads as a control that does nothing;
 *   2. moving it one detent moves the APP, not just the readout.
 *
 * An earlier version of this file waited for `.c-load-trigger` and clicked it to
 * open a panel. That control no longer exists — the fader is always on screen —
 * so the file sat in its wait loop and reported `present: false` forever. It is
 * driven by the arrow keys now, which is the same path the keyboard user takes.
 */
;(async () => {
  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

  /** The app's own effort label — hidden by the skin, still authoritative. */
  const appLabel = () => (document.querySelector('[class*="_7KE1Ra_triggerEffort"]')?.textContent ?? '').trim()
  const consoleLabel = () => document.querySelector('.c-load-now')?.textContent ?? null

  /** The harness's spelling of each detent, in the order the fader offers them. */
  const LADDER = [
    { console: '空载', app: 'Off' },
    { console: '轻载', app: 'Low' },
    { console: '重载', app: 'High' },
    { console: '满载', app: 'Max' },
  ]
  /** Which detent a label belongs to, or null when it is not one of ours. */
  const detentOf = (label, key) => LADDER.findIndex((step) => step[key] === label)

  const report = { steps: [] }
  const track = document.querySelector('.c-load-track')
  if (track === null) {
    document.body.setAttribute('data-real', JSON.stringify({ present: false }))
    return 'no track'
  }

  const press = (key) => track.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  const probe = async (at) => {
    report.steps.push({ at, console: consoleLabel(), app: appLabel() })
  }

  // Give the reconcile a beat to adopt the app's level before reading it.
  await sleep(1200)
  await probe('start')

  press('ArrowRight')
  await sleep(2600)
  await probe('one right')

  press('ArrowLeft')
  await sleep(2600)
  await probe('back left')

  const start = report.steps[0]
  const moved = report.steps[1]
  const back = report.steps[2]

  report.checks = {
    // 1. at every step, the console states the detent the app is actually at
    'start: readout matches the app': detentOf(start.console, 'console') !== -1 && detentOf(start.console, 'console') === detentOf(start.app, 'app'),
    'right: readout matches the app': detentOf(moved.console, 'console') !== -1 && detentOf(moved.console, 'console') === detentOf(moved.app, 'app'),
    'back: readout matches the app': detentOf(back.console, 'console') !== -1 && detentOf(back.console, 'console') === detentOf(back.app, 'app'),
    // 2. the APP moved, not merely the label we painted
    'right: the app itself changed': moved.app !== start.app,
    'back: the app returned': back.app === start.app,
  }
  report.verdict = Object.values(report.checks).every(Boolean) ? 'PASS' : 'FAIL'
  document.body.setAttribute('data-real', JSON.stringify(report))
  return 'ok'
})()
