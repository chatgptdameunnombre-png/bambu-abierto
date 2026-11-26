import { mmss, wodDe, wodTexto } from './wod'

export type TipoReto = 'reps' | 'aguante' | 'cindy'
export type Reto = { id: string; de: string; participantes: string[]; tipo: TipoReto; ejercicio: string; marcas: Record<string, number>; creado: number; movido: number; version: string }
export type EstadoReto = 'te-toca' | 'esperando' | 'terminado' | 'vencido'

export const VENCE = 48 * 3600 * 1000
export const GUARDA = 7 * 86400 * 1000
export const MAX_PERSONAS = 10
export const SEG_REPS = 60
export const TOPE_AGUANTE = 600
export const SE_ACABA = 3000

export const TIPOS: { tipo: TipoReto; nombre: string; texto: string; ejercicios: string[] }[] = [
  { tipo: 'reps', nombre: 'Más repeticiones', texto: '60 segundos con la cámara. Gana quien haga más.', ejercicios: ['Lagartijas', 'Sentadillas', 'Fondos', 'Dominadas', 'Burpees', 'Jumping jacks', 'Lagartijas diamante', 'Pike push ups', 'Chin ups', 'Dominadas australianas'] },
  { tipo: 'aguante', nombre: 'Aguantar más', texto: 'Sin límite. El tiempo corre con la postura correcta; si la pierdes 3 segundos, se acaba.', ejercicios: ['Plancha', 'Plancha con brazos estirados', 'Plancha lateral', 'Wall sit', 'Colgarse de la barra', 'Hollow hold', 'L sit'] },
  { tipo: 'cindy', nombre: 'Cindy', texto: '20 minutos de 5 dominadas, 10 lagartijas y 15 sentadillas. Gana quien haga más.', ejercicios: ['Cindy'] },
]
export const tipoDeReto = (t: string): TipoReto => t === 'aguante' || t === 'cindy' ? t : 'reps'
export const nombreTipo = (t: TipoReto) => TIPOS.find(x => x.tipo === t)?.nombre ?? ''

export function valorTexto(r: Pick<Reto, 'tipo' | 'ejercicio'>, v: number): string {
  if (r.tipo === 'aguante') return mmss(v)
  if (r.tipo === 'cindy') { const w = wodDe(r.ejercicio) ?? wodDe('Cindy'); return w ? wodTexto(w, v) : String(v) }
  return String(v)
}

export function estadoReto(r: Reto, uid: string, ahora = Date.now()): EstadoReto {
  const vencido = r.creado > 0 && ahora - r.creado > VENCE
  if (r.participantes.every(p => p in r.marcas)) return 'terminado'
  if (!(uid in r.marcas)) return vencido ? 'vencido' : 'te-toca'
  return vencido ? 'terminado' : 'esperando'
}

export function lugares(r: Pick<Reto, 'marcas' | 'participantes'>): { uid: string; valor: number; lugar: number }[] {
  const filas = r.participantes.filter(p => p in r.marcas).map(p => ({ uid: p, valor: r.marcas[p] })).sort((a, b) => b.valor - a.valor || a.uid.localeCompare(b.uid))
  return filas.map(f => ({ ...f, lugar: filas.findIndex(x => x.valor === f.valor) + 1 }))
}

export function lugarDe(r: Reto, uid: string): { lugar: number; de: number; empate: boolean } | null {
  const l = lugares(r)
  const mio = l.find(x => x.uid === uid)
  if (!mio) return null
  return { lugar: mio.lugar, de: l.length, empate: l.filter(x => x.lugar === mio.lugar).length > 1 }
}

export function visibles(lista: Reto[], uid: string, ocultos: string[] = [], ahora = Date.now()): Reto[] {
  return lista.filter(r => {
    if (ocultos.includes(r.id)) return false
    const e = estadoReto(r, uid, ahora)
    if (e === 'te-toca' || e === 'esperando') return true
    const cuando = Math.max(r.creado, r.movido)
    return !cuando || ahora - cuando <= GUARDA
  })
}

export function marcador(lista: Reto[], uid: string, desde: number, ahora = Date.now()): { ganados: number; perdidos: number; empates: number } {
  const out = { ganados: 0, perdidos: 0, empates: 0 }
  for (const r of lista) {
    if (estadoReto(r, uid, ahora) !== 'terminado' || Math.max(r.creado, r.movido) < desde) continue
    const l = lugarDe(r, uid)
    if (!l || l.de < 2) continue
    if (l.lugar === 1 && l.empate) out.empates++
    else if (l.lugar === 1) out.ganados++
    else out.perdidos++
  }
  return out
}

export function aVencer(r: Reto): { uid: string; valor: number } | null {
  const l = lugares(r)
  return l.length ? { uid: l[0].uid, valor: l[0].valor } : null
}
