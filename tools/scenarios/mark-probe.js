/**
 * Scenario: report the dialog mark's live state.
 *
 * The mark is a running sequence, so a screenshot is not enough to say whether
 * it is working: a mark frozen on its first cell and one that finished typing
 * look the same in a still. This reports the settled flag, the typed lines, the
 * logo's own rows, and where it sits inside the composer — everything needed to
 * tell "running", "settled" and "stuck" apart.
 */
;(() => {
  const mark = document.querySelector('.c-dialog-mark')
  if (mark === null) {
    document.body.setAttribute('data-mark', JSON.stringify({ present: false }))
    return 'absent'
  }

  const text = (selector) => mark.querySelector(selector)?.textContent ?? null
  const box = (element) => {
    if (element === null) return null
    const rect = element.getBoundingClientRect()
    return { x: Math.round(rect.left), y: Math.round(rect.top), w: Math.round(rect.width), h: Math.round(rect.height) }
  }

  const card = document.querySelector('[data-composer-card]')
  const markBox = box(mark)
  const cardBox = box(card)

  const report = {
    present: true,
    state: mark.getAttribute('data-550c-state'),
    lines: Array.from(mark.querySelectorAll('.c-dialog-line')).map((line) => ({
      text: line.textContent,
      cls: line.className.replace('c-dialog-line', '').trim(),
    })),
    logo: text('.c-dialog-logo'),
    logoRows: (text('.c-dialog-logo') ?? '').split('\n').length,
    // Where it sits relative to the composer card, which is what makes it a mark
    // IN the dialog box rather than one floating near it.
    markBox: markBox,
    cardBox: cardBox,
    insideCard:
      markBox !== null &&
      cardBox !== null &&
      markBox.x >= cardBox.x &&
      markBox.y >= cardBox.y &&
      markBox.x + markBox.w <= cardBox.x + cardBox.w &&
      markBox.y + markBox.h <= cardBox.y + cardBox.h,
    opacity: getComputedStyle(mark).opacity,
    pointerEvents: getComputedStyle(mark).pointerEvents,
    position: getComputedStyle(mark).position,
  }

  document.body.setAttribute('data-mark', JSON.stringify(report))
  return report.state ?? 'running'
})()

