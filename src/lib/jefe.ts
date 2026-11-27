import { dateKey, type AppData } from './model'
import { firstDay, habitOn } from './jardin'
import { walkDone } from './cardio'
import { readOn } from './lectura'
import { routineFor, routineProgress } from './rutina'
import { dungeonXpOn } from './mazmorra'
import { morningHabits } from './manana'
import { mondayOf } from './libre'
import type { Extra, Monster, Scene } from './aventura'

export const BOSS_XP = 100
export const HIT = { set: 3, walk: 15, read: 20, routine: 30, dungeon: 20, crit: 1.5 }
const BOSSES: [string, string, string, Extra, number, number, Scene][] = [
  ['El Eterno Mañana', 'Nunca llega su día', 'm9', 'corona', 2, 2, 'tormenta'],
  ['Sedentarius', 'El sillón que cobró vida', 'm1', 'none', 3, 1, 'ciudad'],
  ['El Hipnotista', 'Controla tu pulgar', 'm2', 'antenas', 0, 3, 'pantalla'],
  ['El Glotón', 'Hambre sin fondo', 'm5', 'sombrero', 0, 2, 'fiesta'],
  ['Dama de la Medianoche', 'Reina de las 3 a.m.', 'm7', 'corona', 0, 3, 'noche'],
  ['El Autómata', 'Fábrica de pretextos', 'm4', 'antenas', 2, 1, 'mazmorra'],
  ['Corsario del Desgano', 'Navega sin rumbo', 'm8', 'gorro', 0, 2, 'volcan'],
  ['El Rey Ermitaño', 'Nunca sale de su cueva', 'm3', 'corona', 0, 2, 'nieve'],
]

function shift(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00`)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function bossOf(monday: string, hp: number): Monster {
  const n = Math.floor(new Date(`${monday}T12:00:00`).getTime() / (7 * 864e5))
  const [name, title, color, extra, horns, eyes, scene] = BOSSES[((n % BOSSES.length) + BOSSES.length) % BOSSES.length]
  return { id: 200 + (n % BOSSES.length), name, title, hp, weak: 'Hábitos', color, horns, eyes, xp: BOSS_XP, scene, extra }
}

export type DayHit = { day: string; sets: number; training: number; armor: boolean; walk: number; read: number; routine: number; dungeon: number; crit: boolean; total: number }
export function dayHit(data: AppData, day: string): DayHit {
  const sets = data.sets.filter(s => s.day === day && s.note !== 'hecho').length
  const walked = data.settings.walkDaily ? walkDone(data, day) : true
  const raw = sets * HIT.set
  const training = walked ? raw : Math.floor(raw / 2)
  const rt = routineFor(data, day)
  const p = rt ? routineProgress(data, day, rt) : null
  const morning = morningHabits(data)
  const crit = morning.length > 0 && morning.every(h => habitOn(data, h, day))
  const parts = { walk: data.settings.walkDaily && walkDone(data, day) ? HIT.walk : 0, read: readOn(data, day) ? HIT.read : 0, routine: p && p.total > 0 && p.done >= p.total ? HIT.routine : 0, dungeon: dungeonXpOn(data, day) > 0 ? HIT.dungeon : 0 }
  const base = training + parts.walk + parts.read + parts.routine + parts.dungeon
  return { day, sets, training, armor: !walked && sets > 0, ...parts, crit, total: Math.round(base * (crit ? HIT.crit : 1)) }
}

export type WeekBoss = { monday: string; monster: Monster; dealt: number; defeatedDay: string | null; days: DayHit[]; daysLeft: number }
export type BossWeek = { monday: string; name: string; defeated: boolean }
type Timeline = { weeks: (WeekBoss & { done: boolean })[]; today: string }
const cache = new WeakMap<AppData, Timeline>()

function timeline(data: AppData, today: string): Timeline {
  const hit = cache.get(data)
  if (hit && hit.today === today) return hit
  const start = mondayOf(firstDay(data, today))
  const thisMonday = mondayOf(today)
  const weeks: Timeline['weeks'] = []
  let wins = 0
  for (let monday = start; monday <= thisMonday; monday = shift(monday, 7)) {
    const monster = bossOf(monday, Math.min(500, 300 + 25 * wins))
    const days: DayHit[] = []
    let dealt = 0, defeatedDay: string | null = null
    for (let k = 0; k < 7; k++) {
      const day = shift(monday, k)
      if (day > today) break
      const h = dayHit(data, day)
      days.push(h)
      dealt += h.total
      if (!defeatedDay && dealt >= monster.hp) defeatedDay = day
    }
    weeks.push({ monday, monster, dealt: Math.min(dealt, monster.hp), defeatedDay, days, daysLeft: 7 - days.length + 1, done: monday < thisMonday })
    if (defeatedDay) wins += 1
  }
  const out = { weeks, today }
  cache.set(data, out)
  return out
}

export function weeklyBoss(data: AppData, today = dateKey()): WeekBoss & { history: BossWeek[]; wins: number } {
  const { weeks } = timeline(data, today)
  const now = weeks[weeks.length - 1]
  const past = weeks.slice(0, -1)
  return { ...now, history: past.slice(-8).reverse().map(w => ({ monday: w.monday, name: w.monster.name, defeated: !!w.defeatedDay })), wins: weeks.filter(w => w.defeatedDay).length }
}

export function bossXpOn(data: AppData, day: string): number {
  const { weeks } = timeline(data, dateKey() > day ? dateKey() : day)
  const w = weeks.find(x => x.monday === mondayOf(day))
  return w?.defeatedDay === day ? BOSS_XP : 0
}
