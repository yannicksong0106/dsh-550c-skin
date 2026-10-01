/**
 * Scenario: prove the skin leaves nothing behind when it is switched off.
 *
 * A skin that removes most of itself is worse than one that never applied: a
 * leftover token stylesheet or a stray `data-ds-dark-theme` shows up as a UI
 * that is subtly wrong days later, with no obvious cause. So the off state is
 * checked as its own list of absences — every style tag, every attribute, every
 * inline property and every overlay node the skin is known to create.
 */
;(() => {
  const root = document.documentElement
  const body = document.body

  const report = {
    // Stylesheets the skin owns.
    skinStyle: document.getElementById('dsh-550c-skin-style') !== null,
    ladderStyle: document.getElementById('dsh-550c-skin-ladder') !== null,
    rowStylePresent: document.getElementById('dsh-550c-skin-row-style') !== null,
    // The overlay the CRT effects live in.
    crtLayer: document.querySelector('.c-crt') !== null,
    // Attributes on <html>.
    htmlAttrs: Array.from(root.attributes)
      .map((attribute) => attribute.name)
      .filter((name) => name.startsWith('data-550c')),
    // Inline design tokens on <html>.
    inlineSkinTokens: Array.from(root.style)
      .filter((name) => name.startsWith('--c-'))
      .slice(0, 5),
    inlineSkinTokenCount: Array.from(root.style).filter((name) => name.startsWith('--c-')).length,
    // Anything the skin wrote to <body>.
    bodyInlineTokens: Array.from(body.style).filter((name) => name.startsWith('--dsw-')).length,
    // Dark mode must be back under the app's control: with the theme
    // preference at `system` in a light browser, a skin that forgot to hand it
    // back leaves the attribute on.
    darkAttribute: body.hasAttribute('data-ds-dark-theme'),
    colorScheme: root.style.colorScheme,
    // A single spot check that the stock palette is back.
    labelPrimary: getComputedStyle(body).getPropertyValue('--dsw-alias-label-primary').trim(),
    bgBase: getComputedStyle(body).getPropertyValue('--dsw-alias-bg-base').trim(),
  }

  report.clean =
    !report.skinStyle &&
    !report.ladderStyle &&
    !report.crtLayer &&
    report.htmlAttrs.length === 0 &&
    report.inlineSkinTokenCount === 0 &&
    report.bodyInlineTokens === 0

  body.setAttribute('data-residue', JSON.stringify(report))
  return 'ok'
})()
