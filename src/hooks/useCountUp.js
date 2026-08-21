import { useEffect, useRef, useState } from 'react'

export function useCountUp(target) {
  const [value, setValue] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting || started.current) return
        started.current = true

        let n = 0
        const step = Math.ceil(target / 40)
        const tick = () => {
          n = Math.min(n + step, target)
          setValue(n)
          if (n < target) setTimeout(tick, 35)
        }
        tick()
        obs.unobserve(el)
      })
    }, { threshold: 0.5 })

    obs.observe(el)
    return () => obs.disconnect()
  }, [target])

  return [ref, value]
}