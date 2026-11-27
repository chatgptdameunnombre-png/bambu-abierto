/** Fotos de las comidas. Igual que las de progreso, viven solo en este teléfono (IndexedDB). */
import { compress } from './photos'

const BASE = 'bambu-fotos-comida'
const STORE = 'fotos'
type Foto = { id: string; blob: Blob; at: number }

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BASE, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('No se pudo abrir las fotos de comida'))
  })
}
async function correr<T>(modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir()
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, modo).objectStore(STORE))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error ?? new Error('Fallo en las fotos de comida'))
    })
  } finally { db.close() }
}

export async function prepararFoto(archivo: Blob): Promise<Blob> {
  return (await compress(archivo, 900)).blob
}
export async function guardarFotoComida(mealId: string, blob: Blob): Promise<void> {
  await correr('readwrite', s => s.put({ id: mealId, blob, at: Date.now() } satisfies Foto))
}
export async function fotoComida(mealId: string): Promise<Blob | null> {
  const f = await correr<Foto | undefined>('readonly', s => s.get(mealId))
  return f?.blob ?? null
}
export async function borrarFotoComida(mealId: string): Promise<void> {
  await correr('readwrite', s => s.delete(mealId))
}
