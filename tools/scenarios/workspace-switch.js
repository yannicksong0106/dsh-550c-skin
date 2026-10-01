/**
 * Scenario: does switching workspace actually switch, with the skin on and off?
 *
 * The decisive question is not "does the click land" but "does the app's own
 * selection move". Selection lives in the sidebar as `folderActive` on a
 * workspace's slot, so this reads that marker before and after clicking a
 * different workspace, and counts the conversation rows before and after using
 * the new-conversation control.
 *
 * Run both ways — skin off and skin on — the pair of results says whether the
 * skin is responsible, which is the only thing that decides where to look.
 */
;(() => {
  const report = { steps: [] }
  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

  /** Which workspace the app considers active, and how many conversations exist. */
  const state = () => {
    const rows = Array.from(document.querySelectorAll('[class*="_projectRow"]'))
    const active = rows.filter((row) => row.querySelector('[class*="folderActive"]') !== null)
    return {
      activeWorkspace: active.map((row) => (row.textContent ?? '').trim().slice(0, 20)),
      workspaces: rows.map((row) => (row.textContent ?? '').trim().slice(0, 20)),
      sessions: document.querySelectorAll('[class*="_sessionRow"]').length,
    }
  }

  const leaves = () => Array.from(document.querySelectorAll('*')).filter((el) => el.children.length === 0)
  const clickable = (leaf) => leaf.closest('button, [role="button"], [role="treeitem"], a') ?? leaf.parentElement ?? leaf

  /**
   * Click the way a mouse does, not the way `element.click()` does.
   *
   * `element.click()` dispatches a single `click` event. Tree rows and menu
   * items very often act on `pointerdown`/`mousedown` instead — to start a drag,
   * to take focus, or to open on press — so a lone `click` can be handled by
   * nothing at all. That is exactly what the first version of this probe did, and
   * it reported "the sidebar is broken" for BOTH the skinned and the unskinned
   * app, which is the signature of a broken probe rather than a broken app.
   */
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

  async function main() {
    report.skinOn = document.documentElement.hasAttribute('data-550c')
    report.before = state()

    // 1. Switch to a workspace that is not the active one.
    const rows = Array.from(document.querySelectorAll('[class*="_projectRow"]'))
    const other = rows.find((row) => row.querySelector('[class*="folderActive"]') === null)
    if (other !== undefined) {
      report.switchTarget = (other.textContent ?? '').trim().slice(0, 20)
      realClick(clickable(other))
      await sleep(1100)
      report.afterSwitch = state()
      report.switchWorked =
        JSON.stringify(report.afterSwitch.activeWorkspace) !== JSON.stringify(report.before.activeWorkspace)
    }

    // 2. Start a new conversation from the rail.
    const newSession = leaves().filter((el) => (el.textContent ?? '').trim() === '新会话')
    report.newSessionControls = newSession.length
    if (newSession.length > 0) {
      // The first is the rail's own button.
      const target = clickable(newSession[0])
      report.newSessionTarget = { tag: target.tagName.toLowerCase(), cls: String(target.className).slice(0, 40) }
      const before = state()
      realClick(target)
      await sleep(1100)
      report.afterNewSession = state()
      report.newSessionWorked = report.afterNewSession.sessions !== before.sessions
    }

    document.body.setAttribute('data-switch', JSON.stringify(report))
  }

  main().catch((error) => {
    report.error = String(error && error.message ? error.message : error)
    document.body.setAttribute('data-switch', JSON.stringify(report))
  })
  return 'driving'
})()
