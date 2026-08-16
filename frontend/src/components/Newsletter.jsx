import { useState } from 'react'
import wpApi from '../api/wordpress'

function Newsletter() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle, loading, success, error
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) return

    setStatus('loading')
    try {
      await wpApi.subscribeNewsletter(email)
      setStatus('success')
      setMessage('Děkujeme za přihlášení k odběru!')
      setEmail('')
    } catch (err) {
      setStatus('error')
      setMessage('Něco se pokazilo. Zkuste to prosím znovu.')
    }
  }

  return (
    <section id="newsletter" className="bg-[color:var(--bg-primary)] px-8 py-28">
      <div className="mx-auto max-w-[560px] text-center">
        <div className="reveal">
          <div className="inline-flex items-center justify-center gap-2.5">
            <span className="h-px w-6 bg-[color:var(--accent)]" />
            <span className="text-[0.68rem] font-medium uppercase tracking-[0.22em] text-[color:var(--accent)]">
              Zůstaňte v obraze
            </span>
          </div>
          <h2 className="mt-3 font-display text-3xl font-bold text-[color:var(--text-primary)]">
            Nepropásněte žádnou novinku
          </h2>
          <p className="mt-2 text-[0.83rem] font-light leading-[1.7] text-[color:var(--text-secondary)]">
            Buďte první, kdo se dozví o nových produktech a akcích. Získejte pozvánky na eventy, servisní připomínky
            a příběhy z dílny.
          </p>

          {status === 'success' ? (
            <div className="mt-7 rounded border border-green-500/30 bg-green-500/10 px-4 py-3 text-green-400">
              {message}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Váš e-mail"
                required
                className="flex-1 rounded border border-[color:var(--border-subtle)] bg-[color:var(--bg-card)] px-4 py-3 text-[0.8rem] text-[color:var(--text-primary)] outline-none transition placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent)]"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="whitespace-nowrap rounded bg-[color:var(--accent)] px-6 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#0e0e0e] transition hover:opacity-80 disabled:opacity-50"
              >
                {status === 'loading' ? 'Odesílám...' : 'Odebírat'}
              </button>
            </form>
          )}

          {status === 'error' && (
            <p className="mt-3 text-sm text-red-400">{message}</p>
          )}
        </div>
      </div>
    </section>
  )
}

export default Newsletter
