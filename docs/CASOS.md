# Fichas de expedientes — Noche 1

Estas fichas son la fuente de diseño. El código vive en `src/content/cases/`. Los costos están en
minutos narrativos. «N» = nota en la pizarra: **D** dijo la persona, **C** comprobé, **I** intenté.

Organización ficticia: **Mutual Sur, sede central**. Dominio simulado `mutualsur.local`.

---

## Práctica — «No se escucha el audio de la PC» (teléfono, fijo)

- **Síntoma**: un video se reproduce en PC-REC-01 (recepción) pero no se escucha.
- **Causa**: la salida predeterminada es el monitor HDMI, que no tiene altavoces. Hay auriculares USB conectados.
- **Alternativas plausibles**: video silenciado; auriculares rotos.
- **Persona**: Marta Quiroga, recepción. Se presenta en su primera intervención.
- **Pruebas**: revisar dispositivo de salida (acceso remoto → Sonido) → C «La salida es el monitor HDMI, sin altavoces».
- **Intervenciones**: subir volumen (no cambia, orienta); elegir Auriculares USB como salida (corrige).
- **Verificación**: sonido de prueba + preguntarle si ahora escucha.
- **Costos**: ninguno. No consume tiempo de campaña ni tiene penalizaciones.

---

## 001 — Impresión detenida (teléfono, Elena Suárez, Administración)

Llega 23:00. Plazo orientativo 00:30 (cierre operativo). Llamadas de seguimiento 23:40 y 00:15 si sigue abierto.
Equipos: PC-ADM-07 (Elena), SRV-IMP-01 `srv-impresion` (10.20.0.15), impresora IMP-ADM-02.

**Síntoma**: Elena manda a imprimir la documentación del cierre y no sale nada.

### Variantes (semillas QA: 7 controlador · 1 trabajo · 2 nombre)

| Variante | Causa real                                                                                    | Intervención coherente                                                                                     |
| -------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `driver` | UniPrint 6.0 instalado a las 21:40 hace caer el servicio de cola al procesar trabajos         | Revertir a 5.2 (el procedimiento reinicia el servicio) y verificar                                         |
| `job`    | Trabajo 412 (planilla de J. Méndez) trabado primero en la cola                                | Cancelar 412, avisar a Méndez que reenvíe, verificar                                                       |
| `dns`    | Servidor migrado de 10.20.0.12 a 10.20.0.15 a las 22:30; el registro DNS quedó en la IP vieja | Corregir registro DNS + renovar caché en PC-ADM-07 (o esperar 60 min / reiniciar PC), verificar por nombre |

Selección: partida nueva usa `seed` aleatoria; `variant = seed % 3` con tabla `{0: job? ...}` definida en
`case-001-printer.ts` (`pickVariant`). Las semillas 7, 1 y 2 están fijadas como fixtures de QA.

### Hipótesis

H-drv controlador defectuoso tras un cambio · H-job trabajo trabado en la cola · H-dns el nombre apunta a una
dirección vieja · H-hw problema físico de la impresora.

### Matriz de pruebas

