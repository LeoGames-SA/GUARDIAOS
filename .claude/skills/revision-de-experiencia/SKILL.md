---
name: revision-de-experiencia
description: Revisar la experiencia de juego (fluidez, textos, accesibilidad, tutorial) antes de cerrar un cambio de interfaz o diálogo.
---

Revisá con el juego abierto (`npm run dev` + captura con Playwright si no hay pantalla):

- Respuesta inmediata al clic; transiciones 100–180 ms (detalles) y 180–280 ms (paneles); nada bloquea mientras anima.
- Diálogo: una intervención por vez, sin adelantar nombres ni opciones; clic/Enter/Espacio completa la frase.
- Costos visibles antes de ejecutar; relectura gratis; intervenciones con confirmación y riesgo.
- Texto en voseo y sin errores; ninguna causa real antes del informe.
- Teclado: Tab, Enter/Espacio, Escape devuelve el foco al objeto; menú contextual con Shift+F10.
- Sin información sólo por color (hilos: trazo + etiqueta). `aria-live` sólo para eventos relevantes.
- Layouts 1366×768, 1920×1080, 3440×1440 y 390×844 sin scroll horizontal ni controles tapados.
  Informá qué se comprobó de verdad y qué no (p. ej., lector de pantalla real).
