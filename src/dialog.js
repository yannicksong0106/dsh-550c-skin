/**
 * The composer, rebuilt as a 550C console.
 *
 * WHAT THIS RESTRUCTURES
 *
 * The dialog box becomes three bands inside the existing card:
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ ███ 550C ══════════════════ 42.1 t/s      SESSION · READY │  header: the animated mark, then the rate
 *   ├──────────────────────────────────────────────────────────┤
 *   │  描述你想要构建的内容…                                     │  the app's own input, terminal-styled
 *   ├──────────────────────────────────────────────────────────┤
 *   │ [+] [⏻] [完全权限]                    [算力荷载 重载] [model ▾] [↑] │  controls; the rheostat abuts the model
 *   └──────────────────────────────────────────────────────────┘
 *
 * The mark and the meter share the header because they are both readouts of the
 * same machine, and because the bar belongs under the mark it is measuring —
 * that is how an instrument panel is actually laid out.
 *
 * THE LOOK
 *
 * Deliberately NOT a dot matrix and NOT a boxed panel. An earlier pass rendered
 * the logotype as `█`/`·` text inside 1px right-angled brackets, which read as a
 * 1980s compiler and clashed with the rest of DSH, whose surfaces are soft and
 * round. The mark is now a grid of cells with the empty ones invisible, the
 * meter is a glowing hairline rail rather than a row of characters, and the
 * frames are gone in favour of light: no border around the mark, gradients
 * instead of hard rules, and radii that match the app's own.
 *
 * This is the ONE place the skin changes layout, and it is a deliberate,
 * authorised exception to its own rule: the rest of the shell still may not move
 * a pixel, and tools/check-geometry.mjs still enforces that. The composer's
 * height changes here because the point of this pass is to give the dialog box a
 * header band and an instrument band — see docs/DESIGN.md.
 *
 * HOW IT INTERVENES
 *
 * The card is rendered by another plugin's React component, so nothing here
 * wraps or reimplements it. Two nodes are injected — a header as the card's
 * first child, and the rheostat immediately to the left of the model selector —
 * and a MutationObserver re-attaches them if a re-render drops them. The app's
 * own input, buttons, model selector and send control are left exactly where
 * they are.
 *
 * THE RHEOSTAT REPLACES THE APP'S EFFORT PICKER
 *
 * The harness offers reasoning effort inside the model dropdown. This console
 * moves that control out: the dropdown's effort group is marked and hidden, and
 * the rheostat is the only place the setting appears. It is not a decoration —
 * choosing a detent really sets the harness's own effort level, by driving the
 * app's option button, which is the only route a third-party plugin has (there
 * is no service for model or effort selection).
 *
 * THE TPS READING
 *
 * Measured, not decorative. It samples how fast the transcript's text is
 * actually growing and converts with the harness's own density heuristic (four
 * characters per token, the same constant `dsh-token-meter` prices text with).
 *
 * The provider's reported `outputTokens` is NOT the right source for a live bar:
 * usage settles once per attempt, so a bar driven by it would jump in steps
 * rather than move while a long answer streams. Rendered growth is continuous,
 * which is what a throughput meter is for. The figure is labelled TPS and is an
 * estimate of output rate — the docs say so too.
 */

/* ── the mark, as block glyphs ───────────────────────────────────────────── */

/**
 * A 4x5 cell font for the three glyphs the logo needs.
 *
 * Five rows is the smallest height that still reads as `550C`; the shapes are
 * authored as cells so the mark is drawn in the same units as the console text
 * around it, which is what gives it a pixel quality rather than merely making it
 * small.
 */
const CONSOLE_GLYPHS = {
  '5': ['████', '█···', '███·', '···█', '████'],
  '0': ['·██·', '█··█', '█··█', '█··█', '·██·'],
  C: ['·███', '█···', '█···', '█···', '·███'],
}

