import { ajustar, ajusteDe } from './deportes'
import { makeId, type AppData, type Routine, type RoutineItem, type RoutineKind, type TrainPlan, type TrainingSet } from './model'

export const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
export const WEEK_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

type Seed = [string, RoutineKind, number, { rounds?: number; when?: 'before' | 'after'; sides?: boolean }?]
const r = (n: string, t: number): Seed => [n, 'reps', t]
const s = (n: string, t: number): Seed => [n, 'seconds', t]
const pistol: Seed = ['Pistol squat', 'reps', 5, { sides: true, rounds: 2 }]
const calfOne: Seed = ['Elevaciones de talón a una pierna', 'reps', 15, { sides: true }]
const bridgeOne: Seed = ['Puente de glúteo a una pierna', 'reps', 12, { sides: true }]
const sidePlank: Seed = ['Plancha lateral', 'seconds', 45, { sides: true }]

function routine(day: number, title: string, seeds: Seed[]): Routine {
  return { title, rounds: 3, items: seeds.map(([name, kind, target, extra], i) => ({ id: `d${day}-${i}`, name, kind, target, ...(extra ?? {}) })) }
}

const colgar = s('Colgarse de la barra', 30)
const PUSH_A: Seed[] = [s('Handstand pecho a la pared', 30), r('Despegar pies en handstand', 5), s('Ranita', 20), s('Tuck planche', 10), r('Handstand toque de hombros', 7), s('Planche lean', 10), r('Pike push ups', 5), r('Fondos', 10), r('Lagartijas', 15), r('Lagartijas declinadas', 15), r('Lagartijas inclinadas', 15), r('Lagartijas diamante', 10), colgar]
const LEGS_A: Seed[] = [r('Sentadillas', 15), r('Desplantes', 15), pistol, s('Wall sit', 60), calfOne, bridgeOne, s('Hollow hold', 45), r('Abs con piernas arriba', 25), r('Abs crackers', 15), r('Russian twist', 55), s('Plancha', 60), s('Aguante isométrico de abs', 30), r('Leg raises', 15), colgar]
const PULL: Seed[] = [['Muscle up', 'reps', 2, { when: 'before' }], s('Front lever tuck', 10), ['Dominadas', 'reps', 7, { rounds: 5 }], r('Curl de toalla superior', 15), r('Curl de toalla inferior', 20), r('Remo con toalla en barra', 10), ['Chin ups', 'reps', 7, { rounds: 5 }], s('Colgarse de la barra', 30)]
const PUSH_B: Seed[] = [s('Handstand pecho a la pared', 30), r('Despegar pies en handstand', 5), s('Ranita', 20), s('Tuck planche', 15), r('Handstand toque de hombros', 7), s('Planche lean', 10), r('Pike push ups', 5), r('Fondos', 10), r('Lagartijas', 15), r('Lagartijas declinadas', 15), r('Lagartijas inclinadas', 15), r('Lagartijas con toque de hombro', 10), r('Lagartijas diamante', 10), colgar]
const LEGS_B: Seed[] = [r('Sentadillas', 15), r('Desplantes', 15), pistol, s('Wall sit', 60), calfOne, bridgeOne, s('L sit', 15), r('Leg raises', 15), sidePlank, s('Hollow hold', 45), r('Abs con piernas arriba', 25), s('Aguante isométrico de abs', 30)]
const CORE: Seed[] = [colgar, ['Estiramientos 10 min', 'free', 0, { when: 'after' }], ['Correr 5 km o bici', 'free', 0, { when: 'after' }]]

export function seedWeek(): TrainPlan {
  return {
    deadline: '19:00', lock: true, restSeconds: 60,
    week: [
      routine(0, 'Hombros, pecho y tríceps', PUSH_A), conColgar(intercalarPiernas(routine(1, 'Piernas y abdomen', LEGS_A))), routine(2, 'Espalda, bíceps y antebrazo', PULL),
      routine(3, 'Hombros, pecho y tríceps', PUSH_B), conColgar(intercalarPiernas(routine(4, 'Piernas y abdomen', LEGS_B))), routine(5, 'Espalda, bíceps y antebrazo', PULL),
      routine(6, 'Descanso activo', CORE),
    ],
  }
}

