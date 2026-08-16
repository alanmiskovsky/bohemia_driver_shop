/**
 * Stripe integration placeholder
 * Install @stripe/stripe-js when ready to implement
 * npm install @stripe/stripe-js @stripe/react-stripe-js
 */

const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY

// Placeholder - will be replaced with actual Stripe.js
let stripePromise = null

export const getStripe = () => {
  if (!stripePromise && STRIPE_PUBLIC_KEY) {
    // Uncomment when stripe is installed:
    // import { loadStripe } from '@stripe/stripe-js'
    // stripePromise = loadStripe(STRIPE_PUBLIC_KEY)
    console.warn('Stripe not configured. Install @stripe/stripe-js and set VITE_STRIPE_PUBLIC_KEY')
  }
  return stripePromise
}

export const createPaymentIntent = async (amount, currency = 'czk') => {
  // This should call your backend which creates the PaymentIntent
  const response = await fetch('/wp-json/bohemia/v1/create-payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, currency }),
  })
  return response.json()
}

export const confirmPayment = async (clientSecret, paymentMethod) => {
  const stripe = await getStripe()
  if (!stripe) throw new Error('Stripe not initialized')

  return stripe.confirmCardPayment(clientSecret, {
    payment_method: paymentMethod,
  })
}
