/**
 * Scenario: dump the reasoning-effort submenu.
 *
 * The model dropdown turns out to hold two cells, not a flat list: one for the
 * model, and one labelled `推理等级` that opens a submenu. The console's drive
 * path assumed a flat list of options and matched on their text, which is why it
 * silently set nothing. This opens the submenu and reports what is actually in
 * it — labels, roles, and which one the harness considers checked — so the drive
 * can be written against the real structure instead of a guess.
 */
;(() => {
  const report = { frames: [] }
  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

  const dump = (label) => {
    const nodes = Array.from(document.querySelectorAll('[class*="_7KE1Ra_cell"], [role="menuitemradio"], [role="menuitem"], [class*="_7KE1Ra_menu"]'))
    report.frames.push({
      at: label,
      nodes: nodes.map((node) => ({
        tag: node.tagName.toLowerCase(),
        cls: String(node.className).slice(0, 40),
        role: node.getAttribute('role'),
        ariaChecked: node.getAttribute('aria-checked'),
        ariaHasPopup: node.getAttribute('aria-haspopup'),
        expanded: node.getAttribute('aria-expanded'),
        text: (node.textContent ?? '').trim().slice(0, 26),
        box: (() => {
          const rect = node.getBoundingClientRect()
          return Math.round(rect.width) + 'x' + Math.round(rect.height)
        })(),
      })),
    })
  }

  async function main() {
    const trigger = document.querySelector('[class*="_7KE1Ra_trigger"]')
    if (trigger === null) {
      document.body.setAttribute('data-sub', JSON.stringify({ trigger: false }))
      return
    }

    trigger.click()
    await sleep(200)
    dump('model menu open')

    // The effort cell is the one whose text starts with the effort label rather
    // than the model name.
    const cells = Array.from(document.querySelectorAll('[class*="_7KE1Ra_cell"]'))
    const effortCell = cells.find((cell) => /推理|等级|Effort|Reasoning/i.test(cell.textContent ?? ''))
    report.effortCellFound = effortCell !== undefined
    if (effortCell !== undefined) {
      effortCell.click()
      await sleep(200)
      dump('effort submenu open')
      await sleep(300)
      dump('effort submenu settled')
    }

    document.body.click()
    document.body.setAttribute('data-sub', JSON.stringify(report))
  }

  main().catch((error) => {
    report.error = String(error && error.message ? error.message : error)
    document.body.setAttribute('data-sub', JSON.stringify(report))
  })
  return 'running'
})()
