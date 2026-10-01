/**
 * Scenario: is the running line wearing the console's colours?
 *
 * `深度求索中，用时 41秒` is DSH's own `RunningStatus` row. It is a
 * `div[data-chat-running]` — that attribute is the stable hook; the hashed class
 * beside it is not — whose visible text sits inside the app's shared
 * `TextShimmer`. The row takes its colour from `--dsw-alias-label-deep-diving`
 * and its sweep from `--dsw-alias-label-deep-diving-shimmer`, so owning those two
 * tokens is the entire treatment and the app supplies the motion.
 *
 * AN EARLIER VERSION OF THIS CHECK WAS WRONG IN A WAY WORTH RECORDING. It built a
 * pair of elements with the class `_turnStatus` and compared their boxes. That
 * class does not exist: the only `turnStatus` in DSH is a JS function named
 * `locationTurnStatus`. The check passed against markup the app never renders,
 * which is worse than failing — it certified a stylesheet rule that could not
 * match anything.
 *
 * Runs without a turn in flight, because the tokens resolve whether or not the
 * row is mounted; the row itself is only read when it happens to be there.
 */
;(() => {
  const body = getComputedStyle(document.body)
  const read = (name) => body.getPropertyValue(name).trim()

  /** `#c9c9c9` and `rgb(201, 201, 201)` have to compare equal here. */
  const normalize = (value) => {
    const hex = value.match(/^#([0-9a-f]{6})$/i)
    if (hex !== null) {
      const n = parseInt(hex[1], 16)
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(',')
    }
    const rgb = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    return rgb === null ? value : [rgb[1], rgb[2], rgb[3]].join(',')
  }

  // The skin's own design token for the accent: the activity colour has to agree
  // with it, or the line is not reading out in this machine's phosphor.
  const accent = read('--c-amber')
  const activity = read('--dsw-alias-label-deep-diving')
  const sweep = read('--dsw-alias-label-deep-diving-shimmer')

  const row = document.querySelector('[data-chat-running]')
  const rowStyle = row === null ? null : getComputedStyle(row)

  const problems = []
  if (accent === '') problems.push('the skin is not active (no --c-amber)')
  if (activity === '') problems.push('--dsw-alias-label-deep-diving is unset')
  else if (normalize(activity) !== normalize(accent)) {
    problems.push(`activity label ${activity} is not the accent ${accent}`)
  }
  if (sweep === '') problems.push('--dsw-alias-label-deep-diving-shimmer is unset')
  if (rowStyle !== null && normalize(rowStyle.color) !== normalize(activity)) {
    problems.push(`the mounted row renders ${rowStyle.color}, not ${activity}`)
  }

  document.body.setAttribute(
    'data-status',
    JSON.stringify({
      accent,
      activity,
      sweep,
      sharedShimmer: read('--dsw-alias-label-shimmer'),
      rowPresent: row !== null,
      rowColor: rowStyle === null ? null : rowStyle.color,
      rowText: row === null ? null : (row.textContent ?? '').trim().slice(0, 40),
      verdict: problems.length === 0 ? 'PASS' : 'FAIL',
      problems,
    }),
  )
  return 'ok'
})()
