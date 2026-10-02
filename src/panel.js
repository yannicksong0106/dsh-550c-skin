/**
 * The instrument panel: the sidebar's console dressing, and the console's
 * backdrop.
 *
 * WHAT THIS IS
 *
 * Everything the skin adds to the two largest surfaces in the app — the sidebar
 * column and the space behind the transcript — is built here, in ONE place, for
 * one reason: the preferences are about to be re-grouped, and a feature whose
 * only home is a stylesheet rule has no switch of its own.
 *
 * WHAT IT ADDS
 *
 * Decorations are attached to the app's OWN nodes rather than drawn over the
 * window, so they move with the layout they belong to:
 *
 *   the sidebar column      four bracket corners, and a label band at the top
 *   each session row         a status tick, on the row's first child
 *
 * The rest of the treatment — the grid behind the transcript, the per-project
 * group rails, the ledger at the foot of the sidebar — is painted by `skin.css`
 * from the `html[data-550c-panel]` attribute alone, because none of it needs a
 * node of its own.
 *
 * WHY THE DECORATIONS CANNOT BREAK THE LAYOUT
 *
 * Every node created here is `position:absolute` with `pointer-events:none`, so
 * none of it participates in layout and none of it can swallow a click. That is
 * the same contract as the CRT layer and the dialog console, and it is what keeps
 * `npm run geometry` byte-identical with the panel switched off.
 *
 * The sidebar is found by STRUCTURE — tall, narrow, in the left half of the
 * frame — rather than by class name. `_sidebarCol` is a CSS-module local name
 * that another build may rename, and the hash in front of it certainly differs
 * between the web profile and the desktop app; trusting either is what took the
 * effort picker out on the desktop build.
 *
 * @param options.sidebar - whether to dress the sidebar.
 * @param options.grid - whether to lay the backdrop behind the transcript.
 * @returns a disposer that removes every node it created.
 */
function mountPanel(options) {
  const created = []

  /** Create one decoration node and remember it for the disposer. */
  const make = (className, parent, tag) => {
    const node = document.createElement(tag ?? 'i')
    node.className = className
    node.setAttribute('aria-hidden', 'true')
    created.push(node)
    parent.appendChild(node)
    return node
  }

  /** The sidebar column, found by shape. */
  const findSidebar = () => {
    const frame = document.querySelector('[data-slot="root"] > *') ?? document.querySelector('[class*="_frame"]')
    const column = frame === null ? null : frame.firstElementChild
    if (column === null) return null
    const rect = column.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
    // A left-hand column: full height, narrow, in the left half.
    if (rect.height < window.innerHeight * 0.8) return null
    if (rect.width > window.innerWidth / 2) return null
    return rect.left < window.innerWidth / 2 ? column : null
  }

  /**
   * Everything the sidebar needs, run on mount AND on every mutation.
   *
   * IT HAS TO BE RE-RUNNABLE. The skin applies before the shell has finished
   * rendering, so on the first live run `findSidebar()` found nothing, the bracket
   * frame was never created, and only the row ticks appeared — because those came
   * from the observer while the frame came from a one-shot branch. The frame is
   * now created by the same pass that decorates the rows, so both wait for the
   * layout they belong to.
   */
  const decorate = () => {
    if (!options.sidebar) return

    // The bracket frame, once the column exists.
    if (document.querySelector('.c-panel-frame') === null) {
      const column = findSidebar()
      if (column !== null) {
        // The decorations are absolute, so their containing block has to be the
        // column — and the column is not positioned. `position:relative` with no
        // offset is the one layout property this sheet sets on a DSH element (it
        // anchors a decoration and moves nothing), and it is set from the
        // stylesheet keyed on this marker, so teardown is removing the marker.
        column.setAttribute('data-550c-panel-anchor', '')
        make('c-panel-frame', column)
      }
    }

    // A status tick on every session row.
    for (const row of document.querySelectorAll('[data-row-key^="session:"]')) {
      if (row.querySelector(':scope > .c-panel-tick') !== null) continue
      make('c-panel-tick', row)
    }
  }
  decorate()

  /** Watch for the sidebar, its rows, and rows arriving and leaving. */
  let observer = null
  if (options.sidebar) {
    let queued = false
    observer = new MutationObserver(() => {
      if (queued) return
      queued = true
      window.setTimeout(() => {
        queued = false
        decorate()
      }, 120)
    })
    observer.observe(document.body, { childList: true, subtree: true })
  }

  if (options.grid) {
    // The backdrop goes on `<body>`, BEFORE the app: it has to sit behind the
    // app's own surfaces, several of which paint their own background — the
    // frame, the sidebar and the centre column all do. A layer above them would
    // be drawing over the app rather than under it.
    const backdrop = document.createElement('div')
    backdrop.className = 'c-grid'
    backdrop.setAttribute('aria-hidden', 'true')
    created.push(backdrop)
    document.body.insertBefore(backdrop, document.body.firstChild)
  }

  return function stop() {
    if (observer !== null) observer.disconnect()
    for (const node of created) node.remove()
    // The anchor marker goes back off the app's own node, or a later mount would
    // inherit a `position:relative` nothing explains.
    for (const anchor of document.querySelectorAll('[data-550c-panel-anchor]')) {
      anchor.removeAttribute('data-550c-panel-anchor')
    }
  }
}
