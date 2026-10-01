/**
 * Scenario: does the workspace switcher above the composer open?
 *
 * "Switch workspace" most likely means this control — the workspace button above
 * the input, which shows the current workspace and opens a picker. It sits in the
 * composer's own seat, which is the area this skin restructures, so it is the one
 * place where the skin could plausibly be responsible.
 *
 * This clicks it with a trusted mouse and reports whether a picker appears and
 * what is in it.
 */
;(() => {
  const report = {}
  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

  const button = document.querySelector('[class*="_workspace"]')
  report.found = button !== null
  report.button = button === null ? null : {
    tag: button.tagName.toLowerCase(),
    cls: String(button.className).slice(0, 40),
    text: (button.textContent ?? '').trim().slice(0, 20),
    expanded: button.getAttribute('aria-expanded'),
    popup: button.getAttribute('aria-haspopup'),
  }

  // Everything on screen that looks like a picker, before and after.
  const popups = () =>
    Array.from(document.querySelectorAll('[role="menu"], [role="listbox"], [role="dialog"], [class*="_popover"], [class*="_picker"], [class*="_dropdown"]'))
      .filter((node) => {
        const rect = node.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
      })
      .map((node) => ({
        role: node.getAttribute('role'),
        cls: String(node.className).slice(0, 40),
        text: (node.textContent ?? '').trim().slice(0, 60),
      }))

  async function main() {
    report.popupsBefore = popups()
    if (button !== null) {
      const rect = button.getBoundingClientRect()
      report.buttonBox = { x: Math.round(rect.left), y: Math.round(rect.top), w: Math.round(rect.width), h: Math.round(rect.height) }
      const base = {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        button: 0,
        pointerId: 1,
        isPrimary: true,
        pointerType: 'mouse',
      }
      button.dispatchEvent(new PointerEvent('pointerdown', { ...base, buttons: 1 }))
      button.dispatchEvent(new MouseEvent('mousedown', { ...base, buttons: 1 }))
      button.dispatchEvent(new PointerEvent('pointerup', { ...base, buttons: 0 }))
      button.dispatchEvent(new MouseEvent('mouseup', { ...base, buttons: 0 }))
      button.dispatchEvent(new MouseEvent('click', { ...base, buttons: 0 }))
      await sleep(900)
    }
    report.popupsAfter = popups()
    report.opened = report.popupsAfter.length > report.popupsBefore.length
    document.body.setAttribute('data-ws-switch', JSON.stringify(report))
  }

  main().catch((error) => {
    report.error = String(error && error.message ? error.message : error)
    document.body.setAttribute('data-ws-switch', JSON.stringify(report))
  })
  return 'clicking'
})()
