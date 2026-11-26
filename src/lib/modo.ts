import type { Settings } from './model'

export type Modo = 'habitos' | 'competir'
export const modoDe = (s: Pick<Settings, 'modo'>): Modo => s.modo === 'competir' ? 'competir' : 'habitos'
export const esCompetir = (s: Pick<Settings, 'modo'>) => modoDe(s) === 'competir'
export const OCULTAS_EN_COMPETIR = ['Hoy', 'Historial'] as const
export function inicioDe<T extends string>(s: Pick<Settings, 'modo'>, permitidas: T[]): T | 'Hoy' {
  if (!esCompetir(s)) return 'Hoy'
  return permitidas.find(x => x === 'Entrenar') ?? permitidas.find(x => x === 'Amigos') ?? permitidas[0] ?? 'Hoy'
}
