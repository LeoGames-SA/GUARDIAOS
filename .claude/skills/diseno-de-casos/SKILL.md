---
name: diseno-de-casos
description: Diseñar o modificar expedientes y noches de Turno de Guardia (ficha, matriz de pruebas, variantes, costos). Usar al tocar src/content/cases o docs/CASOS.md.
---

1. Escribí primero la ficha en `docs/CASOS.md`: síntoma, causa real, alternativas plausibles, matriz resultado-por-prueba y por variante, declaraciones, intervenciones, verificación, costos, consecuencias.
2. Implementá el caso como `CaseDef` en `src/content/cases/` y registralo en `src/content/index.ts` (y en una noche de `nights`).
3. Cada prueba responde una pregunta concreta (`asks`). Las `relations` se basan en lo que la prueba observa en ese estado del mundo; una pista llamativa no debe resolver sola el caso.
4. Declaraciones (`question`) nunca «contradicen» con fuerza; son notas «Dijo».
5. Toda intervención tiene `risk` sin revelar la causa. Las equivocadas marcan `wrong` y una `consequence` recuperable.
6. La verificación (`verify`) sólo `confirms` si `isFixed` es verdadero. Definí `keyProbes` por variante para el informe.
7. Agregá pruebas en `tests/engine.test.ts`: recorrido limpio por variante, intervención equivocada y bloqueo de cierre sin verificación. Corré `npm test`.
