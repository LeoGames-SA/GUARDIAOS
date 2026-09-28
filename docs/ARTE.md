# Integración del arte

Originales: `art-source/assets` (24 PNG, ~36 MB, sin modificar; fuera de la carga del juego).
Derivados: `public/assets/*.webp` (~1,3 MB en total) generados con `npm run assets` (`scripts/optimize-assets.mjs`).
Manifiesto de derivados: `src/content/art-manifest.json`. Posiciones: `src/content/station.ts`.

## Revisión realizada

- Hoja de contacto de los 23 objetos sobre fondo oscuro, claro y magenta.
- Semitransparencias internas medidas por recurso (píxeles con alfa < 240 rodeados de alfa > 200 a 12 px):
  - **monitor**: 8,2 % del interior semitransparente (la pantalla deja ver la ciudad). **Corregido** en el derivado: relleno opaco de la región conectada al centro. Además la interfaz se monta sobre un panel DOM opaco.
  - lámpara 0,54 %, portalápices 0,34 %, planta 0,15 %, gato 0,08 %, taza en mano 0,02 %: huecos legítimos (malla, hojas, brazo, pelaje). Sin corrección.
  - resto: 0 %.
- Recorte de márgenes transparentes (alfa ≤ 8, +4 px) para posicionar por el cuerpo visible.

## Calibraciones

- **Vidrio del monitor**: medido sobre el derivado con grilla al 5 %: x 10,3 %, y 9,7 %, ancho 79,5 %, alto 59,7 % (`MONITOR_GLASS`). La estimación del paquete (zona semitransparente) era más chica y desplazada.
- **Auricular**: se midieron las dos horquillas de la base (eje a ~22–25° de la vertical, igual que el auricular). Escala y posición ajustadas para apoyar ambos extremos: `x 110, y 534, ancho 115` con la base en `x 60, y 522, ancho 400`. Verificado en montaje ampliado ×2 y en la escena.
- **Mano con auricular**: anclada al borde inferior izquierdo (el brazo está cortado en el lienzo). Oculta el auricular suelto. Sin puntero.
- **Mano con taza**: se muestra 1,6 s después de una pausa de café; oculta la taza de la mesa.
- **Mano con mouse**: no se usa. Con GuardiaOS abierto quedaría detrás del panel, y fuera de él no hay acción que la justifique sin parecer un cursor. Se documenta como decisión.
- Mesa: la superficie empieza en y≈512 del fondo; todos los objetos apoyados tienen su base por debajo.
- Segundo monitor: reutiliza la carcasa a 276 px de ancho a la derecha; con la mejora, el monitor principal se corre a la izquierda.

## Efectos programados

Lluvia recortada al vidrio (sólo `transform`, pausada con pestaña oculta y movimiento reducido), vapor SVG en la taza, LED y visor del teléfono, hilos SVG de la pizarra, respiración CSS del gato.

## Pendiente artístico

- La aprobación final del arte corresponde al usuario mirando la escena real (`docs/capturas`).
- El texto «LLAMADA» del visor del teléfono es DOM sobre el LCD dibujado; con ángulo aproximado.
