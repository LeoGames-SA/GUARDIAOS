# Decisiones

- **Stack**: Vite 8 + React 19 + TypeScript 6.0 (typescript-eslint todavía no admite TS 7). Sin motor de juego: escena de capas DOM/CSS con imágenes y SVG para hilos.
- **Tiempo**: un único reloj narrativo (0 = 23:00, 480 = 07:00). Cada acción avanza una vez; los eventos atravesados se procesan en orden. No hay límite oculto de acciones.
- **Estado**: el motor es puro (`step(content, state, action) → {state, events}`), la aplicación tiene un solo store y guarda tras cada acción válida (no por cuadro ni por arrastre).
- **Pizarra**: cada resultado de prueba declara su relación con cada hipótesis según lo observado. El respaldo suma notas conectadas (comprobación/intento 2, declaración 1). Una declaración sola nunca marca una hipótesis como «contradicha».
- **Semillas**: `pickVariant` fija 7 → controlador, 1 → trabajo, 2 → nombre; otras semillas usan `seed % 3`. `?semilla=N` en la URL o el campo de Opciones.
- **Correo**: responder incluye la espera de la respuesta en el costo (6 min), para no obligar a esperar en tiempo real.
- **Llamadas perdidas**: a los 10 min narrativos sin atender, la persona deja un mensaje y hay que devolver la llamada.
- **Esperar**: salta al próximo evento que puede cambiar algo; se omiten seguimientos y plazos de expedientes resueltos.
- **Práctica**: estado separado de la campaña, sin reloj ni penalizaciones; se guarda aparte y puede repetirse desde el menú.
- **Mejora**: segundo monitor al resolver y verificar al menos dos expedientes en una noche. En móvil se convierte en un acceso rápido «Correo/Hist.».
- **Cubo**: modelo 3D de 54 pegatinas con rotaciones reales; se guarda en el perfil. No da beneficios de juego.
- **Sonido**: síntesis WebAudio (sin archivos de terceros), sólo tras un gesto del usuario.
- **Hallazgos corregidos al jugar** (e2e): íconos del escritorio tapados por ventanas; correo que no mostraba la respuesta nueva; «Esperar» que frenaba en eventos irrelevantes; panel de llamada que tapaba la pizarra (ahora la escena se corre); en móvil la llamada se reduce a una barra al abrir un panel.
