/**
 * Scenario: drive the skin's own settings rows, then switch it off from them.
 *
 * Two things need proving that a boot-time state cannot cover:
 *
 *   1. the three rows actually render in 设置 → 通用 (a slot registration that
 *      fails silently leaves no trace anywhere);
 *   2. the LIVE off path removes everything. Deactivating at load and
 *      deactivating from a click are different code paths into the same
 *      teardown, and the click is the one a user takes.
 *
 * The settings panel is opened by clicking the footer's 设置 control, then the
 * rows are located by their own text. Everything reports instead of throwing so
 * a miss costs one field rather than the run.
 */
;(() => {
  const report = { steps: [] }
  const leaves = () => Array.from(document.querySelectorAll('*')).filter((el) => el.children.length === 0)
  const byText = (text) => leaves().find((el) => (el.textContent || '').trim() === text)

  // Open the settings panel from the sidebar footer.
  const settings = byText('设置')
  if (settings !== null) {
    ;(settings.closest('button') ?? settings.parentElement ?? settings).click()
    report.steps.push('clicked 设置')
  } else {
    report.steps.push('设置 control not found')
  }

  window.setTimeout(() => {
    const row = document.querySelector('.dsh550c-skin-row')
    report.rows = document.querySelectorAll('.dsh550c-skin-row').length
    report.titles = Array.from(document.querySelectorAll('.dsh550c-skin-row-title')).map((el) => el.textContent)
    report.segments = Array.from(document.querySelectorAll('.dsh550c-skin-seg')).map((seg) =>
      Array.from(seg.querySelectorAll('button')).map((button) => button.textContent),
    )
    report.activeSegments = Array.from(document.querySelectorAll('.dsh550c-skin-seg button.on')).map((b) => b.textContent)

    // Click 关闭 in the first row — the live off path.
    if (row !== null) {
      const off = Array.from(row.querySelectorAll('button')).find((button) => button.textContent === '关闭')
      if (off !== undefined) {
        off.click()
        report.steps.push('clicked 关闭')
      } else {
        report.steps.push('关闭 button not found')
      }
    }

    window.setTimeout(() => {
      report.after = {
        skinStyle: document.getElementById('dsh-550c-skin-style') !== null,
        ladderStyle: document.getElementById('dsh-550c-skin-ladder') !== null,
        crtLayer: document.querySelector('.c-crt') !== null,
        htmlAttrs: Array.from(document.documentElement.attributes)
          .map((a) => a.name)
          .filter((n) => n.startsWith('data-550c')),
        inlineSkinTokens: Array.from(document.documentElement.style).filter((n) => n.startsWith('--c-')).length,
        darkAttribute: document.body.hasAttribute('data-ds-dark-theme'),
        colorScheme: document.documentElement.style.colorScheme,
        bgBase: getComputedStyle(document.body).getPropertyValue('--dsw-alias-bg-base').trim(),
      }
      window.__settingsProbe = report
      document.body.setAttribute('data-settings-probe', JSON.stringify(report))
    }, 1200)
  }, 1600)

  return report.steps.join(', ')
})()
