/**
 * Scenario: dump what the model dropdown actually contains when opened.
 *
 * The console's drive path polls for an effort option and clicks it. It is not
 * working, and guessing at why is how the last two attempts went wrong — so this
 * opens the dropdown the same way the console does and reports, over several
 * frames, every element that looks like a menu item, its role, its text, and
 * whether it is visible.
 */
;(() => {
  const report = { frames: [] }
  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

  const snapshot = (label) => {
    const nodes = Array.from(document.querySelectorAll('[class*="_7KE1Ra_"], [role="menuitem"], [role="menuitemradio"], [role="listbox"], [role="menu"]'))
    report.frames.push({
      at: label,
      count: nodes.length,
      nodes: nodes.slice(0, 30).map((node) => ({
        tag: node.tagName.toLowerCase(),
        cls: String(node.className).slice(0, 40),
        role: node.getAttribute('role'),
        ariaChecked: node.getAttribute('aria-checked'),
        text: (node.textContent ?? '').trim().slice(0, 20),
        display: getComputedStyle(node).display,
        box: (() => {
          const rect = node.getBoundingClientRect()
          return Math.round(rect.width) + 'x' + Math.round(rect.height)
        })(),
      })),
    })
  }

  async function main() {
    const trigger = document.querySelector('[class*="_7KE1Ra_trigger"]')
    report.triggerFound = trigger !== null
    report.triggerCls = trigger === null ? null : String(trigger.className)
    if (trigger === null) {
      document.body.setAttribute('data-dump', JSON.stringify(report))
      return
    }

    snapshot('before click')
    trigger.click()
    for (const wait of [0, 60, 150, 300, 600]) {
      await sleep(wait)
      snapshot('after +' + wait + 'ms')
    }
    document.body.click()
    document.body.setAttribute('data-dump', JSON.stringify(report))
  }

  main().catch((error) => {
    report.error = String(error && error.message ? error.message : error)
    document.body.setAttribute('data-dump', JSON.stringify(report))
  })
  return 'running'
})()
