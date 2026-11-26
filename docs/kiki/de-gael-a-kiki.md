# De la versión de Gael (Prospect Lab) a la versión de Kiki

Todo lo que cambió desde la app original de Gael (`GaelProspectlab21/bambu-abierto`, rama `main`, commit `53f392a`) hasta la versión de Kiki (rama `kiki`), cómo se hizo y lo que se aprendió en el camino. En vivo: **https://tuagentedeia.com/bambu/**.

## En números

| | |
|---|---|
| Archivos tocados | 100 (64 nuevos, 36 modificados) |
| Líneas | más de +19,000 / −1,000 |
| Publicaciones en vivo | 24, del 24 al 25 de noviembre de 2026 |
| Pruebas automáticas | 73 grupos (`node checks/features.cjs`) |

## Punto de partida: la v7 de Gael

App personal de lectura (cronómetro, Biblia por capítulos, Crónica), entrenamiento con coach, enfoque por bloques, hábitos, tareas, recordatorios push con Supabase, NFC y "pausa antes de las apps" con Atajos de iOS. Diseño claro en verde, cuentas y datos en Supabase, publicada en Vercel en la raíz de su dominio.

## Cronología

| Cuándo | Qué se publicó |
|---|---|
| 24-nov 17:54 | La app vive en una subcarpeta del dominio de Kiki: `tuagentedeia.com/bambu/`. |
| 24-nov 18:04 | Preguntas de la mañana (dormir, pantallas, cama, teléfono). |
| 24-nov 18:11 | Jardín con paisaje, gráfica de progreso e interfaz más limpia. |
| 24-nov 18:19 | Entreno libre con récords, reto semanal y comodín de racha. |
| 24-nov 18:32 | Modo Aventura, cardio y rangos con nombre. |
| 24-nov 18:44 | Monstruos con escenario y esquives; cardio por tiempo o distancia; íconos nuevos. |
| 24-nov 19:08 | Mazmorra del día, temporadas, álbum de cartas, mapa de músculos, fantasma y famosos de calistenia. |
| 24-nov 19:31 | Jefe de la semana y "Tu cuerpo" en el jardín. |
| 24-nov 21:21 | Cuenta con correo (Firebase) y tablas de récords. |
| 24-nov 21:35 | Entrar con Google y confirmar correo. |
| 24-nov 22:00 | Sección Amigos, "Buenos días" real y registro de Libre. |
| 24-nov 22:20 | Cuentas públicas o privadas, solicitudes y subir los datos de antes. |
| 25-nov 17:05 | Cámara que cuenta repeticiones, minutos de redes y candado con Atajos. |
| 25-nov 17:19 | Medidor de profundidad: media repetición vale cero. |
| 25-nov 17:34 | Lagartijas de frente y plancha más tolerante. |
| 25-nov 17:39 | Contar con cámara en la rutina, peleas y mazmorra. |
| 25-nov 18:05 | Competencias solo con cámara, ahorro de batería, CSP y rutina de Kiki. |
| 25-nov 18:08 | Arreglos de la revisión de seguridad. |
| 25-nov 19:04 | Duelos de 60 s; pestañas Redes y Duelos; cámara para cualquier ejercicio; resumen semanal; widget y avisos. |
| 25-nov 19:24 | Ajedrez (bot y en línea) y Cindy. |
| 25-nov 19:34 | Se quita el ajedrez: queda pendiente para después. |
| 25-nov noche | Opción "Solo competir con mis amigos" al crear cuenta (en el código; todavía no en la web). |

## Cambios por área

### Diseño
- De claro y verde a **oscuro estilo Duolingo**: botones grandes con sombra, íconos propios con un solo sistema de color (`--ia`, `--ib`, `--ic`) y todos los colores como tokens en `src/tokens.css`.
- Barra de abajo: Hoy, Entrenar, Tareas, Comida, Jardín y Amigos; módulos que se prenden y apagan en Ajustes.
- Se probaron tres estilos alternativos y uno combinado; ninguno convenció y se quedó el actual.

### Dos formas de usarla
- Pregunta nueva al crear cuenta: **Hábitos y racha** o **Solo competir con mis amigos**.
- En modo competir no hay racha obligatoria, ni camino del día, ni objetivos, ni Jardín; solo las zonas elegidas y Amigos, sin candado de entreno ni avisos de racha. Se cambia en Ajustes (`src/lib/modo.ts`).

### Publicada en una subcarpeta
- `base: './'` en Vite, manifest con rutas relativas (`start_url` y `scope` en `./`), `noindex`.
- El `sw.js` original usa rutas de raíz: no se publica. Los avisos usan un service worker propio (`avisos-sw.js`) con alcance `/bambu/`.

### Cuentas y datos: de Supabase a Firebase
- Firebase Auth y Firestore **por REST, sin el SDK** (la app queda más ligera): `src/lib/firebase.ts` y `src/lib/nubeFormato.ts`.
- Correo y contraseña o Google; confirmar correo; borrar cuenta borra todo.
- Cada cambio es un registro en `bambu/{uid}/registros`; se sincroniza por cursor con la hora del servidor en microsegundos.
- "Seguir sin cuenta" sigue funcionando; "Tus datos de antes" sube lo que había en el teléfono sin duplicar (`src/lib/fusion.ts`).

### Social
- Perfil con apodo y monstruo como avatar (nunca el correo), cuenta pública o privada con solicitudes, código para invitar (`?amigo=CODIGO`), liga de amigos por XP de la semana, repeticiones, racha y nivel.

