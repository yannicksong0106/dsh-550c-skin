/**
 * Scenario: open a WORKSPACE and then a SESSION, reporting as it goes.
 *
 * Everything the skin has been checked against so far is the empty hero state.
 * The transcript — message rows, markdown, code blocks, tool cards — is the
 * surface the skin is actually for, and it only exists once a session is open,
 * so getting there has to be scripted.
 *
 * The first attempt at this clicked the label's text node, which does not toggle
 * a workspace: the handler is on the row. This version walks up to the nearest
 * row ancestor, reports every candidate it saw, and retries with a real pointer
 * sequence when a plain `.click()` changes nothing — so a failure produces a
 * diagnosis instead of a screenshot of an unchanged page.
 */
;(() => {
  const report = { steps: [], candidates: [] }
  const q = (selector) => Array.from(document.querySelectorAll(selector))

  const projectRows = q('[class*="_projectRow"]')
  report.candidates = projectRows.map((row) => ({
    text: (row.textContent || '').trim().slice(0, 30),
    cls: String(row.className).slice(0, 60),
    expanded: row.getAttribute('aria-expanded'),
    tag: row.tagName.toLowerCase(),
  }))

  /** A click that also works on components listening for pointer events. */
  const press = (element) => {
    const rect = element.getBoundingClientRect()
    const init = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: rect.left + Math.min(20, rect.width / 2),
      clientY: rect.top + rect.height / 2,
    }
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
      element.dispatchEvent(new MouseEvent(type, init))
    }
  }

  const target = projectRows.find((row) => (row.textContent || '').trim().length > 0)
  if (target === undefined) {
    report.steps.push('no project row found')
    document.body.setAttribute('data-open-session', JSON.stringify(report))
    return 'no project row'
  }

  const label = (target.textContent || '').trim().slice(0, 20)
  target.click()
  report.steps.push('clicked row: ' + label)

  window.setTimeout(() => {
    report.sessionRowsAfterRowClick = q('[class*="_sessionRow"]').length
    if (report.sessionRowsAfterRowClick === 0) {
      press(target)
      report.steps.push('retried with pointer sequence')
    }
    window.setTimeout(() => {
      const rows = q('[class*="_sessionRow"]')
      report.sessionRows = rows.length
      if (rows.length > 0) {
        rows[rows.length - 1].click()
        report.steps.push('opened a session')
      }
      window.setTimeout(() => {
        const scroll = document.querySelector('[data-conversation-scroll]')
        report.transcriptChildren = scroll === null ? null : scroll.children.length
        report.phase = document.querySelector('[data-phase]')?.getAttribute('data-phase') ?? null
        report.hasMarkdown = q('[class*="_markdown"]').length
        report.hasCodeBlock = q('[class*="_shiki"], pre').length
        report.hasToolCard = q('[class*="_toolCard"], [data-state]').length
        document.body.setAttribute('data-open-session', JSON.stringify(report))
      }, 2400)
    }, 1400)
  }, 1400)

  return report.steps.join(', ')
})()
