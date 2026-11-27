import { cleanActiveReading, readingDetail, type ActiveReading, type ReadingDetail } from './readingSession'
import { normalizeTasks, provenance, type PersonalTask, type Provenance } from './personal'
import type { Anchors, DayPromise, PromiseKind } from './vara'

// ── Lectura ──────────────────────────────────────────────────────────────
export type BibleRange = { book: number; from: number; to: number }
export type Reading = Provenance & ReadingDetail & {
  id: string; day: string; minutes: number; note: string
  bible?: BibleRange[]; workId?: string; pageTo?: number
}
/** Un capítulo de la Biblia leído. id = `${book}:${chapter}` (existe una sola vez). */
export type BibleMark = { id: string; book: number; chapter: number; day: string; verses?: string; source?: string }
export type Work = {
  id: string; title: string; author?: string; totalPages?: number; currentPage?: number
  status: 'reading' | 'paused' | 'done'; startedOn?: string; finishedOn?: string
}

// ── Enfoque ──────────────────────────────────────────────────────────────
export type Micro = { id: string; text: string; minutes?: number; done: boolean }
export type Pause = { at: number; seconds: number; reason: string }
export type Focus = Provenance & {
  id: string; day: string; task: string; minutes: number; result: string; goal?: string
  level?: number; plannedMinutes?: number; startedAt?: number; endedAt?: number
  focusScore?: number; improvement?: string; blockers?: string[]; captured?: string[]
  micro?: Micro[]; openLoop?: string; resumePlan?: string; nextCue?: string
  pausedSeconds?: number; pauses?: Pause[]
}
export type ActiveFocus = {
  task: string; startedAt: number; plannedMinutes?: number; goal?: string
  pausedAt?: number; pausedMilliseconds?: number; taskId?: string; taskIds?: string[]
  level?: number; micro?: Micro[]; captured?: string[]; pauses?: Pause[]
  phase?: 'ritual' | 'active' | 'closing'; endedAt?: number; pauseReason?: string
}

// ── Entrenamiento ────────────────────────────────────────────────────────
/** Una serie. `rir` = repeticiones en reserva: 0 al fallo, 1-2 justo, 3 fácil. */
export type TrainingSet = {
  id: string; day: string; at: number; exercise: string
  reps?: number; seconds?: number; loadKg?: number; rir?: number; note?: string
}
export type Sport = 'caminar' | 'correr' | 'bici'
export type Activity = { id: string; day: string; kind: 'football' | 'rest' | 'walk' | 'other'; minutes?: number; intensity?: number; note?: string; sport?: Sport; km?: number }
export type Checkin = {
  id: string; day: string; sleepHours?: number; energy?: number; steps?: number
  soreness?: string[]; pain?: string; painNote?: string; proteinMeals?: number; realFood?: boolean
  /** La medida del día: con cuánto amaneciste (0 a 100) y cuánto diste de eso. */
  capacity?: number; given?: number; blocker?: string; reflection?: string
  /** La vara (vara.ts): promesas de la mañana, preguntas de conducta y lo que sentías. `given` sale de aquí. */
  promises?: DayPromise[]; anchors?: Anchors; felt?: number
}
export type BodyLog = { id: string; day: string; weightKg?: number; heightCm?: number; neckCm?: number; armCm?: number; waistCm?: number; photos?: boolean }
export type CustomExercise = { id: string; name: string; pattern: string; mode: 'reps' | 'seconds'; muscles: string[] }
export type ActiveWorkout = { startedAt: number; endedAt?: number; template?: string; restUntil?: number; timer?: { exercise: string; startedAt: number; rir: number; loadKg?: number } }
/** Formato viejo de entrenamiento (v2). Se conserva para no perder registros importados. */
export type Training = { id: string; day: string; kind: 'strength' | 'football' | 'recovery'; minutes?: number; note?: string; stopped?: boolean; exercise: string; sets: number; reps: number; load: string; technique: 'steady' | 'review' }

// ── Comida (nutrition.ts decide el plan; foods.ts trae las porciones) ─────
export type FoodGroup = 'proteina' | 'lacteo' | 'leguminosa' | 'cereal' | 'verdura' | 'fruta' | 'grasa' | 'dulce' | 'bebida' | 'platillo'
export type MealSlot = 'desayuno' | 'comida' | 'cena' | 'colacion'
/** Una cosa que comiste. kcal y proteína ya multiplicadas por la cantidad: el registro no depende del catálogo. */
export type MealItem = { name: string; qty: number; unit: string; kcal: number; protein: number; group: FoodGroup; foodId?: string }
export type Meal = { id: string; day: string; at: number; slot: MealSlot; items: MealItem[]; note?: string }
/** Lo que el motor necesita saber de ti. Estatura, cintura y peso viven en `body`. */
export type NutritionGoal = 'definir' | 'musculo' | 'ambos' | 'salud'
export type NutritionProfile = { sex?: 'h' | 'm'; goal?: NutritionGoal; trainingYears?: number }

