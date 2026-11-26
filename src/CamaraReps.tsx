import { useEffect, useRef, useState } from 'react'
import { siFaltaArchivo } from './lib/version'
import { AVISOS, AVISOS_AGUANTE, calibrar, comoDe, esAguante, esSkill, nuevoConteo, paso, valorDe, type Aviso, type Conteo, type Cuadro, type Tipo } from './lib/conteo'
import { minutosDe, tasaTexto } from './lib/minutos'
import { useWakeLock } from './ui'
import { pasoReloj, type Reloj } from './lib/duelos'
import { mmss, siguiente, totalWod, wodDe } from './lib/wod'
import { SE_ACABA } from './lib/retos'
import { haptic } from './lib/haptic'

type Fase = 'intro' | 'cargando' | 'corriendo' | 'pausa' | 'error'
type Landmarker = { detectForVideo: (v: HTMLVideoElement, t: number) => { landmarks: { x: number; y: number; z: number; visibility?: number }[][]; worldLandmarks: { x: number; y: number; z: number; visibility?: number }[][] }; close: () => void }

const PREP = 5
const HUESOS: [number, number][] = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]]

let motor: Promise<Landmarker> | null = null
let cierre: ReturnType<typeof setTimeout> | undefined
function obtenerMotor(): Promise<Landmarker> {
  clearTimeout(cierre)
  if (!motor) motor = (async () => {
    const vision = await import('@mediapipe/tasks-vision').catch(e => siFaltaArchivo<typeof import('@mediapipe/tasks-vision')>(e))
    const archivos = await vision.FilesetResolver.forVisionTasks(new URL('pose', document.baseURI).href)
    return await vision.PoseLandmarker.createFromOptions(archivos, {
      baseOptions: { modelAssetPath: new URL('pose/pose_landmarker_lite.task', document.baseURI).href, delegate: 'CPU' },
      runningMode: 'VIDEO', numPoses: 1,
    }) as unknown as Landmarker
  })().catch(e => { motor = null; throw e })
  return motor
}
function soltarMotor() {
  clearTimeout(cierre)
  cierre = setTimeout(() => { const m = motor; motor = null; void m?.then(x => x.close()).catch(() => undefined) }, 120000)
}

function decir(texto: string) {
  try {
    if (!('speechSynthesis' in window)) return
    const u = new SpeechSynthesisUtterance(texto)
    u.lang = 'es-MX'
    u.rate = 1.05
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  } catch { return }
}

function errorTexto(e: unknown): string {
  const n = e instanceof Error ? e.name : ''
  if (n === 'NotAllowedError' || n === 'SecurityError') return 'No me diste permiso de usar la cámara. En el iPhone: Ajustes → Safari → Cámara → Permitir, y vuelve a intentar.'
  if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'No encontré una cámara en este aparato.'
  if (!window.isSecureContext) return 'La cámara solo funciona en la página segura: tuagentedeia.com/bambu.'
  return 'No pude arrancar la cámara. Cierra otras apps que la usen y vuelve a intentar.'
}

