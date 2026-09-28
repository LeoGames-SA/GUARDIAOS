# Progreso — Turno de Guardia

Rama: `claude/turno-guardia-game-8upsky`. Actualizado en cada etapa.

## Hecho

- A. Base: Vite 8 + React 19 + TypeScript 6 estricto, ESLint, Prettier, Vitest, Playwright 1.56.
- Motor puro (`src/engine`): reloj compartido con cola de eventos, casos declarativos, pizarra, necesidades, cubo, informes.
- Contenido (`src/content`): práctica de audio, expedientes 001 (3 variantes), 002, 003.
- Persistencia versionada con validación y cuarentena de guardados dañados.
- B. Escena con arte real (derivados WebP, 1,3 MB), monitor con vidrio opaco calibrado, auricular encastrado.
- C. GuardiaOS (13 apps), llamada con diálogo consecutivo, pizarra con hilos, cuaderno, manual, práctica guiada.

## Verificado

- `npm test`: 59 pruebas de motor, cubo y guardado.
- `e2e/01-practice.spec.ts`: práctica completa y transición a Elena (Chromium headless, 1366×768).

## Pendiente / siguiente acción exacta

- Ver sección «Estado actual» al final (se actualiza al cerrar cada etapa).

## Estado actual

- En curso: etapa D/E (recorridos e2e de 001/002/003, pausas, minijuegos, mejora, layouts).
