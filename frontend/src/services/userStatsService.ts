import api from './api'
import type { UserStats } from '../types/totalUser'

export async function fetchUserStats(): Promise<UserStats> {
  const { data } = await api.get<UserStats>('/usuarios/stats')
  return data
}