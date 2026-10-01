/**
 * Scenario: report exactly what the skin did to the document.
 *
 * The screenshot alone cannot separate "the token ladder was applied" from "my
 * own rules painted dark rectangles over a light app", which is the ambiguity
 * that matters when the theme service and the presenter disagree. This writes a
 * compact JSON summary onto a body attribute, where the shoot tool's probe
 * prints it back.
 */
;(() => {
  const one = (selector) => document.querySelector(selector)
  const computed = (element) => (element === null ? null : getComputedStyle(element))
  const bg = (selector) => {
    const element = one(selector)
    return element === null ? null : computed(element).backgroundColor
  }
  const tokens = (name) => {
    const declared = document.body.style.getPropertyValue(name)
    const resolved = computed(document.body).getPropertyValue(name)
    return { declared: declared || null, resolved: resolved.trim() || null }
  }

  const diag = {
    html: Array.from(document.documentElement.attributes).map((a) => a.name + '=' + a.value),
    body: Array.from(document.body.attributes)
      .filter((a) => a.name !== 'data-diag')
      .map((a) => a.name + '=' + a.value),
    dark: document.body.hasAttribute('data-ds-dark-theme'),
    colorScheme: document.documentElement.style.colorScheme,
    // The theme presenter appends this node on its first apply, so its presence
    // is what separates "the presenter ran and chose these values" from "the
    // presenter never ran and the boot script's values happen to match".
    metaThemeColor: document.querySelector('meta[name="theme-color"]') !== null,
    metaThemeColorValue: document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? null,
    pluginSheets: document.querySelectorAll('style[data-plugin-css]').length,
    // A package loaded twice produces two plugin instances, two service
    // providers and two stylesheets — which is exactly how a theme can be
    // active in one instance while the presenter watches another.
    themeSheets: document.querySelectorAll('style[data-plugin="@deepseek-ai/dsh-client-ui-theme"]').length,
    slotRoots: document.querySelectorAll('[data-slot="root"]').length,
    pluginTags: Array.from(document.querySelectorAll('style[data-plugin]'))
      .map((node) => node.getAttribute('data-plugin'))
      .filter((name, index, all) => all.indexOf(name) === index).length,
    skinStyle: document.getElementById('dsh-550c-skin-style') !== null,
    rails: document.querySelectorAll('.c-rail').length,
    crt: document.querySelector('.c-crt') !== null,
    tokenCount: document.body.style.length,
    bgBase: tokens('--dsw-alias-bg-base'),
    labelPrimary: tokens('--dsw-alias-label-primary'),
    sidebarFill: tokens('--dsw-specific-sidebar-fill'),
    skinToken: computed(document.documentElement).getPropertyValue('--c-amber').trim(),
    paints: {
      html: computed(document.documentElement).backgroundColor,
      body: computed(document.body).backgroundColor,
      root: bg('#root'),
      frame: bg('[class*="_frame"]'),
      sidebar: bg('[class*="_sidebarCol"]'),
      center: bg('[class*="_centerCol"]'),
      composer: bg('[data-composer-card]'),
    },
  }

  document.body.setAttribute('data-diag', JSON.stringify(diag))
  return 'ok'
})()
