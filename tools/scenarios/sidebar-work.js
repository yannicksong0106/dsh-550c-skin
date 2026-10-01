/**
 * Scenario: does the sidebar actually still work?
 *
 * The report is that switching workspace and starting a new conversation both
 * stopped working. Guessing at the cause produced nothing — no overlay covers the
 * rail, and no exception is thrown — so this drives the controls and reports
 * whether the app's state actually changes.
 *
 * "Did it work" is measured from the app, not from the skin: the conversation
 * area's own content and the URL, sampled before and after each click. A click
 * that lands on the right element but changes nothing is a different bug from a
 * click that never lands.
 */
;(() => {
  const report = { steps: [] }
  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

  /** A fingerprint of the app's own state, independent of the skin. */
  const fingerprint = () => {
    const scroll = document.querySelector('[data-conversation-scroll]')
    const heading = document.querySelector('[data-slot="root"] [class*="title"], [class*="headline"]')
    return {
      url: location.pathname + location.search.slice(0, 12),
      transcriptChars: scroll === null ? null : (scroll.textContent ?? '').length,
      heading: (heading?.textContent ?? '').trim().slice(0, 30),
      composerPlaceholder: (document.querySelector('[data-composer-input]')?.textContent ?? '').trim().slice(0, 20),
    }
  }

  const leaves = () => Array.from(document.querySelectorAll('*')).filter((el) => el.children.length === 0)
  /** Every element whose own text is exactly this. */
  const allByText = (text) => leaves().filter((el) => (el.textContent || '').trim() === text)

  const clickable = (leaf) => leaf.closest('button, [role="button"], [role="treeitem"], a, li') ?? leaf.parentElement ?? leaf

  async function main() {
    report.before = fingerprint()

    // 1. The top-level new-conversation control.
    const newChat = allByText('新会话')
    report.newChatCount = newChat.length
    if (newChat.length > 0) {
      const target = clickable(newChat[0])
      report.newChatTarget = { tag: target.tagName.toLowerCase(), cls: String(target.className).slice(0, 40) }
      target.click()
      await sleep(900)
      report.afterNewChat = fingerprint()
      report.newChatWorked = JSON.stringify(report.afterNewChat) !== JSON.stringify(report.before)
    }

    // 2. A workspace row — the one that is not the active workspace.
    const rows = Array.from(document.querySelectorAll('[class*="_workspace"], [class*="_project"]'))
      .concat(allByText('test'))
    report.workspaceCandidates = rows.length
    const row = rows.map(clickable).find((node) => node !== null)
    if (row !== undefined) {
      const before = fingerprint()
      row.click()
      await sleep(900)
      report.afterWorkspace = fingerprint()
      report.workspaceWorked = JSON.stringify(report.afterWorkspace) !== JSON.stringify(before)
      report.workspaceTarget = { tag: row.tagName.toLowerCase(), cls: String(row.className).slice(0, 40) }
    }

    // 3. Whatever is under the cursor at the workspace title's coordinates, after
    //    everything above — the state the user is actually clicking into.
    const title = allByText('dsh-start')[0] ?? allByText('test')[0] ?? null
    if (title !== null) {
      const rect = title.getBoundingClientRect()
      const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
      report.hitAfter = { tag: top?.tagName.toLowerCase() ?? null, cls: String(top?.className ?? '').slice(0, 40) }
    }

    document.body.setAttribute('data-sidebar-work', JSON.stringify(report))
  }

  main().catch((error) => {
    report.error = String(error && error.message ? error.message : error)
    document.body.setAttribute('data-sidebar-work', JSON.stringify(report))
  })
  return 'driving'
})()
