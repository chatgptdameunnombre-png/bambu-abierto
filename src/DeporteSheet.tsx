import { useState } from 'react'
import { Sheet } from './Sheet'
import { DuoIcon } from './DuoIcons'
import { haptic } from './lib/haptic'
import { ajusteDe, buscarDeportes, decision, deporteActivity, DURACIONES, INTENSIDADES, type Deporte } from './lib/deportes'
import { dateKey, type AppData } from './lib/model'
import { planOf, weekIndex } from './lib/rutina'

type Commit = (update: (d: AppData) => AppData) => void

export function DeporteSheet({ data, commit, onClose, onMessage }: { data: AppData; commit: Commit; onClose: () => void; onMessage: (t: string) => void }) {
  const today = dateKey()
  const [q, setQ] = useState('')
  const [dep, setDep] = useState<Deporte | null>(null)
  const [otro, setOtro] = useState<string | null>(null)
  const [min, setMin] = useState(60)
  const [int, setInt] = useState(2)
  const nombre = dep?.name ?? otro?.trim() ?? ''
  const listo = !!dep || !!otro?.trim()
  const base = planOf(data).week[weekIndex(today)]
  const tocaba = !!base && base.items.length > 0
  const prueba = listo ? { ...data, activities: [...data.activities, deporteActivity(today, dep, nombre, min, int, true)] } : data
  const aj = listo ? ajusteDe(prueba, today) : null
  const texto = !aj ? '' : tocaba ? decision(aj, base!) : 'Hoy no te tocaba rutina: queda en tu registro.'
  const lista = buscarDeportes(q)

  function guardar(ajusta: boolean) {
    if (!listo) return
    haptic([12, 30, 12])
    const act = deporteActivity(today, dep, nombre, min, int, ajusta)
    commit(d => d.activities.some(a => a.id === act.id) ? d : { ...d, activities: [...d.activities, act] })
    onMessage(`${nombre}, ${min} min. ${ajusta ? texto : 'Tu rutina se queda igual.'}`)
    onClose()
  }

  return <Sheet title="Hice otro deporte" tall onClose={onClose}>
    {!listo && otro === null ? <div className="d-deporte">
      <label className="d-buscar">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.6" /><path d="M15.5 15.5 21 21" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
        <input type="search" placeholder="Buscar deporte" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar deporte" enterKeyHint="search" autoComplete="off" />
        {q && <button type="button" className="d-buscar-x" aria-label="Borrar búsqueda" onClick={() => setQ('')}>×</button>}
      </label>
      <div className="d-deporte-lista">
        {lista.map(d => <button key={d.id} type="button" onClick={() => { haptic(8); setDep(d) }}>{d.name}</button>)}
        <button type="button" className="otro" onClick={() => { haptic(8); setOtro(q.trim()) }}>{q.trim() && !lista.length ? `Otro: ${q.trim()}` : 'Otro'}</button>
      </div>
    </div> : <div className="d-deporte">
      <div className="d-deporte-elegido">
        {dep ? <b>{dep.name}</b> : <input className="d-input" value={otro ?? ''} onChange={e => setOtro(e.target.value.slice(0, 40))} placeholder="¿Qué deporte?" aria-label="Nombre del deporte" autoFocus />}
        <button type="button" className="d-link" onClick={() => { setDep(null); setOtro(null) }}>Cambiar</button>
      </div>
      <div className="d-field">¿Cuánto tiempo?
        <div className="d-chips">{DURACIONES.map(m => <button key={m} type="button" className={min === m ? 'on' : ''} aria-pressed={min === m} onClick={() => { haptic(6); setMin(m) }}>{m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)} h ${m % 60}` : `${m / 60} h`}</button>)}</div>
      </div>
      <div className="d-field">¿Qué tan fuerte?
        <div className="d-deporte-int">{INTENSIDADES.map(([v, l, t]) => <button key={v} type="button" className={int === v ? 'on' : ''} aria-pressed={int === v} onClick={() => { haptic(6); setInt(v) }}><b>{l}</b><small>{t}</small></button>)}</div>
      </div>
      {listo && <div className={`d-deporte-decision ${aj?.nivel ?? ''}`}>
        <DuoIcon name={aj?.nivel === 'descanso' ? 'cama' : aj?.nivel === 'rebaja' ? 'pesa' : 'check'} size={30} />
        <p><small>Lo que decide bambú</small>{texto}</p>
      </div>}
      <button type="button" className="d-btn green wide" disabled={!listo} onClick={() => guardar(true)}>Guardar</button>
      {tocaba && aj && aj.nivel !== 'nada' && <button type="button" className="d-btn white wide" disabled={!listo} onClick={() => guardar(false)}>Solo registrarlo</button>}
      {tocaba && aj && aj.nivel !== 'nada' && <p className="d-hint">Si no te convence, "Solo registrarlo" lo guarda sin tocar tu rutina.</p>}
    </div>}
  </Sheet>
}
