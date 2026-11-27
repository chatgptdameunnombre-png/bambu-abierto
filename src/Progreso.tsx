import type { AppData } from './lib/model'
import { PesoCard } from './TrainingPage'
import { PhotoLab } from './PhotoLab'

type Commit = (update: (d: AppData) => AppData) => void
type Msg = (text: string, undo?: () => void) => void

export function Progreso({ data, commit, onMessage }: { data: AppData; commit: Commit; onMessage: Msg }) {
  return <div className="d-coach">
    <PesoCard data={data} commit={commit} onMessage={onMessage} />
    <PhotoLab data={data} commit={commit} onMessage={onMessage} />
  </div>
}
