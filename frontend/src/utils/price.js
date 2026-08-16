/**
 * Price helpers shared by the shop pages.
 */

const formatterWhole = new Intl.NumberFormat('cs-CZ', {
  style: 'currency',
  currency: 'CZK',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const formatterDecimal = new Intl.NumberFormat('cs-CZ', {
  style: 'currency',
  currency: 'CZK',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Format a major-unit amount (e.g. 1290 or 129.5) as Czech currency.
 * Whole numbers render without decimals ("1 290 Kč"), others with two ("129,50 Kč").
 */
export function formatPrice(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return formatterWhole.format(0)
  const rounded = Math.round(number * 100) / 100
  return Number.isInteger(rounded) ? formatterWhole.format(rounded) : formatterDecimal.format(rounded)
}

/**
 * Convert a Store API minor-unit amount (string or number, e.g. "5500" with minor unit 2)
 * to a major-unit number (55).
 */
export function minorToMajor(value, minorUnit = 2) {
  if (value === null || value === undefined || value === '') return 0
  const number = typeof value === 'number' ? value : parseInt(String(value), 10)
  if (!Number.isFinite(number)) return 0
  const unit = Number.isFinite(Number(minorUnit)) ? Number(minorUnit) : 2
  return number / 10 ** unit
}

export default formatPrice
