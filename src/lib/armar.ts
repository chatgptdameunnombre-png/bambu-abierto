import { EXERCISES, type Equipment } from './exercises'
import type { Routine, RoutineItem, TrainPlan } from './model'
import { roundsOf } from './rutina'

export type Nivel = 'empiezo' | 'entreno' | 'avanzado'
export type Minutos = 15 | 30 | 45
export type Respuestas = { equipo: Equipment[]; dias: number; minutos: Minutos; nivel: Nivel }
type Hueco = 'empuje' | 'hombro' | 'jalon' | 'dominada' | 'fondo' | 'biceps' | 'pierna' | 'bisagra' | 'pantorrilla' | 'core'
export type Opcion = { name: string; hueco: Hueco; level: number; kind: 'reps' | 'seconds'; range: [number, number]; equipo: Equipment[] }

const DE_GAEL: Partial<Record<string, Hueco>> = { empuje: 'empuje', hombro: 'hombro', jalon: 'jalon', jalon_ancho: 'jalon', aduccion: 'dominada', biceps: 'biceps', pierna: 'pierna', bisagra: 'bisagra', pantorrilla: 'pantorrilla', core: 'core' }
const EXTRA: Opcion[] = [
  { name: 'Dominadas australianas', hueco: 'jalon', level: 2.5, kind: 'reps', range: [6, 12], equipo: ['barra'] },
  { name: 'Chin ups', hueco: 'dominada', level: 2.5, kind: 'reps', range: [3, 10], equipo: ['barra'] },
  { name: 'Colgarse de la barra', hueco: 'dominada', level: 0.5, kind: 'seconds', range: [15, 40], equipo: ['barra'] },
  { name: 'Fondos en banco', hueco: 'fondo', level: 1, kind: 'reps', range: [8, 15], equipo: ['silla'] },
  { name: 'Fondos', hueco: 'fondo', level: 2, kind: 'reps', range: [5, 12], equipo: ['paralelas'] },
  { name: 'Lagartijas cerradas', hueco: 'fondo', level: 1.5, kind: 'reps', range: [6, 12], equipo: ['nada'] },
  { name: 'Elevaciones de piernas colgado', hueco: 'core', level: 5, kind: 'reps', range: [5, 12], equipo: ['barra'] },
  { name: 'Wall sit', hueco: 'pierna', level: 0.5, kind: 'seconds', range: [20, 60], equipo: ['pared'] },
]
export const OPCIONES: Opcion[] = [
  ...EXERCISES.flatMap(e => { const h = DE_GAEL[e.slot]; return h ? [{ name: e.name, hueco: h, level: e.level, kind: e.mode, range: e.range, equipo: e.equipment }] : [] }),
  ...EXTRA,
]

export const EQUIPO: { id: Equipment; label: string }[] = [
  { id: 'nada', label: 'Solo el piso' }, { id: 'pared', label: 'Pared' }, { id: 'silla', label: 'Silla o banco' }, { id: 'mesa', label: 'Mesa firme' },
  { id: 'barra', label: 'Barra de dominadas' }, { id: 'paralelas', label: 'Paralelas' }, { id: 'mochila', label: 'Mochila con peso' },
  { id: 'toalla', label: 'Toalla' }, { id: 'libros', label: 'Libros' },
]
export const NIVELES: { id: Nivel; label: string }[] = [{ id: 'empiezo', label: 'Empiezo' }, { id: 'entreno', label: 'Ya entreno' }, { id: 'avanzado', label: 'Avanzado' }]

type Tipo = 'torso' | 'pierna' | 'completo'
const SESION: Record<Tipo, { title: string; huecos: Hueco[] }> = {
  torso: { title: 'Torso', huecos: ['empuje', 'jalon', 'hombro', 'dominada', 'fondo', 'biceps', 'core'] },
  pierna: { title: 'Pierna y core', huecos: ['pierna', 'bisagra', 'core', 'pantorrilla', 'pierna', 'core', 'bisagra'] },
  completo: { title: 'Cuerpo completo', huecos: ['pierna', 'empuje', 'jalon', 'bisagra', 'hombro', 'core', 'dominada'] },
}
const SEMANA: Record<number, (Tipo | null)[]> = {
  2: ['completo', null, null, 'completo', null, null, null],
  3: ['torso', null, 'pierna', null, 'completo', null, null],
  4: ['torso', 'pierna', null, 'torso', 'pierna', null, null],
  5: ['torso', 'pierna', null, 'torso', 'pierna', 'completo', null],
  6: ['torso', 'pierna', 'torso', 'pierna', 'torso', 'pierna', null],
}
const POR_TIEMPO: Record<Minutos, { ejercicios: number; rondas: number }> = { 15: { ejercicios: 3, rondas: 2 }, 30: { ejercicios: 5, rondas: 3 }, 45: { ejercicios: 7, rondas: 3 } }
const PUNTO: Record<Nivel, number> = { empiezo: 0, entreno: 0.5, avanzado: 1 }

