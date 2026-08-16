import { useState } from 'react'
import { formatPrice } from '../utils/price'

/* ─── Coupon form ─── */

function CouponForm({ coupons, busy, onApply, onRemove, compact = false }) {
  const [code, setCode] = useState('')
  const [open, setOpen] = useState(!compact)
  const [localError, setLocalError] = useState('')
  const [pending, setPending] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) {
      setLocalError('Zadejte kód kuponu')
      return
    }
    setLocalError('')
    setPending(true)
    try {
      await onApply(trimmed)
      setCode('')
    } catch (err) {
      setLocalError(err.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      {coupons.length > 0 && (
        <ul className="mb-3 space-y-2">
          {coupons.map((c) => (
            <li
              key={c.code}
              className="flex items-center justify-between rounded border border-green-200 bg-green-50 px-3 py-2 text-[0.82rem]"
            >
              <span className="text-green-700">
                Kupon <span className="font-semibold uppercase">{c.code}</span>
                {c.discount > 0 && <span className="ml-1 text-green-600">(−{formatPrice(c.discount)})</span>}
              </span>
              <button
                type="button"
                onClick={() => onRemove(c.code).catch(() => {})}
                disabled={busy}
                className="text-[0.78rem] font-medium text-green-700 underline-offset-2 hover:underline disabled:opacity-50"
              >
                Odebrat
              </button>
            </li>
          ))}
        </ul>
      )}

      {compact && !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[0.8rem] font-medium text-[#d4920a] transition hover:text-[#b8820a]"
        >
          Mám slevový kupon
        </button>
      ) : (
        <form onSubmit={submit} className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value)
              if (localError) setLocalError('')
            }}
            placeholder="Slevový kód"
            disabled={busy || pending}
            className={`min-w-0 flex-1 rounded border bg-white px-3 py-2 text-[0.85rem] uppercase text-gray-900 outline-none transition placeholder:normal-case placeholder:text-gray-400 ${
              localError ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-[#f6ab00]'
            }`}
            aria-label="Slevový kód"
          />
          <button
            type="submit"
            disabled={busy || pending}
            className="rounded border border-gray-900 bg-gray-900 px-4 py-2 text-[0.78rem] font-semibold uppercase tracking-wide text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? '…' : 'Uplatnit'}
          </button>
        </form>
      )}
      {localError && <p className="mt-1 text-[0.75rem] text-red-500">{localError}</p>}
    </div>
  )
}

export default CouponForm
