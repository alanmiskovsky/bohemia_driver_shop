/**
 * Zasilkovna (Packeta) integration placeholder
 * Documentation: https://docs.packetery.com/
 */

const ZASILKOVNA_API_KEY = import.meta.env.VITE_ZASILKOVNA_API_KEY
const ZASILKOVNA_WIDGET_URL = 'https://widget.packeta.com/v6/www/js/library.js'

let widgetLoaded = false

/**
 * Load Zasilkovna widget script
 */
export const loadZasilkovnaWidget = () => {
  return new Promise((resolve, reject) => {
    if (widgetLoaded) {
      resolve(window.Packeta)
      return
    }

    const script = document.createElement('script')
    script.src = ZASILKOVNA_WIDGET_URL
    script.async = true
    script.onload = () => {
      widgetLoaded = true
      resolve(window.Packeta)
    }
    script.onerror = reject
    document.head.appendChild(script)
  })
}

/**
 * Open Zasilkovna pickup point selector
 */
export const openPickupPointSelector = async (options = {}) => {
  const Packeta = await loadZasilkovnaWidget()

  return new Promise((resolve) => {
    Packeta.Widget.pick(
      ZASILKOVNA_API_KEY,
      (point) => {
        if (point) {
          resolve({
            id: point.id,
            name: point.name,
            address: `${point.street}, ${point.city}, ${point.zip}`,
            city: point.city,
            zip: point.zip,
            country: point.country,
            latitude: point.latitude,
            longitude: point.longitude,
          })
        } else {
          resolve(null)
        }
      },
      {
        country: 'cz',
        language: 'cs',
        ...options,
      }
    )
  })
}

/**
 * Get shipping price for Zasilkovna
 */
export const getShippingPrice = async (weight, country = 'CZ') => {
  // This should call your backend for actual pricing
  const response = await fetch('/wp-json/bohemia/v1/shipping-price', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weight, country }),
  })
  return response.json()
}

/**
 * Create shipment in Zasilkovna
 */
export const createShipment = async (orderData) => {
  // This should call your backend which handles Zasilkovna API
  const response = await fetch('/wp-json/bohemia/v1/create-shipment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  })
  return response.json()
}
