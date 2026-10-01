/**
 * Scenario: report the toolbar row's child order.
 *
 * The instrument rig has to sit in the toolbar's empty middle, and "the empty
 * middle" is defined by what the app puts there. The first attempt anchored on
 * the model selector's root class, which turned out to live inside a nested
 * trailing wrapper rather than in the row itself, so the insertion silently fell
 * back to appending — landing the rig after the send button. This reports the
 * actual order so the anchor is chosen from evidence.
 */
;(() => {
  const card = document.querySelector('[data-composer-card]')
  const rig = document.querySelector('.c-rig')
  if (card === null) {
    document.body.setAttribute('data-toolbar', JSON.stringify({ present: false }))
    return 'no composer'
  }

  const row = rig?.parentElement ?? card.querySelector('[class*="_row"]')
  const box = (element) => {
    const rect = element.getBoundingClientRect()
    return { x: Math.round(rect.left), w: Math.round(rect.width) }
  }

  const children = row === null ? [] : Array.from(row.children).map((child, index) => ({
    index,
    tag: child.tagName.toLowerCase(),
    cls: String(child.className).slice(0, 46),
    box: box(child),
    isRig: child === rig,
  }))

  document.body.setAttribute(
    'data-toolbar',
    JSON.stringify({
      present: true,
      rowCls: row === null ? null : String(row.className),
      rowBox: row === null ? null : box(row),
      children,
    }),
  )
  return children.length + ' children'
})()
