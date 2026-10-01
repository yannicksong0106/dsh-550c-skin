/**
 * The 550C mark, living in the dialog box.
 *
 * WHERE IT SITS AND WHY
 *
 * The composer card's toolbar row has a measured 415px of empty space between the
 * permission trigger and the model selector (x 194..609 of a 877px card — see
 * tools/scenarios/composer-map.js). That gap is where this goes: centred on the
 * card, vertically inside the toolbar row, so the mark reads as part of the
 * input bay rather than as something floating in the conversation.
 *
 * It is absolutely positioned and `pointer-events:none`, which is not a detail:
 * the composer's height is driven by its own content, so a mark in flow would
 * resize the whole input cluster. Out of flow it can be any size without moving
 * a single box — the same rule the rest of this skin follows.
 *
 * WHAT IT DOES
 *
 * The pixel mark writes itself out cell by cell, then two short boot lines type
 * themselves, then it settles into a standing `READY` readout and stays.
 *
 * Deliberately NOT here: the overwrite walk, the 47 nodes, the phase list, the
 * anomalies. That material belongs to the splash, where it is the point of a
 * sixteen-second show. In the dialog box it was noise — the mark only has to say
 * which machine you are typing into, and that it is up.
 */

/* ── the mark, as block glyphs ───────────────────────────────────────────── */

/**
 * A 4x5 cell font for the three glyphs the logo needs.
 *
 * Five rows is the smallest height that still reads as `550C` at a glance; the
 * shapes are authored as cells so the "writing" motion is the same quantised
 * motion as the text beside it, which is what gives the mark its pixel quality
 * rather than merely making it small.
 */
const DIALOG_GLYPHS = {
  '5': ['████', '█···', '███·', '···█', '████'],
  '0': ['·██·', '█··█', '█··█', '█··█', '·██·'],
  C: ['·███', '█···', '█···', '█···', '·███'],
}

/** `550C` on five rows, one blank column between glyphs. */
function dialogLogoRows() {
  const order = ['5', '5', '0', 'C']
  return Array.from({ length: 5 }, (_, row) => order.map((glyph) => DIALOG_GLYPHS[glyph][row]).join(' '))
}

/**
 * The two lines the mark types before it settles.
 *
 * Short on purpose. These are the opening beats of the splash's own boot phase,
 * kept because they are what identifies the machine — everything after them in
 * the splash is the operation, and the operation is not this panel's job.
 */
const DIALOG_LINES = [
  ['[550C] 核心在线。', 'sys'],
  ['[550C] 经典控制单元就绪。', 'sys'],
]

/** Milliseconds per character while typing. Slow enough to watch a glyph land. */
const DIALOG_TYPE_MS = 34
/** Milliseconds per logo cell while the mark writes itself out. */
const DIALOG_LOGO_MS = 16

/**
 * Mount the mark inside the composer.
 *
 * The composer card is rendered by another plugin's component, so the node is
 * appended to it and re-appended if a re-render drops it. That is safe here
 * precisely because the node is absolutely positioned: DOM order has no visual
 * consequence, so being the last child can never disturb the card's own layout.
 *
 * @returns a disposer that stops the sequence and removes the node.
 */
function mountDialogMark() {
  const root = document.createElement('div')
  root.className = 'c-dialog-mark'
  root.setAttribute('aria-hidden', 'true')

  const logo = document.createElement('pre')
  logo.className = 'c-dialog-logo'
  const text = document.createElement('div')
  text.className = 'c-dialog-text'
  root.append(logo, text)

  let cancelled = false
  let timer = null

  /** The card to live in; null until the shell has rendered one. */
  const card = () => document.querySelector('[data-composer-card]')

  function attach() {
    const host = card()
    if (host === null) return false
    if (root.parentElement !== host) host.appendChild(root)
    return true
  }

  // The card can be replaced by a re-render, and it does not exist at all until
  // the shell mounts; the observer covers both, cheaply.
  const observer = new MutationObserver(() => {
    if (!cancelled) attach()
  })
  observer.observe(document.body, { childList: true, subtree: true })
  attach()

  const disposed = () => cancelled

  /**
   * Await a step, cancellably.
   *
   * The short-circuit here keys on DISPOSAL only — never on connectivity. The
   * composer does not exist yet when this plugin applies (it is rendered later,
   * by the shell), so a wait that treated "not attached" as "dead" would burn
   * through its whole attempt budget instantly and abort the sequence before the
   * dialog box had ever appeared. That was this module's first bug, and it
   * presented as a mark with no content and no error.
   */
  const sleep = (ms) =>
    new Promise((resolve) => {
      timer = window.setTimeout(() => {
        timer = null
        resolve()
      }, ms)
      if (disposed()) {
        window.clearTimeout(timer)
        timer = null
        resolve()
      }
    })

  /** Type one line out, character by character, into the mark's text slot. */
  async function typeLine(source, tone) {
    const line = document.createElement('div')
    line.className = 'c-dialog-line' + (tone === undefined ? '' : ' is-' + tone)
    text.appendChild(line)
    while (text.children.length > 2) text.removeChild(text.firstChild)
    for (let index = 1; index <= source.length; index += 1) {
      if (disposed()) return
      line.textContent = source.slice(0, index)
      await sleep(DIALOG_TYPE_MS)
    }
  }

  /** The mark fills in cell by cell, left to right, top to bottom. */
  async function writeLogo() {
    const rows = dialogLogoRows()
    const blank = rows.map((row) => '·'.repeat(row.length))
    for (let row = 0; row < rows.length; row += 1) {
      for (let column = 1; column <= rows[row].length; column += 1) {
        if (disposed()) return
        blank[row] = rows[row].slice(0, column) + blank[row].slice(column)
        logo.textContent = blank.join('\n')
        await sleep(DIALOG_LOGO_MS)
      }
    }
  }

  async function run() {
    // Wait for the shell to render a composer before starting: the sequence is
    // short, and beginning it into a node that is not on the page would waste
    // the whole thing. Bounded, so a shell that never renders one cannot leave
    // this spinning forever.
    for (let attempt = 0; attempt < 80; attempt += 1) {
      if (disposed()) return
      if (attach()) break
      await sleep(120)
    }
    if (disposed()) return

    logo.textContent = dialogLogoRows()
      .map((row) => '·'.repeat(row.length))
      .join('\n')
    await writeLogo()
    await sleep(140)

    for (const [line, tone] of DIALOG_LINES) {
      await typeLine(line, tone)
      await sleep(160)
    }

    // Settled: the mark stays, and the panel stops asking to be watched. One
    // short readout replaces the log so the resting state says something useful
    // rather than holding the last typed line forever.
    root.setAttribute('data-550c-state', 'settled')
    text.replaceChildren()
    const ready = document.createElement('div')
    ready.className = 'c-dialog-line is-ready'
    ready.textContent = 'SYSTEM READY'
    text.appendChild(ready)
  }

  run().catch(() => {
    /* a disposed mark has nothing left to report */
  })

  return function stop() {
    cancelled = true
    if (timer !== null) window.clearTimeout(timer)
    observer.disconnect()
    root.remove()
  }
}
