import { borrarAvisos, guardarAvisos, type EstadoAvisos } from './firebase'

export const VAPID = 'BFR90IZW4x_kImg5LXfTV8r1dtoPgv0OzBho3Fvl0J801vGv2M9wsmI_BMXZwOz6U3ZwjK-sMCK6vbpGhe4RHE4'
export type Estado = 'on' | 'off' | 'denied' | 'install' | 'unsupported'
const SW = 'avisos-sw.js'

const esIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const instalada = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
const alcance = () => new URL('./', document.baseURI).href

async function registro(): Promise<ServiceWorkerRegistration | undefined> {
  return navigator.serviceWorker.getRegistration(alcance())
}

export async function estado(): Promise<Estado> {
  if (esIOS() && !instalada()) return 'install'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const sub = await (await registro())?.pushManager.getSubscription()
  return sub && Notification.permission === 'granted' ? 'on' : 'off'
}

function bytes(b64: string): Uint8Array<ArrayBuffer> {
  const raw = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export class AvisoTarde extends Error {}
function tope<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<never>((_, no) => setTimeout(() => no(new AvisoTarde('tarde')), ms))])
}
async function listo(): Promise<ServiceWorkerRegistration> {
  const r = await registro()
  if (r?.active) return r
  await navigator.serviceWorker.register(new URL(SW, document.baseURI).href, { scope: alcance() })
  return navigator.serviceWorker.ready
}

export async function activar(uid: string, hora: string, e: EstadoAvisos): Promise<Estado> {
  if (esIOS() && !instalada()) return 'install'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission !== 'granted') {
    const permiso = await tope(Notification.requestPermission(), 60000)
    if (permiso !== 'granted') return permiso === 'denied' ? 'denied' : 'off'
  }
  const reg = await tope(listo(), 15000)
  const sub = await tope(reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes(VAPID) }), 20000)
  const j = sub.toJSON()
  await tope(guardarAvisos(uid, { endpoint: sub.endpoint, p256dh: j.keys?.p256dh ?? '', auth: j.keys?.auth ?? '' }, hora, Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Mexico_City', e), 20000)
  return 'on'
}

export async function apagar(uid: string): Promise<void> {
  const sub = await (await registro())?.pushManager.getSubscription()
  await borrarAvisos(uid)
  await sub?.unsubscribe()
}
