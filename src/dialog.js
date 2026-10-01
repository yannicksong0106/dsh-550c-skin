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
 * The four detents, in the harness's own order and with its own ids.
 *
 * The ids are the real level names the harness uses — `off`, `low`, `high`,
 * `max`, read from its own effort submenu rather than assumed. (An earlier pass
 * assumed `default/low/high/max`; the real set has no `default`, it has `off`.)
 *
 * The labels are what this console calls them. They are a load ladder because
 * that is exactly what the control trades: more reasoning effort is more compute
 * spent per answer, so the four steps are named the way a machine's load is
 * named — no load, light, heavy, full.
 */
const LOAD_STOPS = [
  { id: 'off', label: '空载', load: 0.08 },
  { id: 'low', label: '轻载', load: 0.4 },
  { id: 'high', label: '重载', load: 0.72 },
  { id: 'max', label: '满载', load: 1 },
]

/**
 * How many blocks the load track is made of.
 *
 * Dense on purpose: the fader covers ~430px, so this works out at roughly 7px per
 * block including its gap — small enough that the row reads as a texture and a
 * partial level is still legible, large enough that the individual blocks stay
 * countable, which is what makes it read as loading cells rather than a gradient.
 */
const LOAD_CELLS = 56

/**
 * How each detent is spelled in the harness's own effort submenu.
 *
 * Matched against the option's text, so the drive works in either language and
 * does not depend on the skin knowing the app's internals beyond the label.
 */
