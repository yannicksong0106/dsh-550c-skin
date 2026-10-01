/**
 * Scenario: find every element still painted in a colour outside the scheme.
 *
 * A token remap is only as complete as the ladder it covers, and the failure
 * mode is silent: one unmapped token leaves one blue button in an amber console
 * and nothing reports it. This walks the live tree, computes each element's own
 * background and text colour, and lists the ones whose hue is outside the
 * phosphor's own family — with the class name and the value, so the missing
 * token can be identified without guessing.
 *
 * "Outside the family" is decided by hue: the four schemes are amber (~35°),
 * green (~130°), cyan (~185°) and neutral, so blue and violet are the hues that
 * stand out, and they are exactly what an unmapped DSH blue looks like.
 */
;(() => {
  const rgb = (value) => {
    const match = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/.exec(value || '')
    if (match === null) return null
    return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: match[4] === undefined ? 1 : Number(match[4]) }
  }

  const hue = ({ r, g, b }) => {
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    if (max === min) return -1
    const d = max - min
    let h
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    return h < 0 ? h + 360 : h
  }

  // Hues this skin legitimately produces: amber/red family, green, cyan, none.
  const inFamily = (h) => h < 0 || (h >= 0 && h <= 60) || (h >= 100 && h <= 210)

  const offenders = []
  for (const element of document.querySelectorAll('body *')) {
    const style = getComputedStyle(element)
    for (const [kind, value] of [
      ['bg', style.backgroundColor],
      ['fg', style.color],
    ]) {
      const colour = rgb(value)
      if (colour === null || colour.a < 0.15) continue
      // Near-black and near-white carry no hue worth reporting.
      const max = Math.max(colour.r, colour.g, colour.b)
      const min = Math.min(colour.r, colour.g, colour.b)
      if (max - min < 24) continue
      const h = hue(colour)
      if (inFamily(h)) continue
      const cls = typeof element.className === 'string' ? element.className : ''
      offenders.push({
        kind: kind,
        hue: Math.round(h),
        value: value,
        tag: element.tagName.toLowerCase(),
        cls: cls.slice(0, 70),
        text: (element.textContent || '').trim().slice(0, 24),
      })
    }
  }

  // Distinct by class+value so one repeated style is reported once.
  const seen = new Set()
  const unique = offenders.filter((item) => {
    const key = item.cls + '|' + item.value + '|' + item.kind
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  document.body.setAttribute('data-offenders', JSON.stringify(unique.slice(0, 60)))
  return 'ok'
})()
