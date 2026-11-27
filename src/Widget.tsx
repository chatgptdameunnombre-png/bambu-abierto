import { useEffect, useState } from 'react'
import { dateKey, type AppData } from './lib/model'
import { borrarWidget, cuenta, estadoAvisos, guardarWidget, misRetos, urlWidget } from './lib/firebase'
import { estadoReto } from './lib/retos'
import { ESTILOS_WIDGET, estadoParaAvisos, estadoWidget, scriptWidget, semanaDe, type EstiloWidget } from './lib/widget'
import { AvisoTarde, activar, apagar, estado, type Estado } from './lib/avisos'
import { nuevaLlave } from './lib/minutos'
import { DuoIcon } from './DuoIcons'

type Commit = (update: (d: AppData) => AppData) => void
const leer = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const guardar = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { return } }

let conRetos = true
let conSemana = true
let retosCache: { uid: string; at: number; n: number } | null = null
async function retosPendientes(uid: string): Promise<number> {
  if (retosCache?.uid === uid && Date.now() - retosCache.at < 5 * 60000) return retosCache.n
  try {
    const n = (await misRetos(uid)).filter(r => estadoReto(r, uid) === 'te-toca').length
    retosCache = { uid, at: Date.now(), n }
    return n
  } catch { return retosCache?.uid === uid ? retosCache.n : 0 }
}

export function usePublicarEstado(data: AppData, uid: string | undefined) {
  useEffect(() => {
    const llave = data.settings.widget?.llave
    const avisos = !!data.settings.avisos
    if (!uid || (!llave && !avisos)) return
    const t = window.setTimeout(() => {
      const hoy = dateKey()
      if (llave) {
        void retosPendientes(uid).then(n => {
          const semana = semanaDe(data)
          const e = { ...estadoWidget(data, hoy, n), ...(semana ? { semana } : {}) }, k = `${llave}|${JSON.stringify(e)}`
          if (leer('bambu.widget.ultimo') === k) return
          const { semana: _s, ...base } = e
          const sinRetos = () => { const { retos: _r, ...resto } = base; return guardarWidget(llave, resto) }
          const sinSemana = () => conRetos ? guardarWidget(llave, base).catch(() => { conRetos = false; return sinRetos() }) : sinRetos()
          const enviar = conSemana && semana ? guardarWidget(llave, e).catch(() => { conSemana = false; return sinSemana() }) : sinSemana()
          enviar.then(() => guardar('bambu.widget.ultimo', k)).catch(() => undefined)
        })
      }
      if (avisos) {
        const e = estadoParaAvisos(data, hoy), k = `${uid}|${JSON.stringify(e)}`
        if (leer('bambu.avisos.ultimo') !== k) estadoAvisos(uid, e).then(() => guardar('bambu.avisos.ultimo', k)).catch(() => undefined)
      }
    }, 3000)
    return () => window.clearTimeout(t)
  }, [data, uid])
}

export function WidgetSetup({ data, commit, onMessage, cloud }: { data: AppData; commit: Commit; onMessage: (t: string) => void; cloud: boolean }) {
  const llave = data.settings.widget?.llave
  const [ver, setVer] = useState(false)
  const [busy, setBusy] = useState(false)
  const [estilo, setEstilo] = useState<EstiloWidget>('bosque')
  const copiar = (t: string, que: string) => { navigator.clipboard?.writeText(t).then(() => onMessage(`${que} copiado.`)).catch(() => onMessage('No se pudo copiar.')) }
  async function prender() {
    const nueva = llave ?? nuevaLlave()
    setBusy(true)
    try {
      await guardarWidget(nueva, estadoWidget(data, dateKey()))
      if (!llave) commit(d => ({ ...d, settings: { ...d.settings, widget: { llave: nueva } } }))
      setVer(true)
      onMessage('Widget listo. Ahora pégalo en Scriptable.')
    } catch { onMessage('No se pudo activar. Revisa tu señal.') }
    setBusy(false)
  }
  async function quitar() {
    if (!llave || !window.confirm('¿Quitar el widget? Después bórralo también de tu pantalla de inicio.')) return
    try { await borrarWidget(llave) } catch { onMessage('No se pudo quitar. Revisa tu señal.'); return }
    commit(d => ({ ...d, settings: { ...d.settings, widget: undefined } }))
    onMessage('Widget quitado.')
  }
  return <div className="d-card d-candado-setup">
    <div className="d-card-head"><h2>Widget en tu pantalla de inicio</h2><DuoIcon name="casa" size={36} /></div>
    <p className="d-hint left">Ve tus minutos de redes, tu racha, tu XP de hoy y si tienes retos sin abrir bambú. Se actualiza cada vez que usas bambú.</p>
    <div className="d-widget-estilos" role="radiogroup" aria-label="Diseño del widget">{ESTILOS_WIDGET.map(e => <button key={e.id} type="button" role="radio" aria-checked={estilo === e.id} className={estilo === e.id ? 'on' : ''} onClick={() => setEstilo(e.id)}>
      <img src={`widget/vista-${e.id}.png`} alt="" width="120" height="120" />
      <b>{e.nombre}</b><small>{e.texto}</small>
    </button>)}</div>
    {!cloud ? <p className="d-hint left red">Necesitas una cuenta para el widget.</p>
      : !llave ? <button type="button" className="d-btn green wide" disabled={busy} onClick={() => void prender()}>{busy ? 'Activando…' : 'Activar widget'}</button>
        : <>
          <button type="button" className="d-btn white wide" onClick={() => setVer(!ver)}>{ver ? 'Ocultar los pasos' : 'Ver cómo ponerlo'}</button>
          {ver && <ol className="d-steps-guide">
            <li><span>Instala <b>Scriptable</b> (gratis) desde la App Store.</span></li>
            <li><span>Ábrelo, toca <b>+</b>, pega el código y ponle de nombre <b>Bambú</b>. Si ya lo tenías, pega el nuevo encima del anterior. <button type="button" className="d-link" onClick={() => copiar(scriptWidget(urlWidget(llave), estilo), `Código del diseño ${ESTILOS_WIDGET.find(e => e.id === estilo)?.nombre}`)}>Copiar código</button></span></li>
            <li><span>En tu pantalla de inicio deja presionado, toca <b>+</b>, busca <b>Scriptable</b> y elige el tamaño <b>chico</b> o <b>mediano</b> (el mediano se ve mejor). También funciona en la pantalla bloqueada.</span></li>
            <li><span>Deja presionado el widget, toca <b>Editar widget</b> y en <b>Script</b> elige <b>Bambú</b>.</span></li>
          </ol>}
          <button type="button" className="d-link" onClick={() => void quitar()}>Quitar widget</button>
        </>}
  </div>
}

