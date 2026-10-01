/**
 * Scenario: why can the sidebar no longer be used?
 *
 * The report is functional, not cosmetic: switching workspace stopped working and
 * a new conversation cannot be started from the sidebar. Both live in the left
 * rail, so the first question is whether a click there even REACHES the control —
 * an invisible overlay would do it, and so would a React tree that no longer
 * matches the DOM this skin has been injecting into.
 *
 * This reports what is actually at each control's coordinates, whether anything
 * has pointer-events disabled over the rail, and what happens when a workspace
 * row is really clicked. It reports rather than throws, so a miss costs one field
 * instead of the whole run.
 */
;(() => {
  const report = { steps: [] }

  const describe = (node) => {
    if (node === null) return null
    return {
      tag: node.tagName.toLowerCase(),
      cls: String(node.className).slice(0, 50),
      text: (node.textContent ?? '').trim().slice(0, 22),
    }
  }

  /** What would receive a click at this element's centre. */
  const hitTest = (element) => {
    if (element === null) return null
    const rect = element.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return { skipped: 'zero size' }
    const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
    return {
      at: { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) },
      topmost: describe(top),
      // The thing under the cursor is either the control or one of its own
      // children — anything else means something is covering it.
      isTheControl: top !== null && (top === element || element.contains(top)),
    }
  }

  // The skin's own layers, and whether any of them can swallow a click.
  const overlays = Array.from(
    document.querySelectorAll('.c-crt, .c-crt > *, .c-console-head, .c-load, .c-load-track, .c-load-cells, .c-mark'),
  ).map((node) => {
    const style = getComputedStyle(node)
    const rect = node.getBoundingClientRect()
    return {
      cls: String(node.className).split(' ')[0],
      pointerEvents: style.pointerEvents,
      position: style.position,
      zIndex: style.zIndex,
      box: { x: Math.round(rect.left), y: Math.round(rect.top), w: Math.round(rect.width), h: Math.round(rect.height) },
    }
  })

  // Anything at all in the document that has pointer-events disabled and covers
  // the left rail.
  const rail = document.querySelector('[data-slot="sidebar"]')
  const railRect = rail === null ? null : rail.getBoundingClientRect()
  const blockers = railRect === null ? [] : Array.from(document.querySelectorAll('*')).filter((node) => {
    const style = getComputedStyle(node)
    if (style.pointerEvents === 'none') return false
    if (style.display === 'none' || style.visibility === 'hidden') return false
    const rect = node.getBoundingClientRect()
    // Covers the rail's centre and is not part of the rail.
    return (
      rect.width > 40 &&
      rect.height > 40 &&
      rect.left <= railRect.left + railRect.width / 2 &&
      rect.right >= railRect.left + railRect.width / 2 &&
      rect.top <= railRect.top + railRect.height / 2 &&
      rect.bottom >= railRect.top + railRect.height / 2 &&
      !(rail !== null && rail.contains(node))
    )
  }).map(describe)

  // The sidebar's own controls.
  const leaves = Array.from(document.querySelectorAll('*')).filter((el) => el.children.length === 0)
  const byText = (text) => leaves.find((el) => (el.textContent || '').trim() === text) ?? null
  const newChat = byText('新对话')
  const workspaceRow = byText('dsh-start')

  const newChatControl = newChat === null ? null : newChat.closest('button, [role="button"], a') ?? newChat
  const workspaceControl =
    workspaceRow === null ? null : workspaceRow.closest('button, [role="button"], a, [role="treeitem"]') ?? workspaceRow

  document.body.setAttribute(
    'data-sidebar',
    JSON.stringify({
      railPresent: rail !== null,
      railRect: railRect === null ? null : { x: Math.round(railRect.left), w: Math.round(railRect.width) },
      overlays,
      blockers,
      newChat: { found: newChatControl !== null, hit: hitTest(newChatControl) },
      workspace: { found: workspaceControl !== null, hit: hitTest(workspaceControl) },
      // The DOM the skin injected, and whether React's containers now hold nodes
      // React did not create — the state that breaks reconciliation.
      injectedInComposer: {
        headerIsFirstChild:
          document.querySelector('[data-composer-card]')?.firstElementChild?.classList.contains('c-console-head') ?? null,
        cardChildCount: document.querySelector('[data-composer-card]')?.children.length ?? null,
        rowChildCount: document.querySelector('[data-composer-card] [class*="_row"]')?.children.length ?? null,
      },
    }),
  )
  return 'ok'
})()
