/**
 * Scenario: hold the mark in its working state long enough to photograph.
 *
 * The loading sweep is motion, and a still cannot show motion — but it can show
 * that the state exists, that the readout has turned, and where the sweep's head
 * is at that instant. The app's own marker is injected and left in place so the
 * capture lands inside the working state rather than between two idle frames.
 */
;(() => {
  const marker = document.createElement('div')
  marker.setAttribute('data-streaming', '')
  marker.style.display = 'none'
  document.body.appendChild(marker)

  // A little output, so the throughput bar is not sitting at zero either.
  const scroll = document.querySelector('[data-conversation-scroll]')
  if (scroll !== null) {
    const sink = document.createElement('div')
    sink.setAttribute('data-550c-shot-probe', '')
    scroll.appendChild(sink)
    let written = 0
    window.setInterval(() => {
      sink.textContent = 'x'.repeat((written += 260))
    }, 120)
  }

  return 'working'
})()
