# Funciones

Todo lo que hace la versión de Kiki. Las funciones originales de Gael (lectura, Biblia, enfoque, NFC, comida) siguen en el código; aquí se describe lo que se ve y se usa hoy.

## Dos formas de usar Bambú

Al crear la cuenta, después del nombre, la app pregunta **"¿Cómo quieres usar Bambú?"**:

| Modo | Qué ves |
|---|---|
| **Hábitos y racha** (el de siempre) | Hoy con el camino del día, objetivos diarios, Jardín y fuego de racha. |
| **Solo competir con mis amigos** | Sin racha obligatoria ni camino del día. No pide objetivos ni plantar el bambú (3 pasos en vez de 5). Solo aparecen las zonas que eliges (Entreno, Tareas, Lectura, Comida) y Amigos; entra directo a Entrenar. Arriba solo XP y nivel. El candado de entreno viene apagado y no llegan avisos de "racha en riesgo". |

Se cambia cuando quieras en **Ajustes → Cómo usas Bambú**. Las cuentas que ya existían siguen en "Hábitos y racha".

## Barra de abajo

Hoy · Entrenar · Tareas · Comida · Jardín · Amigos. Ajustes va en el engrane de arriba. En modo competir: Entrenar · Tareas · Lectura · Comida · Amigos (según las zonas elegidas).

Los módulos se prenden y apagan en **Ajustes → Qué usas**: Entreno, Tareas, Lectura y Comida. Si un módulo está apagado, su pestaña no aparece.

Enlaces directos: `?ir=hoy`, `entrenar`, `redes`, `retos`, `tareas`, `comida`, `jardin`, `amigos`, `ajustes`.

## Hoy

Lista vertical del día: hábitos, rutina, lectura y tareas. Racha, XP del día y nivel arriba.

## Entrenar (5 pestañas)

| Pestaña | Qué hace |
|---|---|
| **Rutina** | Rutina semanal por día (circuito por rondas, antes y después). Cada ejercicio con medidor, temporizador y botón **Contar con cámara**. Hora límite con candado de entreno. |
| **Libre** | Botones grandes **Romper tu récord** (lista de récords con cámara y botón Superar que abre la cámara directo) y **Tablas con amigos**. Reto de la semana. Buscador de ejercicios con filtros (Todos, Famosos, por músculo, WOD) y "Otro ejercicio". |
| **Redes** | Saldo de minutos de redes del día. Eliges cuántos minutos quieres ganar (5, 10, 15, 30) y el ejercicio: te dice cuánto hacer y la cámara muestra la meta. Tabla de cuánto vale cada ejercicio. Estado del bloqueo de redes. |
| **Retos** | Retos con la cámara de 2 a 10 personas: más repeticiones en 60 s, aguantar más o Cindy. Globo rojo cuando te toca. |
| **Aventura** | Monstruos, temporada, mazmorra y jefes. Solo se ataca con lo que cuenta la cámara. |

## Cámara que cuenta

- MediaPipe Pose (modelo lite) servido desde el mismo sitio (`public/pose/`); el video nunca sale del teléfono.
- Cuenta con ángulos en 3D y un **medidor de profundidad**: media repetición vale cero y dice "Llegaste al 70%".
- Avisos por voz en español: número de cada repetición, "Baja hasta abajo", "Cuerpo recto", "Más controlado".
- Ahorra batería: 480×360 a 15 fps, baja el ritmo si no te ve, se apaga sola a los 45 s sin verte o al salir de la app.
- **Aguantes:** 5 segundos para acomodarte antes de que corra el tiempo. **Plancha** es en codos y **Plancha con brazos estirados** va aparte; no cuenta acostado, con la cadera en el piso, apoyado en las rodillas ni sentado o parado frente a la cámara. En **planche, cuervo y bandera** la cámara mide dónde están tus pies en el piso durante esos 5 segundos y solo cuenta con los pies despegados; al bajar, se detiene y se guarda.
- **Familias con postura propia:** lagartijas (de lado o de frente por caída de hombros), fondos, sentadillas, dominadas (barbilla arriba de las manos), pike, handstand push up, remo, elevaciones colgado, jumping jacks, burpees, plancha, plancha lateral, wall sit, colgarse, L sit, handstand, hollow, **planche / tuck planche / cuervo**, **front y back lever**, **bandera humana**.
- **Variantes** por nombre: diamante, abiertas, arqueras, declinadas, inclinadas, en rodillas, explosivas, a una mano, pseudo planche, sumo, búlgara, pistol, shrimp, chin ups, muscle up, etc.
- **Cualquier otro ejercicio:** modo general que aprende tu recorrido en la primera repetición completa y cuenta cada regreso al inicio. Los aguantes sin postura propia cuentan solo mientras estés completo y quieto.

