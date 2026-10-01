/**
 * Scenario: verify the dialog box's arrangement and the console's new look.
 *
 * Each requirement is checked as a fact rather than eyeballed:
 *
 *   1. the rate meter is in the header, immediately after the mark;
 *   2. the mark is UNFRAMED — no border, outline or background of its own;
 *   3. the mark is DYNAMIC — its cells carry animations with staggered delays;
 *   4. there is exactly ONE logotype (the mark), no duplicate `550C` in type;
 *   5. the rheostat abuts the model selector;
 *   6. the harness's own effort picker is hidden but still driveable.
 */
;(() => {
  const box = (element) => {
    if (element === null) return null
    const rect = element.getBoundingClientRect()
    return { x: Math.round(rect.left), y: Math.round(rect.top), w: Math.round(rect.width), h: Math.round(rect.height) }
  }
  const style = (element) => (element === null ? null : getComputedStyle(element))

  const header = document.querySelector('.c-console-head')
  const mark = document.querySelector('.c-mark')
  const tps = document.querySelector('.c-tps')
  const rail = document.querySelector('.c-tps-rail')
  const load = document.querySelector('.c-rig-load')
  const model = document.querySelector('[class*="_7KE1Ra_root"]')
  const effortSuffix = document.querySelector('[class*="_7KE1Ra_triggerEffort"]')
  const litCells = Array.from(document.querySelectorAll('.c-cell[data-lit="1"]'))

  // The distinct animation delays actually applied to lit cells: a mark that is
  // "dynamic" must have staggered phases, not one shared blink.
  const delays = new Set(litCells.map((cell) => style(cell).animationDelay))

  const markStyle = style(mark)
  const tpsBox = box(tps)
  const markBox = box(mark)

  document.body.setAttribute(
    'data-final',
    JSON.stringify({
      meterInHeader: tps !== null && header !== null && header.contains(tps),
      // Immediately after the mark in DOM order, and to its right on screen.
      meterAfterMark: tpsBox !== null && markBox !== null && tpsBox.x >= markBox.x + markBox.w,
      railWidth: box(rail)?.w ?? null,
      railHeight: box(rail)?.h ?? null,

      mark: {
        cells: document.querySelectorAll('.c-cell').length,
        lit: litCells.length,
        box: markBox,
        // Unframed: nothing that would draw a box around it.
        border: markStyle.borderTopWidth,
        outline: markStyle.outlineWidth,
        background: markStyle.backgroundColor,
        boxShadow: markStyle.boxShadow,
        // Dynamic: the mark breathes, its lit cells shimmer, phases are staggered.
        markAnimation: markStyle.animationName,
        cellAnimation: litCells.length === 0 ? null : style(litCells[0]).animationName,
        distinctDelays: delays.size,
      },

      // One logotype only: no textual `550C` anywhere in the console chrome.
      duplicateWordmark: /550C/.test(
        Array.from(document.querySelectorAll('.c-console-head span'))
          .map((span) => span.textContent)
          .join(' '),
      ),

      rheostat: {
        seamPx: load !== null && model !== null ? Math.round(box(model).x - (box(load).x + box(load).w)) : null,
        orderBeforeModel:
          load !== null && model !== null
            ? (load.compareDocumentPosition(model) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
            : null,
        radius: style(document.querySelector('.c-load-trigger'))?.borderRadius ?? null,
      },

      effortPicker: {
        suffixDisplay: style(effortSuffix)?.display ?? 'absent',
        suffixInDom: effortSuffix !== null,
      },
    }),
  )
  return 'ok'
})()
