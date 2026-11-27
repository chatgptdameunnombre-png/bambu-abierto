import { useEffect, useState, type MouseEvent } from 'react'
import { makeId, type HabitDef, type Modules } from './lib/model'
import { BroteArt } from './Brote'
import { haptic } from './lib/haptic'
import { Chips, celebrate } from './ui'
import { burst } from './juice'
import type { Mood } from './lib/brote'

export type OnboardingResult = { name: string; modules: Modules; habits: HabitDef[]; firstVotes: string[]; competir: boolean }
type Props = { initialName: string; onComplete: (result: OnboardingResult) => void }

/** Hábitos de ejemplo para elegir. Ninguno es obligatorio: cada quien arma los suyos. */
const CATALOG: { id: string; label: string; mark: string }[] = [
  { id: 'cama', label: 'Tender la cama', mark: 'T' }, { id: 'oracion', label: 'Oración o meditación', mark: 'O' }, { id: 'comida', label: 'Comer comida real', mark: 'C' },
  { id: 'dormir', label: 'Dormir a mi hora', mark: 'D' }, { id: 'estirar', label: 'Estirar', mark: 'E' },
  { id: 'agua', label: 'Tomar agua', mark: 'A' }, { id: 'pantallas', label: 'Sin pantallas antes de dormir', mark: 'P' },
  { id: 'gratitud', label: 'Escribir tres gratitudes', mark: 'G' }, { id: 'ayudar', label: 'Ayudar a alguien', mark: 'Y' },
  { id: 'aprender', label: 'Aprender algo nuevo', mark: 'N' },
]
const MODULES: { key: keyof Modules; label: string; text: string }[] = [
  { key: 'training', label: 'Entreno', text: 'Tu rutina de la semana, con contador para reps y cronómetro para holds.' },
  { key: 'focus', label: 'Tareas', text: 'Una lista clara de pendientes.' },
  { key: 'reading', label: 'Lectura', text: '¿Leíste? Tu libro, tus tiempos y cronómetro.' },
  { key: 'bible', label: 'Biblia', text: 'Los capítulos que lees y tu avance en toda la Biblia.' },
  { key: 'food', label: 'Comida', text: 'Registra lo que comes en segundos.' },
]
type Step = 'wake' | 'modules' | 'habits' | 'grow'
const ESTRELLAS = [[12, 18, 0], [26, 9, 1.1], [41, 22, 2.3], [58, 12, .6], [73, 25, 1.7], [86, 10, 2.9], [92, 30, .3], [18, 34, 2.1], [64, 36, 1.4], [35, 40, 3.2]]
/** El cielo de la bienvenida: estrellas de noche y, con dia, el amanecer que sale cuando despiertas a Brote. */
export function Cielo({ dia = false }: { dia?: boolean }) {
  return <div className={`ob-sky ${dia ? 'dawn' : ''}`} aria-hidden="true">{ESTRELLAS.map(([x, y, d], i) => <i key={i} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` }} />)}<b className="ob-sun" /></div>
}

/**
 * La bienvenida en 3 pantallas: despiertas a Brote y le dices tu nombre, eliges qué medir
 * (o solo competir) y tus objetivos. El bambú se planta solo y entras a Hoy.
 */
export function Onboarding({ initialName, onComplete }: Props) {
  const [step, setStep] = useState<Step>('wake')
  const [mood, setMood] = useState<Mood>('sueno')
  const [name, setName] = useState(initialName)
  const [modules, setModules] = useState<Modules>({ reading: true, bible: false, training: true, focus: true, food: false })
  const [picked, setPicked] = useState<string[]>([])
  const [custom, setCustom] = useState('')
  const [ticks, setTicks] = useState(0)
  const [anim, setAnim] = useState<'' | 'despierta'>('')
  const [competir, setCompetir] = useState(false)
  // El id del hábito propio se fija una vez: si cambiara en cada pantalla, el primer voto apuntaría a otro.
  const [customId] = useState(() => `h-${makeId().slice(0, 8)}`)
  const flow: Step[] = competir ? ['wake', 'modules'] : ['wake', 'modules', 'habits']
  const index = flow.indexOf(step)
  const toggle = (k: keyof Modules) => setModules(m => ({ ...m, [k]: !m[k] }))
  const go = (next: Step) => { haptic(10); setStep(next) }
  const forward = () => go(flow[index + 1] ?? 'grow')
  const back = () => go(index > 0 ? flow[index - 1] : 'wake')

  const despierto = mood !== 'sueno'
  function wake(e?: MouseEvent) {
    if (despierto) return
    haptic([20, 30, 60])
    const art = (e?.currentTarget as Element | undefined)?.querySelector?.('.brote-art') ?? document.querySelector('.ob-mascot')
    setAnim('despierta')
    setMood('susto')
    window.setTimeout(() => { burst(art, 18); setMood('feliz') }, 650)
    window.setTimeout(() => setAnim(''), 1500)
  }
  const habits = (): HabitDef[] => [
    ...CATALOG.filter(h => picked.includes(h.id)).map(h => ({ id: h.id, label: h.label, mark: h.mark })),
    ...(custom.trim() ? [{ id: customId, label: custom.trim().slice(0, 60), mark: custom.trim().charAt(0).toUpperCase() }] : []),
  ]
  const zonas = [modules.training, modules.focus, modules.reading, modules.food].filter(Boolean).length
  const checklist = competir ? [
    'Modo competir: sin racha obligatoria',
    `${zonas} ${zonas === 1 ? 'zona lista' : 'zonas listas'}`,
    modules.training ? 'Tu rutina de la semana cargada' : 'Sin entreno por ahora',
    'Tu perfil para la liga: créalo en Amigos',
  ] : [
    `${Object.values(modules).filter(Boolean).length} ${Object.values(modules).filter(Boolean).length === 1 ? 'módulo listo' : 'módulos listos'}`,
    `${habits().length} ${habits().length === 1 ? 'objetivo diario' : 'objetivos diarios'}`,
    modules.training ? 'Tu rutina, cuando la armes en Entrenar' : 'Sin entreno por ahora',
  ]
  // "Plantando tu bambú": cada línea se palomea sola y al final entras.
  useEffect(() => {
    if (step !== 'grow') return
    if (ticks >= checklist.length) {
      const t = window.setTimeout(() => {
        if (competir) celebrate({ kind: 'rank', title: `¡A competir${name.trim() ? `, ${name.trim()}` : ''}!`, text: 'Agrega a tus amigos en Amigos y reta a quien quieras.', image: 'img/rango-02-brote.webp' })
        else celebrate({ kind: 'rank', title: `Ya echaste raíz${name.trim() ? `, ${name.trim()}` : ''}.`, text: 'Tu bambú ya está plantado. Lo que repites echa raíces.', image: 'img/rango-02-brote.webp' })
        onComplete({ name: name.trim(), modules, habits: competir ? [] : habits(), firstVotes: [], competir })
      }, 500)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => { haptic(12); setTicks(n => n + 1) }, 330)
    return () => window.clearTimeout(t)
  }, [step, ticks]) // eslint-disable-line react-hooks/exhaustive-deps

  if (step === 'wake') return <main className={`ob ob-wake ${despierto ? 'awake' : 'asleep'}`} onClick={despierto ? undefined : wake}>
    <Cielo />
    <button type="button" className={`ob-mascot ${anim}`} onClick={wake} aria-label={despierto ? 'Brote despierto' : 'Despertar a Brote'}><BroteArt mood={mood} size={176} /></button>
    {!despierto ? <>
      <h1 className="ob-title">Toca para despertar</h1>
      <span className="ob-tap" aria-hidden="true" />
    </> : mood === 'susto' ? <h1 className="ob-title">¡Ay!</h1> : <div className="ob-hola">
      <h1 className="ob-title">¡Hola! Soy Brote.</h1>
      <p className="ob-copy">Te ayudo a ver qué haces con tus días, sin llenar formularios. ¿Cómo te llamas?</p>
      <input className="text-input ob-input" value={name} onChange={e => setName(e.target.value)} maxLength={40} placeholder="Tu nombre" aria-label="Tu nombre" onKeyDown={e => { if (e.key === 'Enter' && name.trim()) forward() }} />
      <button type="button" className="primary-button ob-cta" disabled={!name.trim()} onClick={forward}>Continuar <span>→</span></button>
      <p className="ob-note">Gratis. Tus respuestas se quedan en este teléfono.</p>
    </div>}
  </main>

  return <main className="ob ob-fondo">
    <Cielo dia />
    {step !== 'grow' && <header className="ob-top">
      <button type="button" className="ob-back" onClick={back} aria-label="Atrás">←</button>
      <div className="ob-progress" role="progressbar" aria-valuemin={0} aria-valuemax={flow.length} aria-valuenow={index + 1} aria-label={`Paso ${index + 1} de ${flow.length}`}><span style={{ width: `${(index + 1) / flow.length * 100}%` }} /></div>
    </header>}
    <section className="ob-body" key={step}>
      {step === 'modules' && <>
        <span className="ob-mini"><BroteArt mood="feliz" size={84} /></span>
        <h1 className="ob-q">¿Qué quieres medir?</h1>
        <p className="ob-copy">Enciende solo lo que vas a usar. Lo cambias cuando quieras.</p>
        <div className="ob-options">{MODULES.map(m => <button key={m.key} type="button" className={`ob-option big ${modules[m.key] ? 'on' : ''}`} aria-pressed={modules[m.key]} onClick={() => toggle(m.key)}>
          <strong>{m.label}</strong><small>{m.text}</small></button>)}</div>
        <button type="button" role="switch" aria-checked={competir} className={`ob-switch ${competir ? 'on' : ''}`} onClick={() => { haptic(10); setCompetir(c => !c); if (!competir) setModules(x => ({ ...x, training: true })) }}>
          <span><strong>Solo competir con mis amigos</strong><small>Sin racha ni objetivos diarios. Entrenas, retas y subes en la liga.</small></span><i aria-hidden="true" />
        </button>
      </>}
      {step === 'habits' && <>
        <span className="ob-mini"><BroteArt mood="animo" size={84} /></span>
        <h1 className="ob-q">Tus objetivos diarios</h1>
        <p className="ob-copy">Elige los tuyos o escribe uno. Ninguno es obligatorio.</p>
        <Chips multiple label="Hábitos" value={picked} onChange={id => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])} options={CATALOG.map(h => [h.id, h.label] as [string, string])} />
        <input className="text-input" value={custom} onChange={e => setCustom(e.target.value)} maxLength={60} placeholder="¿Alguno propio? Ej. Tocar guitarra" />
      </>}
      {step === 'grow' && <div className="ob-grow">
        <span className="ob-seed grown"><BroteArt mood="orgulloso" size={170} /></span>
        <h1 className="ob-q">{competir ? 'Preparando tu zona' : 'Plantando tu bambú'}</h1>
        <ul className="ob-checklist">{checklist.map((c, i) => <li key={c} className={i < ticks ? 'done' : ''}><i aria-hidden="true">{i < ticks ? '✓' : ''}</i>{c}</li>)}</ul>
      </div>}
    </section>
    {step !== 'grow' && <footer className="ob-foot">
      <button type="button" className="primary-button wide" onClick={forward}>{index === flow.length - 1 ? 'Listo' : 'Continuar'} <span>→</span></button>
    </footer>}
  </main>
}
