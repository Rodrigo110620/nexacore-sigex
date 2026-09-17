import { useEffect, useState } from 'react'
import { fetchUserStats } from '../services/userStatsService'
import type { UserStats } from '../types/totalUser'

export default function useUserStats() {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

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
  }, [])

  return { stats, loading }
}