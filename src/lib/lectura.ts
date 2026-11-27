import { makeId, type AppData, type BibleMark, type Reading, type Work } from './model'
import { addChapterMarks, describeRanges, toRanges } from './bible'
import { realReading, streak } from './progress'
import { finishReading, readingSeconds } from './readingSession'

export const TIMER_PREFIX = 'timer:'

export function readOn(data: AppData, day: string): boolean {
  return data.reading.some(r => r.day === day && realReading(r))
}

export function books(data: AppData): Work[] {
  const used = new Map<string, number>()
  data.reading.forEach(r => { if (r.workId) used.set(r.workId, Math.max(used.get(r.workId) ?? 0, r.day ? Date.parse(r.day) : 0)) })
  return data.works.filter(w => w.status !== 'done').sort((a, b) => (used.get(b.id) ?? 0) - (used.get(a.id) ?? 0))
}

export function ensureBook(data: AppData, title: string): { data: AppData; id: string | undefined } {
  const clean = title.trim().slice(0, 200)
  if (!clean) return { data, id: undefined }
  const found = data.works.find(w => w.title.toLowerCase() === clean.toLowerCase())
  if (found) return { data, id: found.id }
  const work: Work = { id: `work:${makeId()}`, title: clean, status: 'reading' }
  return { data: { ...data, works: [...data.works, work] }, id: work.id }
}

export function logReading(data: AppData, day: string, opts: { minutes: number; seconds?: number; book?: string; pageTo?: number; mode: 'manual' | 'timer' }): AppData {
  const { data: withBook, id } = ensureBook(data, opts.book ?? '')
  const minutes = Math.max(0, Math.round(opts.minutes))
  const row: Reading = {
    id: `reading:${makeId()}`, day, minutes, note: '', captureMode: opts.mode, source: 'bambu',
    ...(opts.seconds ? { seconds: Math.round(opts.seconds) } : {}), ...(id ? { workId: id } : {}), ...(opts.pageTo ? { pageTo: opts.pageTo } : {}),
  } as Reading
  const works = id && opts.pageTo ? withBook.works.map(w => w.id === id ? { ...w, currentPage: Math.max(w.currentPage ?? 0, opts.pageTo!) } : w) : withBook.works
  return { ...withBook, works, reading: [...withBook.reading, row] }
}

export function startReading(data: AppData, day: string, book: string, timerMinutes: number | null, now = Date.now()): AppData {
  return { ...data, activeReading: { id: `reading:${makeId()}`, day, startedAt: now, title: book.trim().slice(0, 300), location: '', ...(timerMinutes ? { note: `${TIMER_PREFIX}${timerMinutes}` } : {}) } }
}

export function timerOf(data: AppData): number | null {
  const note = data.activeReading?.note ?? ''
  return note.startsWith(TIMER_PREFIX) ? Number(note.slice(TIMER_PREFIX.length)) || null : null
}

export function stopReading(data: AppData, now = Date.now()): AppData {
  const s = data.activeReading
  if (!s) return data
  const done = finishReading(s, now)
  const seconds = readingSeconds(done, now)
  const next = { ...data, activeReading: null }
  if (seconds < 30) return next
  return logReading(next, s.day, { minutes: Math.max(1, Math.round(seconds / 60)), seconds, book: s.title, mode: 'timer' })
}

export type ReadingStats = { weekMinutes: number; todayMinutes: number; streak: number; best: number; recent: { day: string; minutes: number; book: string }[]; perBook: { title: string; minutes: number; page?: number }[] }
export function readingStats(data: AppData, today: string): ReadingStats {
  const monday = new Date(`${today}T12:00:00`)
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7)
  const mon = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
  const real = data.reading.filter(realReading)
  const title = (id?: string) => data.works.find(w => w.id === id)?.title ?? 'Sin libro'
  const st = streak(real.map(r => r.day), today)
  const per = new Map<string, number>()
  real.forEach(r => per.set(title(r.workId), (per.get(title(r.workId)) ?? 0) + r.minutes))
  return {
    weekMinutes: real.filter(r => r.day >= mon && r.day <= today).reduce((a, r) => a + r.minutes, 0),
    todayMinutes: real.filter(r => r.day === today).reduce((a, r) => a + r.minutes, 0),
    streak: st.current, best: st.best,
    recent: [...real].sort((a, b) => b.day.localeCompare(a.day)).slice(0, 6).map(r => ({ day: r.day, minutes: r.minutes, book: title(r.workId) })),
    perBook: [...per.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t, minutes]) => ({ title: t, minutes, page: data.works.find(w => w.title === t)?.currentPage })),
  }
}

export const BIBLIA = 'La Biblia'
/**
 * Marca capítulos de la Biblia en la última lectura de ese día (o en una nueva si no hay).
 * Con UN capítulo y versículos ("1 al 12") queda como lectura parcial: no cuenta el capítulo entero.
 */
export function markBible(data: AppData, day: string, chapters: { book: number; chapter: number }[], verses = ''): AppData {
  if (!chapters.length) return data
  const v = verses.trim().slice(0, 60)
  const partial = chapters.length === 1 && v
  const ranges = toRanges(chapters)
  const location = describeRanges(ranges) + (partial ? `, versículos ${v}` : '')
  const last = data.reading.filter(r => r.day === day).at(-1)
  const bibleWork = data.works.find(w => w.title === BIBLIA)?.id
  const target = last && !last.bible?.length && (!last.workId || last.workId === bibleWork) ? last : null
  const reading = target
    ? data.reading.map(r => r.id === target.id ? { ...r, title: BIBLIA, bible: [...(r.bible ?? []), ...ranges], location } : r)
    : [...data.reading, { id: `reading:${makeId()}`, day, minutes: 0, note: '', title: BIBLIA, bible: ranges, location, captureMode: 'manual', source: 'bambu' } as Reading]
  let bible: BibleMark[]
  if (partial) {
    const { book, chapter } = chapters[0]; const id = `${book}:${chapter}`
    const full = data.bible.some(m => m.id === id && !m.verses)
    bible = full ? data.bible : [...data.bible.filter(m => m.id !== id), { id, book, chapter, day, verses: v, source: 'bambu' }]
  } else bible = addChapterMarks(data.bible, chapters, day)
  return { ...data, reading, bible }
}
