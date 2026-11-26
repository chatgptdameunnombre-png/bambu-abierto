import { estadoReto, lugarDe, valorTexto, type Reto } from './retos'

export const FELICITADOS = 'bambu.retos.felicitados'

export function porFelicitar(lista: Reto[], uid: string, ya: string[], ahora = Date.now()): Reto[] {
  return lista.filter(r => {
    if (ya.includes(r.id) || estadoReto(r, uid, ahora) !== 'terminado') return false
    const l = lugarDe(r, uid)
    return !!l && l.de > 1 && l.lugar === 1 && !l.empate
  })
}

export function textoFelicitar(r: Reto, uid: string): string {
  const v = r.marcas[uid] ?? 0
  const otros = r.participantes.length - 1
  return `${r.ejercicio}: ${valorTexto(r, v)}. Le ganaste a ${otros === 1 ? '1 persona' : `${otros} personas`}.`
}
