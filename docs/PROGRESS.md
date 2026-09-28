# Progreso — Turno de Guardia

Rama: `claude/turno-guardia-game-8upsky`. Estado: **noche 1 completa y jugable** (etapas A–F).

## Hecho

- **A. Base**: Vite 8.3 + React 19.3 + TypeScript 6.0 estricto, ESLint 10, Prettier, Vitest 5, Playwright 1.56 (lockfile). `CLAUDE.md`, 4 skills en `.claude/skills/`, fichas en `docs/CASOS.md`.
- **Motor** (`src/engine`): reloj único 23:00–07:00 con cola de eventos ordenada; casos declarativos; pizarra con respaldo por notas; necesidades de Nico; pausas; cubo 3×3 real; informes y resumen.
- **Contenido**: práctica «audio», 001 impresión (3 causas; semillas 7/1/2), 002 carpeta compartida por correo, 003 portal caído por alerta automática.
- **B. Escena**: 24 recursos optimizados (36 MB → 1,3 MB WebP), matte del monitor corregido, vidrio y auricular calibrados (`docs/ARTE.md`), menú sobre la mesa real.
- **C/D**: GuardiaOS con 13 aplicaciones y ventanas (mover, minimizar, restaurar, cerrar, menú contextual, teclado); llamada con diálogo consecutivo; correo con respuestas contextuales; pizarra con hilos anclados; cuaderno y manual; hasta dos casos activos; historial; plazos y consecuencias; informes.
- **E**: estado de Nico y pausas (café, comer, baño, patio, fumar), pelota, cubo, gato (easter egg local), segundo monitor desbloqueable.
- **F**: móvil con navegación propia, ultrawide con márgenes ambientados, sonido sintetizado, capturas en `docs/capturas`, medición de rendimiento.

## Verificado (ejecutado de verdad)

- `npm run check`: tipos, lint, formato, **60 pruebas** (motor, cubo, guardado) y build — en verde.
- `npm run test:e2e`: **16 recorridos** en Chromium headless — en verde: práctica y transición; 3 causas del 001; intervención equivocada con costo (incluye consola); noche completa 002/003 + resumen + mejora + rejugar; dos casos activos; recarga a mitad de guardia y práctica; seguimiento de Elena y plazo vencido; pizarra por teclado con hilos alineados tras resize y zoom 125 %; ventanas y menú contextual; pausas, pelota, cubo y gato; layouts 1366×768, 1920×1080, 3440×1440, 390×844 sin scroll horizontal ni errores de consola.
- Revisión automática: 0 botones/controles sin nombre accesible en menú, mesa, llamada, GuardiaOS, pizarra y cubo.
- Rendimiento (`scripts/perf.mjs`, Chromium headless sin GPU, 1366×768, build de producción): entrada→pintado 32–96 ms en la mayoría de interacciones; cortar la llamada ~128 ms (la escena cambia de tamaño); 3 tareas largas, máx. 86 ms.

## No verificado / límites

- No se probó con lector de pantalla real; sólo atributos ARIA y navegación por teclado.
- El audio no se escuchó (entorno sin salida de sonido). Sólo consta que los recorridos no dan errores de consola; que no suene antes de un gesto del usuario está en el código (`sound.unlock`) pero no se midió.
- Rendimiento medido en un navegador headless sin GPU; no se afirma 60 fps. Conviene repetir `scripts/perf.mjs` en el equipo del usuario.
- Aprobación artística final: pendiente de que el usuario mire `docs/capturas` o el juego.

## Siguiente acción exacta

Ninguna obligatoria. Opcional: ejecutar `node scripts/perf.mjs` en el equipo del usuario y revisar el arte en vivo; luego diseñar la noche 2 con la skill `diseno-de-casos` (`docs/ROADMAP.md`).

## Archivos clave

`src/engine/game.ts`, `src/content/cases/*.ts`, `src/application/store.ts`, `src/ui/Desk.tsx`, `src/ui/os/apps.tsx`, `src/ui/panels/BoardPanel.tsx`, `src/content/station.ts`, `e2e/*.spec.ts`.
