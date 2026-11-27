import type { AppData, RoutineKind, TrainingSet } from './model'
import { CATALOG, planOf } from './rutina'
import { esCamara } from './conteo'

export type Exercise = { name: string; kind: RoutineKind; group: string; target: number }
export type ExRecord = { name: string; kind: 'reps' | 'seconds'; best: number; bestDay: string; total: number; sets: number; days: number; last: string }
export const CHALLENGE_XP = 50

function shift(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00`)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function mondayOf(day: string): string {
  return shift(day, -((new Date(`${day}T12:00:00`).getDay() + 6) % 7))
}

const counts = (s: TrainingSet) => s.note !== 'hecho' && ((s.reps ?? 0) > 0 || (s.seconds ?? 0) > 0)
export const CAMARA_SET = 'camara'
export const REDES_SET = 'redes'
export const RUTINA_CAM_SET = 'camara-rutina'
export const esNotaCamara = (note?: string) => note === CAMARA_SET || note === REDES_SET || note === RUTINA_CAM_SET
export const conCamaraSet = (s: TrainingSet) => esNotaCamara(s.note) && counts(s)
const valueOf = (s: TrainingSet) => s.seconds !== undefined ? s.seconds : s.reps ?? 0

export function exerciseList(data: AppData): Exercise[] {
  const out = new Map<string, Exercise>()
  CATALOG.forEach(([name, kind, target, group]) => { if (kind !== 'free') out.set(name, { name, kind, group, target }) })
  planOf(data).week.forEach(rt => rt?.items.forEach(i => { if (i.kind !== 'free' && !out.has(i.name)) out.set(i.name, { name: i.name, kind: i.kind, group: 'Mi rutina', target: i.target }) }))
  data.sets.filter(counts).forEach(s => { if (!out.has(s.exercise)) out.set(s.exercise, { name: s.exercise, kind: s.seconds !== undefined ? 'seconds' : 'reps', group: 'Míos', target: valueOf(s) }) })
  return [...out.values()]
}

export function records(data: AppData, before?: string, soloCamara = false): Map<string, ExRecord> {
  const out = new Map<string, ExRecord>()
  const dayset = new Map<string, Set<string>>()
  for (const s of data.sets) {
    if (!counts(s) || (before && s.day >= before) || (soloCamara && !esNotaCamara(s.note))) continue
    const v = valueOf(s)
    const r = out.get(s.exercise)
    if (!r) { out.set(s.exercise, { name: s.exercise, kind: s.seconds !== undefined ? 'seconds' : 'reps', best: v, bestDay: s.day, total: v, sets: 1, days: 1, last: s.day }); dayset.set(s.exercise, new Set([s.day])); continue }
    r.total += v
    r.sets += 1
    if (v > r.best || (v === r.best && s.day < r.bestDay)) { r.best = v; r.bestDay = s.day }
    if (s.day > r.last) r.last = s.day
    dayset.get(s.exercise)!.add(s.day)
    r.days = dayset.get(s.exercise)!.size
  }
  return out
}

export function recordTable(data: AppData, soloCamara = false): ExRecord[] {
  return [...records(data, undefined, soloCamara).values()].sort((a, b) => b.last.localeCompare(a.last) || b.sets - a.sets)
}

export type Challenge = { name: string; kind: 'reps' | 'seconds'; target: number; week: string; best: number; doneDay: string | null }
export function weeklyChallenge(data: AppData, today: string): Challenge | null {
  const week = mondayOf(today)
  const from = shift(week, -28)
  const freq = new Map<string, number>()
  data.sets.filter(s => counts(s) && s.day >= from && s.day < week && esCamara(s.exercise)).forEach(s => freq.set(s.exercise, (freq.get(s.exercise) ?? 0) + 1))
  const name = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0]
  if (!name) return null
  const prev = records(data, week).get(name)
  if (!prev) return null
  const cam = records(data, week, true).get(name)
  const base = CATALOG.find(c => c[0] === name)?.[2] || (prev.kind === 'seconds' ? 30 : 10)
  const target = !cam ? base : cam.kind === 'seconds' ? cam.best + 5 : cam.best + (cam.best >= 20 ? 2 : 1)
  const thisWeek = data.sets.filter(s => conCamaraSet(s) && s.exercise === name && s.day >= week && s.day <= today).sort((a, b) => a.day.localeCompare(b.day) || a.at - b.at)
  const hit = thisWeek.find(s => valueOf(s) >= target)
  return { name, kind: prev.kind, target, week, best: thisWeek.reduce((m, s) => Math.max(m, valueOf(s)), 0), doneDay: hit ? hit.day : null }
}

export function challengeXpOn(data: AppData, day: string): number {
  const c = weeklyChallenge(data, day)
  return c && c.doneDay === day ? CHALLENGE_XP : 0
}

export function unitOf(kind: 'reps' | 'seconds' | RoutineKind, v: number): string {
  return kind === 'seconds' ? `${v} s` : `${v}`
}

export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export type Level = 'Básicos' | 'Intermedios' | 'Avanzados'
export const FAMOUS: Record<Level, string[]> = {
  'Básicos': ['Lagartijas', 'Sentadillas', 'Plancha', 'Wall sit', 'Dominadas australianas', 'Desplantes', 'Burpees', 'Fondos en banco'],
  'Intermedios': ['Dominadas', 'Fondos', 'Chin ups', 'Pike push ups', 'Lagartijas diamante', 'Hollow hold', 'L sit', 'Elevaciones de piernas colgado'],
  'Avanzados': ['Handstand push up', 'Muscle up', 'Pistol squat', 'Dragon flag', 'Front lever tuck', 'Handstand libre', 'Lagartijas a una mano', 'Planche'],
}

export type Ghost = { value: number; day: string; kind: 'reps' | 'seconds' }
export function ghostOf(data: AppData, name: string, today: string): Ghost | null {
  const prev = data.sets.filter(s => counts(s) && s.exercise === name && s.day < today)
  if (!prev.length) return null
  const day = prev.reduce((m, s) => s.day > m ? s.day : m, prev[0].day)
  const rows = prev.filter(s => s.day === day)
  return { value: rows.reduce((m, s) => Math.max(m, valueOf(s)), 0), day, kind: rows[0].seconds !== undefined ? 'seconds' : 'reps' }
}
export function ghostLine(value: number, g: Ghost | null, unit = ''): string {
  if (!g) return 'Primera vez: ya tienes fantasma para la próxima.'
  if (value > g.value) return `¡Le ganaste a tu fantasma por ${Math.round((value - g.value) * 100) / 100}${unit}!`
  if (value === g.value) return 'Empate con tu fantasma.'
  return `Tu fantasma ganó por ${Math.round((g.value - value) * 100) / 100}${unit}.`
}
