import { activeHabits, dateKey, type AppData } from './model'
import { dayScore, firstDay, gardenStats, GOOD, habitOn, shiftDay } from './jardin'
import { clockOf, lockActive, planOf, routineFor, routineProgress } from './rutina'
import { deporteXpOn } from './deportes'
import { realReading } from './progress'
import { challengeXpOn } from './libre'
import { cardioXpOn } from './cardio'
import { adventureXpOn } from './aventura'
import { dungeonXpOn } from './mazmorra'
import { seasonXpOn } from './temporada'
import { bossXpOn } from './jefe'
import type { Mood } from './brote'

export const XP = { habit: 10, task: 10, set: 2, routine: 30, goodDay: 20, read: 10 }
export const DAILY_GOAL = 50

export function routineDone(data: AppData, day: string): boolean {
  const rt = routineFor(data, day)
  if (!rt) return false
  const p = routineProgress(data, day, rt)
  return p.total > 0 && p.done >= p.total
}

export function xpOn(data: AppData, day: string): number {
  const habits = activeHabits(data.settings).filter(h => habitOn(data, h, day)).length * XP.habit
  const tasks = data.tasks.filter(t => t.status === 'done' && t.completedOn === day).length * XP.task
  const sets = data.sets.filter(s => s.day === day).length * XP.set
  const read = data.reading.some(r => r.day === day && realReading(r)) ? XP.read : 0
  const bonus = (routineDone(data, day) ? XP.routine : 0) + (dayScore(data, day).pct >= GOOD ? XP.goodDay : 0)
  return habits + tasks + sets + read + bonus + challengeXpOn(data, day) + cardioXpOn(data, day) + adventureXpOn(data, day) + dungeonXpOn(data, day) + seasonXpOn(data, day) + bossXpOn(data, day) + deporteXpOn(data, day)
}

export function totalXp(data: AppData, today = dateKey()): number {
  let sum = 0
  for (let d = firstDay(data, today), i = 0; d <= today && i < 2000; d = shiftDay(d, 1), i++) sum += xpOn(data, d)
  return sum
}

export function levelOf(xp: number): { level: number; into: number; need: number; pct: number } {
  let level = 1, need = 100, left = Math.max(0, xp)
  while (left >= need) { left -= need; level++; need = 100 + 50 * (level - 1) }
  return { level, into: left, need, pct: left / need }
}

export type BroteLine = { mood: Mood; text: string }
export function broteLine(data: AppData, now = Date.now()): BroteLine {
  const today = dateKey(new Date(now))
  const hour = new Date(now).getHours()
  const score = dayScore(data, today)
  const streak = gardenStats(data, today).current
  const rt = data.settings.modules?.training === false ? null : routineFor(data, today)
  const plan = planOf(data)
  const trained = data.sets.some(s => s.day === today)
  const bed = activeHabits(data.settings).find(h => h.id === 'cama' || /cama/i.test(h.label))
  const name = data.profile.name || ''
  if (score.total > 0 && score.pct >= 1) return { mood: 'orgulloso', text: `¡Día completo${name ? `, ${name}` : ''}! Tu bambú está en flor.` }
  if (lockActive(data, today, clockOf(now))) return { mood: 'susto', text: '¡Ya pasó tu hora! Entrena y tus redes se desbloquean.' }
  if (streak > 0 && score.pct < GOOD && hour >= 18) return { mood: 'susto', text: `¡Cuida tu racha de ${streak} ${streak === 1 ? 'día' : 'días'}! Te falta poco.` }
  if (hour < 12 && bed && !habitOn(data, bed, today)) return { mood: 'animo', text: '¡Buenos días! Tiende tu cama y toca la etiqueta.' }
  if (rt && !trained && plan.lock) return { mood: 'animo', text: `Hoy toca ${rt.title.toLowerCase()}. Antes de las ${plan.deadline}.` }
  if (score.done === 0) return { mood: 'calma', text: 'Empieza por uno. El primero es el que más cuesta.' }
  return { mood: 'feliz', text: `¡Vas ${Math.floor(score.done)} de ${score.total}! Sigue así.` }
}
