import { useMemo, useState } from 'react'
import type { AppData, TrainPlan } from './lib/model'
import { WEEK_DAYS, label } from './lib/rutina'
import { armarSemana, cambiosPara, EQUIPO, NIVELES, type Minutos, type Nivel, type Opcion, type Respuestas } from './lib/armar'
import type { Equipment } from './lib/exercises'
import { Sheet } from './Sheet'
import { Chips } from './ui'
import { DuoIcon } from './DuoIcons'
import { haptic } from './lib/haptic'

export function ElegirRutina({ onBambu, onYo, onCancelar }: { onBambu: () => void; onYo: () => void; onCancelar?: () => void }) {
  return <div className="d-card d-elegir">
    <h2>¿Cómo quieres tu rutina?</h2>
    <button type="button" className="d-elegir-op bambu" onClick={onBambu}>
      <DuoIcon name="estrella" size={38} />
      <span><b>Que Bambú me la arme</b><small>Te pregunto 4 cosas y te la armo. Luego cambias lo que no te guste.</small></span>
    </button>
    <button type="button" className="d-elegir-op" onClick={onYo}>
      <DuoIcon name="lista" size={38} />
      <span><b>La armo yo</b><small>Eliges tus ejercicios, día por día.</small></span>
    </button>
    {onCancelar && <button type="button" className="d-link" onClick={onCancelar}>Dejar mi rutina como está</button>}
  </div>
}

const equipoDe = (data: AppData): Equipment[] => {
  const validos = new Set(EQUIPO.map(e => e.id))
  const e = (data.settings.equipment ?? []).filter((x): x is Equipment => validos.has(x as Equipment))
  return e.length ? e : ['nada']
}

export function ArmarSheet({ data, reemplaza, onClose, onUsar }: { data: AppData; reemplaza: boolean; onClose: () => void; onUsar: (week: TrainPlan['week'], r: Respuestas) => void }) {
  const [equipo, setEquipo] = useState<Equipment[]>(() => equipoDe(data))
  const [dias, setDias] = useState(3)
  const [minutos, setMinutos] = useState<Minutos>(30)
  const [nivel, setNivel] = useState<Nivel>('empiezo')
  const [ver, setVer] = useState(false)
  const r: Respuestas = { equipo: equipo.includes('nada') ? equipo : ['nada', ...equipo], dias, minutos, nivel }
  const semana = useMemo(() => armarSemana(r), [equipo, dias, minutos, nivel]) // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (id: Equipment) => { haptic(8); setEquipo(e => e.includes(id) ? e.filter(x => x !== id) : [...e, id]) }
  return <Sheet title={ver ? 'Tu rutina' : 'Bambú te la arma'} tall onClose={onClose}>
    {!ver ? <div className="d-armar">
      <h3>¿Qué tienes para entrenar?</h3>
      <Chips multiple label="Equipo" value={equipo} onChange={toggle} options={EQUIPO.map(e => [e.id, e.label] as [Equipment, string])} />
      <h3>¿Cuántos días a la semana?</h3>
      <Chips label="Días" value={dias} onChange={setDias} options={[2, 3, 4, 5, 6].map(n => [n, `${n} días`] as [number, string])} />
      <h3>¿Cuánto tiempo por sesión?</h3>
      <Chips label="Tiempo" value={minutos} onChange={v => setMinutos(v as Minutos)} options={[[15, '15 min'], [30, '30 min'], [45, '45 min']]} />
      <h3>¿Cómo vas?</h3>
      <Chips label="Nivel" value={nivel} onChange={setNivel} options={NIVELES.map(n => [n.id, n.label] as [Nivel, string])} />
      <button type="button" className="d-btn green wide" onClick={() => { haptic(12); setVer(true) }}>Armar mi rutina</button>
    </div> : <div className="d-armar">
      <p className="d-hint left">{dias} días · {minutos} min · {NIVELES.find(n => n.id === nivel)?.label.toLowerCase()}. Después puedes cambiar o quitar cualquier ejercicio.</p>
      <ul className="d-armar-dias">{semana.map((rt, i) => rt && <li key={i}>
        <b>{WEEK_DAYS[i]} · {rt.title}</b>
        <small>{rt.rounds} rondas</small>
        <ul>{rt.items.map(it => <li key={it.id}>{it.name} <span>{label(it)}</span></li>)}</ul>
      </li>)}</ul>
      {reemplaza && <p className="d-hint left">Esto reemplaza tu rutina actual. Lo que ya registraste no se borra.</p>}
      <div className="d-row2">
        <button type="button" className="d-btn white" onClick={() => setVer(false)}>Ajustar</button>
        <button type="button" className="d-btn green wide" onClick={() => onUsar(semana, r)}>Usar esta rutina</button>
      </div>
    </div>}
  </Sheet>
}

export function CambiarSheet({ data, nombre, kind, onClose, onCambiar, onQuitar }: { data: AppData; nombre: string; kind: 'reps' | 'seconds' | 'free'; onClose: () => void; onCambiar: (o: Opcion) => void; onQuitar: () => void }) {
  const opciones = useMemo(() => cambiosPara(nombre, equipoDe(data).includes('nada') ? equipoDe(data) : ['nada', ...equipoDe(data)], kind), [data, nombre, kind])
  return <Sheet title={`Cambiar ${nombre}`} onClose={onClose}>
    <p className="d-hint left">{opciones.length ? 'Elige otro del mismo movimiento con lo que tienes. Se cambia en todos tus días.' : 'No hay otro de este movimiento con tu equipo.'}</p>
    <ul className="d-ex">{opciones.map(c => <li key={c.opcion.name}><button type="button" className="d-ex-row" onClick={() => onCambiar(c.opcion)}>
      <span className={`d-ex-icon ${c.opcion.kind}`}><DuoIcon name={c.opcion.kind === 'seconds' ? 'reloj' : 'pesa'} size={28} /></span>
      <span className="d-ex-text"><b>{c.opcion.name}</b><small>{c.etiqueta}</small></span>
      <span className="d-go">›</span>
    </button></li>)}</ul>
    <button type="button" className="d-btn white wide d-quitar" onClick={onQuitar}>Quitar de mi rutina</button>
  </Sheet>
}
