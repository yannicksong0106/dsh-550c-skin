/**
 * Scenario: what is drawing the box around the reasoning row, and how is the
 * running status styled today?
 *
 * The user dislikes boxes and pointed at the `思考` row, which shows a full
 * rectangle around it. Guessing which rule draws it is how the last few passes
 * went wrong, so this reports the computed border and shadow of the real elements
 * — the reasoning row, its wrapper, and the running status line — along with the
 * owning classes so the fix can target the actual source.
 */
;(() => {
  const describe = (label, node) => {
    if (node === null) return { label, present: false }
    const style = getComputedStyle(node)
    return {
      label,
      cls: String(node.className).slice(0, 46),
      dataVariant: node.getAttribute('data-variant'),
      dataState: node.getAttribute('data-state'),
      role: node.getAttribute('role'),
      border: ['Top', 'Right', 'Bottom', 'Left']
        .map((side) => style['border' + side + 'Width'] + '/' + style['border' + side + 'Style'])
        .join(' '),
      borderColor: style.borderTopColor,
      boxShadow: style.boxShadow,
      background: style.backgroundColor,
      radius: style.borderRadius,
      text: (node.textContent ?? '').trim().slice(0, 34),
    }
  }

  // The reasoning row and everything that could be drawing its frame.
  const think = document.querySelector('[data-variant="think"]')
  const wrappers = []
  let node = think
  for (let depth = 0; node !== null && depth < 6; depth += 1) {
    wrappers.push(describe('ancestor ' + depth, node))
    node = node.parentElement
  }

  const status = document.querySelector('[class*="_turnStatus"]')

  document.body.setAttribute(
    'data-boxes2',
    JSON.stringify({
      thinkChain: wrappers,
      status: describe('turnStatus', status),
      statusClock: describe('turnStatusClock', document.querySelector('[class*="_turnStatusClock"]')),
      // Every element inside the flow that is drawing a visible frame, so a box
      // can be traced to whichever rule produced it.
      framed: Array.from(document.querySelectorAll('[data-chat-flow] *'))
        .filter((el) => {
          const style = getComputedStyle(el)
          const hasBorder = ['Top', 'Right', 'Bottom', 'Left'].some(
            (side) => parseFloat(style['border' + side + 'Width']) > 0 && style['border' + side + 'Style'] !== 'none',
          )
          return hasBorder || (style.boxShadow !== 'none' && style.boxShadow !== '')
        })
        .slice(0, 12)
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          cls: String(el.className).slice(0, 40),
          border: getComputedStyle(el).borderTopWidth + '/' + getComputedStyle(el).borderTopStyle,
          shadow: getComputedStyle(el).boxShadow.slice(0, 60),
          text: (el.textContent ?? '').trim().slice(0, 20),
        })),
    }),
  )
  return 'ok'
})()
