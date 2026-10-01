/**
 * The CRT atmosphere layer.
 *
 * One absolutely-positioned, `pointer-events:none` element carries every
 * atmospheric effect the skin adds — scanlines, the rolling refresh band, the
 * vignette, the phosphor bloom and a stepped flicker. It is added to `<body>`
 * and covers the viewport, so it is the one thing here that touches the DOM
 * outside a stylesheet; everything else the skin does is CSS on the app's own
 * elements.
 *
 * WHY ONE LAYER AND NOT PSEUDO-ELEMENTS
 *
 * `html::before` is already spoken for — dsh-550c-boot's first-frame cover uses
 * it, and the splash's own stage uses `#final::before`. A dedicated node cannot
 * collide with either, and it can be switched off as a unit by a single
 * attribute on `<html>`.
 *
 * The layer sits above the app (z-index 2147480000) but deliberately below the
 * boot splash (2147482000), so a splash playing over a skinned UI stays clean.
 *
 * @param options.effects - which axes to include, from the stored preferences.
 * @returns a disposer that removes the layer.
 */
function mountCrt() {
  const crt = document.createElement('div')
  crt.className = 'c-crt'
  crt.setAttribute('aria-hidden', 'true')
  for (const layer of ['c-bloom', 'c-scan', 'c-roll', 'c-vig', 'c-flicker']) {
    const element = document.createElement('i')
    element.className = layer
    crt.appendChild(element)
  }
  document.body.appendChild(crt)
  return function stop() {
    crt.remove()
  }
}
