import { Link, useLocation, Navigate } from 'react-router-dom'

function OrderConfirmation() {
  const location = useLocation()
  const { order, form, demo } = location.state || {}

  // No order data — redirect to home
  if (!order) {
    return <Navigate to="/" replace />
  }

  const orderNumber = order.number || order.id

  return (
    <div className="min-h-screen bg-gray-50 pt-[72px]">
      {/* Breadcrumb */}
      <div className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-[1400px] items-center gap-2 text-[0.8rem] text-gray-500">
          <Link to="/" className="transition hover:text-[#d4920a]">Domů</Link>
          <span>/</span>
          <span className="text-gray-900">Potvrzení objednávky</span>
        </div>
      </div>

      <div className="mx-auto max-w-[640px] px-6 py-16 text-center">
        {/* Success icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-10 w-10 text-green-600">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900">Děkujeme za objednávku!</h1>
        <p className="mt-2 text-gray-500">
          Vaše objednávka <span className="font-semibold text-gray-900">#{orderNumber}</span> byla úspěšně přijata.
        </p>

        {demo && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[0.82rem] text-amber-700">
            Demo režim — backend pro objednávky zatím není nakonfigurován. V produkci bude objednávka uložena do WooCommerce.
          </div>
        )}

        {/* What happens next */}
        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 text-left">
          <h2 className="mb-4 text-[1rem] font-bold text-gray-900">Co bude následovat?</h2>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#f6ab00]/10 text-[0.75rem] font-bold text-[#d4920a]">
                1
              </div>
              <div>
                <p className="text-[0.88rem] font-medium text-gray-900">Potvrzení e-mailem</p>
                <p className="text-[0.82rem] text-gray-500">
                  Na adresu <span className="font-medium">{form?.email || '—'}</span> vám zašleme potvrzení objednávky.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#f6ab00]/10 text-[0.75rem] font-bold text-[#d4920a]">
                2
              </div>
              <div>
                <p className="text-[0.88rem] font-medium text-gray-900">Příprava zásilky</p>
                <p className="text-[0.82rem] text-gray-500">
                  Vaši objednávku připravíme k odeslání co nejdříve.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#f6ab00]/10 text-[0.75rem] font-bold text-[#d4920a]">
                3
              </div>
              <div>
                <p className="text-[0.88rem] font-medium text-gray-900">Doručení</p>
                <p className="text-[0.82rem] text-gray-500">
                  O odeslání zásilky vás budeme informovat e-mailem s číslem pro sledování.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/"
            className="rounded bg-[#f6ab00] px-8 py-3 text-[0.8rem] font-semibold uppercase tracking-wide text-black transition hover:bg-[#e09e00]"
          >
            Pokračovat v nákupu
          </Link>
          <Link
            to="/"
            className="rounded border border-gray-200 bg-white px-8 py-3 text-[0.8rem] font-semibold uppercase tracking-wide text-gray-700 transition hover:border-gray-300"
          >
            Zpět na hlavní stránku
          </Link>
        </div>
      </div>
    </div>
  )
}

export default OrderConfirmation
