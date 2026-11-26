import { dateKey, makeId } from './model'
import type { ActiveReading } from './readingSession'

export function freshReading(): ActiveReading {
  return { id: `reading:${makeId()}`, day: dateKey(), startedAt: Date.now(), title: '', location: '' }
}
