/**
 * Scenario: does the throughput meter actually measure?
 *
 * The meter is driven by how fast the transcript's text grows, so the honest way
 * to test it is to make the transcript grow and watch the reading follow. This
 * appends text to the transcript's own container at a known rate and reports the
 * TPS the console derives from it — a check of the measurement, not of a
 * rendering.
 *
 * It is deliberately NOT a claim about a real model's throughput: the web
 * profile has no sessions and no key, so there is nothing real to stream. What
 * this proves is that the meter reads real DOM growth and converts it with the
 * harness's own four-characters-per-token heuristic.
 */
;(() => {
  // The container the meter actually measures. NOT `[data-conversation-scroll]`:
  // that one contains the composer, which is what made typing look like output.
  const scroll = document.querySelector('[data-chat-flow]')
  const value = () => document.querySelector('.c-tps-value')?.textContent ?? null
  const fill = () => document.querySelector('.c-tps-fill')?.style.width ?? null
  const level = () => document.querySelector('.c-tps')?.getAttribute('data-550c-level') ?? null

  const report = { present: scroll !== null, idle: { value: value(), fill: fill(), level: level() } }
  if (scroll === null) {
    document.body.setAttribute('data-tps', JSON.stringify(report))
    return 'no transcript'
  }

  // A sink that stands in for streaming output: 400 characters per 100ms is
  // 4000 chars/s, which at four characters per token is 1000 TPS — far above the
  // meter's full scale, so the bar should saturate and report "hot".
  const sink = document.createElement('div')
  sink.setAttribute('data-550c-tps-probe', '')
  scroll.appendChild(sink)

  let written = 0
  const feed = window.setInterval(() => {
    sink.textContent = 'x'.repeat((written += 400))
  }, 100)

  window.setTimeout(() => {
    window.clearInterval(feed)
    report.streaming = { value: value(), fill: fill(), level: level(), charsWritten: written }
    // Then stop writing and let the rolling window drain: the reading must fall
    // back to idle on its own, or the bar would be stuck claiming throughput.
    window.setTimeout(() => {
      report.afterStop = { value: value(), fill: fill(), level: level() }
      sink.remove()
      document.body.setAttribute('data-tps', JSON.stringify(report))
    }, 3200)
  }, 1600)

  return 'feeding'
})()
