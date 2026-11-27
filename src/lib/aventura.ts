import { makeId, type AppData, type TrainingSet } from './model'
import { exerciseList } from './libre'

export type Scene = 'noche' | 'ciudad' | 'pantalla' | 'bosque' | 'volcan' | 'tormenta' | 'nieve' | 'fiesta' | 'mazmorra'
export type Extra = 'gorro' | 'antenas' | 'alas' | 'dragon' | 'corona' | 'zzz' | 'sombrero' | 'none'
export type Monster = { id: number; name: string; title: string; hp: number; weak: string; color: string; horns: number; eyes: number; xp: number; scene: Scene; extra: Extra }
export const TAG = 'aventura:'

export const MONSTERS: Monster[] = [
  { id: 0, name: 'Letargo', title: 'Guardián del sueño pesado', hp: 40, weak: 'Piernas', color: 'm0', horns: 0, eyes: 2, xp: 20, scene: 'noche', extra: 'gorro' },
  { id: 1, name: 'Inercia', title: 'El trono que no te deja levantarte', hp: 60, weak: 'Pecho', color: 'm1', horns: 2, eyes: 1, xp: 25, scene: 'ciudad', extra: 'none' },
  { id: 2, name: 'Abismo', title: 'Devora tus horas en la pantalla', hp: 80, weak: 'Abdomen', color: 'm2', horns: 0, eyes: 3, xp: 30, scene: 'pantalla', extra: 'antenas' },
  { id: 3, name: 'Pretexto', title: 'Susurra "mañana empiezo"', hp: 100, weak: 'Hombros', color: 'm3', horns: 0, eyes: 2, xp: 35, scene: 'bosque', extra: 'alas' },
  { id: 4, name: 'Sopor', title: 'Señor de la alarma pospuesta', hp: 125, weak: 'Espalda', color: 'm4', horns: 2, eyes: 2, xp: 40, scene: 'noche', extra: 'zzz' },
  { id: 5, name: 'Gula', title: 'Coloso de la comida chatarra', hp: 150, weak: 'Piernas', color: 'm5', horns: 1, eyes: 1, xp: 45, scene: 'ciudad', extra: 'none' },
  { id: 6, name: 'Estruendo', title: 'Soberano de las notificaciones', hp: 180, weak: 'Cardio', color: 'm6', horns: 0, eyes: 2, xp: 50, scene: 'pantalla', extra: 'corona' },
  { id: 7, name: 'Insomnia', title: 'Hechicera de la madrugada', hp: 210, weak: 'Abdomen', color: 'm7', horns: 0, eyes: 3, xp: 55, scene: 'bosque', extra: 'sombrero' },
  { id: 8, name: 'Desidia', title: 'Dragón que apaga tu fuego', hp: 250, weak: 'Pecho', color: 'm8', horns: 2, eyes: 2, xp: 60, scene: 'volcan', extra: 'dragon' },
  { id: 9, name: 'El Postergador', title: 'Jefe final: todo para después', hp: 300, weak: 'Espalda', color: 'm9', horns: 0, eyes: 1, xp: 75, scene: 'tormenta', extra: 'corona' },
]

export const dodgeChance = (index: number) => Math.round((0.1 + 0.02 * index) * 100) / 100
export function rollDodge(index: number, dmg: number, rnd: () => number = Math.random): number {
  if (dmg <= 0 || rnd() >= dodgeChance(index)) return 0
  return Math.min(dmg, Math.max(1, Math.round(dmg * (0.1 + rnd() * 0.15))))
}
function parseNote(note: string, prefix = TAG): { monster: number; dodged: number } {
  const m = /^(\d+)(?:~(\d+))?$/.exec(note.slice(prefix.length))
  return m ? { monster: Number(m[1]), dodged: Number(m[2] ?? 0) } : { monster: -1, dodged: 0 }
}
export function noteOf(prefix: string, monster: number, dodged = 0): string {
  return `${prefix}${monster}${dodged > 0 ? `~${Math.round(dodged)}` : ''}`
}

export function groupOf(data: AppData, name: string): string {
  return exerciseList(data).find(e => e.name === name)?.group ?? 'Míos'
}

export function damage(set: Pick<TrainingSet, 'reps' | 'seconds'>, weak: boolean): number {
  const base = set.seconds !== undefined ? Math.floor(set.seconds / 2) : set.reps ?? 0
  return base * (weak ? 2 : 1)
}

export type Battle = { monster: Monster; dealt: number; dodged: number; defeatedDay: string | null }
export function track(data: AppData, monsters: Monster[], prefix: string): { battles: Battle[]; current: number } {
  const groups = new Map(exerciseList(data).map(e => [e.name, e.group]))
  const battles: Battle[] = monsters.map(m => ({ monster: m, dealt: 0, dodged: 0, defeatedDay: null }))
  const sets = data.sets.filter(s => s.note?.startsWith(prefix)).sort((a, b) => a.at - b.at)
  for (const s of sets) {
    const { monster, dodged } = parseNote(s.note!, prefix)
    const b = battles[monster]
    if (!b || b.defeatedDay) continue
    b.dealt += Math.max(0, damage(s, (groups.get(s.exercise) ?? 'Míos') === b.monster.weak) - dodged)
    b.dodged += dodged
    if (b.dealt >= b.monster.hp) b.defeatedDay = s.day
  }
  const current = battles.findIndex(b => !b.defeatedDay)
  return { battles, current: current < 0 ? battles.length : current }
}
export function adventure(data: AppData): { battles: Battle[]; current: number } {
  return track(data, MONSTERS, TAG)
}

export function strikeSet(data: AppData, day: string, note: string, exercise: string, kind: 'reps' | 'seconds', value: number, now = Date.now()): AppData {
  const set: TrainingSet = kind === 'seconds'
    ? { id: makeId(), day, at: now, exercise, seconds: Math.max(0, Math.round(value)), note }
    : { id: makeId(), day, at: now, exercise, reps: Math.max(0, Math.round(value)), note }
  return { ...data, sets: [...data.sets, set], activeWorkout: data.activeWorkout && !data.activeWorkout.endedAt ? data.activeWorkout : { startedAt: now } }
}

export function attack(data: AppData, day: string, monster: number, exercise: string, kind: 'reps' | 'seconds', value: number, now = Date.now(), dodged = 0): AppData {
  return strikeSet(data, day, noteOf(TAG, monster, dodged), exercise, kind, value, now)
}

export function adventureXpOn(data: AppData, day: string): number {
  return adventure(data).battles.filter(b => b.defeatedDay === day).reduce((a, b) => a + b.monster.xp, 0)
}
