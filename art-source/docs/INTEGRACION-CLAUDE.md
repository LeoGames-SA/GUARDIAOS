# Instrucción para Claude Code

Integrá este paquete en Turno de Guardia para mejorar el aspecto de la escena, conservando el funcionamiento y la accesibilidad existentes. Trabajá en el repositorio real y leé su CLAUDE.md antes de tocar código. El paquete es arte e información de montaje, no un reemplazo del motor.

## 1. Preparación

- Conservá un punto recuperable con Git, sin sobrescribir trabajo del usuario.
- Revisá el catálogo completo y abrí cada imagen que vayas a usar.
- Contrastá `asset-manifest.json` con la escena real. No copies posiciones a ciegas.
- Empezá en una vista de prueba aislada; no reemplaces inmediatamente la partida.
- No migres de motor como parte de esta tarea. Mantené React, TypeScript y las reglas existentes.

## 2. Contrato de arte

Base propuesta: 1672 × 941, resolución real del fondo. Paleta: sombras azul petróleo, madera nogal, luz ámbar izquierda, borde frío derecho. Mantener proporción natural de cada PNG; el tamaño del lienzo incluye margen transparente y no equivale al tamaño del cuerpo visible.

La composición concentra pizarra arriba a la izquierda; ventana detrás a la derecha; monitor a la derecha; teléfono a la izquierda; cuaderno en primer plano. Teclado debajo del monitor, mouse a su derecha. La lámpara, planta, portalápices y comida son secundarios.

El fondo ya incluye pared, ventana, ciudad, mesa e iluminación base. No colocar otra mesa ni otra ventana encima. No contiene los objetos interactivos. El cartel del edificio exterior es decorativo y no define el trabajo ni los casos.

Usá el fondo como capa 0; decorado 10–20; objetos 30–50; notas/hilos dentro del contenedor de pizarra; manos decorativas en una capa frontal que nunca tape interacción; HUD y paneles por encima.

## 3. Recursos y usos

| Archivo | Uso y comportamiento |
|---|---|
| background.png | Fondo estático, nunca estirado de forma no uniforme |
| monitor.png | Carcasa y pie; interfaz DOM encima de la pantalla |
| telephone-base.png | Base sin auricular, queda visible durante llamada |
| telephone-handset.png | Auricular apoyado; ocultar cuando se usa pose de llamada |
| keyboard.png | Anclaje visual bajo monitor; no convertir cada tecla en botón |
| mouse.png | Mouse independiente; ocultar con hand-mouse |
| corkboard.png | Corcho vacío: notas, textos, chinches e hilos son capas separadas |
| notebook.png | Cuaderno abierto: contenido legible en panel plano al seleccionarlo |
| manual.png | Manual general, distinto del cuaderno y de las pruebas del caso |
| coffee-mug.png | Café disponible; ocultar durante pose de taza sostenida |
| desk-lamp.png | Decoración o control existente; no añadir un sistema nuevo |
| stress-ball.png | Acceso al minijuego existente; deformación breve por código |
| rubik-cube.png | Icono de acceso; no reemplaza el estado 3×3 del minijuego |
| ticket-paper.png | Soporte visual de ticket; título y contenido reales en DOM |
| memo-paper.png | Aviso/documento; contenido real en DOM |
| sticky-note.png | Base reutilizable de notas del expediente |
| pushpin.png | Chinche decorativa; unión del hilo en un anclaje DOM explícito |
| hand-mouse.png | Pose derecha con mouse incluido |
| hand-phone.png | Pose izquierda con auricular incluido |
| hand-coffee.png | Pose derecha con taza incluida |
| cat-easter-egg.png | Ilustración local para easter egg; no es un video |
| snack.png | Representación de la pausa para comer |
| plant.png | Decoración secundaria |
| pen-holder.png | Decoración secundaria |

## 4. Monitor y GuardiaOS

Conservá aplicaciones, ventanas, navegación, arrastre y foco existentes. No dibujes su contenido en un PNG.

