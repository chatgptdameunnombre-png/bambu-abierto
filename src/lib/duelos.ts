export type Reloj = { fase: 'espera' | 'cuenta' | 'duelo' | 'fin'; t: number }
export const CUENTA = 3

export function pasoReloj(r: Reloj, ahora: number, visto: boolean, limite: number): { r: Reloj; mostrar: number | null; evento: 'empieza' | 'acaba' | null } {
  if (r.fase === 'fin') return { r, mostrar: 0, evento: null }
  if (r.fase === 'espera') return visto ? { r: { fase: 'cuenta', t: ahora }, mostrar: -CUENTA, evento: null } : { r, mostrar: null, evento: null }
  if (r.fase === 'cuenta') {
    const n = CUENTA - Math.floor((ahora - r.t) / 1000)
    return n <= 0 ? { r: { fase: 'duelo', t: ahora }, mostrar: limite, evento: 'empieza' } : { r, mostrar: -n, evento: null }
  }
  const resta = limite - Math.floor((ahora - r.t) / 1000)
  return resta <= 0 ? { r: { fase: 'fin', t: ahora }, mostrar: 0, evento: 'acaba' } : { r, mostrar: resta, evento: null }
}
