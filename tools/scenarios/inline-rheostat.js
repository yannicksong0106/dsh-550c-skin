/**
 * Scenario: verify the inline rheostat's placement and texture.
 *
 * The fader is no longer a button that opens a panel: it is laid out directly in
 * the control row's middle and is always live. This checks the arrangement as
 * geometry rather than by eye — that it sits BETWEEN the app's two groups, that
 * it stretches to fill the space, that nothing has to be opened, and that the
 * track really is carrying the slanted-square lattice.
 */
;(() => {
  const box = (element) => {
    if (element === null) return null
    const rect = element.getBoundingClientRect()
    return { x: Math.round(rect.left), y: Math.round(rect.top), w: Math.round(rect.width), h: Math.round(rect.height) }
  }
  const style = (element) => (element === null ? null : getComputedStyle(element))

  const card = document.querySelector('[data-composer-card]')
  const row = card === null ? null : card.querySelector('[class*="_row"]')
  const load = document.querySelector('.c-load')
  const track = document.querySelector('.c-load-track')
  const lattice = document.querySelector('.c-load-lattice')
  const fill = document.querySelector('.c-load-fill')
  const tools = row === null ? null : row.querySelector('[class*="_tools"]')
  const trailing = row === null ? null : row.querySelector('[class*="_trailing"]')

  const order = row === null ? [] : Array.from(row.children).map((child) => String(child.className).split(' ')[0])
  const indexOfLoad = order.findIndex((name) => name.includes('c-load'))
  const indexOfTools = order.findIndex((name) => name.includes('_tools'))
  const indexOfTrailing = order.findIndex((name) => name.includes('_trailing'))

  document.body.setAttribute(
    'data-inline',
    JSON.stringify({
      inRow: load !== null && row !== null && load.parentElement === row,
      // Between the app's two groups, which is the middle of the row.
      betweenGroups: indexOfLoad > indexOfTools && indexOfLoad < indexOfTrailing,
      order,
      loadBox: box(load),
      rowBox: box(row),
      toolsBox: box(tools),
      trailingBox: box(trailing),
      // It fills the gap the app left, rather than hugging one end.
      fillsMiddle: load !== null && tools !== null && trailing !== null
        ? box(load).w > (box(trailing).x - (box(tools).x + box(tools).w)) * 0.5
        : null,
      // Nothing to open: no trigger button, no hidden panel anywhere.
      triggerButtons: document.querySelectorAll('.c-load-trigger').length,
      hiddenPanels: document.querySelectorAll('.c-load-panel').length,
      // Always live: the track is a real slider in the DOM, not a hidden one.
      trackVisible: track !== null && style(track).display !== 'none' && box(track).w > 0,
      trackBox: box(track),
      // The texture: the lattice is drawn by crossing two diagonal gradients.
      latticeLayers: lattice === null ? 0 : (style(lattice).backgroundImage.match(/linear-gradient/g) ?? []).length,
      latticeSize: style(lattice)?.backgroundSize ?? null,
      latticeAngleSlanted: (style(lattice)?.backgroundImage ?? '').includes('45deg'),
      fillWidth: fill?.style.width ?? null,
      level: load?.getAttribute('data-550c-level') ?? null,
      readout: document.querySelector('.c-load-now')?.textContent ?? null,
    }),
  )
  return 'ok'
})()
