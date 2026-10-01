/**
 * Scenario: map the composer card's interior.
 *
 * The 550C mark is moving into the dialog box, and the constraint that decides
 * where it can go is space: the composer's height is driven by its own content,
 * so anything added inside it either has to be out of flow or it will resize the
 * input cluster. This reports every descendant of the card with its box, so the
 * free regions are a measurement rather than a guess.
 */
;(() => {
  const card = document.querySelector('[data-composer-card]')
  if (card === null) {
    document.body.setAttribute('data-composer-map', JSON.stringify({ present: false }))
    return 'no composer'
  }

  const box = (element) => {
    const rect = element.getBoundingClientRect()
    return {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      w: Math.round(rect.width),
      h: Math.round(rect.height),
    }
  }

  const cardBox = box(card)
  const rows = []
  for (const element of card.querySelectorAll('*')) {
    // Only leaf-ish nodes: a wrapper repeats its children's extent.
    if (element.children.length > 2) continue
    const rect = box(element)
    if (rect.w === 0 || rect.h === 0) continue
    const style = getComputedStyle(element)
    rows.push({
      tag: element.tagName.toLowerCase(),
      cls: String(element.className).slice(0, 54),
      data: Array.from(element.attributes)
        .filter((a) => a.name.startsWith('data-'))
        .map((a) => a.name)
        .join(','),
      text: (element.textContent || '').trim().slice(0, 22),
      box: rect,
      // Position relative to the card's own top-left, which is what a decoration
      // inside it would be anchored to.
      rel: { x: rect.x - cardBox.x, y: rect.y - cardBox.y },
      position: style.position,
      display: style.display,
    })
  }

  // The free horizontal bands inside the card: rows nothing occupies.
  const occupied = rows.map((row) => ({ top: row.rel.y, bottom: row.rel.y + row.box.h }))
  const bands = []
  let cursor = 0
  for (const span of occupied.sort((a, b) => a.top - b.top)) {
    if (span.top - cursor > 4) bands.push({ from: cursor, to: span.top })
    cursor = Math.max(cursor, span.bottom)
  }
  if (cardBox.h - cursor > 4) bands.push({ from: cursor, to: cardBox.h })

  document.body.setAttribute(
    'data-composer-map',
    JSON.stringify({ present: true, card: cardBox, rows: rows.slice(0, 40), freeBands: bands }),
  )
  return rows.length + ' nodes'
})()
