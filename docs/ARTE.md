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
- **Encuadre abierto** (`station.ts`): los objetos se reubicaron para que ninguno quede cortado en los bordes; la base del teléfono está en `x 64, y 566, ancho 330` y el auricular se deriva de ella con la calibración de las horquillas (`HANDSET_CAL`: desplazamiento 50/12 y ancho 115 sobre 400), así se mueven juntos. Coordenadas de escena (fondo 1672×941) separadas de las posiciones de la interfaz (`--sw/--sh/--sl/--sb`, escenario con tope de 1840 px).
- **Visor del teléfono**: tres esquinas del LCD medidas sobre el dibujo (`PHONE_LCD`); el texto («LLAMADA», «EN ESPERA», «EN LÍNEA», hora) es SVG con una matriz afín que sigue la perspectiva del visor.
- **Mano con auricular**: anclada al borde inferior izquierdo (el brazo está cortado en el lienzo), `x −10, y 700, ancho 160`. Oculta el auricular suelto; en espera se guarda y vuelve el auricular a la base. La tarjeta de la llamada va arriba a la izquierda y no baja hasta el teléfono (prueba e2e), así la mano queda a la vista. Sin puntero.
- **Mano con taza**: al hacer clic en la taza, la mano levanta, acerca y devuelve la taza (2,1 s, se salta con clic/Esc/Enter/Espacio; 0,7 s estática con movimiento reducido). Oculta la taza de la mesa: nunca hay dos tazas.
- **Sándwich**: el texto describe un sándwich tostado (como el dibujo). Cada comida deja un mordisco hecho con máscara CSS sobre el derivado (sin deformarlo ni editar el recurso); dos mordiscos como máximo, ubicados sobre zonas del pan que no pisan el plato.
- **Cubo en la mano**: modelo 3D (three.js) con los colores del dibujo, luz cálida desde la lámpara (izquierda) y relleno frío del monitor. El sprite de la mesa se oculta mientras se sostiene y el objeto vuelve a su lugar con animación.
- **Pelota en la mano**: el mismo dibujo, ampliado; se aplasta contra el borde inferior (escala 1,22 × 0,70, sombra más ancha y sombreado interno) y rebota al soltar. El sprite de la mesa se oculta mientras se sostiene.
- **Mano con mouse**: no se usa. Con GuardiaOS abierto quedaría detrás del panel, y fuera de él no hay acción que la justifique sin parecer un cursor. Se documenta como decisión.
- Mesa: la superficie empieza en y≈512 del fondo; todos los objetos apoyados tienen su base por debajo.
- Segundo monitor: reutiliza la carcasa a 276 px de ancho a la derecha; con la mejora, el monitor principal se corre a la izquierda.

## Efectos programados

Lluvia recortada al vidrio (sólo `transform`, pausada con pestaña oculta y movimiento reducido), vapor SVG en la taza, LED y visor del teléfono, hilos SVG de la pizarra, respiración CSS del gato.

## Pendiente artístico

- La aprobación final del arte corresponde al usuario mirando la escena real (`docs/capturas`).
- La mano con auricular queda parcialmente cortada por el borde inferior en 16:9 (el brazo del dibujo termina ahí): es intencional, pero conviene mirarlo en vivo.
