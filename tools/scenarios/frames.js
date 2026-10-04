/**
 * Scenario: how bad are the frames while the sidebar expands a project?
 *
 * A REPORTING scenario, not an assertion — frame times depend on the machine, so
 * a threshold here would be flaky and would get tuned away. What it is for is
 * comparing configurations: run it with `panel: full`, then `sidebar`, then `grid`
 * (or `off`), and the dropped-frame counts attribute any stutter to a layer.
 * That is exactly how the backdrop's scan head was found: `grid` alone dropped 12
 * frames, `sidebar` alone dropped none, and hiding the animated `::after` took
 * the full stack to zero.
 *
 * Numbers it prints:
 *
 *   median / p95 / worst   frame interval in ms; 16.7 is 60fps, 33.3 is one
 *                          dropped frame, 50 a long one
 *   over33ms               frames that missed a vsync — the number to drive to 0
 *   longTasks              the browser's own verdict, anything over 50ms
 *
 * The gesture is a real click on a project row, because that is what "opening the
 * sidebar" is: React renders the session rows underneath and the whole column
 * relayouts.
 */
;(async () => {
  const sleep = (ms) => new Promise((done) => window.setTimeout(done, ms))

  const longTasks = []
  let observer = null
  try {
    observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) longTasks.push(Math.round(entry.duration))
    })
    observer.observe({ entryTypes: ['longtask'] })
  } catch (error) {
    /* `longtask` is Chromium-only; the frame deltas still tell the story */
  }

  const frames = []
  let last = performance.now()
  let running = true
  const tick = (now) => {
    frames.push(now - last)
    last = now
    if (running) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)

  // The collapse/expand control on a project row, which is the gesture that
  // renders a list of conversations into the column.
  const project = document.querySelector('[data-row-key^="workspace:"]')
  const control = project === null ? null : (project.querySelector('[role="button"]') ?? project)
  if (control !== null) control.click()

  await sleep(2400)
  running = false
  if (observer !== null) observer.disconnect()

  const sorted = [...frames].sort((a, b) => a - b)
  const at = (q) => Math.round((sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0) * 10) / 10
  const total = frames.reduce((sum, value) => sum + value, 0)

  const report = {
    panel: document.documentElement.getAttribute('data-550c-panel'),
    rows: document.querySelectorAll('[data-row-key]').length,
    ticks: document.querySelectorAll('.c-panel-tick').length,
    frameCount: frames.length,
    fps: Math.round((frames.length / total) * 1000),
    medianMs: at(0.5),
    p95Ms: at(0.95),
    worstMs: Math.round(Math.max(...frames) * 10) / 10,
    over33ms: frames.filter((value) => value > 33).length,
    over50ms: frames.filter((value) => value > 50).length,
    longTasks,
    longTaskTotalMs: longTasks.reduce((sum, value) => sum + value, 0),
  }
  document.body.setAttribute('data-frames', JSON.stringify(report))
  return 'ok'
})()
