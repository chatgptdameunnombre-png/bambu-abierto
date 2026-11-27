import { useMemo } from 'react'
import { dateKey, type AppData } from './lib/model'
import { muscleStats, type Muscle } from './lib/musculos'
import { PesoCard } from './TrainingPage'
import { PhotoLab } from './PhotoLab'
import { fmtDay } from './ui'

type Commit = (update: (d: AppData) => AppData) => void
type Msg = (text: string, undo?: () => void) => void

export function Progreso({ data, commit, onMessage }: { data: AppData; commit: Commit; onMessage: Msg }) {
  return <div className="d-coach">
    <PesoCard data={data} commit={commit} onMessage={onMessage} />
    <PhotoLab data={data} commit={commit} onMessage={onMessage} />
  </div>
}

const HORAS: Record<Muscle, number> = { Pecho: 48, Espalda: 48, Hombros: 48, Brazos: 48, Piernas: 48, Abdomen: 24 }
const META: Record<Muscle, [number, number]> = { Pecho: [8, 16], Espalda: [10, 20], Hombros: [8, 16], Brazos: [8, 16], Piernas: [10, 20], Abdomen: [6, 14] }

export type Estado = { muscle: Muscle; series: number; meta: [number, number]; lastDay: string | null; listo: string | null }
export function recuperacion(data: AppData, today = dateKey(), ahora = Date.now()): Estado[] {
  const semana = muscleStats(data, today, 'semana')
  return (Object.keys(HORAS) as Muscle[]).map(m => {
    const last = semana[m].lastDay
    const fin = data.sets.filter(s => s.day === last).reduce((x, s) => Math.max(x, s.at), 0)
    const listoEn = last && fin ? fin + HORAS[m] * 3600000 : 0
    return { muscle: m, series: semana[m].sets, meta: META[m], lastDay: last, listo: listoEn > ahora ? new Date(listoEn).toISOString() : null }
  })
}

function cuando(iso: string, ahora: number): string {
  const h = Math.ceil((Date.parse(iso) - ahora) / 3600000)
  return h <= 1 ? 'en menos de una hora' : h < 24 ? `en ${h} horas` : h < 48 ? 'mañana' : 'en 2 días'
}

export function Recuperacion({ data }: { data: AppData }) {
  const ahora = Date.now()
  const estados = useMemo(() => recuperacion(data, dateKey(), ahora), [data]) // eslint-disable-line react-hooks/exhaustive-deps
  const listos = estados.filter(e => !e.listo).map(e => e.muscle.toLowerCase())
  return <div className="d-coach">
    <div className="d-card">
      <h2>Cómo van tus músculos</h2>
      <p className="d-hint left">{listos.length === estados.length ? 'Todo listo para entrenar.' : listos.length ? `Listos: ${listos.join(', ')}.` : 'Todo está recuperando. Hoy toca descanso activo: caminar o estirar.'} Cuenta lo de los últimos 7 días.</p>
      <ul className="d-recu">{estados.map(e => {
        const pct = Math.min(100, e.series / e.meta[1] * 100)
        return <li key={e.muscle} className={e.listo ? 'recuperando' : e.series < e.meta[0] ? 'falta' : 'listo'}>
          <div className="d-recu-top"><b>{e.muscle}</b><span>{e.listo ? `Recuperando · listo ${cuando(e.listo, ahora)}` : e.series < e.meta[0] ? 'Toca entrenar' : 'Listo'}</span></div>
          <div className="d-recu-bar"><span style={{ width: `${pct}%` }} /><i style={{ left: `${e.meta[0] / e.meta[1] * 100}%` }} /></div>
          <small>{e.series} series en 7 días · meta {e.meta[0]} a {e.meta[1]}{e.lastDay ? ` · última vez ${fmtDay(e.lastDay)}` : ''}</small>
        </li>
      })}</ul>
    </div>
  </div>
}
