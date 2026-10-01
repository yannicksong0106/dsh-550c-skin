/**
 * Scenario: find what is actually drawing the boxes.
 *
 * The user dislikes the boxed look, including on the composer. Before removing
 * anything, this reports the computed border and shadow of the surfaces in
 * question — the composer card, the rheostat's panel, and a settings card — so
 * the fix targets whatever is really painting an edge. It could be the app's own
 * border wearing a token this skin recoloured, or a ring this skin added, and
 * those need different fixes.
 */
;(() => {
  const describe = (label, node) => {
    if (node === null) return { label, present: false }
    const style = getComputedStyle(node)
    return {
      label,
      present: true,
      cls: String(node.className).slice(0, 46),
      border: ['Top', 'Right', 'Bottom', 'Left']
        .map((side) => style['border' + side + 'Width'] + ' ' + style['border' + side + 'Style'] + ' ' + style['border' + side + 'Color'])
        .join(' | '),
      borderTopWidth: style.borderTopWidth,
      boxShadow: style.boxShadow,
      background: style.backgroundColor,
      radius: style.borderRadius,
    }
  }

  const report = {
    composer: describe('composer card', document.querySelector('[data-composer-card]')),
    consoleHead: describe('console header', document.querySelector('.c-console-head')),
    loadTrigger: describe('load trigger', document.querySelector('.c-load-trigger')),
    // A card on the settings page, if one is on screen.
    anyCard: describe('a card', document.querySelector('[class*="_card"]')),
    anyDialog: describe('a dialog', document.querySelector('[role="dialog"]')),
  }

  document.body.setAttribute('data-boxes', JSON.stringify(report))
  return 'ok'
})()
