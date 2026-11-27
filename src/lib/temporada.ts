import type { AppData } from './model'
import { noteOf, strikeSet, track, type Battle, type Extra, type Monster, type Scene } from './aventura'

export const SEASON_TAG = 'temporada:'
type Def = { name: string; scene: Scene; monsters: [string, string, string, Extra][] }
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DEFS: Def[] = [
  { name: 'Cuesta de enero', scene: 'nieve', monsters: [['El Juramento Roto', 'Promete y no cumple', 'Piernas', 'none'], ['Espectro del Gimnasio', 'Tu membresía sin usar', 'Espalda', 'gorro'], ['Coloso de Azúcar', 'Lo que sobró de las fiestas', 'Abdomen', 'none'], ['Señor de la Cuesta', 'Jefe: la subida más larga', 'Cardio', 'corona']] },
  { name: 'Corazones flojos', scene: 'ciudad', monsters: [['El Derretido', 'Se funde en el sillón', 'Pecho', 'none'], ['Arquero del Sopor', 'Dispara flechas de siesta', 'Hombros', 'alas'], ['El Trovador', 'Te canta para que no te levantes', 'Piernas', 'sombrero'], ['Reina del Antojo', 'Jefe: antojo sin fin', 'Abdomen', 'corona']] },
  { name: 'Jacarandas', scene: 'bosque', monsters: [['Nube de Polen', 'Te nubla las ganas', 'Cardio', 'antenas'], ['Reina Zumbadora', 'Zumba "cinco minutos más"', 'Hombros', 'alas'], ['El Alérgico', 'Un estornudo y se acabó el día', 'Pecho', 'none'], ['Guardián Morado', 'Jefe: florece en tu sillón', 'Espalda', 'corona']] },
  { name: 'Vacaciones eternas', scene: 'fiesta', monsters: [['El Columpio Eterno', 'Se mece todo el día', 'Abdomen', 'none'], ['El Náufrago', 'Nunca se hunde, nunca se mueve', 'Piernas', 'none'], ['Lodo Solar', 'Te pega al camastro', 'Pecho', 'gorro'], ['Rey del Puente', 'Jefe: vacaciones sin fin', 'Espalda', 'corona']] },
  { name: 'Calor del demonio', scene: 'volcan', monsters: [['Sol Abrasador', 'Derrite tus ganas', 'Cardio', 'none'], ['El Escarchado', 'Frío por fuera, flojo por dentro', 'Pecho', 'antenas'], ['Viento Caliente', 'Sopla flojera', 'Hombros', 'alas'], ['Señor del Bochorno', 'Jefe: 35 grados de pereza', 'Piernas', 'corona']] },
  { name: 'Temporal', scene: 'tormenta', monsters: [['El Pantano', 'Te moja los tenis', 'Piernas', 'none'], ['El Pretexto Gris', 'Excusa perfecta para no salir', 'Espalda', 'antenas'], ['Trueno Lento', 'Ruge y se vuelve a dormir', 'Abdomen', 'zzz'], ['Diluvio Tapatío', 'Jefe: inunda Guadalajara', 'Cardio', 'corona']] },
  { name: 'Maratón de series', scene: 'pantalla', monsters: [['El Siguiente', 'Empieza en 5, 4, 3...', 'Pecho', 'antenas'], ['El Extraviado', 'Nunca lo encuentras', 'Abdomen', 'none'], ['La Señal Muerta', 'Carga tu flojera', 'Hombros', 'antenas'], ['Kraken de la Pantalla', 'Jefe: diez temporadas seguidas', 'Espalda', 'corona']] },
  { name: 'Regreso a clases', scene: 'ciudad', monsters: [['El Fardo', 'Pesa como tu flojera', 'Espalda', 'none'], ['El Ansioso', 'Mucho estrés, cero movimiento', 'Hombros', 'antenas'], ['Tarea Sin Fin', 'Nunca se termina', 'Piernas', 'gorro'], ['El Lunes Eterno', 'Jefe: no se acaba nunca', 'Abdomen', 'corona']] },
  { name: 'Mes patrio', scene: 'fiesta', monsters: [['Caldero Hondo', 'Plato hondo de siesta', 'Abdomen', 'none'], ['El Crujiente', 'Mucho ruido, cero movimiento', 'Pecho', 'antenas'], ['El Cohete Mudo', 'Hace ruido y no despega', 'Cardio', 'none'], ['Caudillo del Antojo', 'Jefe: grito de flojera', 'Piernas', 'sombrero']] },
  { name: 'Noche de miedo', scene: 'bosque', monsters: [['Calabaza Hueca', 'Hueca por dentro', 'Piernas', 'none'], ['El Amortajado', 'No sale de la cama', 'Espalda', 'none'], ['Murciélago Nocturno', 'Vuela de video en video', 'Hombros', 'alas'], ['La Momia', 'Jefe: vendada de desvelo', 'Abdomen', 'corona']] },
  { name: 'Día de Muertos', scene: 'fiesta', monsters: [['La Calavera', 'Ni para el verso se levanta', 'Piernas', 'none'], ['Ofrenda de Azúcar', 'Azúcar y siesta', 'Abdomen', 'gorro'], ['El Catrín', 'Elegante y acostado', 'Hombros', 'sombrero'], ['Señor de la Ofrenda', 'Jefe: se come tu energía', 'Espalda', 'corona']] },
  { name: 'Posadas sin fin', scene: 'nieve', monsters: [['El Envuelto', 'Envuelto en hoja de flojera', 'Abdomen', 'none'], ['Caldero de Ponche', 'Te calienta para no salir', 'Cardio', 'antenas'], ['La Piñata de Hierro', 'No se rompe ni a palos', 'Pecho', 'gorro'], ['El Recalentado', 'Jefe: sobras hasta enero', 'Espalda', 'corona']] },
]
const HP = [60, 90, 120, 180]
const XP = [30, 30, 30, 80]
export const SEASON_DODGE = [1, 3, 5, 8]