const tiene = (o: Opcion, equipo: Equipment[]) => o.equipo.every(e => e === 'nada' || equipo.includes(e))
export function escalera(hueco: Hueco, equipo: Equipment[]): Opcion[] {
  return OPCIONES.filter(o => o.hueco === hueco && tiene(o, equipo)).sort((a, b) => a.level - b.level)
}
function meta(o: Opcion, nivel: Nivel): number {
  const [lo, hi] = o.range
  return Math.round(lo + (hi - lo) * PUNTO[nivel] * 0.6)
}
function elegir(hueco: Hueco, r: Respuestas, usados: Set<string>, otra: boolean): Opcion | null {
  const lista = escalera(hueco, r.equipo).filter(o => !usados.has(o.name))
  if (!lista.length) return null
  const i = Math.round((lista.length - 1) * PUNTO[r.nivel])
  return lista[otra && lista.length > 1 ? (i > 0 ? i - 1 : i + 1) : i]
}

export function armarSemana(r: Respuestas): (Routine | null)[] {
  const dias = Math.max(2, Math.min(6, Math.round(r.dias)))
  const { ejercicios, rondas } = POR_TIEMPO[r.minutos]
  const vistos: Record<Tipo, number> = { torso: 0, pierna: 0, completo: 0 }
  return SEMANA[dias].map((tipo, d) => {
    if (!tipo) return null
    const otra = vistos[tipo]++ % 2 === 1
    const usados = new Set<string>()
    const items: RoutineItem[] = []
    for (const hueco of SESION[tipo].huecos) {
      if (items.length >= ejercicios) break
      const o = elegir(hueco, r, usados, otra)
      if (!o) continue
      usados.add(o.name)
      items.push({ id: `b${d}-${items.length}`, name: o.name, kind: o.kind, target: meta(o, r.nivel) })
    }
    return items.length ? { title: SESION[tipo].title, rounds: rondas, items } : null
  })
}

export function planArmado(base: TrainPlan, r: Respuestas): TrainPlan {
  return { ...base, week: armarSemana(r) }
}

export type Tiempo = 0 | 15 | 30
export function recortar(rt: Routine, minutos: Tiempo): Routine {
  if (!minutos) return rt
  const circuito = rt.items.filter(i => !i.when)
  return { ...rt, rounds: minutos === 15 ? 2 : Math.min(3, rt.rounds), items: circuito.slice(0, minutos === 15 ? 3 : 5).map(i => ({ ...i, rounds: undefined })) }
}
export function minutosDe(rt: Routine, descanso: number): number {
  const series = rt.items.reduce((a, i) => a + roundsOf(rt, i) * (i.sides ? 2 : 1), 0)
  return Math.max(1, Math.round(series * (40 + descanso) / 60))
}

export function semanaVacia(): TrainPlan {
  return { deadline: '19:00', lock: false, restSeconds: 60, week: [null, null, null, null, null, null, null] }
}

export type Cambio = { opcion: Opcion; etiqueta: 'Más fácil' | 'Más difícil' | 'Otra opción' }
export function cambiosPara(nombre: string, equipo: Equipment[], kind: 'reps' | 'seconds' | 'free'): Cambio[] {
  const actual = OPCIONES.find(o => o.name === nombre)
  if (!actual) return OPCIONES.filter(o => tiene(o, equipo) && o.name !== nombre && (kind === 'free' || o.kind === kind)).slice(0, 12).map(opcion => ({ opcion, etiqueta: 'Otra opción' as const }))
  return escalera(actual.hueco, equipo).filter(o => o.name !== nombre).map(opcion => ({ opcion, etiqueta: opcion.level < actual.level ? 'Más fácil' as const : opcion.level > actual.level ? 'Más difícil' as const : 'Otra opción' as const }))
}

export function cambiarEnSemana(plan: TrainPlan, nombre: string, opcion: Opcion, nivel: Nivel = 'entreno'): TrainPlan {
  return { ...plan, week: plan.week.map(rt => rt ? { ...rt, items: rt.items.map(i => i.name === nombre ? { ...i, name: opcion.name, kind: opcion.kind, target: meta(opcion, nivel), quiet: undefined } : i) } : rt) }
}

export function quitarDeSemana(plan: TrainPlan, nombre: string): TrainPlan {
  return { ...plan, week: plan.week.map(rt => { if (!rt) return rt; const items = rt.items.filter(i => i.name !== nombre); return items.length ? { ...rt, items } : null }) }
}
