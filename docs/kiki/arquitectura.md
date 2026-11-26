# Arquitectura

React 19 + Vite 8 + TypeScript, sin backend propio: Firebase Auth y Firestore por REST desde el navegador. La app es una PWA publicada como archivos estáticos en GitHub Pages.

## Cómo viajan los datos

1. Todo se guarda primero en el teléfono (IndexedDB `bambu-local`, con espejo en `localStorage`).
2. Con cuenta, cada cambio es un registro en `bambu/{uid}/registros` y se sincroniza por cursor (sube lo pendiente, baja lo nuevo).
3. Lo social (perfil, directorio, solicitudes, duelos) y lo que leen otros (pase del candado, widget, avisos) va en colecciones aparte. Ver [nube-y-reglas.md](nube-y-reglas.md).

## Archivos de la versión de Kiki (`src/`)

### Pantallas

| Archivo | Qué es |
|---|---|
| `App.tsx` | Navegación, módulos, modo (hábitos o competir), enlaces `?ir=`, sincronización, publicación del perfil y del estado (widget y avisos). |
| `Onboarding.tsx` | Preguntas al crear cuenta: nombre, modo, zonas, objetivos y plantar el bambú. |
| `HoyLista.tsx` | Pantalla Hoy. |
| `MiRutina.tsx` | Entrenar: barra de 5 pestañas y la rutina del día. |
| `Libre.tsx` | Libre: romper récord, reto semanal, buscador y registro de series. |
| `Candado.tsx` | Redes (`RedesPage`), botón y envoltura de la cámara, pantalla del candado y su configuración. |
| `CamaraReps.tsx` | Pantalla de la cámara: MediaPipe, voz, medidor, modo duelo (60 s), meta y circuito (Cindy). |
| `Duelos.tsx` | Tarjeta y pestaña de duelos. |
| `Aventura.tsx`, `Jefe.tsx` | Monstruos, temporada, mazmorra y jefes. |
| `Jardin.tsx` | Jardín, estadísticas y **Tu semana**. |
| `Amigos.tsx`, `Tablas.tsx`, `useSocial.ts` | Amigos, perfiles, liga y solicitudes. |
| `Widget.tsx` | Tarjetas de widget y avisos en Ajustes y el envío del estado. |
| `AjustesSimple.tsx` | Ajustes (Qué usas, candado, avisos, widget, cuenta). |
| `ShareCard.tsx` | Imágenes para compartir (semana). |
| `DuoIcons.tsx`, `duo.css`, `tokens.css` | Íconos, estilos y colores (todos los colores en `tokens.css`). |

### Lógica (`src/lib/`)

| Archivo | Qué es |
|---|---|
| `conteo.ts` | Familias de ejercicios, medición de posturas, conteo de repeticiones y aguantes, modo general. |
| `minutos.ts` | Tasas de minutos, saldo, pases, llave del candado, `conCamara` (nota `camara` o `redes`). |
| `libre.ts` | Récords, reto semanal, notas de cámara. |
| `duelos.ts` | Estados del duelo y reloj 3-2-1 + 60 s. |
| `wod.ts` | Cindy: partes, rondas y puntaje. |
| `semana.ts` | Resumen semanal. |
| `widget.ts` | Datos del widget, estado para avisos y el script de Scriptable. |
| `avisos.ts` | Permiso, service worker `avisos-sw.js` y suscripción push. |
| `modo.ts` | Modo hábitos o solo competir: qué pestañas se esconden y dónde se entra. |
| `firebase.ts` | Cuenta (correo y Google), sincronización y todas las colecciones. |
| `nubeFormato.ts` | Conversión de datos de Firestore y mensajes de error en español. |
| `perfil.ts`, `xp.ts`, `jardin.ts`, `rutina.ts`, `model.ts` | Perfil social, XP y niveles, jardín, rutina y modelo de datos. |

### Otros

| Archivo | Qué es |
|---|---|
| `public/pose/` | Modelo y wasm de MediaPipe (1.2.3) servidos desde el sitio. |
| `public/avisos-sw.js` | Service worker mínimo: solo avisos y abrir la app al tocarlos. |
| `vite.config.ts` | CSP solo en el build. |
| `checks/features.cjs` | Pruebas (73 grupos). |
| `checks/nube-prueba.cjs` | Firestore y Auth de mentira para pruebas. |

## Dependencias nuevas de esta versión

- `@mediapipe/tasks-vision` 1.2.3 (cámara).
