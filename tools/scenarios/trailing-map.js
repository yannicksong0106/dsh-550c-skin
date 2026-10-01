/**
 * Scenario: map the trailing group's interior.
 *
 * The rheostat must be an immediate sibling of the model selector, and the first
 * attempt assumed the model's root class was a direct child of the trailing
 * group. It is not, so the insertion fell back to a card-level append and the
 * control landed at the bottom of the dialog box. This reports the real nesting
 * so the anchor is chosen from evidence.
 */
;(() => {
  const trailing = document.querySelector('[class*="_trailing"]')
  if (trailing === null) {
    document.body.setAttribute('data-trailing', JSON.stringify({ present: false }))
    return 'no trailing group'
  }

  const box = (element) => {
    const rect = element.getBoundingClientRect()
    return { x: Math.round(rect.left), w: Math.round(rect.width) }
  }

  // Walk two levels: the direct children, then their children — enough to find
  // where the model selector actually sits.
  const describe = (element, depth) => {
    const out = {
      depth,
      tag: element.tagName.toLowerCase(),
      cls: String(element.className).slice(0, 52),
      box: box(element),
      text: (element.textContent || '').trim().slice(0, 18),
    }
    if (depth === 0) out.children = Array.from(element.children).map((child) => describe(child, 1))
    return out
  }

  document.body.setAttribute(
    'data-trailing',
    JSON.stringify({ present: true, cls: String(trailing.className), tree: describe(trailing, 0) }),
  )
  return 'ok'
})()
