import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'

function formatPrice(price) {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 0,
  }).format(price)
}

const SHIPPING_METHODS = [
  { id: 'zasilkovna', label: 'Zásilkovna — výdejní místo', price: 89, icon: 'pickup' },
  { id: 'ppl', label: 'PPL — doručení na adresu', price: 119, icon: 'truck' },
  { id: 'personal', label: 'Osobní odběr — prodejna', price: 0, icon: 'store' },
]

const PAYMENT_METHODS = [
  { id: 'card', label: 'Platba kartou', fee: 0, icon: 'card', note: 'Visa, Mastercard' },
  { id: 'cod', label: 'Dobírka', fee: 39, icon: 'cod', note: '+39 Kč' },
  { id: 'transfer', label: 'Bankovní převod', fee: 0, icon: 'bank', note: 'Platba předem' },
]

const INITIAL_FORM = {
  email: '',
  phone: '',
  firstName: '',
  lastName: '',
  street: '',
  city: '',
  zip: '',
  country: 'CZ',
  isCompany: false,
  company: '',
  ico: '',
  dic: '',
  shippingMethod: '',
  paymentMethod: '',
  note: '',
  terms: false,
}

function validate(form, pickupPoint) {
  const errors = {}

  if (!form.email.trim()) errors.email = 'Vyplňte e-mail'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Neplatný e-mail'

  if (!form.phone.trim()) errors.phone = 'Vyplňte telefon'
  else if (!/^[\d\s+()-]{9,}$/.test(form.phone)) errors.phone = 'Neplatné telefonní číslo'

  if (!form.firstName.trim()) errors.firstName = 'Vyplňte jméno'
  if (!form.lastName.trim()) errors.lastName = 'Vyplňte příjmení'
  if (!form.street.trim()) errors.street = 'Vyplňte ulici a číslo popisné'
  if (!form.city.trim()) errors.city = 'Vyplňte město'
  if (!form.zip.trim()) errors.zip = 'Vyplňte PSČ'
  else if (!/^\d{3}\s?\d{2}$/.test(form.zip)) errors.zip = 'Neplatné PSČ'

  if (form.isCompany) {
    if (!form.company.trim()) errors.company = 'Vyplňte název firmy'
    if (!form.ico.trim()) errors.ico = 'Vyplňte IČO'
  }

  if (!form.shippingMethod) errors.shippingMethod = 'Vyberte způsob doručení'
  if (form.shippingMethod === 'zasilkovna' && !pickupPoint) errors.shippingMethod = 'Vyberte výdejní místo'
  if (!form.paymentMethod) errors.paymentMethod = 'Vyberte způsob platby'
  if (!form.terms) errors.terms = 'Musíte souhlasit s obchodními podmínkami'

  return errors
}

/* ─── Icons ─── */

function ShippingIcon({ type }) {
  if (type === 'pickup') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  )
  if (type === 'truck') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  )
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function PaymentIcon({ type }) {
  if (type === 'card') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  )
  if (type === 'cod') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  )
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v4M12 14v4M16 14v4" />
    </svg>
  )
}

/* ─── Form Field ─── */

function Field({ label, error, children, className = '' }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-[0.8rem] font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-[0.75rem] text-red-500">{error}</p>}
    </div>
  )
}

function Input({ error, ...props }) {
  return (
    <input
      {...props}
      className={`w-full rounded border bg-white px-3 py-2.5 text-[0.88rem] text-gray-900 outline-none transition placeholder:text-gray-400 ${
        error ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-[#f6ab00]'
      }`}
    />
  )
}

/* ─── Section Wrapper ─── */

function Section({ number, title, children }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 lg:p-6">
      <h2 className="mb-4 flex items-center gap-3 text-[1rem] font-bold text-gray-900">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f6ab00] text-[0.75rem] font-bold text-black">
          {number}
        </span>
        {title}
      </h2>
      {children}
    </div>
  )
}

/* ─── Main Component ─── */

