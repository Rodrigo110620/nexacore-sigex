import { useCallback, useEffect, useState } from 'react'
import { fetchUserStats } from '../services/userStatsService'
import type { UserStats } from '../types/totalUser'

export default function useUserStats() {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    fetchUserStats()
      .then((data) => {
        if (!cancelled) setStats(data)
      })
      .catch(() => {
        if (!cancelled) setStats(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [retryCount])

  const retry = useCallback(() => {
    setRetryCount((n) => n + 1)
  }, [])

  return { stats, loading, retry }
}