import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AuthScreen } from './AuthScreen'
import { AudioMiniPlayer } from './BinauralAudio'
import { Onboarding } from './Onboarding'
import type { Section } from './TodayPage'
import { freshReading } from './lib/sesionLectura'
import { HoyLista } from './HoyLista'
import { StatsBar } from './DuoTop'
import { DuoIcon, type DuoIconName } from './DuoIcons'
import { activeHabits, dateKey, EMPTY_DATA, modulesOf, type AppData } from './lib/model'
import { bedAction, nfcServerAction, trainingAction } from './lib/nfcActions'
import { devolver2611 } from './lib/minutos'
import { PaseAbierto } from './PaseAbierto'
import { ajustarRutina2611, clockOf, deshacerRondas2611, toquesA7, hspuA3, quitar2611, pistol2711 } from './lib/rutina'
import { semanaVacia } from './lib/armar'
import { applyRecords, diffRecords, toRecords, type RecordRow } from './lib/records'
import { SyncEngine, type SyncStatus } from './lib/sync'
import { cuenta, cuentaActiva as cloudConfigured, remoto, reportarFallo, type Sesion } from './lib/firebase'
import { logAuth, setAuthLogOwner } from './lib/authLog'
import { usePublicarPerfil } from './Tablas'
import { usePublicarEstado } from './Widget'
import { useFelicitar } from './Felicitar'
import { OCULTAS_EN_COMPETIR, esCompetir, inicioDe } from './lib/modo'
import { Consentimiento, aceptar, legalAceptado, mostrarLegal } from './Legal'
import { AMIGO_KEY, useAmigosNuevos } from './amigosNuevos'
import { clearAccountStorage, getLocalOwnerId, setStorageScope, loadAppData, parseBackup, readScope, requestPersistence, saveAppData, setLocalOwnerId, syncStore, wipeDevice } from './lib/storage'
import { clearOwnPhotos, setPhotoOwner } from './lib/photos'
import { clearNfcFromUrl, isRepeatScan, parseNfc, type NfcAction } from './lib/nfc'
import { PauseQuick } from './PauseQuick'
import { game, rankOf } from './lib/gamification'
import { keptToday } from './lib/vara'
import { CelebrationLayer, celebrate, rewardSound, useWakeLock } from './ui'
import { XP } from './lib/xp'
import { LoadingScreen, NotFound, ProblemScreen, Recovering, ScreenCrash, type Envio } from './StatusScreens'
import { OfflineBanner, useOnline } from './Offline'
import { StretchHost } from './Stretch'
import { stretchSlot, type StretchWhen } from './lib/stretch'
import { realReading, streak } from './lib/progress'
import { faltaArchivo, recargarPorVersion, siFaltaArchivo } from './lib/version'

const ReadingPage = lazy(() => import('./ReadingPage').then(m => ({ default: m.ReadingPage })).catch(e => siFaltaArchivo(e)))
const FoodPage = lazy(() => import('./FoodPage').then(m => ({ default: m.FoodPage })).catch(e => siFaltaArchivo(e)))
const MiRutina = lazy(() => import('./MiRutina').then(m => ({ default: m.MiRutina })).catch(e => siFaltaArchivo(e)))
const TareasSimple = lazy(() => import('./TareasSimple').then(m => ({ default: m.TareasSimple })).catch(e => siFaltaArchivo(e)))
const JardinPage = lazy(() => import('./Jardin').then(m => ({ default: m.JardinPage })).catch(e => siFaltaArchivo(e)))
const AjustesSimple = lazy(() => import('./AjustesSimple').then(m => ({ default: m.AjustesSimple })).catch(e => siFaltaArchivo(e)))
const AmigosPage = lazy(() => import('./Amigos').then(m => ({ default: m.AmigosPage })).catch(e => siFaltaArchivo(e)))
const CandadoPage = lazy(() => import('./Candado').then(m => ({ default: m.CandadoPage })).catch(e => siFaltaArchivo(e)))
const Cargando = () => <p className="d-hint">Cargando…</p>
const VERSION = (() => { try { return new URL(import.meta.url).pathname.split('/').pop() ?? '' } catch { return '' } })()
import { votesOn } from './lib/identity'

