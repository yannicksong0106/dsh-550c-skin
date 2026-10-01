/**
 * Scenario: which container should the throughput meter actually measure?
 *
 * The report is exact and damning: typing in the composer — before anything is
 * sent — makes the meter move and the mark start loading. That is what happens
 * if the measured container also contains the composer, because then every
 * keystroke looks like output.
 *
 * This reports the containment relationship and the text length of every
 * candidate, so the fix targets a container that holds messages and NOT the
 * input, rather than subtracting a fudge factor.
 */
;(() => {
  const composer = document.querySelector('[data-composer-card]')
  const input = document.querySelector('[data-composer-input]')

  const candidates = [
    '[data-conversation-scroll]',
    '[data-chat-flow]',
    '[data-chat-turn]',
    '[class*="_flow"]',
    '[class*="_scroll"]',
    '[class*="_list"]',
  ]

  const described = candidates.map((selector) => {
    const node = document.querySelector(selector)
    if (node === null) return { selector, present: false }
    return {
      selector,
      present: true,
      cls: String(node.className).slice(0, 40),
      chars: (node.textContent ?? '').length,
      // The whole question: does this container include the input?
      containsComposer: composer !== null && node.contains(composer),
      containsInput: input !== null && node.contains(input),
      turns: node.querySelectorAll('[data-chat-turn]').length,
    }
  })

  // And the composer's own ancestry, so the relationship is unambiguous.
  const ancestry = []
  let node = composer
  while (node !== null && ancestry.length < 12) {
    ancestry.push({
      tag: node.tagName.toLowerCase(),
      cls: String(node.className).slice(0, 40),
      chars: (node.textContent ?? '').length,
      dataAttrs: Array.from(node.attributes)
        .map((attribute) => attribute.name)
        .filter((name) => name.startsWith('data-'))
        .join(','),
    })
    node = node.parentElement
  }

  document.body.setAttribute('data-containers', JSON.stringify({ described, ancestry }))
  return 'ok'
})()
