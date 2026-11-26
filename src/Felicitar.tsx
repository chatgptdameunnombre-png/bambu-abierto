import { useEffect } from 'react'
import { misRetos } from './lib/firebase'
import { FELICITADOS, porFelicitar, textoFelicitar } from './lib/felicitar'
import { celebrate, rewardSound } from './ui'

export function useFelicitar(uid: string | undefined) {
  useEffect(() => {
    if (!uid) return
    let vivo = true
    const t = window.setTimeout(() => {
      misRetos(uid).then(lista => {
        if (!vivo) return
        let ya: string[] = []
        try { const v = JSON.parse(localStorage.getItem(FELICITADOS) ?? '[]'); ya = Array.isArray(v) ? v : [] } catch { ya = [] }
        const nuevos = porFelicitar(lista, uid, ya)
        if (!nuevos.length) return
        try { localStorage.setItem(FELICITADOS, JSON.stringify([...ya, ...nuevos.map(r => r.id)].slice(-300))) } catch { return }
        const r = nuevos[0]
        rewardSound(true)
        celebrate({ kind: 'achievement', title: nuevos.length > 1 ? `🏆 ¡Felicidades! Ganaste ${nuevos.length} retos` : '🏆 ¡Felicidades, ganaste el reto!', text: textoFelicitar(r, uid) })
      }).catch(() => undefined)
    }, 2500)
    return () => { vivo = false; window.clearTimeout(t) }
  }, [uid])
}