export const CATALOG: [string, RoutineKind, number, string, boolean?][] = [
  ['Handstand contra pared', 'seconds', 30, 'Hombros'], ['Handstand pecho a la pared', 'seconds', 30, 'Hombros'], ['Despegar pies en handstand', 'reps', 5, 'Hombros'], ['Ranita', 'seconds', 20, 'Hombros'], ['Handstand toque de hombros', 'reps', 7, 'Hombros'], ['Handstand push up con pared', 'reps', 3, 'Hombros'],
  ['Tuck planche', 'seconds', 15, 'Hombros'], ['Planche lean', 'seconds', 10, 'Hombros'], ['Parado de cabeza', 'seconds', 20, 'Hombros'], ['Pike push ups', 'reps', 5, 'Hombros'],
  ['Fondos', 'reps', 10, 'Pecho'], ['Lagartijas', 'reps', 15, 'Pecho'], ['Lagartijas up', 'reps', 15, 'Pecho'], ['Lagartijas down', 'reps', 15, 'Pecho'],
  ['Lagartijas con toque de hombro', 'reps', 10, 'Pecho'], ['Lagartijas lentas', 'reps', 10, 'Pecho'], ['Lagartijas diamante', 'reps', 10, 'Tríceps'],
  ['Pistol squat asistida', 'reps', 5, 'Piernas', true], ['Sentadillas', 'reps', 15, 'Piernas'], ['Desplantes', 'reps', 15, 'Piernas'], ['Wall sit', 'seconds', 60, 'Piernas'],
  ['Subidas de talones en wall sit', 'reps', 15, 'Piernas'], ['Elevaciones de talones', 'reps', 15, 'Piernas'], ['Elevaciones de talón a una pierna', 'reps', 15, 'Piernas', true],
  ['Puente de glúteo a una pierna', 'reps', 12, 'Piernas', true], ['Hollow hold', 'seconds', 45, 'Abdomen'], ['Abs con piernas arriba', 'reps', 25, 'Abdomen'],
  ['Abs crackers', 'reps', 15, 'Abdomen'], ['Russian twist', 'reps', 55, 'Abdomen'], ['Plancha', 'seconds', 60, 'Abdomen'], ['Plancha con brazos estirados', 'seconds', 45, 'Abdomen'], ['L sit', 'seconds', 10, 'Abdomen'],
  ['Crunches', 'reps', 25, 'Abdomen'], ['Leg raises', 'reps', 15, 'Abdomen'], ['Plancha lateral', 'seconds', 30, 'Abdomen', true], ['Aguante isométrico de abs', 'seconds', 30, 'Abdomen'],
  ['Dominadas lentas', 'reps', 5, 'Espalda'], ['Curl de toalla superior', 'reps', 15, 'Espalda'], ['Curl de toalla inferior', 'reps', 20, 'Espalda'],
  ['Remo con toalla en barra', 'reps', 10, 'Espalda'], ['Muscle up', 'reps', 2, 'Espalda'], ['Chin ups lentas', 'reps', 5, 'Bíceps'], ['Colgarse de la barra', 'seconds', 30, 'Antebrazo'],
  ['Dominadas', 'reps', 8, 'Espalda'], ['Dominadas australianas', 'reps', 12, 'Espalda'], ['Chin ups', 'reps', 8, 'Bíceps'], ['Front lever tuck', 'seconds', 10, 'Espalda'],
  ['Back lever tuck', 'seconds', 10, 'Espalda'], ['Skin the cat', 'reps', 3, 'Espalda'], ['Lagartijas arqueras', 'reps', 6, 'Pecho', true], ['Lagartijas declinadas', 'reps', 12, 'Pecho'],
  ['Lagartijas explosivas', 'reps', 8, 'Pecho'], ['Pseudo planche push ups', 'reps', 8, 'Pecho'], ['Lagartijas a una mano', 'reps', 3, 'Pecho', true], ['Fondos en banco', 'reps', 15, 'Tríceps'],
  ['Handstand push up', 'reps', 3, 'Hombros'], ['Handstand libre', 'seconds', 15, 'Hombros'], ['Planche', 'seconds', 5, 'Hombros'],
  ['Pistol squat', 'reps', 5, 'Piernas', true], ['Sentadilla búlgara', 'reps', 10, 'Piernas', true], ['Sentadilla con salto', 'reps', 15, 'Piernas'], ['Shrimp squat', 'reps', 5, 'Piernas', true], ['Nordic curl', 'reps', 5, 'Piernas'],
  ['Elevaciones de piernas colgado', 'reps', 10, 'Abdomen'], ['Toes to bar', 'reps', 8, 'Abdomen'], ['Dragon flag', 'reps', 5, 'Abdomen'], ['V-ups', 'reps', 15, 'Abdomen'],
  ['Burpees', 'reps', 15, 'Cardio'], ['Mountain climbers', 'reps', 30, 'Cardio'], ['Jumping jacks', 'reps', 40, 'Cardio'],
  ['Lagartijas abiertas', 'reps', 12, 'Pecho'], ['Lagartijas inclinadas', 'reps', 15, 'Pecho'], ['Lagartijas en rodillas', 'reps', 15, 'Pecho'],
  ['Dominadas abiertas', 'reps', 6, 'Espalda'], ['Dominadas arqueras', 'reps', 3, 'Espalda', true], ['Sentadilla sumo', 'reps', 15, 'Piernas'], ['Puente de glúteo', 'reps', 15, 'Piernas'],
  ['Front lever', 'seconds', 5, 'Espalda'], ['Back lever', 'seconds', 5, 'Espalda'], ['Bandera humana', 'seconds', 5, 'Hombros'], ['Cuervo', 'seconds', 20, 'Hombros'],
  ['Cindy', 'reps', 300, 'WOD'],
  ['Salto de cuerda', 'reps', 20, 'Cardio'], ['Burpees suaves sin lagartija', 'reps', 20, 'Cardio'], ['Correr 5 km o bici', 'free', 0, 'Cardio intenso'], ['Estiramientos 10 min', 'free', 0, 'Movilidad'], ['Caminar 30 a 60 min', 'free', 0, 'Obligatorio'],
]