/** `550C` on five rows, one blank column between glyphs. */
function consoleLogoRows() {
  const order = ['5', '5', '0', 'C']
  return Array.from({ length: 5 }, (_, row) => order.map((glyph) => CONSOLE_GLYPHS[glyph][row]).join(' '))
}

/** Milliseconds per logo cell while the mark writes itself out. */
const LOGO_STEP_MS = 14

/* ── the throughput meter ────────────────────────────────────────────────── */

/** The harness's own text density: four characters per token. */
const CHARS_PER_TOKEN = 4
/** How much output history the rate is averaged over. */
const RATE_WINDOW_MS = 2500
/** Sampling period for the meter. */
const RATE_TICK_MS = 250
/** The rate that fills the bar completely, in tokens per second. */
const TPS_FULL_SCALE = 120

/* ── the rheostat ────────────────────────────────────────────────────────── */

/**
 * The four detents, in the app's own order.
 *
 * The ids are the harness's (`default`, `low`, `high`, `max` — the same values
 * its reasoning levels use), and the labels are what this console calls them.
 * The reading above the slider is a load figure because that is what the control
 * actually trades: more reasoning effort is more compute spent per answer.
 */
const LOAD_STOPS = [
  { id: 'default', label: '自适应', load: 0.25 },
  { id: 'low', label: '轻载', load: 0.45 },
  { id: 'high', label: '重载', load: 0.75 },
  { id: 'max', label: '满载', load: 1 },
]

/**
 * Mount the console inside the composer.
 *
 * @returns a disposer that stops every timer, disconnects the observer and
 *   removes both injected nodes.
 */
