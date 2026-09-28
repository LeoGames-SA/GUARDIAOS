---
name: control-de-calidad
description: Comprobación de calidad antes de entregar o al retomar una sesión de Turno de Guardia.
---

1. Leé `docs/PROGRESS.md` (no releas todo el repo).
2. `npm run check` (tipos, lint, formato, pruebas, build). Corregí antes de seguir.
3. `npm run test:e2e` cuando cambian recorridos o UI; si falla, reproducí con una captura (`page.screenshot`).
4. Consola del navegador sin errores en los recorridos.
5. No declares rendimiento, lector de pantalla ni audio verificados sin haberlos medido o escuchado; anotá los límites.
6. Actualizá `docs/PROGRESS.md` con hecho / verificado / pendiente y la siguiente acción exacta. Commit y push a la rama de trabajo.