export function newItem(name: string, kind: RoutineKind, target: number): RoutineItem {
  return { id: `i-${makeId().slice(0, 8)}`, name, kind, target }
}

export function weekIndex(day: string): number {
  return (new Date(`${day}T12:00:00`).getDay() + 6) % 7
}
export function planOf(data: AppData): TrainPlan {
  return data.settings.train ?? seedWeek()
}
export function routineFor(data: AppData, day: string): Routine | null {
  const rt = planOf(data).week[weekIndex(day)]
  return rt && rt.items.length ? ajustar(rt, ajusteDe(data, day)) : null
}

export type Step = { item: RoutineItem; round: number; of: number; phase: 'before' | 'circuit' | 'after'; slot: number; side?: 1 | 2 }
export function roundsOf(rt: Routine, item: RoutineItem): number {
  return item.when ? item.rounds ?? 1 : item.rounds ?? rt.rounds
}
export function setsNeeded(rt: Routine, item: RoutineItem): number {
  return roundsOf(rt, item) * (item.sides ? 2 : 1)
}
export function stepsOf(rt: Routine): Step[] {
  const out: Step[] = []
  const add = (item: RoutineItem, round: number, phase: Step['phase']) => {
    const of = roundsOf(rt, item)
    if (item.sides) { out.push({ item, round, of, phase, slot: round * 2 - 1, side: 1 }, { item, round, of, phase, slot: round * 2, side: 2 }) }
    else out.push({ item, round, of, phase, slot: round })
  }
  const before = rt.items.filter(i => i.when === 'before'), after = rt.items.filter(i => i.when === 'after'), circuit = rt.items.filter(i => !i.when)
  for (const item of before) for (let k = 1; k <= roundsOf(rt, item); k++) add(item, k, 'before')
  const max = Math.max(rt.rounds, ...circuit.map(i => roundsOf(rt, i)))
  for (let k = 1; k <= max; k++) for (const item of circuit) if (roundsOf(rt, item) >= k) add(item, k, 'circuit')
  for (const item of after) for (let k = 1; k <= roundsOf(rt, item); k++) add(item, k, 'after')
  return out
}
export const GAME_NOTE = /^(aventura|temporada|mazmorra):/
export function setsOn(data: AppData, day: string, name: string): TrainingSet[] {
  return data.sets.filter(x => x.day === day && x.exercise === name && !GAME_NOTE.test(x.note ?? '')).sort((a, b) => a.at - b.at)
}
export function doneCount(data: AppData, day: string, item: RoutineItem): number {
  return setsOn(data, day, item.name).length
}
export function nextStep(data: AppData, day: string, rt: Routine): Step | null {
  return stepsOf(rt).find(st => doneCount(data, day, st.item) < st.slot) ?? null
}
export function routineProgress(data: AppData, day: string, rt: Routine): { done: number; total: number } {
  const steps = stepsOf(rt)
  return { done: steps.filter(st => doneCount(data, day, st.item) >= st.slot).length, total: steps.length }
}
export function minutosRutina(data: AppData, day: string, rt: Routine, desde: number, ahora = Date.now()): number {
  const nombres = new Set(rt.items.map(i => i.name))
  const ats = data.sets.filter(x => x.day === day && nombres.has(x.exercise) && x.note !== 'camara' && x.note !== 'redes').map(x => x.at)
  return Math.max(1, Math.round((ahora - Math.min(desde, ...ats)) / 60000))
}
export function trainedOn(data: AppData, day: string): boolean {
  return data.sets.some(x => x.day === day)
}
export function logSet(data: AppData, day: string, item: RoutineItem, value: number, now = Date.now()): AppData {
  const row: TrainingSet = item.kind === 'seconds'
    ? { id: makeId(), day, at: now, exercise: item.name, seconds: Math.max(0, Math.round(value)) }
    : { id: makeId(), day, at: now, exercise: item.name, reps: item.kind === 'free' ? 1 : Math.max(0, Math.round(value)), ...(item.kind === 'free' ? { note: 'hecho' } : {}) }
  return { ...data, sets: [...data.sets, row], activeWorkout: data.activeWorkout && !data.activeWorkout.endedAt ? data.activeWorkout : { startedAt: now } }
}
export function undoLast(data: AppData, day: string, name: string): AppData {
  const last = setsOn(data, day, name).at(-1)
  if (!last) return data
  const sets = data.sets.filter(x => x.id !== last.id)
  return { ...data, sets, activeWorkout: sets.some(x => x.day === day) ? data.activeWorkout : null }
}

