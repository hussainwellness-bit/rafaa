import type { JournalLog } from '../types'

const MOOD_SCORES: Record<string, number> = {
  pumped: 100, good: 80, normal: 60, tired: 30, exhausted: 10,
}
const SORENESS_SCORES: Record<string, number> = {
  none: 100, light: 80, moderate: 50, heavy: 20,
}

export function calcRecoveryScore(log: Partial<JournalLog>): number {
  let score = 0

  // Sleep 35%
  const sleepScore = Math.min(1, (log.sleep_hours ?? 0) / 8) * 100
  score += sleepScore * 0.35

  // Mood 25%
  const moodScore = MOOD_SCORES[log.mood ?? ''] ?? 0
  score += moodScore * 0.25

  // Soreness 20%
  const sorenessScore = SORENESS_SCORES[log.soreness ?? ''] ?? 0
  score += sorenessScore * 0.20

  // Hydration 20%
  const hydrationScore = Math.min(1, (log.water_glasses ?? 0) / 8) * 100
  score += hydrationScore * 0.20

  return Math.round(score)
}

export function recoveryLabel(score: number): { label: string; color: string; dot: string } {
  if (score >= 67) return { label: 'Optimal — Go hard', color: '#22c55e', dot: '🟢' }
  if (score >= 34) return { label: 'Moderate — Light training', color: '#f59e0b', dot: '🟡' }
  return { label: 'Poor — Rest recommended', color: '#ff3d3d', dot: '🔴' }
}
