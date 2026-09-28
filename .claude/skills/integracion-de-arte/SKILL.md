---
name: integracion-de-arte
description: Integrar, recolocar o corregir ilustraciones del paquete de arte en la escena. Usar al tocar art-source, public/assets, src/content/station.ts o Scene.tsx.
---

1. Abrí el PNG original (`art-source/assets`) sobre fondo claro, oscuro y magenta. Buscá semitransparencias internas (script de ejemplo en `docs/ARTE.md`).
2. Corregí el matte en `scripts/optimize-assets.mjs` (nunca en el original) y ejecutá `npm run assets`. Verificá bordes del derivado.
3. Posicioná en `src/content/station.ts` en coordenadas del fondo 1672×941 (x, y, ancho del recorte). Objetos apoyados: base dentro de la mesa (y > 512).
4. Poses de mano: ocultan su duplicado (`POSES.hides`), no reciben puntero, no tapan texto.
5. Tomá una captura a 1366×768 y compará con `docs/referencia/OBJETIVO-VISUAL.png`: proporciones, contacto con la mesa, opacidad del monitor, luz.
6. Registrá cambios y calibraciones en `docs/ARTE.md`. La build en verde no aprueba el arte.
