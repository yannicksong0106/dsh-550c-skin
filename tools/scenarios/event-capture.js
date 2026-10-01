/**
 * Scenario: does the browser deliver a click to the sidebar row at all?
 *
 * Everything measurable has been ruled out — nothing covers the rail, the hit
 * test passes, no exception is thrown, and the behaviour is identical with the
 * skin off. So the remaining question is one layer lower: is a `click` event
 * delivered to the row, or is something in the app swallowing the press?
 *
 * The rows carry `draggable="true"`, which is a real candidate: a mouse press on
 * a draggable element starts a drag, and a drag can end without ever producing a
 * click. This installs capture-phase listeners and records every event that
 * reaches the document, so the answer is what the browser actually did.
 *
 * Run with `--postfile` (installs the listeners), then `--realclick`, then
 * `--eval window.__events`.
 */
;(() => {
  window.__events = []
  const interesting = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click', 'dragstart', 'dragend']

  for (const type of interesting) {
    document.addEventListener(
      type,
      (event) => {
        const target = event.target
        window.__events.push({
          type,
          target: target === null ? null : target.tagName.toLowerCase() + '.' + String(target.className).slice(0, 30),
          // Whether the app stopped the event before it could become a click.
          defaultPrevented: event.defaultPrevented,
          // A click that never fires is the interesting case; so is one that fires
          // somewhere other than where the press landed.
          inSidebar: target !== null && target.closest('[class*="_sidebarCol"]') !== null,
        })
      },
      true,
    )
  }

  // Also watch for the drag layer appearing, which is what a press on a draggable
  // row produces.
  window.__dragObserved = false
  const observer = new MutationObserver(() => {
    if (document.querySelector('[class*="drag"], [class*="Drag"]') !== null) window.__dragObserved = true
  })
  observer.observe(document.body, { childList: true, subtree: true })

  return 'listening'
})()
