# Progreso — Turno de Guardia

Rama: `claude/turno-guardia-game-8upsky`. Estado: **noche 1 completa y jugable** (etapas A–F) + **iteración de pulido visual e interacción** (6 etapas) + **correcciones de la prueba del jugador** (4 etapas), todo subido.

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
- **Correcciones de la prueba del jugador** (cuatro capturas: mesa, acceso remoto, ticket, espera):
  1. Mesa con profundidad: franja de madera delante de los objetos, sombras de contacto, escalas y filas reordenadas; tutorial en una franja propia bajo la barra superior (no tapa objetos ni la barra de tareas); escenario con tope de 2240 px.
  2. Ticket como hoja de solicitud impresa (sin aspecto de cupón); llamada con intervención actual destacada e historial ampliable; espera que se contrae a una tarjeta compacta y se retoma sin perder el diálogo.
  3. Cubo: gestos que siguen al dedo desde cualquier ángulo, eje fijo tras un umbral, espacio libre para girar el objeto, mezcla animada giro a giro y cierre a mitad seguro.
  4. Asistencia remota en la práctica de audio: permiso por diálogo, conexión registrada, escritorio remoto simulado con panel de sonido, selector de salida, configuración, prueba y desconexión; tutorial que señala el control concreto; estructura `CaseDef.remote` reutilizable; migración de prácticas guardadas.
- Supervisor del tutorial: sólo registrado como idea en `docs/ROADMAP.md`.

## Verificado (ejecutado de verdad)

- `npm run check`: tipos, lint, formato, **77 pruebas** (motor, cubo, gestos del cubo en 40 orientaciones, asistencia remota, guardado con migración) y build — en verde.
- `npm run test:e2e`: **29 recorridos** en Chromium headless — en verde. Además de los anteriores: práctica completa con asistencia remota (permiso, conexión, recarga sin sesión duplicada, panel de sonido, salida equivocada que no resuelve, pizarra con observación/intento/confirmación separados, volumen remoto sin tocar el del juego, confirmación y desconexión); mesa con madera delante y tutorial fuera de escena y barra en 4 tamaños; espera contraída, ayuda con «?», recarga y retomar; hoja del ticket (sin causa, equipo sólo al conocerse); tarjeta del sándwich dentro de la pantalla en 4 tamaños; cubo desde tres ángulos (clic, gesto corto, capa a un costado y hacia abajo sin mover la cámara, giro del objeto) y mezcla visible con cierre y recarga.
- Capturas comparables (`node scripts/capturas.mjs`): 20 estados × 4 tamaños en `docs/capturas`, revisadas; comparación antes/después de los cuatro estados de la prueba del jugador.
- Grabaciones (`node scripts/grabacion.mjs … cubo-gestos,asistencia-remota`), revisadas cuadro a cuadro.
- Build de producción y servidor de desarrollo: probados.

## No verificado / límites

- **Audio no escuchado** (entorno sin salida de sonido): los murmullos se verificaron sólo por contadores internos (`window.__tdgSound.stats`): cantidad, corte al completar/espera/silencio. Timbre, volumen y agrado quedan por oír.
- No se probó con lector de pantalla real; sólo atributos ARIA y teclado.
- Rendimiento y WebGL medidos en headless con SwiftShader; conviene repetir `scripts/perf.mjs` en el equipo del usuario. Si WebGL no está disponible, el cubo muestra un aviso y una red plana y se sigue girando con teclado (no probado en un navegador sin WebGL).
- Gestos táctiles del cubo, la pelota y el escritorio remoto: probados con eventos de puntero de mouse; no en un dispositivo táctil real.
- El rendimiento no se volvió a medir en esta iteración (la última medición es de la iteración anterior).
- La asistencia remota interactiva existe sólo en la práctica de audio; los casos 001–003 siguen con la vista de acciones anterior (a propósito, según lo pedido).
- En móvil los avisos temporales (≈4 s) pueden tapar un momento el encabezado de un panel.
- `npm audit` informa una vulnerabilidad alta en `sharp` (sólo herramienta de assets, no llega al juego); su arreglo es un cambio mayor y quedó sin aplicar.
- Aprobación artística final: pendiente de que el usuario mire las capturas, las grabaciones o el juego.

## Siguiente acción exacta

Ninguna obligatoria. Opcional: jugar en vivo para escuchar las voces y ajustar su volumen por defecto; repetir `node scripts/perf.mjs` en el equipo del usuario; diseñar la noche 2 o el supervisor del tutorial con la skill `diseno-de-casos` (`docs/ROADMAP.md`).

## Archivos clave

`src/engine/game.ts`, `src/engine/cube.ts`, `src/content/cases/*.ts`, `src/content/station.ts`, `src/application/store.ts`, `src/ui/Desk.tsx`, `src/ui/panels/CallPanel.tsx`, `src/ui/panels/PauseCard.tsx`, `src/ui/panels/cube3d.ts`, `src/ui/os/mail.tsx`, `src/ui/os/browser.tsx`, `src/ui/os/windows.ts`, `src/ui/os/remote.tsx`, `src/ui/panels/cubeGesture.ts`, `src/ui/panels/DocPanel.tsx`, `e2e/*.spec.ts`, `scripts/capturas.mjs`, `scripts/grabacion.mjs`.
