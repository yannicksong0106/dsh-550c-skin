/**
 * Scenario: read the sidebar's own state.
 *
 * A workspace switch does not necessarily change the URL or the heading — it
 * changes which row is selected — so the earlier fingerprint could not tell
 * "the click did nothing" from "the click worked and I measured the wrong thing".
 * This reports the sidebar's rows with their selection markers and the number of
 * conversations, which is what actually moves when either control is used.
 */
;(() => {
  const describe = (node) => {
    const style = getComputedStyle(node)
    return {
      tag: node.tagName.toLowerCase(),
      cls: String(node.className).slice(0, 46),
      role: node.getAttribute('role'),
      ariaSelected: node.getAttribute('aria-selected'),
      ariaCurrent: node.getAttribute('aria-current'),
      dataState: node.getAttribute('data-state'),
      text: (node.textContent ?? '').trim().slice(0, 26),
      // Selection is often only a class, so surface every class that looks like
      // one, rather than assuming the naming.
      stateClasses: String(node.className)
        .split(/\s+/)
        .filter((name) => /active|select|current|open|on$/i.test(name)),
      bg: style.backgroundColor,
      color: style.color,
    }
  }

  const rows = Array.from(
    document.querySelectorAll('[class*="_projectRow"], [class*="_workspace"], [class*="_folder"], [class*="_sessionRow"], [role="treeitem"], [role="option"]'),
  ).map(describe)

  document.body.setAttribute(
    'data-sidebar-state',
    JSON.stringify({
      rows,
      // The whole rail's text, so the conversation list is visible as a count.
      sidebarText: (document.querySelector('[class*="_sidebarCol"]')?.textContent ?? '').trim().slice(0, 120),
      activeElement: describe(document.activeElement ?? document.body),
    }),
  )
  return 'ok'
})()
