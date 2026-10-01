/**
 * Scenario: switch workspace by picking one from the switcher menu.
 *
 * Opening the picker works; this is the step that actually switches — choosing a
 * different workspace from the menu it opens. The result is read from the app's
 * own label above the composer, which is the one thing that must change.
 */
;(() => {
  const report = { steps: [] }
  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

  const wsLabel = () => (document.querySelector('[class*="_workspaceLabel"]') || {}).textContent ?? null

  const press = (node) => {
    const rect = node.getBoundingClientRect()
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
    node.dispatchEvent(new PointerEvent('pointerdown', { ...base, buttons: 1 }))
    node.dispatchEvent(new MouseEvent('mousedown', { ...base, buttons: 1 }))
    node.dispatchEvent(new PointerEvent('pointerup', { ...base, buttons: 0 }))
    node.dispatchEvent(new MouseEvent('mouseup', { ...base, buttons: 0 }))
    node.dispatchEvent(new MouseEvent('click', { ...base, buttons: 0 }))
  }

  async function main() {
    report.before = wsLabel()

    const button = document.querySelector('[class*="_workspace"]')
    if (button === null) {
      report.error = 'no workspace button'
      document.body.setAttribute('data-pick', JSON.stringify(report))
      return
    }
    press(button)
    await sleep(800)

    // The menu items, by their own text.
    const items = Array.from(
      document.querySelectorAll('[role="menu"] [role="menuitem"], [role="menu"] [role="option"], [role="menu"] button, [role="menu"] li'),
    )
    report.menuItems = items.map((node) => (node.textContent ?? '').trim().slice(0, 16))

    const current = report.before
    const other = items.find((node) => {
      const text = (node.textContent ?? '').trim()
      return text !== '' && text !== current && !/添加/.test(text)
    })
    if (other === undefined) {
      report.error = 'no other workspace in the menu'
      document.body.setAttribute('data-pick', JSON.stringify(report))
      return
    }

    report.picked = (other.textContent ?? '').trim().slice(0, 16)
    press(other)
    await sleep(1500)
    report.after = wsLabel()
    report.switched = report.after !== report.before
    document.body.setAttribute('data-pick', JSON.stringify(report))
  }

  main().catch((error) => {
    report.error = String(error && error.message ? error.message : error)
    document.body.setAttribute('data-pick', JSON.stringify(report))
  })
  return 'picking'
})()
