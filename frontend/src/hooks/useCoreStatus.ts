import { useEffect, useState } from 'react'
import api from '../services/api'

export type CoreStatus = 'checking' | 'online' | 'local'

export function useCoreStatus() {
  const [status, setStatus] = useState<CoreStatus>('checking')

  useEffect(() => {
    let cancelled = false

    api
      .get('/health', { timeout: 2500 })
      .then(() => {
        if (!cancelled) setStatus('online')
      })
      .catch(() => {
        if (!cancelled) setStatus('local')
      })

    return () => {
      cancelled = true
    }
  }, [])

  return status
}
