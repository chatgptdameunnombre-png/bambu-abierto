const CLAVE = 'bambu.recarga'
const ESPERA = 60_000
const FALTA = /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload|Failed to fetch/i

export function faltaArchivo(error: unknown): boolean {
  const texto = error instanceof Error ? `${error.name} ${error.message}` : String(error)
  return FALTA.test(texto)
}

export function recargarPorVersion(ahora = Date.now(), forzar = false): boolean {
  if (!forzar && typeof navigator !== 'undefined' && navigator.onLine === false) return false
  let antes = 0
  try { antes = Number(sessionStorage.getItem(CLAVE)) || 0 } catch { if (!forzar) return false }
  if (!forzar && ahora - antes < ESPERA) return false
  try { sessionStorage.setItem(CLAVE, String(ahora)) } catch { if (!forzar) return false }
  const url = new URL(window.location.href)
  url.searchParams.set('v', ahora.toString(36))
  window.location.replace(url.href)
  return true
}

export function siFaltaArchivo<T>(error: unknown): Promise<T> {
  if (faltaArchivo(error) && recargarPorVersion()) return new Promise<T>(() => {})
  return Promise.reject(error)
}

export function quitarMarcaVersion() {
  try {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('v')) return
    url.searchParams.delete('v')
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
  } catch { return }
}
