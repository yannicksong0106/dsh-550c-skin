/**
 * Scenario: open the compute-load rheostat and drag it.
 *
 * The panel is the point of the control — a load reading above a fader — and it
 * only exists while open, so it has to be driven rather than photographed at
 * rest. This opens it, walks the detents, and reports the reading, the fill and
 * the level attribute at each stop, which is what the colour ladder keys off.
 */
;(() => {
  const trigger = document.querySelector('.c-load-trigger')
  const track = document.querySelector('.c-load-track')
  if (trigger === null || track === null) {
    document.body.setAttribute('data-rheostat', JSON.stringify({ present: false }))
    return 'no rheostat'
  }

  const report = { present: true, steps: [] }
  trigger.click()

  const panel = document.querySelector('.c-load-panel')
  report.opened = panel !== null && panel.hidden === false

  const read = () => ({
    level: panel.getAttribute('data-550c-level'),
    read: document.querySelector('.c-load-read')?.textContent ?? null,
    loadPct: document.querySelector('.c-load-read')?.getAttribute('data-550c-load') ?? null,
    now: document.querySelector('.c-load-now')?.textContent ?? null,
    fill: document.querySelector('.c-load-fill')?.style.width ?? null,
    thumb: document.querySelector('.c-load-thumb')?.style.left ?? null,
    active: document.querySelector('.c-load-tick.is-on')?.textContent ?? null,
    readColor: getComputedStyle(document.querySelector('.c-load-read')).color,
    panelBorder: getComputedStyle(panel).borderColor,
  })

  report.steps.push({ at: 'opened', ...read() })

  // Walk the detents with the keyboard: deterministic, and it exercises the same
  // select() path the pointer does.
  const rect = track.getBoundingClientRect()
  const press = (key) => {
    track.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  }

  window.setTimeout(() => {
    press('ArrowRight')
    report.steps.push({ at: 'right x1', ...read() })
    window.setTimeout(() => {
      press('ArrowRight')
      report.steps.push({ at: 'right x2', ...read() })
      window.setTimeout(() => {
        press('ArrowRight')
        report.steps.push({ at: 'right x3 (max)', ...read() })
        window.setTimeout(() => {
          press('ArrowLeft')
          report.steps.push({ at: 'left x1', ...read() })
          report.trackBox = { x: Math.round(rect.left), w: Math.round(rect.width) }
          document.body.setAttribute('data-rheostat', JSON.stringify(report))
        }, 200)
      }, 200)
    }, 200)
  }, 200)

  return 'opened'
})()