// ── Hábitos y ajustes ────────────────────────────────────────────────────
export type HabitAuto = 'bible' | 'reading' | 'training' | 'focus'
export type HabitDef = { id: string; label: string; mark: string; archived?: boolean; auto?: HabitAuto; when?: 'manana' }
export type ChecklistItem = { id: string; label: string; enabled: boolean }
export type RoutineKind = 'reps' | 'seconds' | 'free'
export type RoutineItem = { id: string; name: string; kind: RoutineKind; target: number; rounds?: number; when?: 'before' | 'after'; quiet?: string; sides?: boolean }
export type Routine = { title: string; rounds: number; items: RoutineItem[] }
export type TrainPlan = { week: (Routine | null)[]; deadline: string; lock: boolean; restSeconds: number }
/** Horas de los recordatorios (HH:MM, vacío = apagado). La lógica de cuándo suenan vive en reminders.ts. */
export type Reminders = { on: boolean; checkin: string; read: string; train: string; wake: string; photos: boolean }
/** Qué partes de Bambú usa cada persona. Lo que no usa no aparece ni cuenta en misiones. */
export type Modules = { reading: boolean; bible: boolean; training: boolean; focus: boolean; food: boolean }
export const ALL_MODULES: Modules = { reading: true, bible: true, training: true, focus: true, food: true }
export function modulesOf(settings: { modules?: Modules }): Modules { return settings.modules ?? ALL_MODULES }
export type Settings = {
  modules?: Modules
  footballDays: number[]; weeklyFocusGoal: number; restSeconds: number
  /** Desde qué escalón arranca el coach a quien no tiene historial: 1 nuevo, 2 algo, 3 constante, 4 avanzado. */
  trainingLevel?: number
  leverageLabels: Record<string, string>; distractions: ChecklistItem[]; pendingCue?: string
  habits: HabitDef[]; age: number; bibleOrder: 'ruta' | 'canonico'
  sleepTarget: number; stepsTarget: number; equipment: string[]; reminders: Reminders
  nutrition?: NutritionProfile
  /** Brote sugiere un hábito nuevo cada tanto (habitCoach.ts): cuándo fue la última y cuáles dijiste que no. */
  habitSuggest?: { lastDay?: string; skipped?: string[] }
  train?: TrainPlan
  morningSetup?: boolean
  tablas?: { apodo: string; avatar: number; privada?: boolean }
  amigos?: string[]
  aprobados?: string[]
  candado?: { llave: string; desde?: number; hasta?: number; pase?: string }
  widget?: { llave: string }
  avisos?: { hora: string }
  modo?: 'competir'
  sinEdad?: boolean
  minLibres?: number
  legal?: { version: string; fecha: string; salud: boolean }
  walkDaily?: boolean
  cardioSetup?: boolean
  rutina2611?: boolean
  rondas2611?: boolean
  toques2611?: boolean
  hspu2611?: boolean
  quitar2611?: boolean
  devolver2611?: boolean
}
/** `north` es en quién te quieres convertir, con tus palabras. La reflexión de la noche te lo pregunta. */
export type Profile = { name: string; onboardingComplete: boolean; north?: string }

export type AppData = {
  version: 2; schemaRevision: 3; profile: Profile; settings: Settings
  habits: Record<string, string[]>
  reading: Reading[]; bible: BibleMark[]; works: Work[]
  focus: Focus[]; tasks: PersonalTask[]
  sets: TrainingSet[]; activities: Activity[]; checkins: Checkin[]; body: BodyLog[]; exercises: CustomExercise[]
  meals: Meal[]
  training: Training[]
  activeFocus: ActiveFocus | null; activeReading: ActiveReading | null; activeWorkout: ActiveWorkout | null
  savedAt?: number
}

export const DEFAULT_HABITS: HabitDef[] = [
  { id: 'bible', label: 'Biblia', mark: 'B', auto: 'bible' },
  { id: 'pushups', label: 'Entrenar o moverme', mark: 'E', auto: 'training' },
  { id: 'food', label: 'Comer comida real', mark: 'C' },
  { id: 'stretch', label: 'Estiramiento', mark: 'S' },
  { id: 'english', label: 'Inglés', mark: 'I' },
  { id: 'speech', label: 'Oratoria', mark: 'O' },
]

export const DEFAULT_REMINDERS: Reminders = { on: false, checkin: '07:00', read: '20:00', train: '17:30', wake: '06:30', photos: true }

