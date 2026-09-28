# Turno de Guardia

Juego web (Vite + React + TypeScript estricto) sobre una guardia nocturna de soporte. Especificación: `docs/PROMPT-MAESTRO-TURNO-DE-GUARDIA.md`. Estado y siguiente acción: `docs/PROGRESS.md`.

## Comandos

- `npm run dev` — servidor de desarrollo (http://localhost:5173). `?semilla=7` fija la semilla de la próxima guardia.
- `npm run build` / `npm run preview` — build de producción y vista previa.
- `npm run typecheck` · `npm run lint` · `npm run format:check` · `npm test` (Vitest, motor/guardado/cubo).
- `npm run check` — todo lo anterior + build. Rápido; usar antes de cada commit.
- `npm run test:e2e` — Playwright sobre la build (lento, ~3 min). Usa el Chromium preinstalado.
- `npm run assets` — regenera `public/assets/*.webp` y `src/content/art-manifest.json` desde `art-source/` (sharp).

## Arquitectura

- `src/engine/` reglas puras: `game.ts` (acciones → estado + eventos, reloj y cola de eventos), `board.ts` (respaldo de hipótesis), `needs.ts`, `cube.ts`, `report.ts`. Sin React, DOM ni storage (ESLint lo impide).
- `src/content/` casos declarativos (`cases/`), inventario, conocimiento, layout del puesto (`station.ts`).
- `src/application/` `store.ts`: única fuente de estado; coordina motor + persistencia. `audio.ts`: síntesis.
- `src/persistence/save.ts` ranuras versionadas (prefs, perfil, campaña, práctica) con validación.
- `src/ui/scene` mesa · `src/ui/os` GuardiaOS y ventanas · `src/ui/panels` llamada, pizarra, cuaderno, pausas, informes.

## Reglas

- La interfaz nunca inventa resultados: todo sale de `ProbeResult` del caso. Las relaciones de la pizarra se definen por lo observado, no por la causa oculta.
- Leer/pensar/mover ventanas/conectar notas no cuesta tiempo; pruebas, intervenciones y pausas sí (una sola vez por acción).
- Español rioplatense con voseo. No mostrar la causa real antes de cerrar un expediente.
- Arte: nunca reemplazar por rectángulos; derivados optimizados; manos decorativas sin puntero. Ver `docs/ARTE.md`.
- Sin hooks automáticos que corran suites completas.

## Terminado

`npm run check` en verde, e2e pertinentes en verde, captura revisada si hubo cambios visuales, `docs/PROGRESS.md` actualizado.

## Skills del proyecto (`.claude/skills/`)

- `diseno-de-casos`: al crear o modificar expedientes o noches.
- `revision-de-experiencia`: antes de cerrar un cambio de interfaz o diálogo.
- `integracion-de-arte`: al sumar o recolocar ilustraciones.
- `control-de-calidad`: antes de entregar o al retomar una sesión.
