/**
 * Scenario: open the agent-preset page.
 *
 * This is the page that showed the problem: dozens of hard rectangles and
 * hundreds of bracket segments, none of them saying anything. It is captured so
 * the simplification is judged where it actually failed, not on a page that
 * happened to look fine.
 *
 * Navigation reuses the approach that already works in settings-rows.js: match
 * the LEAF node carrying the text, then click its nearest clickable ancestor.
 * Matching containers by text is what made the first attempt fail.
 */
;(() => {
  const report = { steps: [] }
  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))
  const leaves = () => Array.from(document.querySelectorAll('*')).filter((el) => el.children.length === 0)

  const clickText = (text) => {
    const leaf = leaves().find((el) => (el.textContent || '').trim() === text)
    if (leaf === undefined) return false
    const target = leaf.closest('button, [role="button"], [role="tab"], a, li') ?? leaf.parentElement ?? leaf
    target.click()
    return true
  }

  /** Every element currently drawing an edge — counted, not eyeballed. */
  const framed = () =>
    Array.from(document.querySelectorAll('*')).filter((node) => {
      const style = getComputedStyle(node)
      if (style.display === 'none' || style.visibility === 'hidden') return false
      const hasBorder = ['Top', 'Right', 'Bottom', 'Left'].some(
        (side) => parseFloat(style['border' + side + 'Width']) > 0 && style['border' + side + 'Style'] !== 'none',
      )
      const ring = style.boxShadow !== 'none' && style.boxShadow.includes('inset')
      return hasBorder || ring
    }).length

  async function main() {
    report.settingsOpened = clickText('设置')
    await sleep(800)
    report.framedInSettings = framed()

    report.presetTab = clickText('Agent 预设')
    await sleep(1000)
    report.framedOnPresetPage = framed()

    document.body.setAttribute('data-preset', JSON.stringify(report))
  }

  main().catch((error) => {
    document.body.setAttribute('data-preset', JSON.stringify({ error: String(error) }))
  })
  return 'opening'
})()