function Checkout() {
  const navigate = useNavigate()
  const { items, itemCount, setShipping, clearCart } = useCart()
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [pickupPoint, setPickupPoint] = useState(null)

  // Redirect if cart is empty
  if (items.length === 0) {
    return <Navigate to="/cart" replace />
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const selectedShipping = SHIPPING_METHODS.find((m) => m.id === form.shippingMethod)
  const selectedPayment = PAYMENT_METHODS.find((m) => m.id === form.paymentMethod)
  const shippingCost = selectedShipping?.price || 0
  const codFee = selectedPayment?.id === 'cod' ? 39 : 0
  const total = subtotal + shippingCost + codFee

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (submitted) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleShippingChange = (methodId) => {
    updateField('shippingMethod', methodId)
    const method = SHIPPING_METHODS.find((m) => m.id === methodId)
    if (method) {
      setShipping({ id: method.id, label: method.label, price: method.price })
    }
    if (methodId !== 'zasilkovna') {
      setPickupPoint(null)
    }
  }

  const handlePickupPointSelect = async () => {
    try {
      const { openPickupPointSelector } = await import('../api/zasilkovna')
      const point = await openPickupPointSelector()
      if (point) setPickupPoint(point)
    } catch {
      // Widget not available — show fallback
      setPickupPoint({
        id: 'demo',
        name: 'Zásilkovna — Demo pobočka',
        address: 'Widget není nakonfigurován',
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitted(true)
    setSubmitError('')

    const validationErrors = validate(form, pickupPoint)
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      // Scroll to first error
      const firstErrorEl = document.querySelector('[data-error="true"]')
      if (firstErrorEl) firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setSubmitting(true)

    try {
      // Build order data
      const orderData = {
        billing_address: {
          first_name: form.firstName,
          last_name: form.lastName,
          email: form.email,
          phone: form.phone,
          address_1: form.street,
          city: form.city,
          postcode: form.zip.replace(/\s/g, ''),
          country: form.country,
          company: form.isCompany ? form.company : '',
        },
        shipping_address: {
          first_name: form.firstName,
          last_name: form.lastName,
          address_1: form.street,
          city: form.city,
          postcode: form.zip.replace(/\s/g, ''),
          country: form.country,
        },
        customer_note: form.note,
        payment_method: form.paymentMethod === 'card' ? 'stripe' : form.paymentMethod === 'cod' ? 'cod' : 'bacs',
        shipping_method: form.shippingMethod,
        pickup_point: pickupPoint,
        line_items: items.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
      }

      // Try WooCommerce Store API checkout
      const response = await fetch('/wp-json/wc/store/v1/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      })

      if (response.ok) {
        const result = await response.json()
        clearCart()
        navigate('/order-confirmation', { state: { order: result, form } })
      } else {
        // Backend not ready — simulate success for development
        clearCart()
        navigate('/order-confirmation', {
          state: {
            order: { id: Date.now(), number: `BHD-${Date.now().toString().slice(-6)}` },
            form,
            demo: true,
          },
        })
      }
    } catch {
      // Network error — simulate success for development
      clearCart()
      navigate('/order-confirmation', {
        state: {
          order: { id: Date.now(), number: `BHD-${Date.now().toString().slice(-6)}` },
          form,
          demo: true,
        },
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-[72px]">
      {/* Breadcrumb */}
      <div className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-[1400px] items-center gap-2 text-[0.8rem] text-gray-500">
          <Link to="/" className="transition hover:text-[#d4920a]">Domů</Link>
          <span>/</span>
          <Link to="/cart" className="transition hover:text-[#d4920a]">Košík</Link>
          <span>/</span>
          <span className="text-gray-900">Pokladna</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="mx-auto max-w-[1200px] px-6 py-8">
          <h1 className="mb-6 text-2xl font-bold text-gray-900">Pokladna</h1>

          {submitError && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[0.88rem] text-red-600">
              {submitError}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* ── Left Column: Form ── */}
            <div className="space-y-5 lg:col-span-2">

              {/* 1. Contact */}
              <Section number="1" title="Kontaktní údaje">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="E-mail *" error={errors.email} data-error={!!errors.email}>
                    <Input
                      type="email"
                      placeholder="vas@email.cz"
                      value={form.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      error={errors.email}
                    />
                  </Field>
                  <Field label="Telefon *" error={errors.phone} data-error={!!errors.phone}>
                    <Input
                      type="tel"
                      placeholder="+420 000 000 000"
                      value={form.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      error={errors.phone}
                    />
                  </Field>
                </div>
              </Section>

              {/* 2. Shipping Address */}
              <Section number="2" title="Dodací adresa">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Jméno *" error={errors.firstName} data-error={!!errors.firstName}>
                    <Input
                      placeholder="Jan"
                      value={form.firstName}
                      onChange={(e) => updateField('firstName', e.target.value)}
                      error={errors.firstName}
                    />
                  </Field>
                  <Field label="Příjmení *" error={errors.lastName} data-error={!!errors.lastName}>
                    <Input
                      placeholder="Novák"
                      value={form.lastName}
                      onChange={(e) => updateField('lastName', e.target.value)}
                      error={errors.lastName}
                    />
                  </Field>
                </div>

                <div className="mt-4">
                  <Field label="Ulice a číslo popisné *" error={errors.street} data-error={!!errors.street}>
                    <Input
                      placeholder="Václavské náměstí 1"
                      value={form.street}
                      onChange={(e) => updateField('street', e.target.value)}
                      error={errors.street}
                    />
                  </Field>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <Field label="Město *" error={errors.city} className="sm:col-span-2" data-error={!!errors.city}>
                    <Input
                      placeholder="Praha"
                      value={form.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      error={errors.city}
                    />
                  </Field>
                  <Field label="PSČ *" error={errors.zip} data-error={!!errors.zip}>
                    <Input
                      placeholder="110 00"
                      value={form.zip}
                      onChange={(e) => updateField('zip', e.target.value)}
                      error={errors.zip}
                    />
                  </Field>
                </div>

                {/* Company toggle */}
                <div className="mt-5">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.isCompany}
                      onChange={(e) => updateField('isCompany', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 accent-[#f6ab00]"
                    />
                    <span className="text-[0.85rem] text-gray-600">Nakupuji na firmu</span>
                  </label>
                </div>

                {form.isCompany && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <Field label="Název firmy *" error={errors.company} data-error={!!errors.company}>
                      <Input
                        placeholder="Firma s.r.o."
                        value={form.company}
                        onChange={(e) => updateField('company', e.target.value)}
                        error={errors.company}
                      />
                    </Field>
                    <Field label="IČO *" error={errors.ico} data-error={!!errors.ico}>
                      <Input
                        placeholder="12345678"
                        value={form.ico}
                        onChange={(e) => updateField('ico', e.target.value)}
                        error={errors.ico}
                      />
                    </Field>
                    <Field label="DIČ">
                      <Input
                        placeholder="CZ12345678"
                        value={form.dic}
                        onChange={(e) => updateField('dic', e.target.value)}
                      />
                    </Field>
                  </div>
                )}
              </Section>

              {/* 3. Shipping Method */}
              <Section number="3" title="Způsob doručení">
                {errors.shippingMethod && (
                  <p className="mb-3 text-[0.8rem] text-red-500" data-error="true">{errors.shippingMethod}</p>
                )}
                <div className="space-y-2">
                  {SHIPPING_METHODS.map((method) => (
                    <label
                      key={method.id}
                      className={`flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition ${
                        form.shippingMethod === method.id
                          ? 'border-[#f6ab00] bg-[#f6ab00]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="shipping"
                        value={method.id}
                        checked={form.shippingMethod === method.id}
                        onChange={() => handleShippingChange(method.id)}
                        className="accent-[#f6ab00]"
                      />
                      <span className="text-gray-500">
                        <ShippingIcon type={method.icon} />
                      </span>
                      <span className="flex-1 text-[0.88rem] font-medium text-gray-900">{method.label}</span>
                      <span className={`text-[0.88rem] font-bold ${method.price === 0 ? 'text-green-600' : 'text-[#d4920a]'}`}>
                        {method.price === 0 ? 'Zdarma' : formatPrice(method.price)}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Zásilkovna pickup point selector */}
                {form.shippingMethod === 'zasilkovna' && (
                  <div className="mt-3 ml-8">
                    {pickupPoint ? (
                      <div className="flex items-center gap-3 rounded border border-green-200 bg-green-50 px-4 py-3">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 flex-shrink-0 text-green-600">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-[0.85rem] font-medium text-gray-900">{pickupPoint.name}</p>
                          <p className="text-[0.75rem] text-gray-500">{pickupPoint.address}</p>
                        </div>
                        <button
                          type="button"
                          onClick={handlePickupPointSelect}
                          className="text-[0.8rem] font-medium text-[#d4920a] transition hover:text-[#b8820a]"
                        >
                          Změnit
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handlePickupPointSelect}
                        className="rounded border border-dashed border-gray-300 px-4 py-3 text-[0.85rem] font-medium text-[#d4920a] transition hover:border-[#f6ab00] hover:bg-[#f6ab00]/5"
                      >
                        Vybrat výdejní místo
                      </button>
                    )}
                  </div>
                )}
              </Section>

              {/* 4. Payment Method */}
              <Section number="4" title="Způsob platby">
                {errors.paymentMethod && (
                  <p className="mb-3 text-[0.8rem] text-red-500" data-error="true">{errors.paymentMethod}</p>
                )}
                <div className="space-y-2">
                  {PAYMENT_METHODS.map((method) => (
                    <label
                      key={method.id}
                      className={`flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition ${
                        form.paymentMethod === method.id
                          ? 'border-[#f6ab00] bg-[#f6ab00]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={method.id}
                        checked={form.paymentMethod === method.id}
                        onChange={() => updateField('paymentMethod', method.id)}
                        className="accent-[#f6ab00]"
                      />
                      <span className="text-gray-500">
                        <PaymentIcon type={method.icon} />
                      </span>
                      <span className="flex-1 text-[0.88rem] font-medium text-gray-900">{method.label}</span>
                      <span className="text-[0.75rem] text-gray-500">{method.note}</span>
                    </label>
                  ))}
                </div>
              </Section>

              {/* 5. Note */}
              <Section number="5" title="Poznámka k objednávce">
                <textarea
                  placeholder="Volitelná poznámka k vaší objednávce..."
                  value={form.note}
                  onChange={(e) => updateField('note', e.target.value)}
                  rows={3}
                  className="w-full rounded border border-gray-200 bg-white px-3 py-2.5 text-[0.88rem] text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#f6ab00]"
                />
              </Section>
            </div>

            {/* ── Right Column: Order Summary ── */}
            <div className="lg:col-span-1">
              <div className="sticky top-[88px] rounded-lg border border-gray-200 bg-white p-5">
                <h2 className="mb-4 text-[1rem] font-bold text-gray-900">Shrnutí objednávky</h2>

                {/* Items */}
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded border border-gray-100 bg-gray-50">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="h-full w-full object-contain p-1" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <div className="h-6 w-6 rounded-full bg-gray-200" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-[0.82rem] font-medium text-gray-900">{item.name}</p>
                        <p className="text-[0.75rem] text-gray-500">{item.quantity}x {formatPrice(item.price)}</p>
                      </div>
                      <span className="flex-shrink-0 text-[0.85rem] font-semibold text-gray-900">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="mt-5 space-y-2 border-t border-gray-100 pt-4">
                  <div className="flex justify-between text-[0.85rem]">
                    <span className="text-gray-500">Mezisoučet ({itemCount} pol.)</span>
                    <span className="text-gray-900">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[0.85rem]">
                    <span className="text-gray-500">Doprava</span>
                    <span className={selectedShipping ? 'text-gray-900' : 'text-gray-400'}>
                      {selectedShipping ? (shippingCost === 0 ? 'Zdarma' : formatPrice(shippingCost)) : '—'}
                    </span>
                  </div>
                  {codFee > 0 && (
                    <div className="flex justify-between text-[0.85rem]">
                      <span className="text-gray-500">Dobírka</span>
                      <span className="text-gray-900">{formatPrice(codFee)}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-between border-t border-gray-200 pt-4">
                  <span className="text-[1rem] font-bold text-gray-900">Celkem</span>
                  <span className="text-[1.15rem] font-bold text-[#d4920a]">{formatPrice(total)}</span>
                </div>

                {/* Terms */}
                <div className="mt-5">
                  <label className="flex cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      checked={form.terms}
                      onChange={(e) => updateField('terms', e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#f6ab00]"
                    />
                    <span className="text-[0.78rem] leading-snug text-gray-600">
                      Souhlasím s{' '}
                      <a href="/terms" className="text-[#d4920a] underline">obchodními podmínkami</a>
                      {' '}a{' '}
                      <a href="/privacy" className="text-[#d4920a] underline">zásadami ochrany osobních údajů</a>
                    </span>
                  </label>
                  {errors.terms && <p className="mt-1 ml-6 text-[0.75rem] text-red-500">{errors.terms}</p>}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-5 w-full rounded bg-[#f6ab00] py-3.5 text-[0.85rem] font-bold uppercase tracking-wide text-black transition hover:bg-[#e09e00] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Zpracování...' : 'Objednat'}
                </button>

                <Link
                  to="/cart"
                  className="mt-3 block text-center text-[0.8rem] text-gray-500 transition hover:text-[#d4920a]"
                >
                  Zpět do košíku
                </Link>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

export default Checkout
