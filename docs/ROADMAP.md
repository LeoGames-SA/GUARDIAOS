# Roadmap de noches futuras

El contenido es declarativo: una noche = lista de casos (`src/content/index.ts → nights`). Para sumar una noche:

1. Ficha en `docs/CASOS.md` (skill `diseno-de-casos`).
2. `CaseDef` nuevo en `src/content/cases/` con variantes, hipótesis, pruebas e intervenciones.
3. Registrar la noche y habilitarla en el menú cuando exista (hoy el menú sólo ofrece la noche 1, sin botones de capítulos inexistentes).

Ideas de noche 2 (no implementadas):

- VPN de un médico de guardia que no conecta (certificado vencido vs. horario de la cuenta).
- Correo masivo sospechoso (phishing) con decisión de contención.
- Variantes adicionales del 002 (grupo correcto pero herencia de permisos cortada) y del 003 (base de datos llena).
- Progreso: más ranuras del puesto (radio de pasillo, lámpara regulable) sólo si cambian algo jugable.