La estimación de pantalla interior respecto al PNG es x=20.1%, y=15.6%, ancho=61.1%, alto=51.4%. Es una medición visual aproximada, no una garantía de ajuste perfecto. Calibrala con una superposición de depuración. El área debe tener fondo opaco para que la ciudad no atraviese el monitor.

En vista general se puede mostrar una miniatura simplificada sin botones minúsculos. Al seleccionar monitor, abrir GuardiaOS en una vista plana, enfocada y legible. No hacer que todos los controles se reduzcan al tamaño físico de la pantalla ilustrada. Conservá cerrar con Esc y devolver foco al monitor.

## 5. Pizarra y documentos

Conservá la procedencia Dijo / Comprobé / Intenté y las reglas de hipótesis. Las notas se generan a partir del expediente activo. No mostrar una nota ficticia para llenar el espacio.

Los hilos deben medirse entre centros de anclajes DOM, no entre el borde del PNG o su margen transparente. Usá el mismo contenedor y transformación para notas e hilos. Recalcular al cambiar layout, escala y contenido; evitar lecturas/escrituras de layout alternadas continuamente durante el render.

La chinche se puede mostrar como sprite pero su anclaje es un elemento lógico. La precisión anterior debe conservarse. Los textos completos deben leerse ampliados sin obligar a descifrar letras sobre una perspectiva oblicua.

## 6. Accesibilidad y entradas

Cada objeto interactivo sigue siendo un button real con nombre accesible. La imagen interna lleva alt vacío cuando el botón ya tiene nombre. La decoración no recibe foco ni intercepta puntero. Áreas de toque razonables, foco visible y etiquetas al enfocar o señalar; en táctil no depender solo de hover.

No use la mano como cursor. No agregues un cursor dibujado que se retrase respecto del real. Las animaciones se pueden cancelar y no bloquean la entrada.

## 7. Fluidez y peso

Los originales son archivos de trabajo, no un presupuesto de descarga. No precargues las 24 imágenes grandes al entrar. Generá derivados a partir del script incluido o del pipeline del proyecto. Cargá primero fondo y objetos visibles; poses, gato y documentos ampliados bajo demanda.

El script conserva transparencia pero no corrige un matte defectuoso. Revisá el resultado visual después de convertirlo.

Medí la escena actual y luego la nueva con el mismo recorrido: entrar, monitor, mover ventana, cerrar, teléfono, pizarra, descanso. Separá tirones de render, demoras de reacción y esperas de diseño. Tests que pasan no equivalen a rendimiento demostrado.

No animar sombras enormes ni filtros blur sobre toda la escena. Para movimientos decorativos usar transform/opacity cuando corresponda. Pausar efectos al ocultar la pestaña y respetar movimiento reducido. Los relojes de render no deben avanzar el tiempo narrativo.

## 8. Adaptación

En escritorio, escalar un contenedor común manteniendo relación de aspecto. En ultrawide, preferir márgenes ambientados antes que deformar la mesa. En móvil, mantener la navegación y paneles adaptados existentes: el montaje HTML de este paquete no es una solución móvil terminada.

No ocultar una acción esencial al ocultar un objeto decorativo o la mano. Probar al menos 1366×768, 3440×1440 y 390×844.

## 9. Aprobación

Primero mostrar una escena con fondo, monitor/GuardiaOS y teléfono funcionales. Comparar con la referencia y corregir tamaños, contactos con la mesa, opacidad y legibilidad. Después extender al resto.

Mantener guardados y casos. Ejecutar las comprobaciones exigidas por el repo y revisar errores de consola. Entregar capturas comparables, un recorrido si se puede grabar y mediciones de las acciones lentas. Informar qué se probó realmente.

No declarar el arte final solo porque los archivos carguen. Transparencias internas, encastre del auricular y alineación de poses deben revisarse en contexto. Corregir el recurso o marcarlo pendiente, sin disimularlo con un placeholder presentado como definitivo.
