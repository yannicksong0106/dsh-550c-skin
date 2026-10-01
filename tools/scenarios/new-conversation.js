/**
 * Scenario: start a new conversation inside a workspace, the way a user does.
 *
 * The first probe looked for a workspace switch in the wrong place — clicking a
 * workspace row expands the tree, it does not change the active workspace — so
 * "nothing happened" was really "I measured the wrong thing". This walks the
 * actual flow: expand a workspace, then use the new-conversation control inside
 * it, and reports what the app does at each step.
 */
;(() => {
  const report = { steps: [] }
  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

  const state = () => ({
    expanded: Array.from(document.querySelectorAll('[class*="_projectRow"]'))
      .filter((row) => row.getAttribute('aria-expanded') === 'true')
      .map((row) => row.textContent.trim().slice(0, 14)),
    sessions: document.querySelectorAll('[class*="_sessionRow"]').length,
    sessionNames: Array.from(document.querySelectorAll('[class*="_sessionRow"]'))
      .map((row) => row.textContent.trim().slice(0, 14))
      .slice(0, 6),
    activeSession: Array.from(document.querySelectorAll('[class*="_sessionRow"]'))
      .filter((row) => row.getAttribute('aria-selected') === 'true')
      .map((row) => row.textContent.trim().slice(0, 14)),
    wsLabel: (document.querySelector('[class*="_workspaceLabel"]') || {}).textContent ?? null,
  })

  /** Click with the full mouse sequence — `element.click()` alone misses handlers
   *  that act on press. */
  const realClick = (node) => {
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

  const leaves = () => Array.from(document.querySelectorAll('*')).filter((el) => el.children.length === 0)

  async function main() {
    report.before = state()

    // 1. Expand a workspace that is not the active one, so its sessions show.
    const rows = Array.from(document.querySelectorAll('[class*="_projectRow"]'))
    const collapsed = rows.find((row) => row.getAttribute('aria-expanded') === 'false')
    if (collapsed !== undefined) {
      report.step1 = 'expand ' + collapsed.textContent.trim().slice(0, 14)
      realClick(collapsed.querySelector('[class*="_title"]') ?? collapsed)
      await sleep(900)
      report.afterExpand = state()
    }

    // 2. Find the new-conversation control that is NOT the rail's own top-level
    //    one — i.e. the one belonging to a workspace.
    const all = leaves().filter((el) => (el.textContent ?? '').trim() === '新会话')
    report.newSessionControls = all.length
    const targets = all.map((leaf) => leaf.closest('button, [role="button"], a, li') ?? leaf)
    report.targetClasses = targets.map((node) => node.tagName.toLowerCase() + '.' + String(node.className).slice(0, 34))

    // Prefer the one inside the tree, which is the workspace's own control.
    const insideTree = targets.find((node) => node.closest('[class*="_projectRow"]') !== null || node.getAttribute('role') === 'treeitem')
    const target = insideTree ?? targets[0]
    if (target !== undefined) {
      report.step2 = 'click ' + target.tagName.toLowerCase() + '.' + String(target.className).slice(0, 30)
      const before = state()
      realClick(target)
      await sleep(1400)
      report.afterNewSession = state()
      report.sessionCountChanged = report.afterNewSession.sessions !== before.sessions
      report.sessionNamesChanged = JSON.stringify(report.afterNewSession.sessionNames) !== JSON.stringify(before.sessionNames)
    }

    document.body.setAttribute('data-newchat', JSON.stringify(report))
  }

  main().catch((error) => {
    report.error = String(error && error.message ? error.message : error)
    document.body.setAttribute('data-newchat', JSON.stringify(report))
  })
  return 'driving'
})()