| Prueba (costo)                     | driver                                                        | job                                          | dns                                     |
| ---------------------------------- | ------------------------------------------------------------- | -------------------------------------------- | --------------------------------------- |
| Alcance por nombre (2)             | responde → contra H-dns                                       | responde → contra H-dns                      | no responde → apoya H-dns               |
| Alcance por IP 10.20.0.15 (2)      | responde                                                      | responde                                     | responde                                |
| Resolver nombre desde PC (1)       | → .15 contra H-dns                                            | → .15 contra H-dns                           | → .12 apoya H-dns                       |
| Cola de IMP-ADM-02 (2)             | trabajo de Elena en **Error** (apoya drv y job, no distingue) | 412 en Error primero, 3 detrás → apoya H-job | vacía → contra H-job                    |
| Página de prueba (3)               | no sale, servicio cae → apoya H-drv                           | queda detrás de 412 → apoya H-job            | sale → contra drv/job/hw                |
| Controlador instalado (1)          | 6.0 desde 21:40 → apoya H-drv                                 | 6.0 desde hace 8 días                        | ídem                                    |
| Estado del servicio (1)            | detenido 22:47 → apoya H-drv                                  | en ejecución → contra H-drv                  | en ejecución → contra H-drv             |
| Eventos servidor (3)               | caídas con uniprint6.dll → apoya H-drv                        | reintentos del 412 → apoya H-job             | sin trabajos desde 22:30 → apoya H-dns  |
| Eventos PC (3)                     | servidor no responde estado                                   | enviado, en espera                           | no conecta con 10.20.0.12 → apoya H-dns |
| Panel impresora (1)                | Lista → contra H-hw                                           | ídem                                         | ídem                                    |
| Registro de cambios (documento, 0) | actualización de controlador hoy                              | controlador hace 8 días                      | migración de IP hoy                     |

**Declaraciones** (1 min c/u): desde cuándo, mensaje exacto, otras PC (en todas: «a Julián tampoco»), qué reinició
(«la impresora y la PC» → no distingue), cambios recientes (distinto por variante, incierto).

### Intervenciones

| Intervención (costo)                                  | driver                                                                    | job                                                   | dns                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------- |
| Reiniciar servicio (3)                                | arranca y vuelve a caer al procesar → **temporal**                        | 412 sigue primero                                     | arranca; siguen sin llegar trabajos                       |
| Cancelar trabajo bloqueante (2, requiere ver la cola) | vacía cola, el servicio sigue cayendo; Elena debe reenviar (consecuencia) | **corrige**                                           | no hay trabajos que cancelar                              |
| Revertir controlador a 5.2 (8)                        | **corrige**                                                               | sin cambio; se pierde la actualización (consecuencia) | ídem                                                      |
| Corregir registro DNS (5)                             | ya estaba bien                                                            | ya estaba bien                                        | corrige el servidor; la PC conserva caché 60 min          |
| Renovar caché DNS en PC (1)                           | sin cambio                                                                | sin cambio                                            | **corrige** si el registro ya fue corregido               |
| Reiniciar PC-ADM-07 (6)                               | sin cambio; Elena pierde planilla abierta (consecuencia)                  | ídem                                                  | renueva caché (corrige si DNS corregido) con consecuencia |
| Reiniciar impresora (3)                               | sin cambio                                                                | sin cambio                                            | sin cambio                                                |

**Verificación**: pedirle a Elena que imprima (teléfono, 2). Cierre verificado sólo con su confirmación.
**Plazo**: a las 00:30 sin resolver → consecuencia «documentación entregada incompleta», estrés +8, resultado con costo.

---

## 002 — Carpeta compartida (correo, Tomás Ibarra, Compras)

Llega 23:20. Plazo orientativo 02:00. Equipos: PC-CMP-04, SRV-ARCH-01 `srv-archivos`, recurso `\\srv-archivos\Compras`.

- **Síntoma**: «Acceso denegado» al abrir la carpeta de Compras. Logística sí abre.
- **Causa**: pasó de Logística a Compras el lunes; RRHH aprobó (solicitud RRHH-2291, autoriza `GG_Compras_Editores`
  y retirar `GG_Logistica_Editores`) pero nadie aplicó el cambio de grupo.
- **Alternativas**: red/conectividad; cuenta bloqueada o contraseña vencida; recurso caído o movido.

