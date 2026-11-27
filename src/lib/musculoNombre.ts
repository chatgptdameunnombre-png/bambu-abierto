import type { Muscle } from './musculos'

const GUESS: [RegExp, Muscle][] = [
  [/handstand|pike|hombro|parado de cabeza|planche/, 'Hombros'],
  [/lagartij|push|fondo|pecho/, 'Pecho'],
  [/domin|chin|pull|remo|australian|lever|muscle up|espalda|toalla/, 'Espalda'],
  [/sentadill|squat|desplante|zancada|talon|gluteo|wall sit|puente|pierna|nordic/, 'Piernas'],
  [/abs|abdom|plancha|hollow|russian|crunch|l sit|dragon|v-up|toes/, 'Abdomen'],
  [/bicep|tricep|curl|brazo|antebrazo|colgar/, 'Brazos'],
]
export const sinAcentos = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function musculoDeNombre(name: string): Muscle | null {
  const n = sinAcentos(name)
  return GUESS.find(([re]) => re.test(n))?.[1] ?? null
}