const NAV: { id: Section; icon: DuoIconName; label: string }[] = [
  { id: 'Hoy', icon: 'casa', label: 'Hoy' }, { id: 'Entrenar', icon: 'pesa', label: 'Entrenar' }, { id: 'Tareas', icon: 'lista', label: 'Tareas' }, { id: 'Lectura', icon: 'libro', label: 'Lectura' },
  { id: 'Comida', icon: 'plato', label: 'Comida' },
  { id: 'Historial', icon: 'planta', label: 'Jardín' }, { id: 'Amigos', icon: 'amigos', label: 'Amigos' }, { id: 'Ajustes', icon: 'engrane', label: 'Ajustes' },
]
// ?estirar=noche (o =manana, o solo ?estirar para la que toque por la hora): una etiqueta NFC junto a la cama abre el estiramiento.
const BOOT_STRETCH: StretchWhen | null = (() => {
  const v = new URL(window.location.href).searchParams.get('estirar')
  if (v === null) return null
  const url = new URL(window.location.href); url.searchParams.delete('estirar'); window.history.replaceState({}, '', url.pathname + url.search + url.hash)
  return v === 'noche' || v === 'manana' ? v : stretchSlot() ?? 'noche'
})()
/** Huella (SHA-256) de la cuenta de Kiki: sus ajustes personales de rutina solo se aplican a él. */
const CUENTA_KIKI = 'c0170f1e0c878c53021befe41219e0910656e5e0b8807e90f0eb951edec2060b'
function useEsCuenta(uid: string | undefined, huella: string): boolean {
  const [es, setEs] = useState(false)
  useEffect(() => {
    if (!uid || !crypto?.subtle) { setEs(false); return }
    let vivo = true
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(uid)).then(b => { if (vivo) setEs([...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('') === huella) }).catch(() => undefined)
    return () => { vivo = false }
  }, [uid, huella])
  return es
}
const CANDADO_KEY = 'bambu.candado'
const BOOT_CANDADO: string | null = (() => {
  const url = new URL(window.location.href)
  const v = url.searchParams.get('candado')
  if (v === null) { try { return sessionStorage.getItem(CANDADO_KEY) } catch { return null } }
  url.searchParams.delete('candado'); window.history.replaceState({}, '', url.pathname + url.search + url.hash)
  const app = /^[a-z]{1,20}$/.test(v) ? v : 'redes'
  try { sessionStorage.setItem(CANDADO_KEY, app) } catch { return app }
  return app
})()
/** ?ir=lectura abre esa sección (lo usan los avisos push). */
const IR: Record<string, Section> = { comida: 'Comida', noche: 'Noche', hoy: 'Hoy', lectura: 'Lectura', entrenar: 'Entrenar', enfoque: 'Enfoque', tareas: 'Tareas', ajustes: 'Ajustes', jardin: 'Historial', amigos: 'Amigos', duelos: 'Entrenar', retos: 'Entrenar', redes: 'Entrenar' }
function sectionFromUrl(): Section {
  const url = new URL(window.location.href)
  const pedida = url.searchParams.get('ir') ?? ''
  const target = Object.prototype.hasOwnProperty.call(IR, pedida) ? IR[pedida] : undefined
  if (url.searchParams.has('ir')) { url.searchParams.delete('ir'); window.history.replaceState({}, '', url.pathname + url.search + url.hash) }
  if (target && (pedida === 'duelos' || pedida === 'retos' || pedida === 'redes')) { try { localStorage.setItem('bambu.entreno.modo', pedida === 'retos' ? 'duelos' : pedida) } catch { return target } }
  if (target) return target
  const amigo = url.searchParams.get('amigo')
  if (amigo !== null) {
    url.searchParams.delete('amigo'); window.history.replaceState({}, '', url.pathname + url.search + url.hash)
    if (/^[A-Za-z0-9]{6,12}$/.test(amigo)) { try { localStorage.setItem(AMIGO_KEY, amigo) } catch { return 'Amigos' } return 'Amigos' }
  }
  try { if (localStorage.getItem('bambu.rutina.abierta') === dateKey()) return 'Entrenar' } catch { return 'Hoy' }
  return 'Hoy'
}
/** Una ruta que la app no conoce: /lo-que-sea o ?ir=algo-que-no-existe. Se lee ANTES de que sectionFromUrl limpie ?ir. */
function lostUrl(): boolean {
  const url = new URL(window.location.href)
  const ir = url.searchParams.get('ir')
  return !(url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')) || (ir !== null && !Object.prototype.hasOwnProperty.call(IR, ir))
}
/** tone 'error': el toast se ve de alerta; action: texto del botón (por defecto Deshacer). */
type ToastOptions = { tone?: 'error'; action?: string }
type Toast = { text: string; undo?: () => void; id: number } & ToastOptions

/** Súbelo cuando cambie cómo se limpian los registros (model.ts / records.ts): cada teléfono baja todo una vez. */
const DATA_VERSION = '2026-11-22-comida'
const DATA_VERSION_KEY = 'bambu.dataVersion'

const storedSession = () => cuenta.guardada()
const ADOPTED_KEY = 'bambu.local.adoptado'

/** Solo en desarrollo: ?crash=1 truena una vez (se repara sola), ?crash=2 truena siempre (tarjeta completa). */
let probeHits = 0
function CrashProbe() {
  if (!import.meta.env.DEV) return null
  const mode = new URLSearchParams(window.location.search).get('crash')
  if (mode === '2' || (mode === '1' && probeHits++ === 0)) throw new Error('Prueba de caída de pantalla')
  return null
}

/**
 * Si una pantalla truena, el primer intento se repara solo en un segundo (muchos fallos son de
 * un instante, como datos a medio llegar). Si vuelve a tronar, enseña la tarjeta completa.
 */
class Guard extends Component<{ children: ReactNode; onReport: (error: Error, where: string) => Promise<Envio>; where: string }, { error: Error | null; retried: boolean }> {
  state = { error: null as Error | null, retried: false }
  timer: number | null = null
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error) { console.error('Bambú encontró un error de pantalla.', error) }
  // El reintento se agenda al montar y al actualizar: si un desmontaje canceló el temporizador,
  // el siguiente montaje lo vuelve a poner y la pantalla nunca se queda en "Reacomodando".
  componentDidMount() { this.ensureRetry() }
  componentDidUpdate() { this.ensureRetry() }
  componentWillUnmount() { if (this.timer) window.clearTimeout(this.timer); this.timer = null }
  ensureRetry() {
    if (!this.state.error || this.state.retried || this.timer) return
    this.timer = window.setTimeout(() => { this.timer = null; this.setState({ error: null, retried: true }) }, 1100)
  }
  render() {
    if (!this.state.error) return this.props.children
    if (!this.state.retried) return <Recovering />
    const error = this.state.error
    return <ScreenCrash where={this.props.where} onRetry={() => { if (!faltaArchivo(error) || !recargarPorVersion(Date.now(), true)) this.setState({ error: null }) }} onReport={() => this.props.onReport(error, this.props.where)} />
  }
}

