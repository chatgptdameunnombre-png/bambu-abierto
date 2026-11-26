# Nube y reglas

Proyecto Firebase de tuagentedeia. Bambú solo acepta cuentas de correo o Google (`bambuCuenta()`); las visitas anónimas de la web no entran.

Las reglas de Firestore se administran aparte (no están en este repo).

## Colecciones

| Colección | Quién lee | Quién escribe | Para qué |
|---|---|---|---|
| `bambu/{uid}/registros` | Solo el dueño | Solo el dueño | Todos los datos de la app (series, hábitos, ajustes…). |
| `bambu_perfiles/{uid}` | El dueño; cualquiera si es pública; aprobados si es privada; el servidor de avisos (para "te pasaron en la liga") | El dueño | Números de la liga y récords. |
| `bambu_directorio/{uid}` | Cualquier cuenta de Bambú | El dueño | Apodo, avatar, nivel y a quién sigue. |
| `bambu_solicitudes/{de__para}` | Los dos | Quien pide | Solicitudes a cuentas privadas. |
| `bambu_pases/{llave}` | Cualquiera con la llave | El dueño | Hasta qué hora hay redes (lo lee el atajo del iPhone). |
| `bambu_retos/{id}` | Los participantes y el servidor de avisos | Quien reta crea con su marca; cada participante agrega la suya una sola vez (48 h) o se sale | Retos de 2 a 10 personas. |
| `bambu_widget/{llave}` | Cualquiera con la llave | El dueño | Datos del widget de Scriptable. |
| `bambu_avisos/{uid}` | El dueño y el servidor de avisos | El dueño | Suscripción push, hora del recordatorio y si ya entrenaste hoy. |

## Límites que ponen las reglas

- Campos exactos (`hasOnly`) y tamaños máximos en todo.
- Retos: de 2 a 10 personas, tipos `reps`, `aguante` o `cindy`, marcas de 0 a 2000; cada quien solo toca su propia marca y una sola vez.
- Avisos: el destino del aviso tiene que ser `https://`.
- Widget y pases: llave secreta de 16 a 40 caracteres; solo el dueño la cambia.

## Lo que las reglas no pueden revisar

Que las marcas de un reto sean reales (lo revisa la app con la cámara). 
