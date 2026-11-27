# Pruebas

## Pruebas automáticas

```bash
node checks/features.cjs
```

81 grupos. Entre ellos: rutina armada por Bambú (días, tiempo, nivel, equipo, Cambiar y Quitar), sesión de 15 o 30 min, Biblia en el registro rápido, ningún verde de Duolingo, retos de grupo, legales, planchas (cadera y rodillas despegadas, sentado de frente no cuenta, de frente con las piernas a la vista, teléfono chueco, tolerancia ya adentro y avisos de qué falla) y tuck planche (cadera alta, brazo de atrás mal visto, puntas colgando), modo solo competir, conteo de la cámara (profundidad, media repetición, ritmo, cuerpo recto, variantes, planche, lever, bandera, modo general y aguantes quietos), minutos de redes solo en Redes, retos (estados, lugares y reloj 3-2-1 + 60 s), Cindy, resumen semanal, widget y avisos, recarga sola cuando faltan archivos de una versión vieja, y una prueba de punta a punta contra la nube de prueba (incluye reportes de fallas con y sin cuenta): 1,201 registros, token vencido, cuentas separadas, cuenta privada, pase del candado, widget y avisos que nadie más puede cambiar, retos donde cada quien marca una sola vez y puede salirse y borrado completo de la cuenta.

## Nube de prueba

`checks/nube-prueba.cjs` imita Firebase Auth y Firestore (con las mismas reglas que importan) en el puerto 5641. Servidores de desarrollo:

| Nombre | Puerto | Qué es |
|---|---|---|
| `bambu` | 5640 | App en desarrollo, sin nube. |
| `bambu-nube` | 5642 | App en desarrollo conectada a la nube de prueba (5641). |

Si cambias `nube-prueba.cjs`, detén y vuelve a arrancar `bambu-nube`: si no, sigue corriendo la versión vieja.

## Pruebas de pantalla

Scripts de Playwright (viven en el repo privado de Kiki). Usan Playwright con cámara falsa (`--use-fake-device-for-media-stream`). Las capturas quedan junto al script.

| Script | Qué revisa | Necesita |
|---|---|---|
| `pantallas.cjs` | Redes, elegir ejercicio, meta, Libre, romper récord, Retos, Jardín y la imagen de la semana. | `bambu` (5640) |
| `duelo.cjs` | Retos entre cuentas: te retan, ves "a vencer", abres la cámara en modo reto. | `bambu-nube` (5642) |
| `ajustes.cjs` | Tarjetas de avisos y widget; que el widget se guarde en la nube y el código se copie. | `bambu-nube` (5642) |
| `cindy.cjs` | Cindy en Libre y su pantalla de cámara. | `bambu` (5640) |
| `produccion-camara.cjs` | El build de producción bajo la CSP: Redes, cámara, Retos, semana y registro del service worker. | `dist` servido en `http://127.0.0.1:5677/bambu/` |
| `en-vivo.cjs` | Lo mismo contra `https://tuagentedeia.com/bambu/`. | Internet |

## Lo que no se puede probar sin el iPhone

Que la cámara cuente bien con tu cuerpo real, que lleguen los avisos y que el widget se vea en la pantalla de inicio.
