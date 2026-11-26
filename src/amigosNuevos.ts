import { useEffect, useState } from 'react'
import type { AppData } from './lib/model'
import { cargarSocial, type Social } from './useSocial'

export const AMIGO_KEY = 'bambu.amigo.pendiente'
export const SEEN_KEY = (uid: string) => `bambu.amigos.vistos.${uid}`

function seen(uid: string): string[] {
  try { const v = JSON.parse(localStorage.getItem(SEEN_KEY(uid)) ?? '[]'); return Array.isArray(v) ? v : [] } catch { return [] }
}
export function avisos(s: Social, uid: string, privada: boolean): string[] {
  const nuevos = privada ? [] : s.dir.filter(d => d.uid !== uid && d.siguiendo.includes(uid)).map(d => d.uid)
  return [...new Set([...s.entrantes, ...nuevos])]
}

export function useAmigosNuevos(data: AppData, uid: string | undefined, page: string): number {
  const [n, setN] = useState(0)
  const joined = !!data.settings.tablas
  const privada = data.settings.tablas?.privada === true
  useEffect(() => {
    if (!uid || !joined) { setN(0); return }
    let alive = true
    cargarSocial(uid, data.settings.amigos ?? []).then(s => {
      if (!alive) return
      const vistos = seen(uid)
      setN(page === 'Amigos' ? 0 : avisos(s, uid, privada).filter(id => !vistos.includes(id)).length)
    }).catch(() => undefined)
    return () => { alive = false }
  }, [uid, joined, page, privada]) // eslint-disable-line react-hooks/exhaustive-deps
  return n
}
