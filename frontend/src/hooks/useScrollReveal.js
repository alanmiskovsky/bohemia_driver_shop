import { useEffect } from 'react'

/**
 * Hook for scroll reveal animations
 */
export function useScrollReveal() {
  useEffect(() => {
    const handleReveal = () => {
      document.querySelectorAll('.reveal').forEach((element) => {
        const top = element.getBoundingClientRect().top
        if (top < window.innerHeight * 0.88) {
          element.classList.add('visible')
        }
      })
    }

    handleReveal()
    window.addEventListener('scroll', handleReveal, { passive: true })
    window.addEventListener('load', handleReveal)

    return () => {
      window.removeEventListener('scroll', handleReveal)
      window.removeEventListener('load', handleReveal)
    }
  }, [])
}

export default useScrollReveal