export default function App() {
  const [data, setData] = useState<AppData>(EMPTY_DATA)
  const dataRef = useRef<AppData>(EMPTY_DATA)
  const [ready, setReady] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [authReady, setAuthReady] = useState(!cloudConfigured)
  const [session, setSession] = useState<Sesion | null>(null)
  const [cloudReady, setCloudReady] = useState(!cloudConfigured)
  const [cloudError, setCloudError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const engine = useRef<SyncEngine | null>(null)
  const channel = useRef<BroadcastChannel | null>(null)
  const [lost, setLost] = useState(lostUrl)
  const [section, setSection] = useState<Section>(sectionFromUrl)
  const [candado, setCandado] = useState<string | null>(BOOT_CANDADO)
  const [toast, setToast] = useState<Toast | null>(null)
  // La pausa de Atajos no es una etiqueta de la app: siempre la atiende PauseQuick con la llave.
  const [nfc, setNfc] = useState<NfcAction | null>(() => { const a = parseNfc(window.location.search); return a?.tag === 'pause' ? null : a })
  // Etiqueta con llave abierta en Safari sin sesión: la acción la hace el servidor (NfcQuick).
  const [quick] = useState(() => parseNfc(window.location.search) ? window.location.search : '')
  const [trainingKey, setTrainingKey] = useState(0)

  const message = useCallback((text: string, undo?: () => void, options?: ToastOptions) => setToast({ text, undo, id: Date.now(), ...options }), [])
  const fail = useCallback((text: string, retry?: () => void) => message(text, retry, { tone: 'error', action: 'Reintentar' }), [message])
  const online = useOnline()
  useWakeLock(!!data.activeReading && !data.activeReading.endedAt && !data.activeReading.pausedAt)
  const [update, setUpdate] = useState(false)

  // Red de seguridad: un error suelto (fuera de una pantalla) no debe pasar en silencio ni asustar.
  // Lo de red se ignora aquí porque la franja de sin señal ya lo explica. Máximo un aviso por minuto.
  useEffect(() => {
    let last = 0
    const shout = (reason: unknown) => {
      const text = reason instanceof Error ? reason.message : String(reason ?? '')
      if (/fetch|network|load failed|resizeobserver|abort|able to recover/i.test(text) || Date.now() - last < 60000) return
      last = Date.now()
      console.error('Error sin atrapar en Bambú.', reason)
      message('Algo falló por dentro. Lo que registraste está guardado; si se repite, recarga.', undefined, { tone: 'error' })
    }
    const onError = (e: ErrorEvent) => shout(e.error ?? e.message)
    const onRejection = (e: PromiseRejectionEvent) => shout(e.reason)
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => { window.removeEventListener('error', onError); window.removeEventListener('unhandledrejection', onRejection) }
  }, [message])

  // Versión nueva: el service worker ya la instaló; la pantalla sigue con la vieja hasta recargar.
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return
    const on = () => setUpdate(true)
    navigator.serviceWorker.addEventListener('controllerchange', on)
    return () => navigator.serviceWorker.removeEventListener('controllerchange', on)
  }, [])
  const replace = useCallback((next: AppData) => { dataRef.current = next; setData(next) }, [])
  const applyRemote = useCallback((rows: RecordRow[]) => {
    const next = applyRecords(dataRef.current, rows)
    if (next !== dataRef.current) replace(next)
  }, [replace])
  /** Lo que baja la nube: a la pantalla y al disco YA, sin esperar el guardado diferido. El cursor espera esto. */
  const persistRemote = useCallback(async (rows: RecordRow[]) => {
    const next = applyRecords(dataRef.current, rows)
    if (next === dataRef.current) return
    replace(next)
    await saveAppData(next)
  }, [replace])

  /**
   * Una vez por versión de datos, el teléfono vuelve a bajar todo. Por qué: si un teléfono bajó
   * sus registros con una versión vieja de la app, esa versión pudo tirar campos al limpiarlos
   * (pasó con dayConfirmed: la racha salía en 3 en vez de 72). Como esos registros no vuelven a
   * cambiar en la nube, nunca se corregían solos. Primero sube lo pendiente para no pisarlo.
   */
  const refreshIfStale = useCallback(async (client: ReturnType<typeof remoto>, sync: SyncEngine) => {
    let seen = ''
    try { seen = localStorage.getItem(DATA_VERSION_KEY) ?? '' } catch { return }
    if (seen === DATA_VERSION) return
    try {
      // Si la subida no se confirmó, no se baja nada: se reintenta en el próximo arranque.
      if (!await sync.syncNow()) return
      const all = await client.pull(0)
      await persistRemote(sync.keepNewer(all.rows))
      localStorage.setItem(DATA_VERSION_KEY, DATA_VERSION)
      logAuth('data-refresh', { rows: all.rows.length, from: seen || 'none' })
    } catch (error) { console.warn('No se pudo refrescar el espacio; se intenta en el próximo arranque.', error) }
  }, [persistRemote])

  /** Única puerta de escritura: guarda, calcula qué registros cambiaron y los manda a la cola. */
  const commit = useCallback((update: (d: AppData) => AppData) => {
    const prev = dataRef.current
    const raw = update(prev)
    if (raw === prev) return
    const next = { ...raw, savedAt: Date.now() }
    replace(next)
    const rows = diffRecords(prev, next)
    if (!rows.length) return
    engine.current?.track(rows)
    channel.current?.postMessage(rows)
  }, [replace])

  useEffect(() => {
    if (!('BroadcastChannel' in window)) return
    if (cloudConfigured && (!session || !cloudReady)) return
    const bc = new BroadcastChannel(`bambu-records:${cloudConfigured ? session!.uid : 'local'}`)
    bc.onmessage = (event: MessageEvent<RecordRow[]>) => { if (Array.isArray(event.data)) applyRemote(event.data) }
    channel.current = bc
    return () => { bc.close(); channel.current = null }
  }, [applyRemote, session?.uid, cloudReady])

  useEffect(() => {
    let cancelled = false
    setStorageScope(cloudConfigured ? storedSession()?.uid ?? 'signed-out' : 'local')
    void setPhotoOwner(cloudConfigured ? storedSession()?.uid ?? 'signed-out' : 'local')
    loadAppData().then(({ data: saved }) => { if (!cancelled) { replace(saved); setReady(true) } })
      .catch(error => { console.error('No se pudo leer el espacio local de Bambú.', error); setLoadFailed(true) })
    void requestPersistence()
    return () => { cancelled = true }
  }, [replace])

  useEffect(() => {
    if (!ready || (cloudConfigured && (!session || !cloudReady))) return
    const timer = window.setTimeout(() => { saveAppData(data).catch(error => { console.error('No se pudo guardar localmente.', error); message('No se pudo guardar en este teléfono. Descarga un respaldo desde Ajustes.', undefined, { tone: 'error' }) }) }, 250)
    return () => window.clearTimeout(timer)
  }, [data, ready, message, session?.uid, cloudReady])

  useEffect(() => {
    if (!cloudConfigured) return
    setAuthLogOwner(storedSession()?.uid ?? 'signed-out')
    logAuth('boot', { stored: !!storedSession() })
    setSession(storedSession())
    setAuthReady(true)
    return cuenta.alCambiar(next => {
      setAuthLogOwner(next?.uid ?? 'signed-out')
      logAuth(next ? 'SIGNED_IN' : 'SIGNED_OUT', { session: !!next })
      if (!next) { engine.current?.stop(); engine.current = null; setCloudReady(false); replace({ ...EMPTY_DATA }) }
      setSession(next)
    })
  }, [replace])

  const userId = session?.uid
  const esKiki = useEsCuenta(userId, CUENTA_KIKI)
  usePublicarPerfil(data, cloudConfigured && cloudReady ? userId : undefined)
  usePublicarEstado(data, cloudConfigured && cloudReady ? userId : undefined)
  useFelicitar(cloudConfigured && cloudReady && data.settings.tablas ? userId : undefined)
  useEffect(() => {
    if (ready && cloudReady && data.profile.onboardingComplete && !data.settings.rutina2611) commit(d => d.settings.rutina2611 ? d : ajustarRutina2611(d))
    if (ready && cloudReady && data.settings.rondas2611) commit(d => d.settings.rondas2611 ? deshacerRondas2611(d) : d)
    if (ready && cloudReady && esKiki && data.profile.onboardingComplete && !data.settings.toques2611) commit(d => d.settings.toques2611 ? d : toquesA7(d))
    if (ready && cloudReady && esKiki && data.profile.onboardingComplete && !data.settings.hspu2611) commit(d => d.settings.hspu2611 ? d : hspuA3(d))
    if (ready && cloudReady && esKiki && data.profile.onboardingComplete && !data.settings.quitar2611) commit(d => d.settings.quitar2611 ? d : quitar2611(d))
    if (ready && cloudReady && esKiki && data.profile.onboardingComplete && !data.settings.devolver2611) commit(d => d.settings.devolver2611 ? d : devolver2611(d))
    if (ready && cloudReady && esKiki && data.profile.onboardingComplete && !data.settings.pistol2711) commit(d => d.settings.pistol2711 ? d : pistol2711(d))
  }, [ready, cloudReady, esKiki, data.profile.onboardingComplete, data.settings.rutina2611, data.settings.rondas2611, data.settings.toques2611, data.settings.hspu2611, data.settings.quitar2611, data.settings.devolver2611, data.settings.pistol2711]) // eslint-disable-line react-hooks/exhaustive-deps
  const nuevosAmigos = useAmigosNuevos(data, cloudConfigured && cloudReady ? userId : undefined, section)
  useEffect(() => {
    if (!cloudConfigured || !userId || !ready) return
    const client = remoto(userId)
    let cancelled = false
    setCloudReady(false)
    setCloudError('')
    const sync = new SyncEngine({ client, userId, store: syncStore(userId), onRemote: persistRemote, onStatus: setStatus })
    async function hydrate() {
      try {
        setStorageScope(userId!)
        await setPhotoOwner(userId!)
        const own = await loadAppData()
        if (cancelled) return
        replace(own.data)
        const state = await sync.load()
        if (!state.bootstrapped) {
          const first = await client.pull(0)
          const fromCloud = first.rows.length ? applyRecords({ ...EMPTY_DATA }, first.rows) : null
          let base: AppData
          let pushed = false
          if (fromCloud?.profile.onboardingComplete) {
            base = fromCloud
          } else {
            base = fromCloud ?? dataRef.current
            let adopted = ''
            try { adopted = localStorage.getItem(ADOPTED_KEY) ?? '' } catch { adopted = '' }
            if (!base.profile.onboardingComplete && (!adopted || adopted === userId)) {
              const local = await readScope('local').catch(() => null)
              if (local?.profile.onboardingComplete) { base = local; try { localStorage.setItem(ADOPTED_KEY, userId!) } catch { adopted = '' } }
            }
            const nombre = cuenta.guardada()?.nombre
            if (!base.profile.onboardingComplete && nombre) base = { ...base, profile: { ...base.profile, name: nombre } }
            await client.push(toRecords(base))
            pushed = true
          }
          const settled = pushed ? await client.pull(0) : first
          if (cancelled) return
          replace(base)
          await saveAppData(base)
          await sync.markBootstrapped(settled.cursor)
        }
        await setLocalOwnerId(userId!)
        if (cancelled) return
        engine.current = sync
        sync.start()
        setCloudReady(true)
        void refreshIfStale(client, sync)
      } catch (error) {
        console.error('No se pudo abrir el espacio en la nube.', error)
        if (cancelled) return
        const owner = await getLocalOwnerId().catch(() => null)
        if (owner === userId && sync.bootstrapped) { engine.current = sync; sync.start(); setCloudReady(true) }
        else setCloudError(error instanceof Error ? error.message : 'Sin conexión')
      }
    }
    void hydrate()
    return () => { cancelled = true; sync.stop(); if (engine.current === sync) engine.current = null }
  }, [userId, ready, attempt, persistRemote, replace, refreshIfStale])

  const wasOffline = useRef(false)
  useEffect(() => {
    if (!online) { wasOffline.current = true; return }
    if (!wasOffline.current) return
    wasOffline.current = false
    const pending = status?.pending ?? 0
    message(pending ? `Volvió la señal. Subiendo tus ${pending} ${pending === 1 ? 'cambio' : 'cambios'}.` : 'Volvió la señal. Todo al día.')
    void engine.current?.syncNow()
  }, [online]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(t => t?.id === toast.id ? null : t), toast.tone === 'error' ? 8000 : toast.undo ? 6000 : 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  // Celebra lo que se gana: nivel, logros y día completo. La primera lectura solo memoriza.
  const seen = useRef<{ level: number; unlocked: Set<string>; dayComplete: boolean; kept: Set<string>; day: string; read: boolean; votes: number } | null>(null)
  useEffect(() => {
    if (!ready || !data.profile.onboardingComplete) return
    const timer = window.setTimeout(() => {
      const g = game(dataRef.current)
      const unlocked = new Set(g.achievements.filter(a => a.unlocked).map(a => a.id))
      const before = seen.current
      const day = dateKey()
      const kept = new Set(keptToday(dataRef.current, day))
      const rs = streak(dataRef.current.reading.filter(realReading).map(r => r.day), day)
      const votes = votesOn(dataRef.current, day).total
      seen.current = { level: g.level, unlocked, dayComplete: g.dayComplete, kept, day, read: rs.todayDone, votes }
      if (!before) return
      // La racha crece en el momento en que lees (el instante más adictivo de Duolingo, aquí ganado).
      if (before.day === day && !before.read && rs.todayDone && modulesOf(dataRef.current.settings).reading) celebrate({ kind: 'streak', title: rs.current === 1 ? 'Día uno.' : `${rs.current} días seguidos`, text: rs.current === 1 ? 'Toda racha larga empezó con un día como este.' : rs.current >= rs.best ? 'Tu mejor racha. Sigue mañana.' : `Tu récord es ${rs.best}. Vas por él.`, count: rs.current })
      // Promesa cumplida en el momento: la recompensa pegada a la acción, como en el pollito.
      if (before.day === day) {
        const promises = dataRef.current.checkins.find(c => c.day === day)?.promises ?? []
        const fresh = promises.filter(p => kept.has(p.id) && !before.kept.has(p.id))
        fresh.slice(0, 1).forEach(p => celebrate({ kind: 'record', title: 'Promesa cumplida', text: kept.size === promises.length ? `${p.label}. Cumpliste todo lo que prometiste hoy.` : `${p.label}. Te ${promises.length - kept.size === 1 ? 'falta una' : `faltan ${promises.length - kept.size}`}.` }))
      }
      if (g.level > before.level) {
        // Cambio de etapa: la celebración grande, con la imagen de la etapa nueva.
        const newRank = rankOf(g.level).index > rankOf(before.level).index
        celebrate(newRank
          ? { kind: 'rank', title: `Nueva etapa: ${g.rank}`, text: `Nivel ${g.level}. Lo que repetiste echó raíz.`, image: g.rankInfo.image }
          : { kind: 'level', title: `¡Nivel ${g.level}!`, text: g.rankInfo.next ? `${g.rankInfo.next.level - g.level} ${g.rankInfo.next.level - g.level === 1 ? 'nivel' : 'niveles'} para ${g.rankInfo.next.name}.` : `Tu bambú ya es ${g.rank}.` })
      }
      g.achievements.filter(a => a.unlocked && !before.unlocked.has(a.id)).slice(0, 2).forEach(a => celebrate({ kind: 'achievement', title: a.name, text: a.description }))
      if (g.dayComplete && !before.dayComplete) celebrate({ kind: 'day', title: 'Día completo', text: '5 de 5 misiones. +25 XP.' })
    }, 400)
    return () => window.clearTimeout(timer)
  }, [data, ready])

  const go = useCallback((target: Section) => { const next: Section = target === 'Enfoque' ? 'Tareas' : target; setSection(next); setLost(false); window.scrollTo({ top: 0 }) }, [])
  const goHome = useCallback(() => { window.history.replaceState({}, '', window.location.pathname); go('Hoy') }, [go])
  const reportar = useCallback(async (error: Error, donde: string): Promise<Envio> => {
    try {
      await reportarFallo({ donde, error: `${error.name}: ${error.message}`, pila: (error.stack ?? '').split('\n').slice(0, 6).join('\n'), version: VERSION, navegador: navigator.userAgent })
      return 'enviado'
    } catch { return 'error' }
  }, [])

  useEffect(() => {
    if (!ready) return
    const url = new URL(window.location.href)
    if (!url.searchParams.has('recibir')) return
    url.searchParams.delete('recibir')
    window.history.replaceState({}, '', url.pathname + url.search + url.hash)
    const from = window.opener as Window | null
    if (!from) return
    const lan = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}):5640$/
    const onMsg = (e: MessageEvent) => {
      if (!lan.test(e.origin) || e.source !== from || e.data?.type !== 'bambu-datos') return
      window.removeEventListener('message', onMsg)
      try {
        const restored = parseBackup(JSON.stringify(e.data.data))
        const series = restored.sets.filter(x => x.day === dateKey()).length
        if (!window.confirm(`¿Pasar tus datos aquí? Trae a ${restored.profile.name || 'tu perfil'}, ${restored.settings.habits.filter(h => !h.archived).length} objetivos y ${series} series de hoy. Reemplaza lo que haya en esta versión.`)) return
        commit(() => restored)
        from.postMessage({ type: 'bambu-recibido' }, e.origin)
        message('Listo: tus datos ya están aquí.')
      } catch (error) {
        console.error('No se pudieron pasar los datos.', error)
        message('No se pudieron pasar los datos. Intenta otra vez.', undefined, { tone: 'error' })
      }
    }
    window.addEventListener('message', onMsg)
    from.postMessage({ type: 'bambu-listo' }, '*')
    return () => window.removeEventListener('message', onMsg)
  }, [ready]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── NFC: se resuelve una sola vez, cuando ya están los datos de la cuenta ──
  const appReady = ready && (!cloudConfigured || (cloudReady && !!session)) && data.profile.onboardingComplete
  useEffect(() => {
    if (!nfc || !appReady) return
    const action = nfc
    setNfc(null)
    clearNfcFromUrl()
    if (isRepeatScan(action)) return
    const d = dataRef.current
    const now = Date.now()
    if (action.tag === 'reading') {
      const s = d.activeReading
      if (s && !s.endedAt) {
        if (now - s.startedAt < 8000) { message('Tu lectura ya empezó.'); go('Lectura'); return }
        commit(x => nfcServerAction(x, { tag: 'reading' }, Date.now(), dateKey()).next)
        message('Tiempo de lectura guardado. Completa tus capítulos y tu idea.')
      } else if (!s) {
        commit(x => x.activeReading ? x : ({ ...x, activeReading: freshReading() }))
        message('Lectura iniciada. Vuelve a acercar el teléfono al terminar.', () => commit(x => ({ ...x, activeReading: null })))
      }
      go('Lectura')
    } else if (action.tag === 'training') {
      const r = trainingAction(d, now, dateKey())
      commit(x => trainingAction(x, now, dateKey()).next)
      message(r.open ? `${r.title}. Registra cada serie al terminarla.` : `${r.title}. ${r.text}`)
      setTrainingKey(k => k + 1)
      go('Entrenar')
    } else if (action.tag === 'cama') {
      const r = bedAction(d, dateKey(), clockOf(now))
      commit(x => bedAction(x, dateKey(), clockOf(now)).next)
      if (r.next === d) message(`${r.title}. ${r.text}`)
      else { rewardSound(true); celebrate({ kind: 'achievement', title: r.title, text: `${r.text} +${XP.habit} XP`, image: 'img/tallo-cheer.webp' }) }
      go('Hoy')
    } else if (action.tag === 'focus') {
      go('Tareas')
    } else if (action.tag === 'habit') {
      const habit = activeHabits(d.settings).find(h => h.id === action.habit)
      if (!habit) { message('Esa etiqueta apunta a un hábito que ya no existe.'); return }
      const day = dateKey()
      if ((d.habits[day] ?? []).includes(habit.id)) message(`${habit.label}: ya estaba marcado hoy.`)
      else {
        commit(x => ({ ...x, habits: { ...x.habits, [day]: [...(x.habits[day] ?? []), habit.id] } }))
        rewardSound(true)
        celebrate({ kind: 'achievement', title: `¡${habit.label}!`, text: `Marcado con tu etiqueta. +${XP.habit} XP`, image: 'img/tallo-cheer.webp' })
      }
      go('Hoy')
    } else if (action.tag === 'night') {
      go('Noche')
    } else if (action.tag === 'checkin') {
      message(d.checkins.some(c => c.day === dateKey()) ? 'Ya hiciste tu check-in de hoy.' : 'Buenos días. ¿Cómo dormiste?')
      go('Hoy')
    } else if (action.tag === 'weigh') {
      message('Pésate en ayunas y guárdalo en Progreso.')
      setTrainingKey(k => k + 1)
      go('Entrenar')
    }
  }, [nfc, appReady, commit, go, message])

  function exportBackup() {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([JSON.stringify(dataRef.current, null, 2)], { type: 'application/json' }))
    link.download = `bambu-respaldo-${dateKey()}.json`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000)
    message('Respaldo descargado.')
  }
  async function importBackup(file?: File) {
    if (!file) return
    try {
      const restored = parseBackup(await file.text())
      if (!window.confirm('Esto reemplaza lo que hay en Bambú por el respaldo. ¿Continuar?')) return
      commit(() => restored)
      message('Respaldo restaurado.')
    } catch (error) {
      console.error('Respaldo inválido.', error)
      message('Ese archivo no parece un respaldo de Bambú. No se cambió nada.', undefined, { tone: 'error' })
    }
  }
  async function deleteAccount(password: string) {
    if (!userId) throw new Error('Sin cuenta')
    const sync = engine.current
    sync?.stop()
    try { await cuenta.borrar(password) } catch (error) { if (sync && cuenta.guardada()) sync.start(); throw error }
    engine.current = null
    setReady(false)
    const cleanup = await Promise.allSettled([clearOwnPhotos(), clearAccountStorage(userId)])
    if (cleanup.some(result => result.status === 'rejected')) {
      window.alert('Tu cuenta ya se borró de la nube. Este navegador no dejó borrar todas sus copias locales. Borra los datos de bambú en los ajustes del navegador para terminar.')
    }
    window.location.reload()
  }
  async function deleteEverything(password = '') {
    if (cloudConfigured) { await deleteAccount(password); return }
    await clearOwnPhotos().catch(() => undefined)
    await wipeDevice()
    window.location.replace(window.location.pathname)
  }
  async function signOut() {
    if (!cloudConfigured) return
    try { if (engine.current && !await engine.current.syncNow()) { fail('Hay cambios sin subir. Conéctate antes de cerrar sesión.'); return }; cuenta.salir() } catch (error) { console.error(error); fail('No se pudo cerrar la sesión. Revisa tu conexión.', () => void signOut()) }
  }

  if (loadFailed) return <ProblemScreen tone="error" title="No pudimos abrir tus datos." text="No los vamos a reemplazar por una lista vacía. Siguen guardados en este teléfono."><button className="primary-button" onClick={() => window.location.reload()}>Intentar otra vez</button></ProblemScreen>
  if (!ready || (cloudConfigured && !authReady)) return <LoadingScreen text="Abriendo tu espacio." />
  if (quick && parseNfc(quick)?.tag === 'pause') return <PauseQuick search={quick} local={data} />
  if (cloudConfigured && !session) return <AuthScreen />
  if (cloudConfigured && !cloudReady && cloudError) return <ProblemScreen tone="offline" title="No llegamos a la nube." text="Revisa tu señal. Lo de este teléfono sigue intacto y se sube solo cuando vuelva la conexión."><button className="primary-button" onClick={() => setAttempt(a => a + 1)}>Reintentar</button><button className="quiet-button" onClick={signOut}>Cerrar sesión</button></ProblemScreen>
  if (cloudConfigured && !cloudReady) return <LoadingScreen text="Sincronizando tu espacio privado." />
  if (mostrarLegal && cloudConfigured && userId && !legalAceptado(data.settings)) return <Consentimiento onAceptar={salud => aceptar(commit, salud)} onSalir={() => void signOut()} />
  if (!data.profile.onboardingComplete) return <Onboarding initialName={data.profile.name} onComplete={r => commit(d => ({ ...d, profile: { name: r.name || 'Tú', onboardingComplete: true },
    settings: { ...d.settings, modules: r.modules, habits: r.habits, ...(r.age ? { age: r.age } : {}), sinEdad: r.sinEdad, train: r.competir ? { ...(d.settings.train ?? semanaVacia()), lock: false } : d.settings.train ?? semanaVacia(), walkDaily: true, cardioSetup: true, modo: r.competir ? 'competir' : undefined },
    habits: r.firstVotes.length ? { ...d.habits, [dateKey()]: [...new Set([...(d.habits[dateKey()] ?? []), ...r.firstVotes])] } : d.habits }))} />
  if (candado) return <Suspense fallback={<Cargando />}><CandadoPage data={data} commit={commit} app={candado} onSalir={to => { try { sessionStorage.removeItem(CANDADO_KEY) } catch { void 0 } setCandado(null); if (to) go(to) }} /></Suspense>

  const syncText = !cloudConfigured ? 'Guardado en este dispositivo' : !status ? 'Conectando' : status.phase === 'synced' ? 'Nube al día' : status.phase === 'offline' ? `Sin conexión · ${status.pending} por subir` : `Subiendo ${status.pending || ''}`.trim()
  // Sin conexión con cambios pendientes: la píldora se vuelve botón para reintentar a mano.
  const retrySync = () => { const e = engine.current; if (!e) return; message('Reintentando subir tus cambios.'); void e.syncNow().then(okay => { if (!okay) fail('Sigue sin conexión. Tus cambios esperan en este teléfono.', retrySync) }) }
  const pill = (extra = '') => status?.phase === 'offline'
    ? <button type="button" className={`sync-pill sync-offline ${extra}`} onClick={retrySync} aria-label={`${syncText}. Toca para reintentar.`}>{syncText} · Reintentar</button>
    : <div className={`sync-pill sync-${status?.phase ?? 'local'} ${extra}`} role="status">{syncText}</div>
  const mods = modulesOf(data.settings)
  const competir = esCompetir(data.settings)
  const allowed = (id: Section) => competir && (OCULTAS_EN_COMPETIR as readonly string[]).includes(id) ? false : id === 'Lectura' ? mods.reading : id === 'Entrenar' ? mods.training : id === 'Tareas' ? mods.focus : id === 'Comida' ? mods.food : id !== 'Noche' && id !== 'Hábitos' && id !== 'Enfoque'
  const nav = NAV.filter(n => allowed(n.id) && (n.id !== 'Lectura' || competir))
  const tabs = nav.filter(n => n.id !== 'Ajustes')
  const page: Section = allowed(section) ? section : inicioDe(data.settings, tabs.map(t => t.id))
  const labelOf = (id: Section) => NAV.find(n => n.id === id)?.label ?? id
  const live = { Lectura: !!data.activeReading, Entrenar: !!(data.activeWorkout && !data.activeWorkout.endedAt), Amigos: nuevosAmigos > 0 } as Partial<Record<Section, boolean>>
  return <div className="shell d-shell">
    <aside className="side">
      <button className="brand" onClick={() => go('Hoy')}><span>bambú</span></button>
      <nav className="side-nav" aria-label="Secciones">{nav.map(n => <button key={n.id} className={page === n.id ? 'side-item on' : 'side-item'} aria-current={page === n.id ? 'page' : undefined} onClick={() => go(n.id)}><DuoIcon name={n.icon} size={32} />{n.label}{live[n.id] && <i className="live-dot" aria-label="en curso" />}</button>)}</nav>
      {pill()}
    </aside>
    <main className="main">
      <header className="top" aria-label={lost ? 'No encontrada' : labelOf(page)}><StatsBar data={data} go={go} /><button type="button" className={`top-gear ${page === 'Ajustes' ? 'on' : ''}`} aria-label="Ajustes" onClick={() => go('Ajustes')}><DuoIcon name="engrane" size={30} /></button></header>
      <div className="page">
        {!online && <OfflineBanner pending={status?.pending ?? 0} cloud={cloudConfigured} />}
        <PaseAbierto data={data} commit={commit} onMessage={t => message(t)} />
        {update && <button type="button" className="update-banner" onClick={() => window.location.reload()}><span><strong>Versión nueva lista.</strong> Toca para estrenarla.</span><i aria-hidden="true">↻</i></button>}
        {lost ? <NotFound onHome={goHome} onGo={s => go(s)} /> : <Guard onReport={reportar} where={page} key={page}><div className="section-in">
          <CrashProbe />
          <Suspense fallback={<Cargando />}>
          {page === 'Hoy' && <HoyLista data={data} commit={commit} go={go} onMessage={message} />}
          {page === 'Lectura' && <ReadingPage data={data} commit={commit} onMessage={message} />}
          {page === 'Entrenar' && <MiRutina key={trainingKey} data={data} commit={commit} onMessage={message} onIr={go} />}
          {page === 'Tareas' && <TareasSimple data={data} commit={commit} />}
          {page === 'Comida' && <FoodPage data={data} commit={commit} onMessage={message} />}
          {page === 'Historial' && <JardinPage data={data} />}
          {page === 'Amigos' && <AmigosPage data={data} commit={commit} onMessage={message} />}
          {page === 'Ajustes' && <AjustesSimple data={data} commit={commit} onMessage={message} cloud={cloudConfigured} onExport={exportBackup} onImport={f => void importBackup(f)} onSignOut={() => void signOut()} onDelete={deleteEverything} />}
          </Suspense>
        </div></Guard>}
        <footer className="foot">Lo que repites echa raíces.</footer>
      </div>
    </main>
    <nav className="bottom-nav d-nav" aria-label="Secciones principales">{tabs.map(n => <button key={n.id} className={page === n.id ? 'on' : ''} aria-current={page === n.id ? 'page' : undefined} aria-label={n.label} onClick={() => go(n.id)}><DuoIcon name={n.icon} size={34} /><span>{n.label}</span>{live[n.id] && <i className="live-dot" />}</button>)}</nav>
    <AudioMiniPlayer />
    <StretchHost data={data} commit={commit} onMessage={message} boot={BOOT_STRETCH} />
    <CelebrationLayer />
    {toast && <div key={toast.id} className={`toast ${toast.tone === 'error' ? 'toast-error' : ''}`} role={toast.tone === 'error' ? 'alert' : 'status'}>{toast.tone === 'error' && <i aria-hidden="true">!</i>}<span>{toast.text}</span>{toast.undo && <button onClick={() => { toast.undo?.(); setToast(null) }}>{toast.action ?? 'Deshacer'}</button>}</div>}
  </div>
}
