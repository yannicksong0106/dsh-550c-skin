/**
 * Scenario: how much DOM churn is the page generating?
 *
 * The skin's console watches the whole body with a MutationObserver so it can
 * re-attach its nodes when the app re-renders. If that observer is being called
 * in a storm, real interaction would feel unresponsive even though every scripted
 * check passes — it is the one plausible way this skin could still be at fault.
 *
 * This counts raw mutations per second, independent of the skin, so the number
 * can be compared with the skin off and on.
 */
;(() => {
  window.__churn = { total: 0, started: Date.now() }
  const observer = new MutationObserver((records) => {
    window.__churn.total += records.length
  })
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true })

  return 'counting'
})()