export type Bump = { item: RoutineItem; dayIndex: number; to: number; text: string }
function valueOf(set: TrainingSet, kind: RoutineKind): number { return kind === 'seconds' ? set.seconds ?? 0 : set.reps ?? 0 }
export function bumpFor(data: AppData, rt: Routine, item: RoutineItem, today: string): number | null {
  if (item.kind === 'free' || item.target <= 0) return null
  const days = [...new Set(data.sets.filter(x => x.exercise === item.name && x.day < today && !GAME_NOTE.test(x.note ?? '') && (!item.quiet || x.day > item.quiet)).map(x => x.day))].sort().slice(-2)
  if (days.length < 2) return null
  const need = setsNeeded(rt, item)
  const full = days.every(d => { const rows = setsOn(data, d, item.name); return rows.length >= need && rows.every(x => valueOf(x, item.kind) >= item.target) })
  if (!full) return null
  return item.kind === 'seconds' ? item.target + 5 : item.target + (item.target >= 20 ? 2 : 1)
}
export function bumps(data: AppData, today: string): Bump[] {
  const plan = planOf(data)
  const seen = new Set<string>()
  const out: Bump[] = []
  plan.week.forEach((rt, dayIndex) => rt?.items.forEach(item => {
    if (seen.has(item.name)) return
    const to = bumpFor(data, rt, item, today)
    if (to === null) return
    seen.add(item.name)
    const unit = item.kind === 'seconds' ? 's' : ''
    out.push({ item, dayIndex, to, text: `${item.name}: ${item.target}${unit} a ${to}${unit}` })
  }))
  return out
}
export function applyBump(plan: TrainPlan, name: string, to: number): TrainPlan {
  return { ...plan, week: plan.week.map(rt => rt ? { ...rt, items: rt.items.map(i => i.name === name ? { ...i, target: to, quiet: undefined } : i) } : rt) }
}
export function quietBump(plan: TrainPlan, name: string, day: string): TrainPlan {
  return { ...plan, week: plan.week.map(rt => rt ? { ...rt, items: rt.items.map(i => i.name === name ? { ...i, quiet: day } : i) } : rt) }
}