const HORAS = ['07:00', '08:00', '09:00', '12:00', '15:00', '17:00', '18:00', '19:00', '20:00', '21:00']
const TEXTO: Record<Exclude<Estado, 'on' | 'off'>, string> = {
  install: 'En iPhone primero agrega Bambú a tu pantalla de inicio: botón Compartir → Agregar a inicio. Ábrela desde ahí y vuelve aquí.',
  unsupported: 'Este navegador no puede recibir avisos.',
  denied: 'Bloqueaste los avisos. Actívalos en Ajustes del iPhone → Notificaciones → Bambú.',
}

export function AvisosSetup({ data, commit, onMessage, cloud }: { data: AppData; commit: Commit; onMessage: (t: string) => void; cloud: boolean }) {
  const uid = cuenta.guardada()?.uid
  const [st, setSt] = useState<Estado | null>(null)
  const [busy, setBusy] = useState(false)
  const hora = data.settings.avisos?.hora ?? '19:00'
  useEffect(() => { estado().then(setSt).catch(() => setSt('unsupported')) }, [])
  async function prender(h = hora) {
    if (!uid) return
    setBusy(true)
    try {
      const r = await activar(uid, h, estadoParaAvisos(data, dateKey()))
      setSt(r)
      if (r === 'on') { commit(d => ({ ...d, settings: { ...d.settings, avisos: { hora: h } } })); onMessage('Avisos prendidos.') }
      else if (r !== 'off') onMessage(TEXTO[r])
    } catch (error) { onMessage(error instanceof AvisoTarde ? 'El iPhone no contestó. Cierra bambú desde el selector de apps, ábrela otra vez desde su ícono y vuelve a intentar.' : 'No se pudieron prender los avisos. Revisa tu señal.') }
    setBusy(false)
  }
  async function apagarlos() {
    if (!uid) return
    setBusy(true)
    try { await apagar(uid); commit(d => ({ ...d, settings: { ...d.settings, avisos: undefined } })); setSt('off'); onMessage('Avisos apagados.') } catch { onMessage('No se pudo. Revisa tu señal.') }
    setBusy(false)
  }
  const prendidos = st === 'on' && !!data.settings.avisos
  return <div className="d-card d-candado-setup">
    <div className="d-card-head"><h2>Avisos en tu teléfono</h2><DuoIcon name="reloj" size={36} /></div>
    <p className="d-hint left">Te aviso a la hora que elijas si no has entrenado, a las 9 de la noche si tu racha está en riesgo, cuando un amigo te reta a un duelo y cuando contesta el tuyo. Nada de 10 de la noche a 7 de la mañana.</p>
    {!cloud || !uid ? <p className="d-hint left red">Necesitas una cuenta para los avisos.</p> : <>
      <p className="d-tb-sub">¿A qué hora te recuerdo?</p>
      <div className="d-chips">{HORAS.map(h => <button key={h} type="button" className={hora === h ? 'on' : ''} disabled={busy} onClick={() => { if (prendidos) void prender(h); else commit(d => ({ ...d, settings: { ...d.settings, avisos: d.settings.avisos ? { hora: h } : undefined } })) }}>{Number(h.slice(0, 2)) > 12 ? `${Number(h.slice(0, 2)) - 12} pm` : `${Number(h.slice(0, 2))} ${h === '12:00' ? 'pm' : 'am'}`}</button>)}</div>
      {st && st !== 'on' && st !== 'off' && <p className="d-hint left">{TEXTO[st]}</p>}
      {prendidos ? <button type="button" className="d-btn white wide" disabled={busy} onClick={() => void apagarlos()}>Apagar avisos</button>
        : <button type="button" className="d-btn green wide" disabled={busy || st === 'install' || st === 'unsupported' || st === 'denied'} onClick={() => void prender()}>{busy ? 'Prendiendo…' : 'Prender avisos'}</button>}
    </>}
  </div>
}
