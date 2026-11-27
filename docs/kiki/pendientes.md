# Pendientes

## Ajedrez (se va a incluir después)

Se hizo y se publicó el 25-nov-2026 (commit `abb4090` del sitio) y **ese mismo día Kiki pidió quitarlo** porque no le gustó. Se quitó por completo de la app, del sitio, del enviador de avisos, de las pruebas y de las reglas. Se va a incluir más adelante, cuando Kiki lo pida.

**Lo que tenía, para retomarlo:**

- Módulo en **Ajustes → Qué usas** (apagado por defecto), con su pestaña en la barra de abajo.
- **Contra un bot**: 3 niveles (búsqueda alfa-beta de 1, 2 y 3 jugadas con valores de piezas y tablas de posición), corriendo en un *worker* para no congelar la pantalla (el difícil tardaba ~0.6 s). Partida guardada en el teléfono para seguirla después; deshacer y rendirse.
- **En línea con amigos**: colección `bambu_partidas` (blancas, negras, jugadas, fen, turno, estado, resultado). Las reglas dejaban mover solo a quien tiene el turno, una jugada a la vez, y rendirse a cualquiera de los dos. La pantalla consultaba cada 3 s mientras esperabas y el VPS mandaba aviso "Te toca".
- Reglas completas del juego con la librería **chess.js 1.4.0** (licencia BSD-2).
- Piezas con caracteres Unicode; en iOS el peón negro sale como emoji si no se agrega el selector de texto U+FE0E.

**Qué no le gustó:** Kiki lo quitó sin dar detalle. Antes de volver a hacerlo, preguntarle qué cambiaría (diseño del tablero, dónde va, si en línea o solo contra el bot).

## Otros pendientes

| Pendiente | Quién |
|---|---|
| Probar en el iPhone: plancha en codos y con brazos estirados, tuck planche, lagartijas arqueras, Cindy y los aguantes del modo general | Kiki |
| Armar el widget con Scriptable | Kiki |
| Primer reto con Gael (aceptar su solicitud en Amigos) | Kiki |
| Llenar los datos del responsable para activar los legales (y que un abogado los revise) | Kiki |
| Probar en el iPhone: la bienvenida nueva (edad solo con Comida), armar la rutina con Bambú, sesión de 15 min, Progreso, la Biblia nueva, Comida con foto y abrir sin señal | Kiki |
| Pedir a ChatGPT el ícono 1 solo en 1024 px para que se vea nítido en grande (hoy está recortado de la hoja de 9) | Kiki |
| Volver a conectar Noche y Bloque de enfoque (el código ya está; hoy no hay botón que lleve) | Claude, con OK de Kiki |
| Los ajustes de la rutina de Kiki (toques a 7, sin parado de cabeza ni handstand push up) se aplican a todos: limitarlos a su cuenta | Claude |
| Decidir con Gael: una sola nube, amigos solo por código, quitar "Pasar mis datos" | Kiki y Gael |
| Una sola versión con Gael: por ahora cada quien su link; ver "Decisiones de Kiki sobre la versión de Gael" en [de-gael-a-kiki.md](de-gael-a-kiki.md) | Kiki y Gael |
| Mascota nueva: Brote no convenció a Kiki ni a Gael; generar opciones en ChatGPT y usar la elegida tal cual | Kiki |
| Arte de monstruos menos caricatura (ChatGPT), para ponerlo tal cual | Kiki |
