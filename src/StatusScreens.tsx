/**
 * Pantallas de estado: cargando, algo falló y página que no existe.
 * Regla: siempre dicen qué pasó con TUS DATOS y dan un siguiente paso. Nunca un callejón sin salida.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { BroteArt } from './Brote'

/** Lo que Bambú cree, dicho corto. Rota mientras algo tarda: si vas a esperar, que sirva. */
const WHILE_YOU_WAIT = [
  'Cinco minutos de lectura cuentan como día leído.',
  'Con poco tiempo, cuida las series de la semana, no los días.',
  'Tu vara sale de hechos, no de cómo te sientes en la noche.',
  'Lo difícil primero y el celular después.',
  'Un día malo no rompe el proceso. Mañana vuelves.',
  'Lo que repites echa raíces.',
]

/** Brote creciendo mientras abre. Si tarda, lo dice, enseña algo útil y a los 15 s ofrece recargar. */
export function LoadingScreen({ text }: { text: string }) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => { const t = window.setInterval(() => setSeconds(s => s + 1), 1000); return () => window.clearInterval(t) }, [])
  const tip = WHILE_YOU_WAIT[Math.floor(seconds / 5) % WHILE_YOU_WAIT.length]
  return <main className="status-screen loading" aria-busy="true">
    <div className="grow-mark" aria-hidden="true"><img src="brote.svg" alt="" width="96" height="96" /></div>
    <p role="status">{text}</p>
    {seconds >= 6 && <>
      <p className="status-slow">Está tardando más de lo normal. Lo de este teléfono sigue a salvo.</p>
      <p className="status-tip" key={tip}>{tip}</p>
    </>}
    {seconds >= 15 && <button type="button" className="secondary-button" onClick={() => window.location.reload()}>Recargar</button>}
  </main>
}

type Tone = 'error' | 'offline' | 'lost'
const ART: Record<Tone, string> = { error: 'img/error.webp', offline: 'img/sin-senal.webp', lost: 'img/perdido.webp' }

/** Pantalla completa para cuando no se puede abrir la app. */
export function ProblemScreen({ tone, title, text, children }: { tone: Tone; title: string; text: string; children?: ReactNode }) {
  return <main className={`status-screen problem tone-${tone}`}>
    <img className="status-art" src={ART[tone]} alt="" width="220" height="220" />
    <h1>{title}</h1>
    <p>{text}</p>
    {children && <div className="status-actions">{children}</div>}
  </main>
}

const SHORTCUTS = ['Hoy', 'Lectura', 'Entrenar', 'Tareas'] as const
/** Dentro de la app: una sección o enlace que no existe. Brote buscó, no encontró, y te da atajos. */
export function NotFound({ onHome, onGo }: { onHome: () => void; onGo?: (s: typeof SHORTCUTS[number]) => void }) {
  return <section className="card status-card tone-lost">
    <img className="status-art" src={ART.lost} alt="" width="180" height="180" />
    <span className="eyebrow">PÁGINA NO ENCONTRADA</span>
    <h2>Brote buscó por todos lados.</h2>
    <p>Esta página no existe: el enlace está viejo o tiene un error. Tus registros no se movieron.</p>
    <button className="primary-button" onClick={onHome}>Ir a Hoy <span>↗</span></button>
    {onGo && <div className="lost-shortcuts" aria-label="Atajos">{SHORTCUTS.slice(1).map(s => <button key={s} type="button" className="chip" onClick={() => onGo(s)}>{s}</button>)}</div>}
  </section>
}

/** El primer tropiezo de una pantalla: se reintenta sola en un segundo, sin pedirte nada. */
export function Recovering() {
  return <section className="card status-card recovering" role="status">
    <BroteArt mood="susto" size={96} />
    <h2>Ups, me tropecé.</h2>
    <p>Reacomodando esta pantalla. Tus datos están bien.</p>
  </section>
}

/** Una pantalla que se cayó dos veces: el resto de la app sigue vivo y nada se borró. */
type Envio = 'listo' | 'enviando' | 'enviado' | 'error'
const TEXTO_ENVIO: Record<Envio, string> = { listo: 'Reportar', enviando: 'Enviando…', enviado: 'Reporte enviado', error: 'Reportar otra vez' }

export function ScreenCrash({ where, onRetry, onReport }: { where: string; onRetry: () => void; onReport: () => Promise<Envio> }) {
  const [envio, setEnvio] = useState<Envio>('listo')
  async function reportar() {
    setEnvio('enviando')
    setEnvio(await onReport().catch((): Envio => 'error'))
  }
  return <section className="card status-card tone-error">
    <BroteArt mood="susto" size={120} />
    <span className="eyebrow">ALGO FALLÓ EN {where.toUpperCase()}</span>
    <h2>Esta pantalla se cayó.</h2>
    <p>Tus datos están a salvo: lo que registraste ya se guardó.</p>
    <div className="row-actions">
      <button className="primary-button" onClick={onRetry}>Reintentar</button>
      <button className="secondary-button" disabled={envio === 'enviando' || envio === 'enviado'} onClick={() => void reportar()}>{TEXTO_ENVIO[envio]}</button>
    </div>
  </section>
}
export type { Envio }