## Minutos de redes

- **Solo se ganan en Entrenar → Redes** (series con nota `redes`). Récords, rutina, retos y monstruos con cámara no dan minutos.
- Tasas: 2 lagartijas = 1 min · 4 sentadillas = 1 min · 1 dominada = 2 min · 20 s de plancha = 1 min · skills 5 s = 1 min · cualquier otro 4 repeticiones = 1 min. Variantes difíciles valen el doble y fáciles la mitad.
- Se reinicia cada noche. Gastar minutos crea un pase.
- **Bloqueo con Atajos del iPhone:** el atajo "Bambú Candado" lee el pase en la nube; si no hay tiempo, abre `?candado=redes` para gastar minutos o hacer ejercicio. Se configura en Ajustes → Candado de redes.

## Récords, retos y tablas

Solo cuentan series hechas con la cámara (notas `camara` o `redes`): récords, reto semanal (+50 XP), tablas de la semana, peleas y mazmorra.

## Retos con amigos

Eliges tipo, ejercicio (con buscador) y a uno o varios amigos (hasta 9, con botón "Todos"). Tú vas primero con la cámara; los demás tienen 48 horas. No dan minutos de redes.

| Tipo | Cómo se gana |
|---|---|
| **Más repeticiones** | 60 segundos; gana quien haga más (lagartijas, sentadillas, fondos, dominadas, burpees, jumping jacks, diamante, pike, chin ups, australianas). |
| **Aguantar más** | Sin límite; el tiempo corre con la postura correcta y se acaba si la pierdes 3 segundos (plancha, plancha con brazos estirados, lateral, wall sit, colgarse, hollow, L sit). |
| **Cindy** | 20 minutos de 5 dominadas, 10 lagartijas y 15 sentadillas. |

Cada quien marca una sola vez. Al terminar se ve la tabla de lugares (con empates) y hay revancha con la misma gente. Si ganas, la app te felicita al abrirla.

## Cindy

WOD en Libre: 20 minutos de 5 dominadas, 10 lagartijas y 15 sentadillas. La cámara cambia sola de ejercicio y avisa la ronda. El puntaje queda como "12 rondas + 7".

## Jardín

Plantas por día, estadísticas (racha, XP, nivel, días al 100), comodín semanal, objetivos y **Tu semana**: repeticiones con cámara, días, XP, minutos ganados y usados, récords nuevos y botón **Compartir mi semana** (imagen vertical 1080×1920).

## Amigos

Perfil con apodo y avatar, cuenta pública o privada (solicitudes), código para invitar, liga de amigos (XP de la semana, reps, racha, nivel), buscador. Al aceptar una solicitud ofrece agregar de regreso. **Tu red** (solo la ves tú): a quién sigues y quién te sigue.

## Widget y avisos (Ajustes)

- **Widget** con la app gratis Scriptable: racha, XP de hoy contra la meta, minutos de redes y avance de la rutina. Se actualiza cada vez que usas Bambú.
- **Avisos** con la voz de Brote: recordatorio a la hora que elijas si no has entrenado (la frase cambia según el día), racha en riesgo a las 9 pm ("se acaba a la medianoche"), te retaron, resultado del reto (con felicitación si ganas), "te pasaron en la liga", alguien quiere ser tu amigo y alguien te agregó. Se revisan cada minuto. Nada de 10 pm a 7 am. En iPhone solo con la app instalada en la pantalla de inicio. Vista previa local: `vista-avisos.html`.

## Legales

Aviso de privacidad integral (ley de 2025, autoridad: Secretaría Anticorrupción y Buen Gobierno), términos y condiciones con advertencia de salud y una pantalla de consentimiento después de entrar con dos casillas sin marcar (aviso y datos de salud). La aceptación se guarda en la cuenta con fecha y versión. Se activan al llenar los datos del responsable en `src/lib/legal.ts`; mientras tanto solo se ven en pruebas.

## Cuenta

Correo y contraseña o Google. Los datos viven en el teléfono y se sincronizan con Firestore. "Tus datos de antes" sube lo que había en el teléfono antes de crear la cuenta. Borrar la cuenta borra todo (perfil, pases, retos, widget, avisos y registros).

## Lo que viene

Ajedrez (contra un bot y en línea con amigos): se probó y se quitó el 25-nov-2026; se va a incluir después. Ver [pendientes.md](pendientes.md).