export const DEFAULT_SETTINGS: Settings = {
  footballDays: [], weeklyFocusGoal: 0, restSeconds: 90,
  leverageLabels: {
    '1': 'Relleno: pendientes chicos que no mueven nada. Júntalos o suéltalos',
    '2': 'Compromisos: lo que ya le prometiste a alguien',
    '3': 'Construir: lo que mejora tus sistemas, tu escuela o tu trabajo',
    '4': 'Lo importante: lo que más cambia tu semana. Va primero',
  },
  distractions: [
    { id: 'celular', label: 'Celular en otro cuarto o en modo avión', enabled: true },
    { id: 'pestanas', label: 'Cerrar todas las pestañas menos la que necesitas', enabled: true },
    { id: 'notificaciones', label: 'Notificaciones apagadas', enabled: true },
    { id: 'agua', label: 'Agua a la mano', enabled: true },
    { id: 'aviso', label: 'Avisar en casa que estás en bloque', enabled: true },
  ],
  habits: DEFAULT_HABITS, age: 16, bibleOrder: 'ruta', sleepTarget: 9, stepsTarget: 10000,
  equipment: ['nada', 'pared'],
  reminders: DEFAULT_REMINDERS,
}

// Los respaldos antiguos sin ajustes explícitos conservan los valores con los que se crearon.
// Los perfiles nuevos usan DEFAULT_SETTINGS. No depende del nombre ni del uid.
const LEGACY_SETTINGS: Settings = {
  ...DEFAULT_SETTINGS, footballDays: [1, 2, 4], weeklyFocusGoal: 540,
  equipment: ['nada', 'pared', 'silla', 'paralelas', 'mochila', 'libros', 'toalla', 'puerta'],
  habits: [...DEFAULT_HABITS.slice(0, 2), { id: 'prospect', label: 'Prospección', mark: 'P' }, ...DEFAULT_HABITS.slice(2)],
}

export const EMPTY_DATA: AppData = {
  version: 2, schemaRevision: 3, profile: { name: '', onboardingComplete: false }, settings: DEFAULT_SETTINGS,
  habits: {}, reading: [], bible: [], works: [], focus: [], tasks: [],
  sets: [], activities: [], checkins: [], body: [], exercises: [], meals: [], training: [],
  activeFocus: null, activeReading: null, activeWorkout: null,
}