export default function CamaraReps({ ej, kind, onGuardar, onCerrar, limite: limiteProp, meta, redes = false, hastaFallar = false }: { ej: string; kind?: Tipo; onGuardar: (valor: number) => void; onCerrar: () => void; limite?: number; meta?: number; redes?: boolean; hastaFallar?: boolean }) {
  const wod = wodDe(ej)
  const limite = limiteProp ?? wod?.seg
  const circ = useRef({ i: 0, rondas: 0 })
  const [vuelta, setVuelta] = useState({ i: 0, rondas: 0 })
  const ejDe = () => wod ? wod.partes[circ.current.i].ej : ej
  const tipo = wod ? 'reps' as const : kind
  const patron = nuevoConteo(ej, kind).patron
  const aguante = esAguante(patron)
  const skill = esSkill(patron)
  const conPrep = aguante && !limiteProp && !wod
  const prep = useRef<{ fase: 'espera' | 'cuenta' | 'listo'; t: number }>({ fase: 'espera', t: 0 })
  const [prepN, setPrepN] = useState<number | null>(null)
  const [fase, setFase] = useState<Fase>('intro')
  const [error, setError] = useState('')
  const [frente, setFrente] = useState(true)
  const [vista, setVista] = useState<{ valor: number; aviso: Aviso | null; visto: boolean; prof: number; ultima: number }>({ valor: 0, aviso: null, visto: false, prof: 0, ultima: 0 })
  const video = useRef<HTMLVideoElement>(null)
  const lienzo = useRef<HTMLCanvasElement>(null)
  const conteo = useRef<Conteo>(nuevoConteo(ej, kind))
  const vivo = useRef(true)
  const parar = useRef<() => void>(() => undefined)
  const arrancando = useRef(false)
  const [motivo, setMotivo] = useState<'ocio' | 'salio'>('ocio')
  const faseRef = useRef<Fase>('intro')
  faseRef.current = fase
  const duelo = useRef<Reloj>({ fase: 'espera', t: 0 })
  const [reloj, setReloj] = useState<number | null>(null)
  const guardado = useRef(false)
  const fin = useRef((_mensaje?: string) => undefined as void)
  fin.current = (mensaje?: string) => {
    if (guardado.current) return
    guardado.current = true
    duelo.current = { fase: 'fin', t: performance.now() }
    parar.current()
    decir(mensaje ?? '¡Tiempo!')
    onGuardar(wod ? totalWod(wod, circ.current.rondas, circ.current.i, valorDe(conteo.current)) : valorDe(conteo.current))
  }
  useWakeLock(fase === 'corriendo' || fase === 'cargando')

  useEffect(() => { vivo.current = true; return () => { vivo.current = false; parar.current() } }, [])
  useEffect(() => {
    const oculto = () => {
      if (!document.hidden || faseRef.current !== 'corriendo') return
      if (duelo.current.fase === 'duelo') { fin.current(); return }
      if (duelo.current.fase === 'cuenta') { duelo.current.fase = 'espera'; setReloj(null) }
      parar.current(); setMotivo('salio'); setFase('pausa')
    }
    document.addEventListener('visibilitychange', oculto)
    return () => document.removeEventListener('visibilitychange', oculto)
  }, [])

  async function empezar(usarFrente = frente) {
    if (arrancando.current) return
    arrancando.current = true
    try { await arrancar(usarFrente) } finally { arrancando.current = false }
  }
  async function arrancar(usarFrente: boolean) {
    haptic(10)
    decir('Ponte en posición')
    setFase('cargando')
    parar.current()
    let stream: MediaStream | null = null
    let lm: Landmarker | null = null
    let reloj: ReturnType<typeof setTimeout> | undefined
    parar.current = () => {
      clearTimeout(reloj)
      stream?.getTracks().forEach(t => t.stop())
      if (video.current) video.current.srcObject = null
      stream = null
      soltarMotor()
    }
    try {
      const [s, m] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ video: { facingMode: usarFrente ? 'user' : 'environment', width: { ideal: 480 }, height: { ideal: 360 }, frameRate: { ideal: 15, max: 20 } }, audio: false }),
        obtenerMotor(),
      ])
      stream = s
      lm = m
      if (!vivo.current) { parar.current(); return }
      const v = video.current!
      v.srcObject = stream
      await v.play()
    } catch (e) {
      parar.current()
      setError(errorTexto(e))
      setFase('error')
      return
    }
    conteo.current = { ...nuevoConteo(ejDe(), tipo), reps: conteo.current.reps, segundos: conteo.current.segundos, acumulado: conteo.current.acumulado, base: conteo.current.base }
    if (conPrep) { prep.current = conteo.current.acumulado > 0 ? { fase: 'listo', t: 0 } : { fase: 'espera', t: 0 }; setPrepN(null) }
    if (limite && duelo.current.fase !== 'duelo') { duelo.current = { fase: 'espera', t: 0 }; circ.current = { i: 0, rondas: 0 }; setVuelta(circ.current); conteo.current = nuevoConteo(ejDe(), tipo); setReloj(null) }
    setFase('corriendo')
    const color = getComputedStyle(document.documentElement).getPropertyValue('--d-green').trim() || 'lime'
    let tVideo = -1, dicho = 0, avisoDicho = 0, ultimoAviso: Aviso | null = null, intervalo = 80, ultimoVisto = performance.now(), mostrado: number | null = null, prepMostrado: number | null = null
    const ciclo = () => {
      reloj = setTimeout(ciclo, intervalo)
      if (limite) {
        if (guardado.current) return
        const p = pasoReloj(duelo.current, performance.now(), conteo.current.visto, limite)
        if (p.evento === 'acaba') { fin.current(); return }
        if (hastaFallar && p.r.fase === 'duelo' && conteo.current.segundos >= 1 && conteo.current.malDesde && Date.now() - conteo.current.malDesde >= SE_ACABA) { fin.current(); return }
        duelo.current = p.r
        if (p.evento === 'empieza') {
          circ.current = { i: 0, rondas: 0 }
          setVuelta(circ.current)
          conteo.current = nuevoConteo(ejDe(), tipo)
          setVista(v => ({ ...v, valor: 0, aviso: null }))
          haptic(30)
          decir('¡Ya!')
        }
        if (p.mostrar !== mostrado) {
          mostrado = p.mostrar
          setReloj(p.mostrar)
          if (p.r.fase === 'cuenta' && p.mostrar !== null) decir(String(-p.mostrar))
          else if (p.r.fase === 'duelo' && (p.mostrar === 30 || p.mostrar === 10)) decir(`${p.mostrar} segundos`)
        }
      }
      const v = video.current, c = lienzo.current
      if (!v || !c || !lm || !stream || v.readyState < 2 || v.currentTime === tVideo) return
      tVideo = v.currentTime
      const ahora = performance.now()
      let r: ReturnType<Landmarker['detectForVideo']>
      try { r = lm.detectForVideo(v, ahora) } catch { return }
      const costo = performance.now() - ahora
      const img = r.landmarks[0], mundo = r.worldLandmarks[0]
      const cuadro: Cuadro | null = img && mundo ? { img: img.map(p => ({ x: p.x, y: p.y, z: p.z, v: p.visibility ?? 0 })), mundo: mundo.map(p => ({ x: p.x, y: p.y, z: p.z, v: p.visibility ?? 0 })), aspecto: v.videoWidth / (v.videoHeight || 1) } : null
      const antes = conteo.current
      let nuevo = paso(antes, cuadro, Date.now())
      conteo.current = nuevo
      if (img) ultimoVisto = ahora
      if (conPrep && prep.current.fase !== 'listo') {
        const t0 = performance.now()
        if (prep.current.fase === 'espera' && nuevo.visto) { prep.current = { fase: 'cuenta', t: t0 }; decir(skill ? 'Acomódate con las manos y los pies en el piso' : 'Acomódate') }
        if (prep.current.fase === 'cuenta') {
          const n = PREP - Math.floor((t0 - prep.current.t) / 1000)
          if (n <= 0) {
            prep.current = { fase: 'listo', t: t0 }
            const limpio = nuevoConteo(ej, kind)
            conteo.current = skill && cuadro ? calibrar(limpio, cuadro) : limpio
            setPrepN(null)
            setVista(x => ({ ...x, valor: 0, aviso: null, prof: 0 }))
            haptic(30)
            decir(skill ? '¡Arriba!' : '¡Ya!')
            return
          }
          if (n !== prepMostrado) { prepMostrado = n; setPrepN(n); if (n <= 3) decir(String(n)) }
        }
        conteo.current = { ...nuevo, acumulado: 0, segundos: 0 }
        nuevo = conteo.current
      }
      if (conPrep && skill && prep.current.fase === 'listo' && nuevo.segundos >= 1 && nuevo.malDesde && Date.now() - nuevo.malDesde >= 1500) { fin.current(`Bajaste. ${nuevo.segundos} segundos.`); return }
      const contando = (!limite || duelo.current.fase === 'duelo') && (!conPrep || prep.current.fase === 'listo')
      const ocioso = ahora - ultimoVisto
      intervalo = Math.max(ocioso > 3000 ? 300 : 80, costo * 2.5)
      if (ocioso > 45000) {
        if (limite && duelo.current.fase === 'duelo') { fin.current(); return }
        if (limite) { duelo.current = { fase: 'espera', t: 0 }; setReloj(null) }
        parar.current(); setMotivo('ocio'); setFase('pausa'); return
      }
      if (c.width !== v.videoWidth) { c.width = v.videoWidth; c.height = v.videoHeight }
      const g = c.getContext('2d')
      if (g) {
        g.clearRect(0, 0, c.width, c.height)
        if (img) {
          g.strokeStyle = color
          g.lineWidth = 6
          g.lineCap = 'round'
          for (const [a, b] of HUESOS) {
            if ((img[a].visibility ?? 0) < 0.5 || (img[b].visibility ?? 0) < 0.5) continue
            g.beginPath(); g.moveTo(img[a].x * c.width, img[a].y * c.height); g.lineTo(img[b].x * c.width, img[b].y * c.height); g.stroke()
          }
        }
      }
      const valor = valorDe(nuevo), prev = valorDe(antes)
      if (wod && contando && valor >= wod.partes[circ.current.i].reps) {
        circ.current = siguiente(wod, circ.current.i, circ.current.rondas)
        setVuelta(circ.current)
        const sig = wod.partes[circ.current.i]
        conteo.current = nuevoConteo(sig.ej, 'reps')
        haptic([20, 40, 20])
        decir(circ.current.i === 0 ? `Ronda ${circ.current.rondas + 1}. ${sig.reps} ${sig.ej}` : `Ahora ${sig.reps} ${sig.ej}`)
        setVista(v => ({ ...v, valor: 0, aviso: null, prof: 0 }))
        return
      }
      if (valor !== prev && contando) {
        haptic(20)
        if (meta && prev < meta && valor >= meta) { haptic([30, 60, 30]); decir('¡Meta cumplida!') }
        else if (!aguante) decir(String(valor))
        else if (valor % 10 === 0 && valor !== dicho) { dicho = valor; decir(`${valor} segundos`) }
      }
      if (duelo.current.fase !== 'cuenta' && (!conPrep || prep.current.fase === 'listo') && nuevo.aviso && nuevo.aviso !== ultimoAviso && ahora - avisoDicho > 2500) { avisoDicho = ahora; decir(texto(nuevo.aviso, nuevo.ultimaProf)) }
      ultimoAviso = nuevo.aviso
      const prof = Math.round(nuevo.prof * 20) / 20
      if (valor !== prev || nuevo.aviso !== antes.aviso || nuevo.visto !== antes.visto || prof !== Math.round(antes.prof * 20) / 20) setVista({ valor, aviso: nuevo.aviso, visto: nuevo.visto, prof, ultima: nuevo.ultimaProf })
    }
    reloj = setTimeout(ciclo, 0)
  }

  function cambiar() {
    const f = !frente
    setFrente(f)
    void empezar(f)
  }
  function terminar() {
    if (limite) { if (duelo.current.fase === 'duelo') fin.current(); else cerrar(); return }
    const valor = valorDe(conteo.current)
    parar.current()
    if (valor > 0) onGuardar(valor)
    else onCerrar()
  }
  function cerrar() {
    if (limite && duelo.current.fase === 'duelo') { fin.current(); return }
    parar.current()
    onCerrar()
  }

  const unidad = aguante ? 's' : ''
  function texto(a: Aviso, ultima: number) {
    if (aguante && AVISOS_AGUANTE[a]) return AVISOS_AGUANTE[a]!
    if (a === 'baja' && ultima > 0 && ultima < 1) return `Llegaste al ${Math.round(ultima * 100)}%. ${AVISOS.baja}`
    return AVISOS[a]
  }
  const enDuelo = !!limite && reloj !== null && reloj > 0
  const valor = limite && !enDuelo ? 0 : vista.valor
  const min = Math.floor(minutosDe(ej, valor) + 1e-9)
  return <div className={`d-cam ${fase}`} role="dialog" aria-label={`Contar ${ej} con la cámara`}>
    <video ref={video} className={frente ? 'espejo' : ''} playsInline muted autoPlay />
    <canvas ref={lienzo} className={frente ? 'espejo' : ''} />
    <header className="d-cam-top">
      <button type="button" className="d-x" onClick={cerrar} aria-label="Cerrar">×</button>
      <span className="d-libre-tag">{wod ? enDuelo ? `${wod.nombre} · ${mmss(reloj ?? 0)}` : `${wod.nombre} · ${Math.round((limite ?? 0) / 60)} min` : hastaFallar ? 'Reto · aguantar más' : limite ? enDuelo ? `Reto · ${reloj} s` : `Reto de ${limite} s` : 'Con cámara'}</span>
      {fase === 'corriendo' && (!limite || reloj === null) ? <button type="button" className="d-link" onClick={cambiar}>Voltear</button> : <span />}
    </header>
    {fase === 'intro' && <div className="d-cam-intro">
      <h2>{wod ? wod.nombre : hastaFallar ? `${ej} · aguantar más` : limite ? `${ej} · ${limite} segundos` : ej}</h2>
      <p>{wod ? wod.como : comoDe(ej, patron)}</p>
      {redes && <p className="d-cam-tasa">{tasaTexto(ej)} de redes</p>}
      {wod ? <ul>{wod.reglas.map(r => <li key={r}>{r}</li>)}</ul> : hastaFallar ? <ul>
        <li>Cuando te vea cuento 3, 2, 1 y empieza a correr el tiempo.</li>
        <li>Solo cuenta con la postura correcta. Si la pierdes 3 segundos, se acaba.</li>
        <li>Gana quien aguante más.</li>
      </ul> : limite ? <ul>
        <li>Cuando te vea cuento 3, 2, 1 y corren los {limite} segundos.</li>
        <li>Media repetición vale cero. Gana quien haga más.</li>
        <li>Si sales de Bambú o cierras, el reto termina con lo que llevas.</li>
      </ul> : <ul>
        <li>{patron === 'generico' ? 'Haz la primera repetición completa: con ella aprendo tu recorrido.' : skill ? 'Te doy 5 segundos para acomodarte con las manos y los pies en el piso. Al oír "¡Arriba!" sube: el tiempo corre solo con los pies despegados y, si bajas, se guarda.' : patron === 'quieto' ? 'Te doy 5 segundos para acomodarte. Luego reviso que estés completo en cámara y sin moverte.' : aguante ? 'Te doy 5 segundos para acomodarte. El tiempo solo corre con la postura correcta.' : 'Mide qué tan abajo llegas: media repetición vale cero.'}</li>
        <li>Te digo cada número en voz alta. No toques el teléfono.</li>
        <li>El video no sale de tu teléfono.</li>
      </ul>}
      <button type="button" className="d-btn green wide" onClick={() => void empezar()}>Abrir cámara</button>
    </div>}
    {fase === 'cargando' && <div className="d-cam-intro"><h2>Preparando la cámara…</h2><p>La primera vez tarda unos segundos.</p></div>}
    {fase === 'pausa' && <div className="d-cam-intro">
      <h2>Cámara en pausa</h2>
      <p>{motivo === 'ocio' ? 'No te vi en un rato y la apagué para cuidar tu batería.' : 'Saliste de bambú y apagué la cámara para cuidar tu batería.'}</p>
      {!limite && vista.valor > 0 && <p className="d-cam-tasa">Llevas {vista.valor}{unidad}</p>}
      <button type="button" className="d-btn green wide" onClick={() => void empezar()}>Seguir</button>
      {!limite && vista.valor > 0 && <button type="button" className="d-btn white wide" onClick={terminar}>Guardar {vista.valor}{unidad}</button>}
    </div>}
    {fase === 'error' && <div className="d-cam-intro"><h2>No se pudo</h2><p>{error}</p><button type="button" className="d-btn white wide" onClick={() => void empezar()}>Intentar otra vez</button></div>}
    {fase === 'corriendo' && <>
      <div className={`d-cam-gauge ${vista.prof >= 1 ? 'full' : ''}`} aria-hidden="true"><i style={{ height: `${Math.round(vista.prof * 100)}%` }} /><b>{aguante ? (vista.prof >= 1 ? 'Bien' : 'Pausa') : `${Math.round(vista.prof * 100)}%`}</b></div>
      {limite && reloj !== null && reloj < 0 && <div className="d-cam-cuenta" aria-live="assertive">{-reloj}</div>}
      {prepN !== null && <div className="d-cam-cuenta" aria-live="assertive">{prepN}</div>}
      <div className="d-cam-count" aria-live="polite"><strong>{wod && enDuelo ? `${valor}/${wod.partes[vuelta.i].reps}` : `${valor}${unidad}`}</strong><small>{wod && enDuelo ? `Ronda ${vuelta.rondas + 1} · ${wod.partes[vuelta.i].ej} · ${mmss(reloj ?? 0)}` : hastaFallar && enDuelo ? 'Aguanta. Se acaba si pierdes la postura.' : enDuelo ? `Quedan ${reloj} s` : limite ? 'Ponte en posición' : meta ? valor >= meta ? `¡Meta cumplida! +${min} min` : `Meta ${meta}${unidad} · faltan ${meta - valor}${unidad}` : redes ? min > 0 ? `+${min} min de redes` : tasaTexto(ej) : aguante ? 'segundos' : 'repeticiones'}</small></div>
      <div className="d-cam-foot">
        <p className={`d-cam-aviso ${vista.aviso && prepN === null ? 'on' : ''}`}>{prepN !== null ? (skill ? 'Acomódate. Al terminar la cuenta, ¡arriba!' : 'Acomódate en posición.') : vista.aviso && (!limite || reloj === null || reloj > 0) ? texto(vista.aviso, vista.ultima) : limite && reloj !== null && reloj < 0 ? '¡Prepárate!' : vista.visto ? '¡Así! Sigue.' : 'Buscándote…'}</p>
        <button type="button" className="d-btn green wide" onClick={terminar}>{limite ? enDuelo ? 'Terminar ya' : 'Salir' : vista.valor > 0 ? `Guardar ${vista.valor}${unidad}` : 'Salir'}</button>
      </div>
    </>}
  </div>
}
