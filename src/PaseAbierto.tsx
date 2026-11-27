import { useState } from 'react'
import { DuoIcon } from './DuoIcons'
import { avisarFinPase, guardarPase } from './lib/firebase'
import { haptic } from './lib/haptic'
import { hastaTexto, sobranDe, terminarPase } from './lib/minutos'
import type { AppData } from './lib/model'
import { useNow } from './ui'

type Commit = (update: (d: AppData) => AppData) => void
const hora = (ms: number) => new Date(ms).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' })

export function PaseAbierto({ data, commit, onMessage, boton = false }: { data: AppData; commit: Commit; onMessage: (t: string) => void; boton?: boolean }) {
  const c = data.settings.candado
  const activo = !!c?.llave && !!c.hasta && c.hasta > Date.now()
  const now = useNow(activo, 15000)
  const [busy, setBusy] = useState(false)
  if (!c?.llave || !c.hasta || c.hasta <= now) return null
  const quedan = Math.max(1, Math.ceil((c.hasta - now) / 60000))
  const sobran = sobranDe(data, now)
  async function terminar() {
    if (!c?.llave) return
    haptic([12, 30, 12])
    setBusy(true)
    const ahora = Date.now()
    const devueltos = sobranDe(data, ahora)
    try {
      await guardarPase(c.llave, hastaTexto(ahora))
    } catch {
      setBusy(false)
      onMessage('No se pudo cerrar. Revisa tu señal.')
      return
    }
    commit(d => terminarPase(d, ahora))
    if (data.settings.avisos) avisarFinPase(0)
    setBusy(false)
    onMessage(devueltos > 0 ? `Pase cerrado. Te devolví ${devueltos} min.` : 'Pase cerrado.')
  }
  if (boton) return <button type="button" className="d-btn white wide" disabled={busy} onClick={() => void terminar()}>{busy ? 'Cerrando…' : sobran > 0 ? `Ya terminé · +${sobran} min` : 'Ya terminé: cerrar pase'}</button>
  return <div className="d-pase-abierto" role="status">
    <DuoIcon name="reloj" size={26} />
    <span><b>Redes abiertas: {quedan} min</b><small>{sobran > 0 ? `¿Ya terminaste? Te devuelvo ${sobran}` : `Hasta las ${hora(c.hasta)}`}</small></span>
    <button type="button" className="d-btn green small" disabled={busy} onClick={() => void terminar()}>{busy ? '…' : 'Ya terminé'}</button>
  </div>
}
