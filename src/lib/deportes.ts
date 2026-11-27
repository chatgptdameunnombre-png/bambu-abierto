import { makeId, type Activity, type AppData, type Routine } from './model'
import type { Muscle } from './musculos'
import { musculoDeNombre, sinAcentos } from './musculoNombre'

export type Deporte = { id: string; name: string; musculos: Muscle[] }
const TODO: Muscle[] = ['Pecho', 'Espalda', 'Hombros', 'Brazos', 'Abdomen', 'Piernas']
export const DEPORTES: Deporte[] = [
  { id: 'futbol', name: 'Fútbol', musculos: ['Piernas'] },
  { id: 'basquet', name: 'Básquet', musculos: ['Piernas', 'Hombros'] },
  { id: 'voleibol', name: 'Vóleibol', musculos: ['Piernas', 'Hombros'] },
  { id: 'americano', name: 'Fútbol americano', musculos: ['Piernas', 'Pecho', 'Hombros'] },
  { id: 'beisbol', name: 'Béisbol', musculos: ['Hombros', 'Brazos'] },
  { id: 'rugby', name: 'Rugby', musculos: ['Piernas', 'Pecho', 'Hombros'] },
  { id: 'hockey', name: 'Hockey', musculos: ['Piernas'] },
  { id: 'handball', name: 'Handball', musculos: ['Piernas', 'Hombros'] },
  { id: 'escalar', name: 'Escalar', musculos: ['Espalda', 'Brazos', 'Abdomen'] },
  { id: 'nadar', name: 'Nadar', musculos: ['Espalda', 'Hombros', 'Pecho'] },
  { id: 'box', name: 'Box', musculos: ['Hombros', 'Brazos', 'Abdomen'] },
  { id: 'artes', name: 'Artes marciales', musculos: ['Piernas', 'Abdomen', 'Hombros'] },
  { id: 'lucha', name: 'Lucha o jiu-jitsu', musculos: ['Espalda', 'Brazos', 'Abdomen'] },
  { id: 'correr', name: 'Correr', musculos: ['Piernas'] },
  { id: 'bici', name: 'Bici', musculos: ['Piernas'] },
  { id: 'caminar', name: 'Caminar', musculos: ['Piernas'] },
  { id: 'senderismo', name: 'Senderismo', musculos: ['Piernas'] },
  { id: 'tenis', name: 'Tenis', musculos: ['Hombros', 'Brazos', 'Piernas'] },
  { id: 'padel', name: 'Pádel', musculos: ['Hombros', 'Brazos', 'Piernas'] },
  { id: 'frontenis', name: 'Frontenis', musculos: ['Hombros', 'Brazos', 'Piernas'] },
  { id: 'pingpong', name: 'Ping pong', musculos: ['Brazos'] },
  { id: 'badminton', name: 'Bádminton', musculos: ['Hombros', 'Piernas'] },
  { id: 'remo', name: 'Remo', musculos: ['Espalda', 'Brazos', 'Piernas'] },
  { id: 'surf', name: 'Surf', musculos: ['Espalda', 'Hombros'] },
  { id: 'patinar', name: 'Patinar o skate', musculos: ['Piernas'] },
  { id: 'baile', name: 'Baile', musculos: ['Piernas'] },
  { id: 'yoga', name: 'Yoga', musculos: [] },
  { id: 'pilates', name: 'Pilates', musculos: ['Abdomen'] },
  { id: 'crossfit', name: 'CrossFit', musculos: TODO },
  { id: 'pesas', name: 'Gimnasio con pesas', musculos: TODO },
  { id: 'golf', name: 'Golf', musculos: [] },
]
export const OTRO = 'otro'
export const DURACIONES = [30, 45, 60, 90, 120] as const
export const INTENSIDADES: [number, string, string][] = [[1, 'Suave', 'Platicando sin problema'], [2, 'Normal', 'Sudando, a buen ritmo'], [3, 'Fuerte', 'Al máximo, sin aire']]
export const DEPORTE_PREFIX = 'Deporte:'
export const DEPORTE_RE = /^[a-z]{2,20}$/

export type Nivel = 'nada' | 'rebaja' | 'descanso'
export type Ajuste = { nivel: Nivel; musculos: Muscle[]; nombres: string[]; minutos: number }

