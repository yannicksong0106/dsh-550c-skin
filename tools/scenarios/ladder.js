/**
 * Scenario: is the token ladder actually on <body>?
 *
 * The skin's colour half arrives two ways — the `--dsw-*` ladder written as
 * inline properties on <body>, and the stylesheet's own `--c-*` rules. A
 * screenshot cannot tell them apart, and mistaking one for the other is how a
 * skin ends up looking right on its own surfaces while every DSH component
 * keeps its stock colours. This reports the two separately.
 */
;(() => {
  const body = document.body
  const style = body.style
  const computed = getComputedStyle(body)
  const pick = (name) => ({
    declared: style.getPropertyValue(name) || null,
    resolved: computed.getPropertyValue(name).trim() || null,
  })

  const report = {
    inlineCount: style.length,
    bgBase: pick('--dsw-alias-bg-base'),
    sidebarFill: pick('--dsw-specific-sidebar-fill'),
    infoFill: pick('--dsw-alias-button-info-fill'),
    businessTertiary: pick('--dsw-alias-state-business-tertiary'),
    labelPrimary: pick('--dsw-alias-label-primary'),
    // What the DSH components actually end up painted with.
    primaryButtonBg: (() => {
      const element = document.querySelector('[class*="_primary"]')
      return element === null ? null : getComputedStyle(element).backgroundColor
    })(),
    previewBadgeBg: (() => {
      const element = document.querySelector('[class*="_previewBadge"]')
      return element === null ? null : getComputedStyle(element).backgroundColor
    })(),
    newSessionBg: (() => {
      const element = document.querySelector('[class*="_newSession"]')
      return element === null ? null : getComputedStyle(element).backgroundColor
    })(),
    labelPrimaryUsed: (() => {
      const element = document.querySelector('[class*="_projectText"], [class*="_sessionRow"]')
      return element === null ? null : getComputedStyle(element).color
    })(),
  }

  body.setAttribute('data-ladder', JSON.stringify(report))
  return 'ok'
})()