export type Season = { id: string; name: string; month: string; year: string; scene: Scene; monsters: Monster[] }
export function seasonInfo(id: string): Season {
  const [year, mm] = id.split('-')
  const m = Number(mm) - 1
  const def = DEFS[m]
  return {
    id, name: def.name, month: MONTHS[m], year, scene: def.scene,
    monsters: def.monsters.map(([name, title, weak, extra], k) => ({ id: 100 + m * 10 + k, name, title, weak, extra, hp: HP[k], xp: XP[k], scene: def.scene, color: `m${(m * 3 + k * 2) % 10}`, horns: k === 3 ? 2 : extra === 'none' ? k % 2 : 0, eyes: [2, 1, 3, 2][k] })),
  }
}
export const seasonIdOf = (day: string) => day.slice(0, 7)
export function daysLeft(day: string): number {
  const d = new Date(`${day}T12:00:00`)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate() + 1
}

export type SeasonState = Season & { battles: Battle[]; current: number; daysLeft: number; done: boolean }
export function season(data: AppData, day: string, id = seasonIdOf(day)): SeasonState {
  const info = seasonInfo(id)
  const t = track(data, info.monsters, `${SEASON_TAG}${id}:`)
  return { ...info, ...t, daysLeft: id === seasonIdOf(day) ? daysLeft(day) : 0, done: t.current >= info.monsters.length }
}
export function seasonAttack(data: AppData, day: string, index: number, exercise: string, kind: 'reps' | 'seconds', value: number, now = Date.now(), dodged = 0): AppData {
  return strikeSet(data, day, noteOf(`${SEASON_TAG}${seasonIdOf(day)}:`, index, dodged), exercise, kind, value, now)
}
export function seasonsPlayed(data: AppData): string[] {
  return [...new Set(data.sets.filter(s => s.note?.startsWith(SEASON_TAG)).map(s => s.note!.slice(SEASON_TAG.length, SEASON_TAG.length + 7)))].filter(id => /^\d{4}-\d{2}$/.test(id)).sort()
}
export function seasonXpOn(data: AppData, day: string): number {
  return season(data, day).battles.filter(b => b.defeatedDay === day).reduce((a, b) => a + b.monster.xp, 0)
}