function mountDialogConsole() {
  /* ── the header band ───────────────────────────────────────────────── */

  const header = document.createElement('div')
  header.className = 'c-console-head'
  header.setAttribute('aria-hidden', 'true')

  /* The mark is a grid of CELLS, not a block of text.
   *
   * Rendering the logo as a `<pre>` of `█` and `·` made the empty cells visible
   * as a dot matrix, which is what made the whole thing read like a 1980s
   * compiler: a dot matrix is a display technology, and this machine is not
   * being emulated, it is being depicted. As cells, the empty ones are simply
   * invisible and the mark reads as a clean piece of lettering — and every lit
   * cell can carry its own animation delay, which is what makes the mark move. */
  const mark = document.createElement('div')
  mark.className = 'c-mark'
  const markCells = []

  /** Build the cell grid for `550C`; returns nothing, fills `markCells`. */
  function buildMark() {
    const rows = consoleLogoRows()
    mark.style.setProperty('--cols', String(rows[0].length))
    mark.replaceChildren()
    markCells.length = 0
    for (let row = 0; row < rows.length; row += 1) {
      for (let column = 0; column < rows[row].length; column += 1) {
        const cell = document.createElement('span')
        cell.className = 'c-cell'
        // The column drives the shimmer's phase, so the mark pulses as a wave
        // travelling across it rather than blinking as a block.
        cell.style.setProperty('--col', String(column))
        cell.dataset.on = rows[row][column] === '█' ? '1' : '0'
        mark.appendChild(cell)
        markCells.push(cell)
      }
    }
  }

  /* ── the throughput bar, in the header, right after the mark ───────── */

  /* The meter lives beside the mark rather than in its own band: both are
     readouts of the same machine, and a bar under the mark's own name is how an
     instrument panel is actually laid out. The bar is long because a meter too
     short to separate a quiet answer from a fast one is not a meter — and it
     shows RATE, not progress, so it has no business looking like a progress
     bar: a hairline rail with a glowing fill. */
  const tps = document.createElement('div')
  tps.className = 'c-tps'
  const tpsRail = document.createElement('div')
  tpsRail.className = 'c-tps-rail'
  const tpsFill = document.createElement('div')
  tpsFill.className = 'c-tps-fill'
  tpsRail.appendChild(tpsFill)
  const tpsValue = document.createElement('span')
  tpsValue.className = 'c-tps-value'
  tpsValue.textContent = '--'
  const tpsUnit = document.createElement('span')
  tpsUnit.className = 'c-tps-unit'
  tpsUnit.textContent = 't/s'
  tps.append(tpsRail, tpsValue, tpsUnit)

  const session = document.createElement('span')
  session.className = 'c-console-session'
  session.textContent = 'SESSION 0x' + Math.random().toString(16).slice(2, 10).toUpperCase()
  const state = document.createElement('span')
  state.className = 'c-console-state'
  state.textContent = 'BOOT'

  // No wordmark: the mark above IS the name, and setting `550C` in type next to
  // a 550C logotype says the same thing twice.
  header.append(mark, tps, session, state)

  /* ── the compute-load rheostat ─────────────────────────────────────── */

  /* The control, not the readout: it belongs with the app's own controls, and it
     sits immediately to the LEFT of the model selector because the two describe
     the same thing — which model, and how hard it is being driven. */
  const load = document.createElement('div')
  load.className = 'c-rig-load'
  const loadTrigger = document.createElement('button')
  loadTrigger.type = 'button'
  loadTrigger.className = 'c-load-trigger'
  const loadKey = document.createElement('span')
  loadKey.className = 'c-rig-key'
  loadKey.textContent = '算力荷载'
  const loadNow = document.createElement('span')
  loadNow.className = 'c-load-now'
  loadTrigger.append(loadKey, loadNow)

  const panel = document.createElement('div')
  panel.className = 'c-load-panel'
  panel.hidden = true
  const panelHead = document.createElement('div')
  panelHead.className = 'c-load-head'
  const panelTitle = document.createElement('span')
  panelTitle.className = 'c-load-title'
  panelTitle.textContent = '算力荷载'
  const panelRead = document.createElement('span')
  panelRead.className = 'c-load-read'
  panelHead.append(panelTitle, panelRead)

  const track = document.createElement('div')
  track.className = 'c-load-track'
  track.setAttribute('role', 'slider')
  track.setAttribute('aria-label', '算力荷载')
  track.setAttribute('aria-valuemin', '0')
  track.setAttribute('aria-valuemax', String(LOAD_STOPS.length - 1))
  const fill = document.createElement('div')
  fill.className = 'c-load-fill'
  const thumb = document.createElement('div')
  thumb.className = 'c-load-thumb'
  track.append(fill, thumb)

  const ticks = document.createElement('div')
  ticks.className = 'c-load-ticks'

  panel.append(panelHead, track, ticks)
  load.append(loadTrigger, panel)

  /* ── attachment ────────────────────────────────────────────────────── */

  let cancelled = false
  const card = () => document.querySelector('[data-composer-card]')
  /** The app's trailing group, which the row pushes to its right edge. */
  const trailingGroup = (host) => host.querySelector('[class*="_trailing"]')

  /**
   * The trailing group's direct child that CONTAINS the model selector.
   *
   * The rheostat goes immediately before this, which is what makes it abut the
   * model control. The model's own root class is not a direct child of the
   * trailing group — it sits inside an unclassed wrapper — so anchoring on the
   * root class directly made the check fail and the insertion fell back to a
   * card-level append, landing the control at the bottom of the dialog box.
   * Walking up to the group's own child is what makes the anchor reliable
   * without depending on wrapper class names the app is free to change.
   */
  function modelAnchor(host) {
    const trailing = trailingGroup(host)
    const model = host.querySelector('[class*="_7KE1Ra_root"]')
    if (trailing === null || model === null) return null
    let node = model
    while (node.parentElement !== null && node.parentElement !== trailing) node = node.parentElement
    return node.parentElement === trailing ? node : null
  }

  /**
   * Mark the app's own reasoning-effort group so the stylesheet can hide it.
   *
   * The rheostat REPLACES that control, so it must not also be offered in the
   * model dropdown — two controls for one setting is worse than either alone.
   * The group is only hidden, never removed: the option buttons inside it are
   * exactly what `applyToApp` clicks to set the level for real, and a
   * `display:none` button is still clickable.
   */
  function markEffortGroup() {
    const keywords = ['思考', '推理', '努力', 'Effort', 'Reasoning', 'Thinking']
    for (const group of document.querySelectorAll('[class*="_7KE1Ra_group"]')) {
      if (group.hasAttribute('data-550c-effort')) continue
      const title = (group.querySelector('[class*="_groupTitle"]')?.textContent ?? '').trim()
      if (title === '') continue
      if (keywords.some((keyword) => title.includes(keyword))) group.setAttribute('data-550c-effort', '')
    }
  }

  function attach() {
    const host = card()
    if (host === null) return false

    // Header first: the band above the input. It carries the mark and the
    // throughput bar, so there is no separate meter row to place.
    if (header.parentElement !== host) host.insertBefore(header, host.firstChild)

    // The rheostat immediately to the left of the model selector, inside the
    // app's own trailing group — adjacent to the control it belongs with, rather
    // than floating in the middle of the row.
    const anchor = modelAnchor(host)
    if (anchor !== null) {
      if (load.parentElement !== anchor.parentElement || load.nextElementSibling !== anchor) {
        anchor.parentElement.insertBefore(load, anchor)
      }
      // Butt it right up against the model control. The group's own flex gap is
      // what holds the app's controls apart, and it applies to the rheostat too;
      // cancelling it on THIS element is the one way to close the seam without
      // setting a layout property on an element the app owns. The gap is read
      // rather than hard-coded, so a change to the app's spacing follows.
      const gap = getComputedStyle(anchor.parentElement).columnGap
      load.style.marginRight = gap === 'normal' || gap === '' ? '0' : '-' + gap
    } else if (load.parentElement !== host) {
      host.appendChild(load)
    }

    markEffortGroup()
    return true
  }

  const observer = new MutationObserver(() => {
    if (!cancelled) attach()
  })
  observer.observe(document.body, { childList: true, subtree: true })
  attach()

  /* ── the throughput meter ──────────────────────────────────────────── */

  const transcript = () => document.querySelector('[data-conversation-scroll]')
  /** Rolling (timestamp, cumulative characters) samples. */
  let samples = []
  let lastChars = 0

  /** Count the transcript's visible characters — the thing that grows as text streams. */
  function transcriptChars() {
    const node = transcript()
    return node === null ? 0 : (node.textContent ?? '').length
  }

  /**
   * Paint the meter for one rate.
   *
   * The parameter is named `rate`, not `tpsValue`: the element above is
   * `tpsValue`, and a parameter of the same name shadowed it — so the write went
   * onto a number primitive and was silently discarded. The bar kept working
   * (its element was not shadowed), which is exactly how that bug hides.
   */
  function renderTps(rate) {
    const fraction = Math.max(0, Math.min(1, rate / TPS_FULL_SCALE))
    // The rail is a RATE gauge, not a progress bar: the fill is how fast the
    // machine is writing right now, so it falls back on its own when output
    // stops. A short transition keeps it from looking like a level that jumps.
    tpsFill.style.width = (fraction * 100).toFixed(1) + '%'
    tpsValue.textContent = rate < 0.05 ? '--' : rate.toFixed(1)
    tps.setAttribute('data-550c-level', rate >= TPS_FULL_SCALE * 0.7 ? 'hot' : rate >= TPS_FULL_SCALE * 0.3 ? 'busy' : 'idle')
  }

  function tickTps() {
    if (cancelled) return
    const now = Date.now()
    const total = transcriptChars()
    samples.push({ at: now, chars: total })
    while (samples.length > 1 && now - samples[0].at > RATE_WINDOW_MS) samples.shift()

    const oldest = samples[0]
    const elapsed = (now - oldest.at) / 1000
    const grown = total - oldest.chars
    // A shrinking transcript means a session switch or a re-render, not negative
    // throughput: reset the window instead of reporting nonsense.
    if (grown < 0) {
      samples = [{ at: now, chars: total }]
      renderTps(0)
      return
    }
    const rate = elapsed < 0.4 ? 0 : grown / elapsed
    renderTps(rate / CHARS_PER_TOKEN)
  }

  // The meter is driven by observed growth, so it needs no cooperation from the
  // app and keeps working through any renderer change.
  const tpsTimer = window.setInterval(tickTps, RATE_TICK_MS)
  lastChars = transcriptChars()

  /* ── the rheostat ──────────────────────────────────────────────────── */

  let index = 0

  /** Paint the panel, the track, the trigger and the readout for one detent. */
  function paint() {
    const stop = LOAD_STOPS[index]
    const fraction = stop.load

    loadNow.textContent = stop.label
    panelRead.textContent = stop.label
    // The reading carries the load as a percentage as well as a name: the name is
    // the detent, the figure is what the detent costs.
    panelRead.setAttribute('data-550c-load', String(Math.round(fraction * 100)))

    fill.style.width = Math.round(fraction * 100) + '%'
    thumb.style.left = Math.round(fraction * 100) + '%'
    // The level attribute is what the stylesheet keys the colour ladder and the
    // pulse off, so "how loaded is it" is expressed once, in the DOM, and the
    // CSS owns every visual consequence.
    const level = fraction >= 0.9 ? 'max' : fraction >= 0.6 ? 'high' : fraction >= 0.4 ? 'mid' : 'low'
    for (const node of [load, panel, track]) node.setAttribute('data-550c-level', level)

    // Detent ticks: the one you are on is marked, so the control reads as a
    // stepped rheostat rather than a continuous fader.
    ticks.replaceChildren()
    for (let position = 0; position < LOAD_STOPS.length; position += 1) {
      const tick = document.createElement('span')
      tick.className = 'c-load-tick' + (position === index ? ' is-on' : '')
      tick.textContent = LOAD_STOPS[position].label
      ticks.appendChild(tick)
    }
  }

  /**
   * True while the console is driving the app's own dropdown.
   *
   * Applying a level means clicking the app's effort option, and the app closes
   * its dropdown on an outside click — which is a click on the document, which
   * is also what dismisses this console's panel. Without this guard, setting a
   * level slammed the panel shut under the user's hand.
   */
  let driving = false

  /**
   * Apply the chosen level to the app's own reasoning-effort control.
   *
   * There is no service for this — the harness exposes model and effort
   * selection only through its own dropdown, and its options are plain buttons.
   * So the console drives that control the way a user would: open the trigger,
   * click the option matching the level, and let the app do the rest. Best-effort
   * by design: if the shape has changed, the console still reads correctly, it
   * simply cannot set the value.
   *
   * @returns whether an option was found and clicked.
   */
  function applyToApp(stop) {
    const trigger = document.querySelector('[class*="_7KE1Ra_trigger"]')
    if (trigger === null) return false
    driving = true
    try {
      trigger.click()
      let clicked = false
      const options = document.querySelectorAll('[class*="_7KE1Ra_"] button, [role="menuitem"]')
      for (const option of options) {
        const text = (option.textContent ?? '').trim()
        if (text === '') continue
        // Match the harness's own names for the level, in either language.
        const wanted = {
          default: ['默认', 'Default', '自适应'],
          low: ['低', 'Low', '轻载'],
          high: ['高', 'High', '重载'],
          max: ['最高', 'Max', '满载'],
        }[stop.id] ?? []
        if (wanted.some((candidate) => text.includes(candidate))) {
          option.click()
          clicked = true
          break
        }
      }
      // Close the app's dropdown either way: leaving it open would cover the
      // composer. The guard keeps this from also dismissing our own panel.
      document.body.click()
      return clicked
    } finally {
      driving = false
    }
  }

  function select(next, apply) {
    index = Math.max(0, Math.min(LOAD_STOPS.length - 1, next))
    paint()
    if (apply === true) applyToApp(LOAD_STOPS[index])
  }

  loadTrigger.addEventListener('click', (event) => {
    event.stopPropagation()
    panel.hidden = !panel.hidden
    if (!panel.hidden) paint()
  })

  // Pointer handling on the track: press and drag, which is what a rheostat is.
  // Snapping to detents on release keeps the control honest to the four levels
  // the harness actually has.
  const trackIndexAt = (clientX) => {
    const rect = track.getBoundingClientRect()
    if (rect.width === 0) return index
    const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    // The detents sit at their own load positions, so pick the nearest one.
    let best = 0
    let bestDistance = Infinity
    for (let position = 0; position < LOAD_STOPS.length; position += 1) {
      const distance = Math.abs(LOAD_STOPS[position].load - fraction)
      if (distance < bestDistance) {
        bestDistance = distance
        best = position
      }
    }
    return best
  }

  track.addEventListener('pointerdown', (event) => {
    event.preventDefault()
    track.setPointerCapture(event.pointerId)
    select(trackIndexAt(event.clientX), false)
  })
  track.addEventListener('pointermove', (event) => {
    if (!track.hasPointerCapture(event.pointerId)) return
    select(trackIndexAt(event.clientX), false)
  })
  track.addEventListener('pointerup', (event) => {
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId)
    select(trackIndexAt(event.clientX), true)
  })

  // Keyboard, so the control is not mouse-only.
  track.tabIndex = 0
  track.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      select(index - 1, true)
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      select(index + 1, true)
    }
  })

  // Dismiss the panel by clicking anywhere else — but not when the click is part
  // of driving the app's dropdown, and not when it is inside the console itself.
  const onDocumentClick = (event) => {
    if (driving) return
    if (event.target instanceof Element && (load.contains(event.target) || event.target === track)) return
    if (!panel.hidden) panel.hidden = true
  }
  document.addEventListener('click', onDocumentClick)

  paint()

  /* ── the boot ──────────────────────────────────────────────────────── */

  /** Await a step, cancellably. Keys on disposal only — never on connectivity. */
  const sleep = (ms) =>
    new Promise((resolve) => {
      const timer = window.setTimeout(resolve, ms)
      if (cancelled) {
        window.clearTimeout(timer)
        resolve()
      }
    })

  async function boot() {
    // Wait for the shell to render a composer; the sequence is short and
    // starting it into a detached node would waste the whole thing.
    for (let attempt = 0; attempt < 80; attempt += 1) {
      if (cancelled) return
      if (attach()) break
      await sleep(120)
    }
    if (cancelled) return

    // The mark writes itself out cell by cell, then keeps moving. The write is
    // the boot beat; the shimmer that follows is what stops a finished logotype
    // from looking like a sticker.
    buildMark()
    const lit = markCells.filter((cell) => cell.dataset.on === '1')
    for (const cell of lit) {
      if (cancelled) return
      cell.setAttribute('data-lit', '1')
      await sleep(LOGO_STEP_MS)
    }
    state.textContent = 'READY'
  }

  boot().catch(() => {
    /* a disposed console has nothing left to report */
  })

  return function stop() {
    cancelled = true
    window.clearInterval(tpsTimer)
    observer.disconnect()
    document.removeEventListener('click', onDocumentClick)
    // The meter lives inside the header, so removing the header takes it too.
    header.remove()
    load.remove()
    // The marker is on the app's own node, so it has to be taken back off —
    // leaving it would keep the effort group hidden after the skin is gone.
    for (const group of document.querySelectorAll('[data-550c-effort]')) {
      group.removeAttribute('data-550c-effort')
    }
    void lastChars
  }
}
