/**
 * Scenario: does the effort menu ever become VISIBLE while the fader is driven?
 *
 * The bug report was exact: every move of the fader flashed the reasoning-effort
 * picker open and shut. The cause was that the drive really does open the app's
 * menus — it has to, because the option buttons only exist while the menu is
 * open — and nothing hid them.
 *
 * A screenshot cannot catch a flash, so this watches: it moves the fader and
 * samples the menu's computed visibility on every frame for the whole drive,
 * reporting whether it was ever on screen and for how many samples. Zero visible
 * samples is the only acceptable answer.
 */
;(() => {
  const report = { samples: 0, visibleSamples: 0, states: [], markerSeen: false }
  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

  const menuState = () => {
    const menu = document.querySelector('[class*="_7KE1Ra_menu"]')
    if (menu === null) return 'absent'
    const style = getComputedStyle(menu)
    const rect = menu.getBoundingClientRect()
    return {
      visibility: style.visibility,
      display: style.display,
      opacity: style.opacity,
      w: Math.round(rect.width),
      h: Math.round(rect.height),
      // The thing that matters: could a person see it?
      onScreen: style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0,
    }
  }

  async function main() {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const track = document.querySelector('.c-load-track')
      if (track !== null) {
        // Start from the bottom so the move is a real change.
        track.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
        await sleep(400)

        // Sample continuously across three fader moves.
        let sampling = true
        const sampler = window.setInterval(() => {
          if (!sampling) return
          const state = menuState()
          report.samples += 1
          if (document.documentElement.hasAttribute('data-550c-driving')) report.markerSeen = true
          if (state !== 'absent') {
            if (state.onScreen) report.visibleSamples += 1
            if (report.states.length < 6) report.states.push(state)
          }
        }, 16)

        track.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
        await sleep(700)
        track.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
        await sleep(700)
        track.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
        await sleep(900)

        sampling = false
        window.clearInterval(sampler)
        report.markerCleared = !document.documentElement.hasAttribute('data-550c-driving')
        report.finalLevel = document.querySelector('.c-load-now')?.textContent ?? null
        report.appEffort = (document.querySelector('[class*="_7KE1Ra_triggerEffort"]')?.textContent ?? '').trim()
        document.body.setAttribute('data-flash', JSON.stringify(report))
        return
      }
      await sleep(150)
    }
    document.body.setAttribute('data-flash', JSON.stringify({ present: false }))
  }

  main().catch((error) => {
    report.error = String(error && error.message ? error.message : error)
    document.body.setAttribute('data-flash', JSON.stringify(report))
  })
  return 'watching'
})()
