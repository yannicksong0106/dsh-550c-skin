/**
 * Scenario: report the bounding box of every landmark in the shell.
 *
 * The skin's contract is that it changes how DSH looks and never where anything
 * is. A screenshot cannot prove that — a shifted layout and a restyled one look
 * equally plausible in a picture. This can: run it twice, once with the skin on
 * and once off, and diff the two JSON blobs. Identical geometry is the proof.
 *
 * Rects are rounded to whole pixels so sub-pixel font-metric noise from the
 * monospace stack does not read as a layout change, and the comparison that
 * matters is `left`/`top`/`width`/`height`, which are exactly what a padding,
 * margin or flex change would move.
 */
;(() => {
  const SELECTORS = {
    root: '#root',
    frame: '[class*="_frame"]',
    sidebar: '[class*="_sidebarCol"]',
    center: '[class*="_centerCol"]',
    rightbar: '[class*="_rightbarCol"]',
    sidebarHeader: '[class*="_logoRow"]',
    newSession: '[class*="_newSession"]',
    regionArea: '[class*="_regionArea"]',
    listArea: '[class*="_listArea"]',
    footer: '[class*="_footArea"]',
    settingsArea: '[class*="_settingsArea"]',
    composerSeat: '[data-composer-seat]',
    composerCard: '[data-composer-card]',
    composerInput: '[data-composer-input]',
    // The placeholder is in the list because the skin draws a block cursor as an
    // inline pseudo-element at its end: that is the one decoration inside text
    // flow, so it is the one that could wrap and push a line box. Measuring it
    // is how that stays a checked fact rather than a hope.
    placeholder: '[data-composer-placeholder], [class*="_placeholder"]',
    hero: '[class*="_hero"]',
    headline: '[class*="_headline"]',
  }

  const report = {}
  for (const [name, selector] of Object.entries(SELECTORS)) {
    let element = null
    try {
      element = document.querySelector(selector)
    } catch (error) {
      report[name] = 'selector-error'
      continue
    }
    if (element === null) {
      report[name] = null
      continue
    }
    const rect = element.getBoundingClientRect()
    report[name] = {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      w: Math.round(rect.width),
      h: Math.round(rect.height),
    }
  }

  // Body scroll metrics also catch a page that grew a scrollbar or lost height.
  report.__body = {
    scrollW: document.documentElement.scrollWidth,
    scrollH: document.documentElement.scrollHeight,
    clientW: document.documentElement.clientWidth,
    clientH: document.documentElement.clientHeight,
  }

  // The ancestor chain from the workspace seat up to #root, with the box-model
  // numbers that could explain a width change. A cascade of 1-2px shifts is
  // otherwise very hard to attribute; this names the level where it starts.
  const chain = []
  let node = document.querySelector('[data-composer-seat]')
  while (node !== null && node !== document.documentElement) {
    const rect = node.getBoundingClientRect()
    const style = getComputedStyle(node)
    chain.push({
      tag: node.tagName.toLowerCase(),
      cls: (typeof node.className === 'string' ? node.className : '').slice(0, 60),
      x: Math.round(rect.left),
      w: Math.round(rect.width),
      box: style.boxSizing,
      pad: style.paddingLeft + '/' + style.paddingRight,
      bord: style.borderLeftWidth + '/' + style.borderRightWidth,
      ovf: style.overflowX + '/' + style.overflowY,
      scrollbar: Math.round(node.offsetWidth - node.clientWidth),
      display: style.display,
    })
    node = node.parentElement
  }
  report.__chain = chain

  document.body.setAttribute('data-rects', JSON.stringify(report))
  return 'ok'
})()
