# Turno de Guardia

Juego web sobre una guardia nocturna de soporte informático: sos Nico, técnico de soporte de Mutual Sur, de 23:00 a 07:00. Atendés llamadas, correos y alertas, investigás con un sistema operativo simulado, anotás pruebas en una pizarra de corcho y cerrás cada caso con verificación.

Creado por **Wilson / WillTech**. Todo es simulado: el juego no se conecta a redes ni ejecuta comandos en tu equipo.

## Empezar

```bash
npm install
npm run dev        # http://localhost:5173
```

Build: `npm run build && npm run preview`. Comprobaciones: `npm run check` (tipos, lint, formato, pruebas y build) y `npm run test:e2e` (navegador).

## Cómo jugar

- **Nueva guardia** ofrece una práctica breve (se puede omitir y repetir desde «Cómo se juega»).
- Clic en los objetos de la mesa: teléfono, monitor (GuardiaOS), pizarra, cuaderno, taza, pelota, cubo, papeles. Con teclado: Tab y Enter; Escape cierra.
- Las pruebas e intervenciones muestran su costo en minutos antes de ejecutarse. Leer y conectar notas es gratis.
- En la pizarra elegí una hipótesis, conectá las notas y tomala como hipótesis de trabajo.
- Intervení, verificá con la persona y cerrá el ticket. Hasta dos expedientes activos a la vez.

## Retomar y semillas

- «Continuar» restaura la guardia guardada en el navegador (localStorage).
- `?semilla=7` (controlador), `?semilla=1` (trabajo trabado) o `?semilla=2` (nombre viejo) fijan la causa del expediente 001. También en Opciones → Pruebas.

## Dónde agregar casos

`src/content/cases/` (ver `docs/CASOS.md` y la skill `.claude/skills/diseno-de-casos`). Arquitectura y reglas en `CLAUDE.md`.

Documentación: `docs/PROGRESS.md` (estado), `docs/CASOS.md`, `docs/ARTE.md`, `docs/DECISIONES.md`, `docs/ROADMAP.md`, `docs/capturas/`.
