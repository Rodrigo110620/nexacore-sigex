import { useEffect, useState } from 'react'

export function useClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const time = now.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  const timeWithSeconds = now.toLocaleTimeString('es', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const date = now.toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const dateShort = now.toLocaleDateString('es', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  return { now, time, timeWithSeconds, date, dateShort }
}
