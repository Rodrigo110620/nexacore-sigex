import { useEffect, useState } from 'react'

export function useClock(locale = 'es-BO') {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  return {
    now,
    time: new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(now),
    date: new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    }).format(now),
  }
}
