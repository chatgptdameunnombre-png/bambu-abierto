# Arquitectura

React 19 + Vite 8 + TypeScript, sin backend propio: Firebase Auth y Firestore por REST desde el navegador. La app es una PWA publicada como archivos estáticos en GitHub Pages.

## Cómo viajan los datos

1. Todo se guarda primero en el teléfono (IndexedDB `bambu-local`, con espejo en `localStorage`).
2. Con cuenta, cada cambio es un registro en `bambu/{uid}/registros` y se sincroniza por cursor (sube lo pendiente, baja lo nuevo).
3. Lo social (perfil, directorio, solicitudes, retos) y lo que leen otros (pase del candado, widget, avisos) va en colecciones aparte. Ver [nube-y-reglas.md](nube-y-reglas.md).

## Archivos de la versión de Kiki (`src/`)

### Pantallas

| Archivo | Qué es |
|---|---|
| `App.tsx` | Navegación, módulos, modo (hábitos o competir), enlaces `?ir=`, sincronización, publicación del perfil y del estado (widget y avisos). |
| `Onboarding.tsx` | Bienvenida de 3 pantallas (despertar a Brote y nombre, qué medir con "Solo competir", objetivos) y `Cielo` (noche y amanecer, también en `AuthScreen`). |
| `HoyLista.tsx` | Pantalla Hoy. |
| `MiRutina.tsx` | Entrenar: barra de 4 pestañas, Hoy · Progreso · Recuperación, rutina del día, sesión de 15 o 30 min y Cambiar. |
| `ArmarRutina.tsx` | Elegir cómo quieres tu rutina, la hoja "Bambú te la arma" y la de Cambiar. |
| `Progreso.tsx` | Progreso (peso y fotos, de `TrainingPage`) y Recuperación con tus entrenos. |
| `Brote.tsx` | Brote: 7 caras, accesorios y volumen. |
| `Musculos.tsx` | Tu cuerpo: imagen base y capas por grupo en `public/cuerpo/`, toque por máscara. |
| `Libre.tsx` | Libre: romper récord, reto semanal, buscador y registro de series. |
| `Candado.tsx` | Redes (`RedesPage`), botón y envoltura de la cámara, pantalla del candado y su configuración. |
| `CamaraReps.tsx` | Pantalla de la cámara: MediaPipe, voz, medidor, 5 s para acomodarse en aguantes, reto de 60 s, aguantar hasta fallar, meta y circuito (Cindy). |
| `Duelos.tsx` | Pestaña Retos: crear, aceptar, lugares y revancha. |
| `Legal.tsx` | Aviso de privacidad, términos, consentimiento y tarjeta en Ajustes. |
| `Aventura.tsx`, `Jefe.tsx` | Monstruos, temporada, mazmorra y jefes. |
| `Jardin.tsx` | Jardín, estadísticas y **Tu semana**. |
| `Amigos.tsx`, `Tablas.tsx`, `useSocial.ts`, `amigosNuevos.ts` | Amigos, perfiles, liga, solicitudes, agregar de regreso y Tu red. |
| `Felicitar.tsx` | Felicitación al abrir la app si ganaste un reto. |
| `Widget.tsx` | Tarjetas de widget y avisos en Ajustes y el envío del estado. |
| `AjustesSimple.tsx` | Ajustes (Qué usas, candado, avisos, widget, cuenta). |
| `ShareCard.tsx` | Imágenes para compartir (semana). |
| `DuoIcons.tsx`, `duo.css`, `tokens.css` | Íconos, estilos y colores (todos los colores en `tokens.css`). |

### Lógica (`src/lib/`)

- `armar.ts`: arma la semana (equipo, días, tiempo, nivel) con los ejercicios de Gael más extras, Cambiar, Quitar, `recortar` para la sesión de 15 o 30 min y `semanaVacia` para cuentas nuevas.
- `lectura.ts`: `markBible` (capítulos y versículos de la Biblia, de la versión de Gael).

| Archivo | Qué es |
|---|---|
| `conteo.ts` | Familias de ejercicios, medición de posturas, conteo de repeticiones y aguantes, modo general. |
| `minutos.ts` | Tasas de minutos, saldo, pases, llave del candado, `conCamara` (nota `camara` o `redes`). |
| `libre.ts` | Récords, reto semanal, notas de cámara. |
| `retos.ts` | Tipos de reto, estados, lugares con empates y marcador. |
| `duelos.ts` | Reloj 3-2-1 + tiempo del reto. |
| `legal.ts` | Textos legales y datos del responsable (por completar). |
| `version.ts` | Recarga sola si faltan archivos de una versión vieja (una vez, no sin señal) y limpia la marca `?v=`. |
| `wod.ts` | Cindy: partes, rondas y puntaje. |
| `semana.ts` | Resumen semanal. |
| `felicitar.ts` | Qué retos ganaste sin empate y el texto de la felicitación. |
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
| `checks/features.cjs` | Pruebas (81 grupos). |
| `vista-avisos.html` | Vista previa local de los avisos (solo desarrollo; no se publica). |
| `checks/nube-prueba.cjs` | Firestore y Auth de mentira para pruebas. |

## Carga por partes

Entrenar, Jardín, Amigos, Ajustes, Comida, Tareas, Lectura y el candado se cargan solo al abrirlos (`lazy` en `App.tsx`): el archivo principal bajó de 708 KB a 363 KB.

## Dependencias nuevas de esta versión

- `@mediapipe/tasks-vision` 1.2.3 (cámara).