### Juego
- Rangos con nombre, XP diario, comodín de racha, jardín por día.
- **Aventura**: 10 monstruos con escenario, debilidades y esquives; mazmorra del día; temporadas mensuales con tema mexicano; álbum de 39 cartas; jefe de la semana al que solo le pegan los hábitos.

### Cámara que cuenta repeticiones
- **MediaPipe Pose Landmarker 1.2.3** (modelo lite) servido desde el propio sitio; el video nunca sale del teléfono.
- Cuenta con **ángulos en 3D** suavizados y un **medidor de profundidad**: media repetición vale cero y te dice "Llegaste al 70%". Voz en español para cada número y cada aviso.
- Familias con postura propia (lagartijas, fondos, sentadillas, dominadas, pike, handstand push up, remo, elevaciones, saltos, burpees, plancha, lateral, wall sit, colgarse, L sit, handstand, hollow, planche, cuervo, front y back lever, bandera) y variantes por nombre (diamante, arqueras, abiertas, inclinadas, en rodillas…).
- **Cualquier otro ejercicio**: un modo general aprende tu recorrido en la primera repetición; los aguantes sin postura propia cuentan solo mientras estés quieto.
- Récords, retos, tablas, peleas y duelos **solo cuentan con cámara**.

### Minutos de redes y bloqueo
- Se ganan con ejercicio **solo en la pestaña Redes** (2 lagartijas = 1 min, 4 sentadillas = 1 min, 1 dominada = 2 min, 20 s de plancha = 1 min; variantes difíciles valen el doble).
- Bloqueo real con **Atajos del iPhone**: el atajo lee un "pase" en la nube con una llave secreta; si no hay tiempo, abre Bambú para gastar minutos o ganarlos.

### Duelos, Cindy y resumen
- **Duelos de 60 s** con la cámara: cuenta 3, 2, 1 al verte; el amigo tiene 48 horas para superarte.
- **Cindy**: 20 minutos de 5 dominadas, 10 lagartijas y 15 sentadillas; la cámara cambia sola de ejercicio y guarda rondas + repeticiones.
- **Tu semana** en el Jardín con imagen vertical para compartir.

### Widget y avisos
- **Widget** con la app gratis Scriptable, que lee un documento público por llave.
- **Avisos push** sin Supabase: recordatorio a tu hora, racha en riesgo, duelo recibido y resultado. Los manda un servidor propio cada 5 minutos.

## Cómo se hizo

1. **Entender → plan → OK de Kiki → ejecutar sin interrumpir.** Cada tanda empezó con un plan corto; lo visual se enseñó primero en local.
2. **Pruebas automáticas** de la lógica: conteo de la cámara con secuencias de ángulos, minutos, duelos, Cindy, semana y una prueba de punta a punta contra una **nube de prueba** (`checks/nube-prueba.cjs`) que imita Auth y Firestore con las mismas reglas.
3. **Pruebas de pantalla** con Playwright en un teléfono simulado, con **cámara falsa**, y con dos cuentas a la vez para duelos.
4. **Build de producción bajo su CSP** antes de publicar y la misma revisión **en vivo** después: 0 bloqueos, cámara, worker y service worker.
5. **Prueba de Kiki en su iPhone** y ajustes con lo que reportó (lagartijas que pedían alejarse, plancha que no contaba, minutos que no debían salir de un récord).
6. **Revisión de seguridad** con arreglos publicados el mismo día.

## Lo que se aprendió

- **MediaPipe en CPU es mejor que en GPU en la web del teléfono**: el arranque bajó de 17.5 s a 2 s y el procesador de ~100% a ~15%. Además: video 480×360 a 15 fps, menos cuadros cuando no hay nadie, apagado a los 45 s sin verte y el modelo se reutiliza 2 minutos.
- **Lagartijas de frente**: el codo casi no se ve desde enfrente; funciona medir cuánto bajan los hombros hacia las manos, dividido entre el ancho de hombros, con una ventana de 3.5 s.
- **Aguantes**: 0.7 s de tolerancia para que un temblor no pause el tiempo. Para saber si alguien está quieto hay que comparar contra hace un segundo, no contra el cuadro anterior: el ruido de la detección cuadro a cuadro parece movimiento.
- **Modo general**: elegir la articulación que más se mueve, aprender su rango y contar cada regreso al inicio con margen (20% y 80%) para no contar temblores.
- **React en desarrollo monta dos veces**: la cámara se quedaba en "Preparando" hasta que la bandera de vida se reinició en el efecto.
- **Push web sin librerías**: el cifrado del estándar (RFC 8291) se implementó en Python y se valida contra el ejemplo oficial cada vez que corre. En iPhone solo funciona con la app instalada en la pantalla de inicio.
- **Firestore por REST** basta para una PWA: con `hasOnly`, tipos y topes en las reglas, cada cuenta solo toca lo suyo; cosas como "contestar un duelo una sola vez" se logran solo con reglas.
- **La CSP va solo en el build**: el servidor de desarrollo de Vite usa scripts en línea.
- **Decisiones de producto que cambiaron el diseño**: los minutos solo se ganan en Redes; las competencias son solo con cámara; el ajedrez se quitó para hacerlo después con otro enfoque.

## Lo que no está en este repo

Las reglas completas de Firestore, el servidor de avisos y la revisión de seguridad viven en el repo privado de Kiki.
