# Estados visuales propuestos

Estas son instrucciones de integración, no animaciones ya renderizadas.

| Situación | Mostrar | Ocultar | Movimiento recomendado |
|---|---|---|---|
| Reposo | mouse, base y auricular, taza | poses | Ninguno obligatorio |
| Trabajo con PC | hand-mouse opcional | mouse independiente | Entrada breve por borde inferior; no seguir al cursor |
| Llamada entrante | base y auricular | hand-phone | LED DOM y oscilación pequeña del auricular, sin mover toda la mesa |
| Llamada atendida | base y hand-phone | auricular independiente, otras poses | Entrada lateral breve; mostrar conversación sin esperar animación |
| Café | hand-coffee | taza independiente, otras poses | Entrada desde abajo; al terminar volver a taza en mesa |
| Pelota | stress-ball | ninguna | Compresión leve al pulsar, restauración breve; coste narrativo según motor |
| Cubo | rubik-cube en escena | ninguna | Abrir minijuego real; no simular sus giros deformando esta imagen |
| Gato | cat-easter-egg en navegador | ninguna | Ilustración local; respiración muy sutil opcional, no fingir que es un video |

Prioridad de poses: la acción explícita activa decide; una llamada entrante sola no debe arrebatar la taza de la mano. No mostrar dos poses a la vez ni ambos duplicados de un mismo objeto. Mantener el tamaño del objeto entre pose y reposo al calibrar.

Las imágenes de pose no comparten lienzo ni pivote. Medir puntos de apoyo antes de animarlas. No hacer una interpolación continua entre ellas: son cambios de pose con transiciones cortas, no un rig articulado.

## Efectos programados

- Vapor: dos o tres trazos SVG pequeños anclados a la taza, solo si corresponde al estado. Se desactiva en movimiento reducido.
- Lluvia: una capa recortada al vidrio. No pasar por delante del monitor ni de la pared.
- Luces: variaciones discretas; no parpadeo intenso. El fondo tiene iluminación horneada, por lo que apagar la lámpara no produce una noche físicamente correcta con este único fondo.
- Hilos: SVG vivo unido a anclajes; estado semántico del motor.
- LED y reloj: DOM/CSS. La hora siempre viene del turno, no del reloj del dispositivo.
- Reacción al clic: inmediata. Transiciones orientativas de 100–180 ms para detalles y 180–280 ms para paneles; ajustar jugando.

## Recursos que no conviene dibujar como bitmaps

Textos, números, títulos de tickets, barras de estado, cursores, foco, iconos ya existentes del sistema, menús contextuales, resultados técnicos, conexiones de red y estados del cubo. Reutilizar los componentes actuales con estilos coherentes.
