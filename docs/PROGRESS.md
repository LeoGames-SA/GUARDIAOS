# Progreso — Turno de Guardia

Rama: `claude/turno-guardia-game-8upsky`. Estado: **noche 1 completa y jugable** (etapas A–F) + **iteración de pulido visual e interacción** (6 etapas, todas subidas).

## Hecho

- **A. Base**: Vite 8.3 + React 19.3 + TypeScript 6.0 estricto, ESLint 10, Prettier, Vitest 5, Playwright 1.56 (lockfile). `CLAUDE.md`, 4 skills en `.claude/skills/`, fichas en `docs/CASOS.md`.
- **Motor** (`src/engine`): reloj único 23:00–07:00 con cola de eventos ordenada; casos declarativos; pizarra con respaldo por notas; necesidades de Nico; pausas; cubo 3×3 real (con capas del medio); espera y despedida en llamadas; informes y resumen.
- **Contenido**: práctica «audio», 001 impresión (3 causas; semillas 7/1/2), 002 carpeta compartida por correo, 003 portal caído por alerta automática.
- **Iteración de pulido** (pedido con `referencia.zip`):
  1. Encuadre abierto, visor del teléfono en perspectiva, llamada como capa estable (no mueve la mesa).
  2. Menú con composición propia (escena ambiental sin mensajes de casos, jerarquía Continuar/Nueva guardia) y pizarra de corcho en todos sus estados, con archivados.
  3. Llamadas: entrante/conversación/en espera/retomada/finalizada, despedida según el resultado, informe en tres partes (resolución técnica, razonamiento documentado, buenas prácticas), voces estilizadas con volumen propio.
  4. Correo completo (carpetas, leído/no leído, conversación por expediente, adjunto en visor), navegador de intranet (historial, portal, base de conocimiento, estado ligado al motor, errores diferenciados), ventanas en el área útil y recordadas.
  5. Café desde la taza (levantar/acercar/devolver, se salta), sándwich desde el plato (duración y aviso previo, mordiscos), resumen compacto de pausas y bandeja de avisos.
  6. Cubo 3D en la mano (three.js a pedido, gestos por capa y objeto, teclado) y pelota que se aprieta (mouse, toque, teclado; efecto único por el motor).
- Supervisor del tutorial: sólo registrado como idea en `docs/ROADMAP.md`.

## Verificado (ejecutado de verdad)

- `npm run check`: tipos, lint, formato, **68 pruebas** (motor, cubo con gestos contra geometría, guardado con compatibilidad de partidas anteriores) y build — en verde.
- `npm run test:e2e`: **21 recorridos** en Chromium headless — en verde. Incluye: práctica; 3 causas del 001; noche completa con correo/navegador nuevos; dos casos activos; recarga; seguimiento y plazo; pizarra por teclado con hilos alineados (1366, 1920, zoom 125 %); ventanas dentro del área útil, recordadas y corregidas al achicar; menú sin avanzar el reloj; pizarra vacía y archivados; la llamada no mueve la mesa, no tapa teléfono ni mano y deja libre parte del corcho; espera → recarga → retomar → despedida → informe → historial; voces (contador de murmullos, se detienen al completar/espera); café una sola vez con doble clic; sándwich con aviso y mordisco; pelota con teclado y mouse (soltar fuera no la traba); cubo con arrastre de capa, arrastre del objeto, teclado, deshacer y guardado tras recargar; layouts 1366×768, 1920×1080, 3440×1440 y 390×844 sin scroll horizontal ni errores de consola.
- Capturas comparables (`node scripts/capturas.mjs`): 15 estados × 4 tamaños en `docs/capturas`, revisadas; comparación antes/después generada con las capturas previas a la iteración.
- Grabaciones (`node scripts/grabacion.mjs`): llamada con espera, café y comida, cubo y pelota (webm); revisadas cuadro a cuadro.
- Rendimiento (`scripts/perf.mjs`, headless sin GPU, 1366×768, build de producción): entrada→pintado ≤ 80 ms en todas las interacciones de juego (atender, contraer/expandir, espera, retomar, cortar, café, pizarra, cubo, pelota) y 144 ms al crear la guardia; levantar el cubo (descarga de three.js incluida) ~380 ms de reloj; 4 tareas largas, máx. 138 ms. Los tiempos de reloj altos de «Abrir pizarra» y «Retomar» incluyen la espera a que termine de aparecer el texto de la llamada, no trabajo del navegador.

## No verificado / límites

- **Audio no escuchado** (entorno sin salida de sonido): los murmullos se verificaron sólo por contadores internos (`window.__tdgSound.stats`): cantidad, corte al completar/espera/silencio. Timbre, volumen y agrado quedan por oír.
- No se probó con lector de pantalla real; sólo atributos ARIA y teclado.
- Rendimiento y WebGL medidos en headless con SwiftShader; conviene repetir `scripts/perf.mjs` en el equipo del usuario. Si WebGL no está disponible, el cubo muestra un aviso y una red plana y se sigue girando con teclado (no probado en un navegador sin WebGL).
- Gestos táctiles del cubo y la pelota: probados con eventos de puntero de mouse; no en un dispositivo táctil real.
- En móvil los avisos temporales (≈4 s) pueden tapar un momento el encabezado de un panel.
- `npm audit` informa una vulnerabilidad alta en `sharp` (sólo herramienta de assets, no llega al juego); su arreglo es un cambio mayor y quedó sin aplicar.
- Aprobación artística final: pendiente de que el usuario mire las capturas, las grabaciones o el juego.

## Siguiente acción exacta

Ninguna obligatoria. Opcional: jugar en vivo para escuchar las voces y ajustar su volumen por defecto; repetir `node scripts/perf.mjs` en el equipo del usuario; diseñar la noche 2 o el supervisor del tutorial con la skill `diseno-de-casos` (`docs/ROADMAP.md`).

## Archivos clave

`src/engine/game.ts`, `src/engine/cube.ts`, `src/content/cases/*.ts`, `src/content/station.ts`, `src/application/store.ts`, `src/ui/Desk.tsx`, `src/ui/panels/CallPanel.tsx`, `src/ui/panels/PauseCard.tsx`, `src/ui/panels/cube3d.ts`, `src/ui/os/mail.tsx`, `src/ui/os/browser.tsx`, `src/ui/os/windows.ts`, `e2e/*.spec.ts`, `scripts/capturas.mjs`, `scripts/grabacion.mjs`.
