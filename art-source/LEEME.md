# Turno de Guardia — Paquete de arte v1

24 ilustraciones separadas, generadas para la escena de escritorio nocturno. Fecha: 28/09/2026.

## Empezar

1. Extraé el ZIP completo, conservando sus carpetas.
2. Abrí `catalogo.html` con doble clic para ver los archivos y descargar cada PNG por separado.
3. Abrí `escena.html` para un montaje técnico inicial. No es el juego ni una integración aprobada.
4. Entregá a Claude esta carpeta y pedile leer `docs/INTEGRACION-CLAUDE.md`.
5. Antes de integrar, generar copias livianas con `integration/optimize-assets.mjs`, manteniendo los originales.

## Carpetas

- `assets/`: 24 PNG originales. Un fondo RGB y 23 objetos RGBA.
- `asset-manifest.json`: tamaños reales, peso, hashes, límites visibles aproximados y posiciones propuestas.
- `docs/INTEGRACION-CLAUDE.md`: instrucciones detalladas para el proyecto.
- `docs/ESTADOS-Y-ANIMACIONES.md`: cambios de pose, prioridades y efectos.
- `docs/CONTROL-DE-CALIDAD.md`: comprobaciones realizadas y pendientes.
- `docs/PROMPTS-DE-GENERACION.json`: especificaciones usadas en generación.
- `integration/`: optimización opcional y estilos de referencia.

## Alcance real

Este paquete cubre la habitación principal y sus objetos actuales. No incluye nuevas habitaciones para patio/baño, audio, fuentes, animaciones por cuadros ni un video del gato. El gato es una ilustración estática para el easter egg. La UI, los estados del cubo, los hilos, el vapor, las notificaciones y la lluvia deben seguir siendo elementos programados.

Las poses de la mano incluyen el objeto sostenido: nunca mostrarlas junto con su duplicado independiente. No son cuadros alineados de una animación y no se deben interpolar como si lo fueran.

Son ilustraciones con estética pixelada, no sprites de una misma grilla de baja resolución. No aplicar `image-rendering: pixelated` indiscriminadamente. Revisar el resultado a su tamaño real.

## Transparencia y montaje

Los PNG tienen canal alfa real, pero varias ilustraciones contienen semitransparencias internas y de borde. Que exista alfa no garantiza que el objeto sea completamente opaco. Revisar sobre fondo oscuro y claro mediante el catálogo; ver el control de calidad. La pantalla debe quedar cubierta por un panel DOM opaco. Si un cuerpo deja pasar la textura del fondo, corregir el matte de ese recurso antes de aprobarlo.

La geometría del auricular suelto y la base requiere calibración. No se ha validado un encastre exacto. Las posiciones de `escena.html` son una propuesta, no coordenadas extraídas de tu repositorio.

## Procedencia

Ilustraciones generadas mediante la herramienta integrada de imágenes, con la propuesta visual de Turno de Guardia como referencia común. Los archivos se entregan separados sin modificar sus píxeles originales. El HTML y los estilos auxiliares se escribieron para este paquete. No se incluyeron packs de terceros.
