/**
 * Scenario: does the fader stand down when the model has no effort setting?
 *
 * `ModelSelect` renders its effort suffix only when the model HAS one
 * (`effortLabel !== void 0 && <span className={triggerEffort}>`), so the suffix's
 * presence is the app's own way of saying whether there is anything to choose.
 * The fader reads availability from exactly that, and this is the check that it
 * does something honest with the answer.
 *
 * Without it the control stayed fully live on such a model and went on painting
 * 空载 / 轻载 / 重载 / 满载 — four levels of a setting that does not exist, and a
 * drag that silently did nothing. That is the same lie as the one where the fader
 * opened on 空载 while the harness sat at `Max`.
 *
 * The condition is reproduced rather than waited for: the live model does offer
 * effort, so the suffix's CLASS is renamed for the duration, which is what the
 * skin matches on. Renaming is used instead of removing the node because React
 * owns that node and removing it would disturb more than the test needs.
 */
;(async () => {
  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

  const state = () => ({
    unavailable: document.querySelector('.c-load')?.hasAttribute('data-550c-unavailable') ?? null,
    ariaDisabled: document.querySelector('.c-load-track')?.getAttribute('aria-disabled') ?? null,
    readout: document.querySelector('.c-load-now')?.textContent ?? null,
    lit: document.querySelectorAll('.c-load-cell[data-lit="1"]').length,
    thumbDisplay: (() => {
      const thumb = document.querySelector('.c-load-thumb')
      return thumb === null ? null : getComputedStyle(thumb).display
    })(),
  })

  const report = {}
  const suffix = document.querySelector('[class*="_triggerEffort"]')
  if (suffix === null) {
    // Nothing to reproduce: this model genuinely has no effort setting, so the
    // fader should ALREADY be unavailable — which is the same assertion.
    report.afterHidingSuffix = state()
    report.checks = {
      'no effort setting: marked unavailable': report.afterHidingSuffix.unavailable === true,
      'no effort setting: says 不适用': report.afterHidingSuffix.readout === '不适用',
      'no effort setting: no lit blocks': report.afterHidingSuffix.lit === 0,
      'no effort setting: aria-disabled': report.afterHidingSuffix.ariaDisabled === 'true',
    }
    report.verdict = Object.values(report.checks).every(Boolean) ? 'PASS' : 'FAIL'
    document.body.setAttribute('data-effortabsent', JSON.stringify(report))
    return 'ok'
  }

  report.available = state()

  const original = suffix.className
  suffix.className = 'probe_noEffortHere'

  // EFFORT_ABSENT_TICKS is 8 samples at 250ms; wait comfortably past it so a
  // single miss cannot be mistaken for an absence.
  await sleep(3200)
  report.afterHidingSuffix = state()

  // And it must be inert: a key press must not paint a detent.
  document
    .querySelector('.c-load-track')
    ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }))
  await sleep(900)
  report.afterKeyPress = state()

  suffix.className = original
  await sleep(1500)
  report.afterRestoring = state()

  report.checks = {
    'available model: fader is live': report.available.unavailable === false && report.available.ariaDisabled === 'false',
    'no effort setting: marked unavailable': report.afterHidingSuffix.unavailable === true,
    'no effort setting: says 不适用': report.afterHidingSuffix.readout === '不适用',
    'no effort setting: no lit blocks': report.afterHidingSuffix.lit === 0,
    'no effort setting: no handle': report.afterHidingSuffix.thumbDisplay === 'none',
    'no effort setting: aria-disabled': report.afterHidingSuffix.ariaDisabled === 'true',
    'no effort setting: a key press does nothing': report.afterKeyPress.readout === '不适用',
    'effort comes back: fader returns': report.afterRestoring.unavailable === false && report.afterRestoring.readout !== '不适用',
  }
  report.verdict = Object.values(report.checks).every(Boolean) ? 'PASS' : 'FAIL'
  document.body.setAttribute('data-effortabsent', JSON.stringify(report))
  return 'ok'
})()