const EFFORT_NAMES = {
  off: ['Off', '关闭', '空载', '无'],
  low: ['Low', '低', '轻载'],
  high: ['High', '高', '重载'],
  max: ['Max', '最高', '满载'],
}

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
    let sequence = 0
    for (let row = 0; row < rows.length; row += 1) {
      for (let column = 0; column < rows[row].length; column += 1) {
        const cell = document.createElement('span')
        cell.className = 'c-cell'
        // Two phases, because the mark moves two ways:
        //   `--col` drives the idle shimmer, a wave travelling ACROSS the mark;
        //   `--seq` drives the loading rewrite, a sweep travelling in READING
        //   order — which is what makes the working state look like the logo
        //   being written out again rather than merely pulsing.
        cell.style.setProperty('--col', String(column))
        cell.style.setProperty('--seq', String(sequence))
        sequence += 1
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

  /* ── the compute-load rheostat, laid out in the control row's middle ── */

  /* INLINE AND ALWAYS LIVE. No trigger, no popover, nothing to open: the control
     row already has a wide empty middle, and a fader you can see and grab at any
     moment is the entire point of a rheostat — a control you must open first is
     a menu, not a fader. Removing the popover also removed its dismissal
     handling, its panel styling and its own markup, which is less machinery for
     the same job. */
  const load = document.createElement('div')
  load.className = 'c-load'
  const loadKey = document.createElement('span')
  loadKey.className = 'c-load-key'
  loadKey.textContent = '算力荷载'

  const track = document.createElement('div')
  track.className = 'c-load-track'
  track.setAttribute('role', 'slider')
  track.setAttribute('aria-label', '算力荷载')
  track.setAttribute('aria-valuemin', '0')
  track.setAttribute('aria-valuemax', String(LOAD_STOPS.length - 1))
  track.tabIndex = 0

  // The track is a run of DENSE NARROW SLANTED BLOCKS, lit left to right, so the
  // load reads as a row of loading cells filling up — the shape of a segmented
  // load meter rather than a fill level on a rail.
  //
  // The blocks are real elements rather than a striped gradient: a gradient can
  // draw slanted stripes, but not separate blocks with gaps and their own edges,
  // and the whole point of the texture is that you can count the cells. They are
  // laid out with flex, so their width follows the track and nothing has to be
  // recomputed when the window changes.
  const cells = document.createElement('div')
  cells.className = 'c-load-cells'
  const cellNodes = []
  for (let index = 0; index < LOAD_CELLS; index += 1) {
    const cell = document.createElement('span')
    cell.className = 'c-load-cell'
    // The index drives the flow animation's phase. It is authored once, here,
    // and read by the stylesheet as `--i`.
    cell.style.setProperty('--i', String(index))
    cells.appendChild(cell)
    cellNodes.push(cell)
  }
  const thumb = document.createElement('div')
  thumb.className = 'c-load-thumb'
  track.append(cells, thumb)

  const loadNow = document.createElement('span')
  loadNow.className = 'c-load-now'

  load.append(loadKey, track, loadNow)

  /* ── attachment ────────────────────────────────────────────────────── */

  let cancelled = false

  /**
   * Await a step, cancellably. Keys on disposal only — never on connectivity.
   *
   * Declared here rather than beside the boot sequence because the rheostat's
   * apply path uses it too, and a `const` used before its declaration is a
   * temporal-dead-zone throw — silent here, since the promise that would carry
   * it is deliberately not awaited.
   */
  const sleep = (ms) =>
    new Promise((resolve) => {
      const timer = window.setTimeout(resolve, ms)
      if (cancelled) {
        window.clearTimeout(timer)
        resolve()
      }
    })

  const card = () => document.querySelector('[data-composer-card]')
  /** The app's trailing group, which the row pushes to its right edge. */
  const trailingGroup = (host) => host.querySelector('[class*="_trailing"]')

  /**
   * Mark the app's own reasoning-effort cell so the stylesheet can hide it.
   *
   * The rheostat REPLACES that control, so it must not also be offered in the
   * model dropdown — two controls for one setting is worse than either alone.
   *
   * The effort picker is a CELL in the model menu (`模型` / `推理等级`), not a
   * group, and not a flat list: it opens a submenu. The first version of this
   * looked for a `_7KE1Ra_group` with a `_groupTitle` — a structure this build
   * does not have — so it marked nothing and hid nothing, while reporting
   * success. It now finds the cell by its own label.
   *
   * Hidden, never removed: the cell is what the console clicks to reach the real
   * level options, and a `display:none` element is still clickable.
   */
  function markEffortCell() {
    for (const cell of document.querySelectorAll('[class*="_7KE1Ra_cell"]')) {
      if (cell.hasAttribute('data-550c-effort')) continue
      const label = (cell.querySelector('[class*="_cellLabel"]')?.textContent ?? '').trim()
      if (/推理|等级|Effort|Reasoning/i.test(label)) cell.setAttribute('data-550c-effort', '')
    }
  }

  function attach() {
    const host = card()
    if (host === null) return false

    // Header first: the band above the input. It carries the mark and the
    // throughput bar, so there is no separate meter row to place.
    if (header.parentElement !== host) host.insertBefore(header, host.firstChild)

    // The rheostat fills the CONTROL ROW'S MIDDLE: between the app's tools group
    // and its trailing group, which is exactly where the row has empty space and
    // where the user asked for it. It is one more flex item in the app's own row,
    // never an overlay on it.
    const row = host.querySelector('[class*="_row"]')
    if (row !== null && load.parentElement !== row) {
      const trailing = trailingGroup(host)
      if (trailing !== null && trailing.parentElement === row) row.insertBefore(load, trailing)
      else row.appendChild(load)
    }

    markEffortCell()
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

  /**
   * Is the agent working right now?
   *
   * Read from the app's own markers rather than guessed, and from more than one,
   * because each covers a different part of a run:
   *
   *   `[data-streaming]`        the assistant's text is arriving right now
   *   `[data-state="running"]`  a reasoning block is still open — which is what
   *                             covers the stretch BEFORE the first token lands,
   *                             when nothing is streaming yet
   *   the measured output rate  the transcript is growing, which catches anything
   *                             the two markers miss
   *
   * The rate is held for a moment after it stops, so the mark does not flicker
   * back to idle in the gaps between chunks.
   */
  const WORKING_MARKERS = ['[data-streaming]', '[data-state="running"]']
  let rateHoldUntil = 0

  function isWorking() {
    for (const selector of WORKING_MARKERS) {
      if (document.querySelector(selector) !== null) return true
    }
    return Date.now() < rateHoldUntil
  }

  /** Paint the mark's working state, and the header's own readout with it. */
  function renderWorking(working) {
    if (working === (header.getAttribute('data-550c-working') !== null)) return
    if (working) header.setAttribute('data-550c-working', '')
    else header.removeAttribute('data-550c-working')
    // The readout says what the mark is showing, so the state is legible as text
    // too and not only as movement.
    state.textContent = working ? 'RUNNING' : 'READY'
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
      renderWorking(isWorking())
      return
    }
    const rate = elapsed < 0.4 ? 0 : grown / elapsed
    const tps = rate / CHARS_PER_TOKEN
    // Measured output counts as work, and keeps counting briefly after it stops.
    if (tps > 0.5) rateHoldUntil = now + 1200
    renderTps(tps)
    renderWorking(isWorking())
  }

  // The meter is driven by observed growth, so it needs no cooperation from the
  // app and keeps working through any renderer change.
  const tpsTimer = window.setInterval(tickTps, RATE_TICK_MS)
  lastChars = transcriptChars()

  /* ── the rheostat ──────────────────────────────────────────────────── */

  let index = 0

  /** Paint the fader and its readout for one detent. */
  function paint() {
    const stop = LOAD_STOPS[index]
    const fraction = stop.load

    loadNow.textContent = stop.label
    // The percentage is carried on the slider itself rather than printed, so the
    // row stays quiet while the value is still available to anything that reads
    // the DOM.
    track.setAttribute('aria-valuenow', String(index))
    track.setAttribute('aria-valuetext', stop.label)
    load.setAttribute('data-550c-load', String(Math.round(fraction * 100)))

    // Light the blocks up to the load, and leave the rest dark: the boundary
    // between the two IS the reading, which is why the handle is only a marker
    // on top of it rather than the thing carrying the value.
    const lit = Math.round(fraction * LOAD_CELLS)
    for (let position = 0; position < LOAD_CELLS; position += 1) {
      cellNodes[position].dataset.lit = position < lit ? '1' : '0'
    }
    thumb.style.left = Math.round(fraction * 100) + '%'
    // The level attribute is what the stylesheet keys the colour ladder and the
    // pulse off, so "how loaded is it" is expressed once, in the DOM, and the
    // CSS owns every visual consequence.
    const level = fraction >= 0.9 ? 'max' : fraction >= 0.6 ? 'high' : fraction >= 0.4 ? 'mid' : 'low'
    for (const node of [load, track]) node.setAttribute('data-550c-level', level)
  }

  /**
   * True while the console is driving the app's own menus.
   *
   * Applying a level means opening the app's model menu, stepping into its effort
   * submenu and clicking an option. The app closes those menus on an outside
   * click, so a drive must not be interrupted by one — and while it runs, the
   * console must not treat the clicks it makes as user input either.
   */
  let driving = false

  /**
   * The level the console is trying to set, and whether a drive is in flight.
   *
   * Drives are SERIALISED, and this is not a refinement — it is a correctness
   * fix. Each drive opens the app's menus, clicks through them and closes them
   * again, so two running at once fight over the same popovers. Dragging the
   * fader or holding an arrow key fires a change per step, which started a drive
   * per step: three quick steps to `满载` left the harness on `Low`, and four
   * back to `空载` left it on `High` — the app was being set to a level nobody
   * asked for, by whichever drive happened to click last.
   *
   * With one loop and a single pending target, rapid changes coalesce: the
   * intermediate levels are skipped and the harness ends on the one you stopped
   * at, which is the only outcome that matters.
   */
  let pendingLevel = null
  let applying = false

  async function applyLevel(stop) {
    pendingLevel = stop
    if (applying) return
    applying = true
    try {
      while (pendingLevel !== null && !cancelled) {
        const target = pendingLevel
        pendingLevel = null
        await driveApp(target)
      }
    } finally {
      applying = false
    }
  }

  /**
   * Poll for a node until it appears, or give up.
   *
   * The harness's menus render a frame or two after the click that opens them,
   * so every step of the drive has to wait rather than query immediately.
   */
  async function waitFor(find) {
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const found = find()
      if (found !== null) return found
      await sleep(20)
    }
    return null
  }

  /**
   * Drive the harness's own reasoning-effort control to one level.
   *
   * There is no service for this — model and effort selection are exposed only
   * through the app's own menus — so the console drives them the way a user
   * would. It is a TWO-STEP path, which is what an earlier version got wrong:
   * the model menu holds a `推理等级` cell that opens a SUBMENU, and the real
   * level options (`Off`/`Low`/`High`/`Max`) live in that submenu. Matching
   * option text against the model menu found nothing, so every detent painted
   * correctly while the harness's effort never changed at all.
   *
   * Two things make it reliable, and both were earned:
   *
   *   - it RESETS first, closing whatever a previous drive left open. Without
   *     that, a drive that started while the menus were mid-transition clicked
   *     into a stale tree and the level silently did not take.
   *   - it VERIFIES against the harness's own effort label and retries once.
   *     The check reads the app's state, not ours, so it cannot pass by the
   *     console simply agreeing with itself.
   *
   * And one thing makes it INVISIBLE. The menus have to be opened for the option
   * buttons to exist, but they must not be seen: every move of the fader used to
   * flash the effort picker open and shut under the user's hand. A marker on
   * `<html>` hides the menu for the duration of the drive while leaving it fully
   * built and clickable, and is removed in the `finally` so a thrown error can
   * never leave the app's own menu permanently invisible.
   *
   * Best-effort by design: if the shape has changed, the console still reads
   * correctly, it simply cannot set the value.
   *
   * @returns a promise of whether the harness ended on the requested level.
   */
  async function driveApp(stop) {
    const trigger = document.querySelector('[class*="_7KE1Ra_trigger"]')
    if (trigger === null) return false
    const wanted = EFFORT_NAMES[stop.id] ?? []

    /** What the harness itself says the level is, hidden or not. */
    const appLabel = () =>
      (document.querySelector('[class*="_7KE1Ra_triggerEffort"]')?.textContent ?? '').trim()

    driving = true
    document.documentElement.setAttribute('data-550c-driving', '')
    try {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        // Start from a known state.
        document.body.click()
        await sleep(60)

        // Step 1: open the model menu and find the effort cell by its label.
        trigger.click()
        const cell = await waitFor(() => {
          for (const candidate of document.querySelectorAll('[class*="_7KE1Ra_cell"]')) {
            const label = (candidate.querySelector('[class*="_cellLabel"]')?.textContent ?? '').trim()
            if (/推理|等级|Effort|Reasoning/i.test(label)) return candidate
          }
          return null
        })
        if (cell === null) {
          document.body.click()
          return false
        }

        // Step 2: open its submenu and click the matching level. Exact match
        // first, so `Off` cannot be satisfied by a longer label containing it.
        cell.click()
        const option = await waitFor(() => {
          const options = Array.from(document.querySelectorAll('[class*="_7KE1Ra_option"], [role="menuitemradio"]'))
          const texts = options.map((candidate) => (candidate.textContent ?? '').trim())
          for (const name of wanted) {
            const exact = texts.indexOf(name)
            if (exact !== -1) return options[exact]
          }
          for (const name of wanted) {
            const partial = texts.findIndex((text) => text.includes(name))
            if (partial !== -1) return options[partial]
          }
          return null
        })
        if (option !== null) option.click()
        await sleep(90)
        // Close the menus: leaving them open would cover the composer.
        document.body.click()

        if (wanted.some((name) => appLabel() === name || appLabel().includes(name))) return true
      }
      return false
    } finally {
      // The marker must come off whatever happens, or the app's own menu would
      // stay invisible for the rest of the session.
      document.documentElement.removeAttribute('data-550c-driving')
      driving = false
    }
  }

  function select(next, apply) {
    index = Math.max(0, Math.min(LOAD_STOPS.length - 1, next))
    paint()
    // Not awaited: the detent should move under the hand, and setting the app's
    // value takes a few frames while its menus render. `applyLevel` serialises
    // those drives, so dragging does not start one per step.
    if (apply === true) void applyLevel(LOAD_STOPS[index])
  }

  // No trigger and no panel to open or dismiss: the fader is always on screen,
  // so the only handlers it needs are the ones that move it.

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

  paint()

  /* ── the boot ──────────────────────────────────────────────────────── */

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
    // A drive may still be in flight when the skin is switched off, so the
    // invisibility marker is cleared here too — otherwise the app's own menu
    // would stay hidden after the console is gone.
    document.documentElement.removeAttribute('data-550c-driving')
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
