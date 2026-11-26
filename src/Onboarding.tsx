import { useEffect, useState } from 'react'
import { makeId, type HabitDef, type Modules } from './lib/model'
import { BroteArt } from './Brote'
import { HoldButton } from './Vara'
import { haptic } from './lib/haptic'
import { Chips, celebrate } from './ui'
import { reward } from './juice'
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
  { key: 'food', label: 'Comida', text: 'Registra lo que comes en segundos.' },
]
type Step = 'wake' | 'name' | 'modo' | 'modules' | 'habits' | 'plant' | 'first' | 'grow'
const MODOS: { competir: boolean; label: string; text: string }[] = [
  { competir: false, label: 'Hábitos y racha', text: 'Camino del día, objetivos diarios y racha. Para construir constancia.' },
  { competir: true, label: 'Solo competir con mis amigos', text: 'Sin racha obligatoria ni camino del día. Entrenas, retas a tus amigos y subes en la liga.' },
]

/**
 * La bienvenida: una pregunta por pantalla, Brote reacciona y al final se planta el bambú
 * manteniendo presionado. Inspirada en el ritual de Clucky: comprometerse se siente, no se clica.
 */
export function Onboarding({ initialName, onComplete }: Props) {
  const [step, setStep] = useState<Step>('wake')
  const [mood, setMood] = useState<Mood>('sueno')
  const [name, setName] = useState(initialName)
  const [modules, setModules] = useState<Modules>({ reading: true, bible: false, training: true, focus: true, food: false })
  const [picked, setPicked] = useState<string[]>([])
  const [custom, setCustom] = useState('')
  const [ticks, setTicks] = useState(0)
  const [first, setFirst] = useState<string[]>([])
  const [competir, setCompetir] = useState(false)
  // El id del hábito propio se fija una vez: si cambiara en cada pantalla, el primer voto apuntaría a otro.
  const [customId] = useState(() => `h-${makeId().slice(0, 8)}`)
  const flow: Step[] = competir ? ['name', 'modo', 'modules'] : ['name', 'modo', 'modules', 'habits', 'plant', ...(picked.length || custom.trim() ? ['first' as Step] : [])]
  const index = flow.indexOf(step)
  const toggle = (k: keyof Modules) => setModules(m => ({ ...m, [k]: !m[k] }))
  const go = (next: Step) => { haptic(10); setStep(next) }
  const forward = () => go(flow[index + 1] ?? 'grow')
  const back = () => go(index > 0 ? flow[index - 1] : 'wake')

  function wake() {
    if (mood !== 'sueno') return
    haptic([20, 30, 60])
    setMood('susto')
    window.setTimeout(() => setMood('feliz'), 700)
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
    modules.training ? 'Tu rutina de la semana cargada' : 'Sin entreno por ahora',
    first.length ? `${first.length === 1 ? 'Tu primer hecho' : `${first.length} hechos`} de hoy` : 'Tu primer hecho, cuando hagas algo',
  ]
  // "Plantando tu bambú": cada línea se palomea sola y al final entras.
  useEffect(() => {
    if (step !== 'grow') return
    if (ticks >= checklist.length) {
      const t = window.setTimeout(() => {
        if (competir) celebrate({ kind: 'rank', title: `¡A competir${name.trim() ? `, ${name.trim()}` : ''}!`, text: 'Agrega a tus amigos en Amigos y reta a quien quieras.', image: 'img/rango-02-brote.webp' })
        else celebrate({ kind: 'rank', title: `Ya echaste raíz${name.trim() ? `, ${name.trim()}` : ''}.`, text: first.length ? `${first.length === 1 ? 'Tu primer hecho ya cuenta' : `${first.length} hechos ya cuentan`}. Lo que repites echa raíces.` : 'Tu bambú ya está plantado. Lo que repites echa raíces.', image: 'img/rango-02-brote.webp' })
        onComplete({ name: name.trim(), modules, habits: competir ? [] : habits(), firstVotes: competir ? [] : first, competir })
      }, 700)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => { haptic(12); setTicks(n => n + 1) }, 520)
    return () => window.clearTimeout(t)
  }, [step, ticks]) // eslint-disable-line react-hooks/exhaustive-deps

  if (step === 'wake') return <main className="ob ob-wake" onClick={wake}>
    <button type="button" className="ob-mascot" onClick={wake} aria-label={mood === 'sueno' ? 'Despertar a Brote' : 'Brote despierto'}><BroteArt mood={mood} size={200} /></button>
    <h1 className="ob-title">{mood === 'sueno' ? 'Toca para despertar' : mood === 'susto' ? '¡Ay!' : '¡Hola! Soy Brote.'}</h1>
    {mood === 'feliz' && <>
      <p className="ob-copy">Te ayudo a ver qué haces con tus días, sin llenar formularios. Te toma un minuto.</p>
      <button type="button" className="primary-button ob-cta" onClick={e => { e.stopPropagation(); go('name') }}>Empezar <span>→</span></button>
      <p className="ob-note">Gratis. Tus respuestas se quedan en este teléfono.</p>
    </>}
  </main>

  const canGo = step !== 'name' || name.trim().length > 0
  return <main className="ob">
    {step !== 'grow' && <header className="ob-top">
      <button type="button" className="ob-back" onClick={back} aria-label="Atrás">←</button>
      <div className="ob-progress" role="progressbar" aria-valuemin={0} aria-valuemax={flow.length} aria-valuenow={index + 1} aria-label={`Paso ${index + 1} de ${flow.length}`}><span style={{ width: `${(index + 1) / flow.length * 100}%` }} /></div>
    </header>}
    <section className="ob-body" key={step}>
      {step === 'name' && <>
        <BroteArt mood="feliz" size={110} />
        <h1 className="ob-q">¿Cómo te llamas?</h1>
        <input className="text-input ob-input" autoFocus value={name} onChange={e => setName(e.target.value)} maxLength={40} placeholder="Tu nombre" onKeyDown={e => { if (e.key === 'Enter' && name.trim()) forward() }} />
      </>}
      {step === 'modo' && <>
        <h1 className="ob-q">¿Cómo quieres usar Bambú?</h1>
        <p className="ob-copy">Lo cambias cuando quieras en Ajustes.</p>
        <div className="ob-options">{MODOS.map(m => <button key={m.label} type="button" className={`ob-option big ${competir === m.competir ? 'on' : ''}`} aria-pressed={competir === m.competir} onClick={() => { haptic(10); setCompetir(m.competir); if (m.competir) setModules(x => ({ ...x, training: true })) }}>
          <strong>{m.label}</strong><small>{m.text}</small></button>)}</div>
      </>}
      {step === 'modules' && <>
        <h1 className="ob-q">{competir ? '¿Qué zonas quieres?' : '¿Qué quieres medir?'}</h1>
        <p className="ob-copy">Enciende solo lo que vas a usar. Lo demás no aparece. Lo cambias cuando quieras.</p>
        <div className="ob-options">{MODULES.map(m => <button key={m.key} type="button" className={`ob-option big ${modules[m.key] ? 'on' : ''}`} aria-pressed={modules[m.key]} onClick={() => toggle(m.key)}>
          <strong>{m.label}</strong><small>{m.text}</small></button>)}</div>
      </>}
      {step === 'habits' && <>
        <h1 className="ob-q">Tus objetivos diarios</h1>
        <p className="ob-copy">Elige los tuyos o escribe uno. Ninguno es obligatorio y los cambias cuando quieras.</p>
        <Chips multiple label="Hábitos" value={picked} onChange={id => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])} options={CATALOG.map(h => [h.id, h.label] as [string, string])} />
        <input className="text-input" value={custom} onChange={e => setCustom(e.target.value)} maxLength={60} placeholder="¿Alguno propio? Ej. Tocar guitarra" />
      </>}
      {step === 'plant' && <>
        <img className="ob-seed" src="img/rango-01-semilla.webp" alt="" width="180" height="180" />
        <h1 className="ob-q">Planta tu bambú</h1>
        <p className="ob-copy">El bambú pasa años echando raíces antes de crecer. Así funciona la constancia.</p>
        <HoldButton label="Mantén presionado para plantar" done="Plantado" onDone={() => window.setTimeout(() => go(flow.includes('first') ? 'first' : 'grow'), 400)} />
      </>}
      {step === 'first' && <>
        <BroteArt mood="animo" size={110} />
        <h1 className="ob-q">¿Ya hiciste alguno hoy?</h1>
        <p className="ob-copy">Márcalo y es tu primer hecho. Si no, no pasa nada: mañana empiezas.</p>
        <div className="ob-options ob-first">{habits().map(h => <button key={h.id} type="button" className={`ob-option ${first.includes(h.id) ? 'on' : ''}`} aria-pressed={first.includes(h.id)} onClick={e => { haptic(14); if (!first.includes(h.id)) reward(e.currentTarget); setFirst(f => f.includes(h.id) ? f.filter(x => x !== h.id) : [...f, h.id]) }}>{first.includes(h.id) ? '✓ ' : ''}{h.label}</button>)}</div>
      </>}
      {step === 'grow' && <div className="ob-grow">
        <img className="ob-seed grown" src="img/rango-02-brote.webp" alt="" width="200" height="200" />
        <h1 className="ob-q">{competir ? 'Preparando tu zona' : 'Plantando tu bambú'}</h1>
        <ul className="ob-checklist">{checklist.map((c, i) => <li key={c} className={i < ticks ? 'done' : ''}><i aria-hidden="true">{i < ticks ? '✓' : ''}</i>{c}</li>)}</ul>
      </div>}
    </section>
    {!['plant', 'grow'].includes(step) && <footer className="ob-foot">
      <button type="button" className="primary-button wide" disabled={!canGo} onClick={forward}>{step === 'first' ? (first.length ? 'Listo' : 'Hoy no, empiezo mañana') : 'Continuar'} <span>→</span></button>
    </footer>}
  </main>
}