export function buscarDeportes(q: string): Deporte[] {
  const b = sinAcentos(q.trim())
  return b ? DEPORTES.filter(d => sinAcentos(d.name).includes(b)) : DEPORTES
}
export function deportePorId(id: string | undefined): Deporte | null {
  return DEPORTES.find(d => d.id === id) ?? null
}
export function carga(minutos: number, intensidad: number): number {
  return minutos * (intensidad >= 3 ? 2 : intensidad === 2 ? 1.5 : 1)
}
export function nivelDe(c: number): Nivel {
  return c >= 120 ? 'descanso' : c >= 45 ? 'rebaja' : 'nada'
}
export function nombreDeporte(a: Activity): string {
  return deportePorId(a.deporte)?.name ?? ((a.note ?? '').replace(DEPORTE_PREFIX, '').trim() || 'Otro deporte')
}
export function deportesOn(data: AppData, day: string): Activity[] {
  return data.activities.filter(a => a.day === day && !!a.deporte)
}
function resumen(list: Activity[]): Ajuste | null {
  if (!list.length) return null
  const minutos = list.reduce((m, a) => m + (a.minutes ?? 0), 0)
  const c = list.reduce((m, a) => m + carga(a.minutes ?? 0, a.intensity ?? 2), 0)
  const musculos = [...new Set(list.flatMap(a => deportePorId(a.deporte)?.musculos ?? []))]
  return { nivel: nivelDe(c), musculos, nombres: list.map(nombreDeporte), minutos }
}
export function ajusteDe(data: AppData, day: string): Ajuste | null {
  return resumen(deportesOn(data, day).filter(a => !a.sinAjuste))
}
export function previa(dep: Deporte | null, minutos: number, intensidad: number): Ajuste {
  return { nivel: nivelDe(carga(minutos, intensidad)), musculos: dep?.musculos ?? [], nombres: [dep?.name ?? 'Otro deporte'], minutos }
}
export function ajustar(rt: Routine, aj: Ajuste | null): Routine | null {
  if (!aj || aj.nivel === 'nada') return rt
  if (aj.nivel === 'descanso') return null
  const usado = (name: string) => { const m = musculoDeNombre(name); return !!m && aj.musculos.includes(m) }
  const items = rt.items.filter(i => i.when || !usado(i.name)).map(i => !i.when && i.rounds ? { ...i, rounds: Math.min(i.rounds, 2) } : i)
  if (!items.some(i => !i.when)) return null
  return { ...rt, rounds: Math.min(rt.rounds, 2), items }
}
const MUSCULO_TEXTO: Record<Muscle, string> = { Pecho: 'pecho', Espalda: 'espalda', Hombros: 'hombros', Brazos: 'brazos', Abdomen: 'abdomen', Piernas: 'pierna' }
export function lista(xs: string[]): string {
  return xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`
}
export function decision(aj: Ajuste, base: Routine | null): string {
  if (aj.nivel === 'descanso') return 'Hoy descansas: ya cumpliste tu entreno.'
  if (aj.nivel === 'nada' || !base) return 'Tu rutina se queda igual.'
  if (!ajustar(base, aj)) return 'Hoy descansas: ya usaste todo lo que tocaba.'
  const quita = aj.musculos.filter(m => base.items.some(i => !i.when && musculoDeNombre(i.name) === m)).map(m => MUSCULO_TEXTO[m])
  return quita.length ? `Te quito ${lista(quita)} y bajo a 2 rondas.` : 'Bajo tu rutina a 2 rondas.'
}
export function deporteActivity(day: string, dep: Deporte | null, nombre: string, minutos: number, intensidad: number, ajusta: boolean): Activity {
  return { id: `deporte:${makeId()}`, day, kind: 'other', minutes: minutos, intensity: intensidad, deporte: dep?.id ?? OTRO, note: `${DEPORTE_PREFIX} ${(dep?.name ?? nombre).slice(0, 40)}`, ...(ajusta ? {} : { sinAjuste: true }) }
}
export function deporteXpOn(data: AppData, day: string): number {
  const aj = resumen(deportesOn(data, day))
  return !aj ? 0 : aj.nivel === 'descanso' ? 30 : aj.nivel === 'rebaja' ? 15 : 10
}