| Prueba (costo)                   | Resultado                                          | Relación                         |
| -------------------------------- | -------------------------------------------------- | -------------------------------- |
| Identidad de tibarra (1)         | activa, sin bloqueo, depto Compras                 | contra cuenta                    |
| Grupos de tibarra (1)            | Logística_Editores, Todos                          | apoya permisos                   |
| Permisos del recurso (2)         | Compras_Editores: modificar; Compras_Lectura: leer | apoya permisos                   |
| Acceso efectivo (2)              | ninguno (tras alta: modificar)                     | apoya permisos                   |
| Alcance srv-archivos (2)         | responde                                           | contra red, contra recurso caído |
| Abrir recurso desde PC (2)       | el servidor responde «acceso denegado»             | contra red, apoya permisos       |
| Eventos de seguridad (3)         | denegaciones a tibarra 23:05 y 23:12               | apoya permisos                   |
| Buscar solicitudes (2)           | RRHH-2291 aprobada → habilita alta                 | autorización                     |
| Credenciales de sesión en PC (1) | grupos del token (antes/después)                   | —                                |

**Correo** (respuestas contextuales, 6 min incluida la espera): pedir PC y mensaje; preguntar por cambio de puesto
(da el número RRHH-2291); pedir que cierre sesión y vuelva a entrar; pedir que pruebe; informar avance.

**Intervenciones**: agregar a Compras_Editores (3, requiere autorización encontrada); agregar a Compras_Admin (3,
no autorizado → consecuencia de seguridad); retirar Logística_Editores (2, recomendado por la solicitud);
restablecer contraseña (2, innecesario → consecuencia); renovar sesión remota (2) o pedirle cerrar sesión.
**Verificación**: Tomás confirma que abrió y guardó. **Escalar**: apropiado si no se encontró la autorización.
**Plazo** 02:00: consecuencia «Tomás avisó a su jefa que no pudo avanzar».

---

## 003 — Portal interno caído (ticket automático, Monitor)

Llega 01:00 (alerta MON-5531). Plazo orientativo 04:00. Equipos: SRV-APP-02 `portal.mutualsur.local` (10.20.1.30),
SRV-BD-01.

- **Síntoma**: el monitor recibe HTTP 503 desde 00:52.
- **Causa**: mantenimiento 00:30 (parche + reinicio). Tras reiniciar, el servicio de aplicación `PortalPersonal`
  tiene inicio manual y no arrancó. El servidor web responde 503.
- **Alternativas**: red/DNS; base de datos caída; servidor apagado.

| Prueba (costo)                     | Resultado                                          | Relación                            |
| ---------------------------------- | -------------------------------------------------- | ----------------------------------- |
| Alcance por nombre (2)             | responde 10.20.1.30                                | contra red, contra apagado          |
| Abrir portal en navegador (1)      | 503 del servidor web                               | contra apagado; no distingue app/BD |
| Página /salud (1)                  | 503 (antes) / 200 (después)                        | —                                   |
| Servicios de SRV-APP-02 (1)        | web en ejecución; PortalPersonal detenido (manual) | apoya servicio                      |
| Conexión a BD (2)                  | responde                                           | contra BD                           |
| Eventos 00:30–01:00 (3)            | reinicio 00:33; PortalPersonal no iniciado         | apoya servicio                      |
| Aviso de mantenimiento (documento) | parche + reinicio 00:30                            | correlación                         |

**Intervenciones**: iniciar PortalPersonal (2, corrige); configurar inicio automático (1, calidad); reiniciar servidor
web (3, sin cambio); reiniciar servidor completo (12, sin cambio + corta mensajería → consecuencia).
**Verificación**: /salud 200 desde Nico **y** revalidación del monitor externo (2). **Comunicar**: publicar
actualización en el ticket (1). **Plazo** 04:00: consecuencia «turno mañana sin portal; supervisión pide informe».

---

## Tiempos de referencia

- Preguntas: 1 min. Pruebas: 1–3 min. Intervenciones: 1–12 min. Correos: 6 min (incluye espera).
- Pausas: café 5, comer 20, baño 5, aire 10, pelota 2, gato 1. Cubo: sin tiempo ni efecto.
- Cansancio (energía < 25) o baño urgente (> 85): +25 % en pruebas e intervenciones (redondeo hacia arriba).
- Recorrido limpio de 001 ≈ 12–20 min; probar todo al azar ≈ 45–60 min y pasa el plazo.