type Rec = Record<string, unknown>
export function isRecord(value: unknown): value is Rec {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
export function isDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00`)
  return Number.isFinite(date.getTime()) && dateKey(date) === value
}
export function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}
function int(value: unknown, min: number, max: number): number | undefined {
  const n = Number(value)
  return value !== undefined && value !== null && value !== '' && Number.isInteger(n) && n >= min && n <= max ? n : undefined
}
function num(value: unknown, min: number, max: number): number | undefined {
  const n = Number(value)
  return value !== undefined && value !== null && value !== '' && Number.isFinite(n) && n >= min && n <= max ? n : undefined
}
function stamp(value: unknown): number | undefined {
  return num(value, 1, 9e15)
}
/** Quita las llaves undefined para que dos objetos iguales serialicen igual. */
function compact<T extends Rec>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T
}
function texts(value: unknown, maxItems: number, maxLength: number): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const list = value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0).map(v => v.trim().slice(0, maxLength)).slice(0, maxItems)
  return list.length ? list : undefined
}
function list<T>(items: unknown, max: number, clean: (value: Rec) => T | null): T[] {
  if (!Array.isArray(items)) return []
  return items.slice(0, max).flatMap(value => {
    if (!isRecord(value)) return []
    const row = clean(value)
    return row ? [row] : []
  })
}
function idOf(value: Rec): string {
  return cleanText(value.id, 160)
}

export function cleanReadingRow(value: Rec): Reading | null {
  const id = idOf(value)
  const minutes = int(value.minutes, 0, 1440)
  if (!id || !isDay(value.day) || minutes === undefined) return null
  const bible = Array.isArray(value.bible) ? value.bible.flatMap(range => {
    if (!isRecord(range)) return []
    const book = int(range.book, 1, 73), from = int(range.from, 1, 150), to = int(range.to, 1, 150)
    return book && from && to && to >= from ? [{ book, from, to }] : []
  }).slice(0, 30) : []
  return compact({
    id, day: value.day, minutes, note: cleanText(value.note, 1000), ...provenance(value), ...readingDetail(value),
    bible: bible.length ? bible : undefined, workId: cleanText(value.workId, 160) || undefined, pageTo: int(value.pageTo, 1, 20000),
  }) as Reading
}
export function cleanBibleRow(value: Rec): BibleMark | null {
  const book = int(value.book, 1, 73), chapter = int(value.chapter, 1, 150)
  if (!book || !chapter || !isDay(value.day)) return null
  return compact({ id: `${book}:${chapter}`, book, chapter, day: value.day, verses: cleanText(value.verses, 60) || undefined, source: cleanText(value.source, 20) || undefined })
}
export function cleanWorkRow(value: Rec): Work | null {
  const id = idOf(value), title = cleanText(value.title, 200)
  if (!id || !title) return null
  const status = value.status === 'done' || value.status === 'paused' ? value.status : 'reading'
  return compact({
    id, title, status, author: cleanText(value.author, 120) || undefined, totalPages: int(value.totalPages, 1, 20000),
    currentPage: int(value.currentPage, 0, 20000), startedOn: isDay(value.startedOn) ? value.startedOn : undefined,
    finishedOn: isDay(value.finishedOn) ? value.finishedOn : undefined,
  }) as Work
}
function cleanMicro(value: unknown): Micro[] | undefined {
  if (!Array.isArray(value)) return undefined
  const rows = value.slice(0, 10).flatMap((item, index) => {
    if (!isRecord(item)) return []
    const text = cleanText(item.text, 200)
    return text ? [compact({ id: cleanText(item.id, 80) || `m${index}`, text, minutes: int(item.minutes, 1, 240), done: item.done === true })] : []
  })
  return rows.length ? rows : undefined
}
function cleanPauses(value: unknown): Pause[] | undefined {
  if (!Array.isArray(value)) return undefined
  const rows = value.slice(0, 100).flatMap(item => {
    if (!isRecord(item)) return []
    const at = stamp(item.at), seconds = int(item.seconds, 0, 86400)
    return at && seconds !== undefined ? [{ at, seconds, reason: cleanText(item.reason, 80) || 'otra' }] : []
  })
  return rows.length ? rows : undefined
}
export function cleanFocusRow(value: Rec): Focus | null {
  const id = idOf(value), task = cleanText(value.task, 300), minutes = int(value.minutes, 0, 1440)
  if (!id || !task || minutes === undefined || !isDay(value.day)) return null
  return compact({
    id, day: value.day, task, minutes, result: cleanText(value.result, 1000), goal: cleanText(value.goal, 300) || undefined,
    level: int(value.level, 1, 4), plannedMinutes: int(value.plannedMinutes, 1, 600), startedAt: stamp(value.startedAt), endedAt: stamp(value.endedAt),
    focusScore: int(value.focusScore, 1, 5), improvement: cleanText(value.improvement, 1000) || undefined,
    blockers: texts(value.blockers, 12, 60), captured: texts(value.captured, 50, 300), micro: cleanMicro(value.micro),
    openLoop: cleanText(value.openLoop, 500) || undefined, resumePlan: cleanText(value.resumePlan, 300) || undefined,
    nextCue: cleanText(value.nextCue, 300) || undefined, pausedSeconds: int(value.pausedSeconds, 0, 86400), pauses: cleanPauses(value.pauses),
    ...provenance(value),
  }) as Focus
}
export function cleanSetRow(value: Rec): TrainingSet | null {
  const id = idOf(value), exercise = cleanText(value.exercise, 80), at = stamp(value.at)
  const reps = int(value.reps, 0, 500), seconds = int(value.seconds, 0, 3600)
  if (!id || !exercise || !at || !isDay(value.day) || (reps === undefined && seconds === undefined)) return null
  return compact({ id, day: value.day, at, exercise, reps, seconds, loadKg: num(value.loadKg, 0, 300), rir: int(value.rir, 0, 5), note: cleanText(value.note, 300) || undefined })
}
export function cleanActivityRow(value: Rec): Activity | null {
  const id = idOf(value)
  const kind = (['football', 'rest', 'walk', 'other'] as const).find(k => k === value.kind)
  if (!id || !kind || !isDay(value.day)) return null
  const sport = (['caminar', 'correr', 'bici'] as const).find(k => k === value.sport)
  const km = num(value.km, 0, 500)
  return compact({ id, day: value.day, kind, minutes: int(value.minutes, 1, 1440), intensity: int(value.intensity, 1, 3), note: cleanText(value.note, 300) || undefined, sport, km: km !== undefined ? Math.round(km * 100) / 100 : undefined })
}
export function cleanCheckinRow(value: Rec): Checkin | null {
  if (!isDay(value.day)) return null
  return compact({
    id: value.day, day: value.day, sleepHours: num(value.sleepHours, 0, 16), energy: int(value.energy, 1, 5), steps: int(value.steps, 0, 100000),
    soreness: texts(value.soreness, 20, 30), pain: cleanText(value.pain, 30) || undefined, painNote: cleanText(value.painNote, 300) || undefined,
    proteinMeals: int(value.proteinMeals, 0, 8), realFood: typeof value.realFood === 'boolean' ? value.realFood : undefined,
    capacity: int(value.capacity, 0, 100), given: int(value.given, 0, 100), blocker: cleanText(value.blocker, 40) || undefined, reflection: cleanText(value.reflection, 600) || undefined,
    promises: cleanPromises(value.promises), anchors: cleanAnchors(value.anchors), felt: int(value.felt, 0, 100),
  }) as Checkin
}
const PROMISE_KINDS: PromiseKind[] = ['reading', 'training', 'focus', 'task', 'habit', 'free']
function cleanPromises(value: unknown): DayPromise[] | undefined {
  if (!Array.isArray(value)) return undefined
  const out = value.filter(isRecord).flatMap(p => {
    const kind = PROMISE_KINDS.find(k => k === p.kind)
    const id = cleanText(p.id, 80), label = cleanText(p.label, 120)
    if (!kind || !id || !label) return []
    return [compact({ id, kind, label, target: int(p.target, 1, 600), ref: cleanText(p.ref, 80) || undefined, done: p.done === true ? true : undefined }) as DayPromise]
  }).slice(0, 3)
  return out.length ? out : undefined
}
function cleanAnchors(value: unknown): Anchors | undefined {
  if (!isRecord(value)) return undefined
  const pick = (v: unknown) => typeof v === 'boolean' ? v : undefined
  const out = compact({ start: pick(value.start), escape: pick(value.escape), people: pick(value.people) }) as Anchors
  return Object.keys(out).length ? out : undefined
}
export function cleanBodyRow(value: Rec): BodyLog | null {
  if (!isDay(value.day)) return null
  return compact({
    id: value.day, day: value.day, weightKg: num(value.weightKg, 20, 250), heightCm: num(value.heightCm, 100, 230),
    neckCm: num(value.neckCm, 15, 70), armCm: num(value.armCm, 10, 70), waistCm: num(value.waistCm, 40, 200), photos: value.photos === true ? true : undefined,
  }) as BodyLog
}
const GROUPS: FoodGroup[] = ['proteina', 'lacteo', 'leguminosa', 'cereal', 'verdura', 'fruta', 'grasa', 'dulce', 'bebida', 'platillo']
const SLOTS: MealSlot[] = ['desayuno', 'comida', 'cena', 'colacion']
function cleanMealItem(value: unknown): MealItem | null {
  if (!isRecord(value)) return null
  const name = cleanText(value.name, 80), qty = num(value.qty, 0.1, 50), kcal = num(value.kcal, 0, 5000), protein = num(value.protein, 0, 300)
  if (!name || qty === undefined || kcal === undefined || protein === undefined) return null
  const group = GROUPS.includes(value.group as FoodGroup) ? value.group as FoodGroup : 'platillo'
  return compact({ name, qty, unit: cleanText(value.unit, 30) || 'porción', kcal: Math.round(kcal), protein: Math.round(protein * 10) / 10, group, foodId: cleanText(value.foodId, 60) || undefined }) as MealItem
}
export function cleanMealRow(value: Rec): Meal | null {
  const id = idOf(value)
  if (!id || !isDay(value.day) || !Array.isArray(value.items)) return null
  const items = value.items.slice(0, 40).map(cleanMealItem).filter((i): i is MealItem => !!i)
  if (!items.length) return null
  return compact({ id, day: value.day, at: stamp(value.at) ?? Date.parse(`${value.day}T12:00:00`), slot: SLOTS.includes(value.slot as MealSlot) ? value.slot as MealSlot : 'comida', items, note: cleanText(value.note, 300) || undefined }) as Meal
}
function cleanNutrition(value: unknown): NutritionProfile | undefined {
  if (!isRecord(value)) return undefined
  const goals: NutritionGoal[] = ['definir', 'musculo', 'ambos', 'salud']
  const out = compact({ sex: value.sex === 'h' || value.sex === 'm' ? value.sex : undefined, goal: goals.includes(value.goal as NutritionGoal) ? value.goal as NutritionGoal : undefined, trainingYears: num(value.trainingYears, 0, 60) }) as NutritionProfile
  return Object.keys(out).length ? out : undefined
}
function cleanHabitSuggest(value: unknown): Settings['habitSuggest'] {
  if (!isRecord(value)) return undefined
  const out = compact({ lastDay: isDay(value.lastDay) ? value.lastDay : undefined, skipped: texts(value.skipped, 60, 40) })
  return Object.keys(out).length ? out : undefined
}
export function cleanExerciseRow(value: Rec): CustomExercise | null {
  const id = idOf(value), name = cleanText(value.name, 80)
  if (!id || !name) return null
  return { id, name, pattern: cleanText(value.pattern, 30) || 'otro', mode: value.mode === 'seconds' ? 'seconds' : 'reps', muscles: texts(value.muscles, 6, 30) ?? [] }
}
function cleanLegacyTraining(value: Rec): Training | null {
  const id = idOf(value)
  if (!id || !isDay(value.day)) return null
  if (value.kind !== 'strength' && value.kind !== 'football' && value.kind !== 'recovery') return null
  return {
    id, day: value.day, kind: value.kind, exercise: cleanText(value.exercise, 80) || 'Actividad', sets: int(value.sets, 0, 20) ?? 0, reps: int(value.reps, 0, 200) ?? 0,
    load: cleanText(value.load, 80), note: cleanText(value.note, 1000), stopped: value.stopped === true, technique: value.technique === 'steady' ? 'steady' : 'review',
    ...(int(value.minutes, 1, 1440) ? { minutes: int(value.minutes, 1, 1440) } : {}),
  }
}
export function cleanActiveFocus(value: unknown): ActiveFocus | null {
  if (!isRecord(value)) return null
  const task = cleanText(value.task, 300), startedAt = stamp(value.startedAt)
  if (!task || !startedAt) return null
  const phase = (['ritual', 'active', 'closing'] as const).find(p => p === value.phase)
  return compact({
    task, startedAt, plannedMinutes: int(value.plannedMinutes, 1, 600), goal: cleanText(value.goal, 300) || undefined,
    pausedAt: stamp(value.pausedAt), pausedMilliseconds: num(value.pausedMilliseconds, 0, 9e12), taskId: cleanText(value.taskId, 160) || undefined, taskIds: texts(value.taskIds, 12, 160),
    level: int(value.level, 1, 4), micro: cleanMicro(value.micro), captured: texts(value.captured, 50, 300), pauses: cleanPauses(value.pauses),
    phase, endedAt: stamp(value.endedAt), pauseReason: cleanText(value.pauseReason, 80) || undefined,
  }) as ActiveFocus
}
export function cleanActiveWorkout(value: unknown): ActiveWorkout | null {
  if (!isRecord(value)) return null
  const startedAt = stamp(value.startedAt)
  if (!startedAt) return null
  return compact({ startedAt, endedAt: stamp(value.endedAt), template: cleanText(value.template, 30) || undefined, restUntil: stamp(value.restUntil), timer: isRecord(value.timer) && cleanText(value.timer.exercise, 160) && stamp(value.timer.startedAt) ? compact({ exercise: cleanText(value.timer.exercise, 160), startedAt: stamp(value.timer.startedAt)!, rir: int(value.timer.rir, 0, 3) ?? 1, loadKg: num(value.timer.loadKg, 0, 60) }) : undefined })
}
function cleanChecklist(value: unknown, fallback: ChecklistItem[]): ChecklistItem[] {
  if (!Array.isArray(value)) return fallback
  const rows = value.slice(0, 20).flatMap(item => isRecord(item) && cleanText(item.label, 120)
    ? [{ id: cleanText(item.id, 40) || cleanText(item.label, 40), label: cleanText(item.label, 120), enabled: item.enabled !== false }] : [])
  return rows.length ? rows : fallback
}
function cleanHabitDefs(value: unknown): HabitDef[] {
  if (!Array.isArray(value)) return DEFAULT_HABITS
  const seen = new Set<string>()
  const rows = value.slice(0, 30).flatMap(item => {
    if (!isRecord(item)) return []
    const id = cleanText(item.id, 40), label = cleanText(item.label, 60)
    if (!id || !label || seen.has(id)) return []
    seen.add(id)
    const auto = (['bible', 'reading', 'training', 'focus'] as const).find(a => a === item.auto)
    return [compact({ id, label, mark: cleanText(item.mark, 2) || label.charAt(0).toUpperCase(), archived: item.archived === true ? true : undefined, auto, when: item.when === 'manana' ? 'manana' as const : undefined })]
  })
  // Una lista vacía es válida (quien no quiere hábitos); solo se repone si había datos y ninguno servía.
  return rows.length || value.length === 0 ? rows : DEFAULT_HABITS
}
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
const clock = (value: unknown, fallback: string) => typeof value === 'string' && (value === '' || HHMM.test(value)) ? value : fallback
export function cleanReminders(value: unknown): Reminders {
  const v = isRecord(value) ? value : {}
  const d = DEFAULT_REMINDERS
  return {
    on: v.on === true, checkin: clock(v.checkin, d.checkin), read: clock(v.read, d.read), train: clock(v.train, d.train),
    wake: clock(v.wake, d.wake) || d.wake, photos: v.photos !== false,
  }
}
function cleanRoutineItem(value: unknown, i: number): RoutineItem | null {
  if (!isRecord(value)) return null
  const name = cleanText(value.name, 80)
  if (!name) return null
  const kind = (['reps', 'seconds', 'free'] as const).find(k => k === value.kind) ?? 'reps'
  const when = value.when === 'before' || value.when === 'after' ? value.when : undefined
  return compact({ id: cleanText(value.id, 40) || `i${i}`, name, kind, target: int(value.target, 0, 3600) ?? 0, rounds: int(value.rounds, 1, 10), when, quiet: isDay(value.quiet) ? value.quiet : undefined, sides: value.sides === true ? true : undefined }) as RoutineItem
}
function cleanRoutine(value: unknown): Routine | null {
  if (!isRecord(value) || !Array.isArray(value.items)) return null
  const items = value.items.slice(0, 40).flatMap((item, i) => { const row = cleanRoutineItem(item, i); return row ? [row] : [] })
  return { title: cleanText(value.title, 80) || 'Rutina', rounds: int(value.rounds, 1, 10) ?? 3, items }
}
export function cleanTrain(value: unknown): TrainPlan | undefined {
  if (!isRecord(value) || !Array.isArray(value.week)) return undefined
  const week = Array.from({ length: 7 }, (_, i) => cleanRoutine((value.week as unknown[])[i]))
  return { week, deadline: clock(value.deadline, '19:00') || '19:00', lock: value.lock !== false, restSeconds: int(value.restSeconds, 0, 600) ?? 60 }
}
function cleanAmigos(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const ids = [...new Set(value.filter((x): x is string => typeof x === 'string' && /^[A-Za-z0-9]{6,128}$/.test(x)))].slice(0, 200)
  return ids.length ? ids : undefined
}
function cleanCandado(value: unknown): Settings['candado'] {
  if (!isRecord(value) || typeof value.llave !== 'string' || !/^[A-Za-z0-9]{16,40}$/.test(value.llave)) return undefined
  const ms = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0 && v < 8.64e15 ? Math.round(v) : undefined
  const desde = ms(value.desde), hasta = ms(value.hasta)
  const pase = typeof value.pase === 'string' && /^(pase|emergencia):[A-Za-z0-9-]{1,60}$/.test(value.pase) ? value.pase : undefined
  return { llave: value.llave, ...(desde ? { desde } : {}), ...(hasta ? { hasta } : {}), ...(pase ? { pase } : {}) }
}
function cleanAvisos(value: unknown): Settings['avisos'] {
  return isRecord(value) && typeof value.hora === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value.hora) ? { hora: value.hora } : undefined
}
function cleanTablas(value: unknown): Settings['tablas'] {
  if (!isRecord(value)) return undefined
  const apodo = cleanText(value.apodo, 24)
  return apodo ? { apodo, avatar: int(value.avatar, 0, 9) ?? 0, ...(typeof value.privada === 'boolean' ? { privada: value.privada } : {}) } : undefined
}
export function cleanSettings(value: unknown): Settings {
  const v = isRecord(value) ? value : {}
  const labels = isRecord(v.leverageLabels) ? v.leverageLabels : {}
  const m = isRecord(v.modules) ? v.modules : null
  return compact({
    modules: m ? { reading: m.reading !== false, bible: m.bible !== false, training: m.training !== false, focus: m.focus !== false, food: m.food !== false } : undefined,
    footballDays: Array.isArray(v.footballDays) ? [...new Set(v.footballDays.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))].sort() : DEFAULT_SETTINGS.footballDays,
    weeklyFocusGoal: int(v.weeklyFocusGoal, 0, 10080) ?? DEFAULT_SETTINGS.weeklyFocusGoal,
    restSeconds: int(v.restSeconds, 15, 600) ?? DEFAULT_SETTINGS.restSeconds,
    leverageLabels: Object.fromEntries(['1', '2', '3', '4'].map(k => [k, cleanText(labels[k], 160) || DEFAULT_SETTINGS.leverageLabels[k]])),
    distractions: cleanChecklist(v.distractions, DEFAULT_SETTINGS.distractions),
    pendingCue: cleanText(v.pendingCue, 300) || undefined,
    habits: cleanHabitDefs(v.habits),
    age: int(v.age, 8, 99) ?? DEFAULT_SETTINGS.age,
    trainingLevel: int(v.trainingLevel, 1, 4) ?? undefined,
    bibleOrder: v.bibleOrder === 'canonico' ? 'canonico' : 'ruta',
    sleepTarget: num(v.sleepTarget, 6, 12) ?? DEFAULT_SETTINGS.sleepTarget,
    stepsTarget: int(v.stepsTarget, 1000, 40000) ?? DEFAULT_SETTINGS.stepsTarget,
    equipment: texts(v.equipment, 20, 20) ?? DEFAULT_SETTINGS.equipment,
    reminders: cleanReminders(v.reminders),
    nutrition: cleanNutrition(v.nutrition),
    habitSuggest: cleanHabitSuggest(v.habitSuggest),
    train: cleanTrain(v.train),
    morningSetup: v.morningSetup === true ? true : undefined,
    walkDaily: v.walkDaily === true ? true : undefined,
    cardioSetup: v.cardioSetup === true ? true : undefined,
    rutina2611: v.rutina2611 === true ? true : undefined,
    rondas2611: v.rondas2611 === true ? true : undefined,
    toques2611: v.toques2611 === true ? true : undefined,
    hspu2611: v.hspu2611 === true ? true : undefined,
    quitar2611: v.quitar2611 === true ? true : undefined,
    devolver2611: v.devolver2611 === true ? true : undefined,
    tablas: cleanTablas(v.tablas),
    amigos: cleanAmigos(v.amigos),
    aprobados: cleanAmigos(v.aprobados),
    candado: cleanCandado(v.candado),
    widget: cleanCandado(v.widget),
    avisos: cleanAvisos(v.avisos),
    modo: v.modo === 'competir' ? 'competir' as const : undefined,
    sinEdad: v.sinEdad === true ? true : undefined,
    minLibres: int(v.minLibres, 0, 240),
    legal: isRecord(v.legal) && typeof v.legal.version === 'string' && /^\d{4}-\d\d-\d\d$/.test(v.legal.version) && typeof v.legal.fecha === 'string' && v.legal.fecha.length <= 40 ? { version: v.legal.version, fecha: v.legal.fecha, salud: v.legal.salud === true } : undefined,
  }) as Settings
}
export function cleanHabitDays(value: unknown): Record<string, string[]> {
  if (!isRecord(value)) return {}
  return Object.fromEntries(Object.entries(value).filter(([day, ids]) => isDay(day) && Array.isArray(ids)).slice(0, 10000)
    .map(([day, ids]) => [day, [...new Set((ids as unknown[]).filter((id): id is string => typeof id === 'string' && id.length <= 40))].slice(0, 30)]))
}
function dedupe<T extends { id: string }>(rows: T[]): T[] {
  return [...new Map(rows.map(row => [row.id, row])).values()]
}

export function normalizeData(value: unknown): AppData {
  if (!isRecord(value)) return { ...EMPTY_DATA }
  if (value.version !== undefined && value.version !== 2) throw new Error('La versión de los datos de bambu no es compatible.')
  const profile = isRecord(value.profile) ? value.profile : {}
  // Solo los formatos anteriores con actividad real requieren los defaults históricos.
  const historical = value.schemaRevision === undefined && ['reading', 'focus', 'training'].some(key => Array.isArray(value[key]) && value[key].length > 0)
  const settings = historical ? { ...LEGACY_SETTINGS, ...(isRecord(value.settings) ? value.settings : {}) } : value.settings
  return {
    version: 2, schemaRevision: 3,
    profile: { name: cleanText(profile.name, 40), onboardingComplete: profile.onboardingComplete === true, north: cleanText(profile.north, 140) || undefined },
    settings: cleanSettings(settings),
    habits: cleanHabitDays(value.habits),
    reading: dedupe(list(value.reading, 20000, cleanReadingRow)),
    bible: dedupe(list(value.bible, 2000, cleanBibleRow)),
    works: dedupe(list(value.works, 500, cleanWorkRow)),
    focus: dedupe(list(value.focus, 20000, cleanFocusRow)),
    tasks: dedupe(normalizeTasks(value.tasks)),
    sets: dedupe(list(value.sets, 100000, cleanSetRow)),
    activities: dedupe(list(value.activities, 20000, cleanActivityRow)),
    checkins: dedupe(list(value.checkins, 20000, cleanCheckinRow)),
    body: dedupe(list(value.body, 20000, cleanBodyRow)),
    exercises: dedupe(list(value.exercises, 300, cleanExerciseRow)),
    meals: dedupe(list(value.meals, 50000, cleanMealRow)),
    training: dedupe(list(value.training, 10000, cleanLegacyTraining)),
    activeFocus: cleanActiveFocus(value.activeFocus),
    activeReading: cleanActiveReading(value.activeReading),
    activeWorkout: cleanActiveWorkout(value.activeWorkout),
    savedAt: typeof value.savedAt === 'number' ? value.savedAt : 0,
  }
}

export function dateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}
export function activeHabits(settings: Settings): HabitDef[] {
  return settings.habits.filter(h => !h.archived)
}
