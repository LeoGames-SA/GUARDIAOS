# Comprobación de la entrega

## Realizado

- 24 ilustraciones generadas individualmente; originales copiados sin modificar píxeles.
- Inspección de las salidas mostradas por la herramienta de imágenes.
- Decodificación y verificación de los 24 PNG con Pillow.
- Dimensiones, modo de color, peso, canal alfa, límites visibles y SHA-256 registrados en el manifiesto.
- Fondo RGB; los otros 23 archivos contienen canal alfa con zonas transparentes.
- Documentación de exclusión entre cada pose y el objeto incluido en ella.
- Referencias locales del catálogo y del montaje comprobadas por análisis de archivos.
- Sintaxis de los scripts JavaScript comprobada con Node.
- Integridad del ZIP comprobada antes de entregar.

## Hallazgos y límites

- Se detectaron semitransparencias internas en algunas ilustraciones. Ejemplo: un píxel del interior de la pantalla de monitor tiene alfa 134/255; por eso es obligatoria una superficie opaca bajo GuardiaOS. Hay que comprobar también cuerpos y bordes sobre el fondo final; no son recortes con opacidad binaria garantizada.
- La base y el auricular se generaron por separado: hace falta ajustar tamaño, posición y posiblemente el recorte para un encastre perfecto. No se afirma que estén calibrados.
- Las poses de mano no forman un sprite sheet ni una animación articulada. La mano con mouse tiene una perspectiva algo más superior que la escena: evaluar su tamaño y uso en contexto.
- Los PNG tienen distintas dimensiones y márgenes. No tratarlos como cuadros uniformes ni anclarlos por el borde visible suponiendo que coincide con el borde del archivo.
- Algunos recursos mantienen detalles incidentales del estilo (numeración del teléfono, cartel exterior). No son datos narrativos.
- El gato es una imagen estática, no el video originalmente imaginado.
- No se modificó ni ejecutó el repositorio de Turno de Guardia del usuario. No se probaron casos, guardados, rendimiento ni accesibilidad de esa aplicación.
- Se intentó revisar `escena.html` con Playwright, pero el entorno carece del ejecutable de Chromium y su descarga no se completó correctamente. No hay captura validada del montaje ni prueba interactiva en navegador de este paquete.
- `optimize-assets.mjs` se entrega como utilidad con sintaxis comprobada; no se ejecutó la conversión ni se midieron pesos de derivados. El paquete contiene originales de aproximadamente 35 MB.

## Antes de aprobar en el juego

1. Revisar recortes sobre fondo claro y oscuro en `catalogo.html`.
2. Corregir cualquier objeto que deje ver la mesa a través de su cuerpo. No declarar ese recurso final sin corregir el matte.
3. Calibrar pantalla, auricular, manos y zonas de clic.
4. Exportar tamaños de uso y evitar cargar todas las poses de antemano.
5. Probar interacción, teclado, móvil y ultrawide en el juego real.
6. Comparar fluidez antes/después con mediciones del mismo recorrido.

Este documento distingue recursos generados de integración terminada. La aprobación artística corresponde al usuario mirando la escena real.