function minutes(hhmm: string): number { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }
export function lockActive(data: AppData, day: string, clock: string): boolean {
  const plan = planOf(data)
  if (!plan.lock || !routineFor(data, day) || trainedOn(data, day)) return false
  return minutes(clock) >= minutes(plan.deadline)
}
export function clockOf(now: number): string {
  const d = new Date(now)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
export function label(item: RoutineItem): string {
  const side = item.sides ? ' por lado' : ''
  if (item.kind === 'free') return 'Marcar hecho'
  if (item.kind === 'seconds') return `${item.target >= 60 && item.target % 60 === 0 ? `${item.target / 60} min` : `${item.target} s`}${side}`
  return item.target > 0 ? `${item.target} reps${side}` : 'Las que salgan'
}

export function ajustarRutina2611(data: AppData): AppData {
  const train = data.settings.train
  const cambia = (i: RoutineItem): RoutineItem => i.name === 'Dominadas lentas' ? { ...i, name: 'Dominadas', target: 7 }
    : i.name === 'Chin ups lentas' ? { ...i, name: 'Chin ups', target: 7 }
    : i.name === 'Curl de toalla inferior' ? { ...i, target: 20 } : i
  const next = train ? { ...train, week: train.week.map(rt => rt ? { ...rt, items: rt.items.map(cambia) } : rt) } : undefined
  return { ...data, settings: { ...data.settings, train: next, rutina2611: true } }
}

function fijarMeta(train: TrainPlan | undefined, nombres: string[], target: number): TrainPlan | undefined {
  return train ? { ...train, week: train.week.map(rt => rt ? { ...rt, items: rt.items.map(i => nombres.includes(i.name) ? { ...i, target, quiet: undefined } : i) } : rt) } : undefined
}
export function metas2711(data: AppData): AppData {
  const train = fijarMeta(fijarMeta(data.settings.train, ['Crunches'], 30), ['Plancha lateral'], 45)
  return { ...data, settings: { ...data.settings, train, metas2711: true } }
}
export function cuerda2711(data: AppData): AppData {
  const train = data.settings.train
  const cambia = (rt: Routine): Routine => ({ ...rt, items: rt.items.filter(i => i.name !== 'Salto de cuerda').map(i => !i.when && /^pistol squat$/i.test(i.name) ? { ...i, rounds: 2 } : i) })
  return { ...data, settings: { ...data.settings, train: train ? { ...train, week: train.week.map(rt => rt ? cambia(rt) : rt) } : undefined, cuerda2711: true } }
}
export function talones2711(data: AppData): AppData {
  const train = data.settings.train
  return { ...data, settings: { ...data.settings, train: train ? { ...train, week: train.week.map(rt => rt ? { ...rt, items: rt.items.filter(i => i.name !== 'Subidas de talones en wall sit') } : rt) } : undefined, talones2711: true } }
}
const PIERNA_RE = /sentadilla|squat|desplante|zancada|lunge|wall sit|tal[oó]n|pantorrilla|puente de gl[uú]teo|nordic/i
const esPierna = (n: string) => CATALOG.find(c => c[0] === n)?.[3] === 'Piernas' || PIERNA_RE.test(n)
export function intercalarPiernas(rt: Routine): Routine {
  const colgar = rt.items.filter(i => !i.when && i.name === 'Colgarse de la barra')
  const circuito = rt.items.filter(i => !i.when && i.name !== 'Colgarse de la barra')
  const piernas = circuito.filter(i => esPierna(i.name)), otros = circuito.filter(i => !esPierna(i.name))
  const mezcla: RoutineItem[] = []
  for (let k = 0; k < Math.max(piernas.length, otros.length); k++) { if (piernas[k]) mezcla.push(piernas[k]); if (otros[k]) mezcla.push(otros[k]) }
  return { ...rt, items: [...rt.items.filter(i => i.when === 'before'), ...mezcla, ...colgar, ...rt.items.filter(i => i.when === 'after')] }
}
export function orden2711(data: AppData): AppData {
  const train = data.settings.train
  return { ...data, settings: { ...data.settings, train: train ? { ...train, week: train.week.map((rt, i) => rt && i === 4 ? intercalarPiernas(rt) : rt) } : undefined, orden2711: true } }
}
function conColgar(rt: Routine): Routine {
  const colgar = rt.items.filter(i => i.name === 'Colgarse de la barra')
  const resto = rt.items.filter(i => i.name !== 'Colgarse de la barra')
  const item = colgar[0] ?? newItem('Colgarse de la barra', 'seconds', 30)
  const k = resto.findIndex(i => i.when === 'after')
  return { ...rt, items: k === -1 ? [...resto, item] : [...resto.slice(0, k), item, ...resto.slice(k)] }
}
function habilidades(rt: Routine, tuck: number): Routine {
  const cambia = (i: RoutineItem): RoutineItem => i.name === 'Handstand contra pared' ? { ...i, name: 'Handstand pecho a la pared' } : i.name === 'Lagartijas up' ? { ...i, name: 'Lagartijas declinadas' } : i.name === 'Lagartijas down' ? { ...i, name: 'Lagartijas inclinadas' } : i
  const items = rt.items.map(cambia)
  const tiene = (n: string) => items.find(i => i.name === n)
  const frente = [tiene('Handstand pecho a la pared') ?? newItem('Handstand pecho a la pared', 'seconds', 30), tiene('Despegar pies en handstand') ?? newItem('Despegar pies en handstand', 'reps', 5), tiene('Ranita') ?? newItem('Ranita', 'seconds', 20), tiene('Tuck planche') ?? newItem('Tuck planche', 'seconds', tuck)]
  const nombres = new Set(frente.map(i => i.name))
  const antes = items.filter(i => i.when === 'before'), despues = items.filter(i => i.when === 'after'), circuito = items.filter(i => !i.when && !nombres.has(i.name))
  return conColgar({ ...rt, items: [...antes, ...frente, ...circuito, ...despues] })
}
export function habilidades2711(data: AppData): AppData {
  const train = data.settings.train
  const sinTalones = (rt: Routine): Routine => ({ ...rt, items: rt.items.filter(i => i.name !== 'Elevaciones de talones') })
  const dia = (rt: Routine | null, i: number): Routine | null => !rt ? rt
    : i === 0 ? habilidades(rt, 10)
    : i === 3 ? habilidades(rt, 15)
    : i === 1 ? conColgar(sinTalones(rt))
    : i === 4 ? conColgar(intercalarPiernas(sinTalones(rt)))
    : i === 6 ? conColgar(rt) : rt
  return { ...data, settings: { ...data.settings, train: train ? { ...train, week: train.week.map(dia) } : undefined, habilidades2711: true } }
}
const PECHO = ['Lagartijas', 'Lagartijas declinadas', 'Lagartijas inclinadas']
function pechoCompleto(rt: Routine): Routine {
  const items = rt.items.map(i => i.name === 'Toe pulls en handstand' ? { ...i, name: 'Despegar pies en handstand' } : i)
  const trio = PECHO.map(n => items.find(i => i.name === n) ?? newItem(n, 'reps', 15))
  const sin = items.filter(i => !PECHO.includes(i.name))
  const otra = sin.findIndex(i => !i.when && /^lagartijas/i.test(i.name))
  const fin = sin.findIndex(i => i.name === 'Colgarse de la barra' || i.when === 'after')
  const k = otra !== -1 ? otra : fin !== -1 ? fin : sin.length
  return { ...rt, items: [...sin.slice(0, k), ...trio, ...sin.slice(k)] }
}
export function pecho2711(data: AppData): AppData {
  const train = data.settings.train
  return { ...data, settings: { ...data.settings, train: train ? { ...train, week: train.week.map((rt, i) => rt && (i === 0 || i === 3) ? pechoCompleto(rt) : rt) } : undefined, pecho2711: true } }
}
function domingoActivo(rt: Routine | null): Routine {
  const colgar = rt?.items.find(i => i.name === 'Colgarse de la barra') ?? newItem('Colgarse de la barra', 'seconds', 30)
  const correr = rt?.items.find(i => i.name === 'Correr 5 km o bici') ?? { ...newItem('Correr 5 km o bici', 'free', 0), when: 'after' as const }
  return { title: 'Descanso activo', rounds: rt?.rounds ?? 3, items: [colgar, { ...newItem('Estiramientos 10 min', 'free', 0), when: 'after' }, correr] }
}
function conLever(rt: Routine): Routine {
  if (rt.items.some(i => /front lever/i.test(i.name))) return rt
  const k = rt.items.findIndex(i => !i.when)
  const lever = newItem('Front lever tuck', 'seconds', 10)
  return { ...rt, items: k === -1 ? [...rt.items, lever] : [...rt.items.slice(0, k), lever, ...rt.items.slice(k)] }
}
export function ajuste2711(data: AppData): AppData {
  const train = data.settings.train
  const sinLentas = (rt: Routine): Routine => ({ ...rt, items: rt.items.filter(i => i.name !== 'Lagartijas lentas') })
  const conLegRaises = (rt: Routine): Routine => rt.items.some(i => i.name === 'Leg raises') ? rt : { ...rt, items: [...rt.items, newItem('Leg raises', 'reps', 15)] }
  const dia = (rt: Routine | null, i: number): Routine | null => i === 6 ? domingoActivo(rt)
    : !rt ? rt
    : i === 0 || i === 3 ? sinLentas(pechoCompleto(rt))
    : i === 1 ? conColgar(intercalarPiernas(conLegRaises(rt)))
    : i === 2 || i === 5 ? conLever(rt) : rt
  return { ...data, settings: { ...data.settings, train: train ? { ...train, week: train.week.map(dia) } : undefined, ajuste2711: true } }
}
export function legs2711(data: AppData): AppData {
  const train = data.settings.train
  return { ...data, settings: { ...data.settings, train: train ? { ...train, week: train.week.map(rt => rt ? { ...rt, items: rt.items.map(i => i.name === 'Crunches' ? { ...i, name: 'Leg raises', target: 15, quiet: undefined } : i) } : rt) } : undefined, legs2711: true } }
}
export function lsit2711(data: AppData): AppData {
  return { ...data, settings: { ...data.settings, train: fijarMeta(data.settings.train, ['L sit', 'L-sit', 'L Sit'], 15), lsit2711: true } }
}
export function toquesA7(data: AppData): AppData {
  return { ...data, settings: { ...data.settings, train: fijarMeta(data.settings.train, ['Handstand toque de hombros'], 7), toques2611: true } }
}
export const QUITADOS_2611 = ['Parado de cabeza', 'Handstand push up con pared', 'Handstand push up']
export function quitar2611(data: AppData): AppData {
  const train = data.settings.train
  const next = train ? { ...train, week: train.week.map(rt => rt ? { ...rt, items: rt.items.filter(i => !QUITADOS_2611.includes(i.name)) } : rt) } : undefined
  return { ...data, settings: { ...data.settings, train: next, quitar2611: true } }
}
export function pistol2711(data: AppData): AppData {
  const train = data.settings.train
  const next = train ? { ...train, week: train.week.map(rt => rt ? { ...rt, items: rt.items.map(i => i.name === 'Pistol squat asistida' ? { ...i, name: 'Pistol squat' } : i) } : rt) } : undefined
  return { ...data, settings: { ...data.settings, train: next, pistol2711: true } }
}
export function hspuA3(data: AppData): AppData {
  return { ...data, settings: { ...data.settings, train: fijarMeta(data.settings.train, ['Handstand push up con pared', 'Handstand push up'], 3), hspu2611: true } }
}

export function deshacerRondas2611(data: AppData): AppData {
  const train = data.settings.train
  const vuelve = (rt: Routine): Routine => ({ ...rt, rounds: 3, items: rt.items.map(i => !i.when && /^(Dominadas|Chin ups)$/.test(i.name) && i.rounds === 4 ? { ...i, rounds: 5 } : i) })
  const next = train ? { ...train, week: train.week.map((rt, i) => rt && i === 2 && rt.rounds === 4 ? vuelve(rt) : rt) } : undefined
  return { ...data, settings: { ...data.settings, train: next, rondas2611: undefined } }
}
