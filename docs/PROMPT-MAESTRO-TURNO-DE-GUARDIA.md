# TURNO DE GUARDIA — Prompt maestro para reconstruir el juego desde cero

Actuá como responsable de desarrollo de un videojuego: ingeniería, diseño de interacción, narrativa técnica, integración artística y verificación. Construí el proyecto y sus archivos, ejecutalo, comprobalo y corregilo. Este pedido autoriza implementar el alcance definido abajo; no te limites a responder con un plan.

Estamos empezando una versión nueva desde cero, con lo aprendido en un prototipo anterior. El objetivo es un juego web completo, agradable y visualmente cuidado sobre una guardia nocturna de soporte informático. Tenemos ilustraciones propias adjuntas. La prioridad es una experiencia que se sienta bien al jugar, además de reglas correctas.

Tengo un presupuesto limitado de uso de la plataforma. Trabajá por etapas concretas, con avances breves y decisiones documentadas. No necesito largas discusiones sobre motores, arquitecturas hipotéticas ni decenas de funciones incompletas. No podés asumir cuántos créditos consume cada acción ni garantizar que todo entre en un número concreto: usá eficientemente las herramientas y mantené siempre una versión ejecutable.

## 0. Insumos, autoridad y comienzo

Adjunto un paquete de arte: `Turno-de-Guardia-Recursos-v1.zip`, o su carpeta extraída `turno-de-guardia-arte-v1`. Si recibís un ZIP de inicio que incluye este documento y esa carpeta, extraelo y localizá ambos.

1. Inspeccioná los archivos que realmente tenés disponibles. No asumas acceso a mi PC ni a un proyecto local anterior.
2. Si el entorno contiene otro proyecto, creá esta reconstrucción en una carpeta o rama separada sin borrar trabajo previo. Si está vacío, inicializá directamente el nuevo proyecto.
3. Leé este documento completo y el LEEME, manifiesto y control de calidad del paquete gráfico. Abrí las imágenes, no deduzcas su contenido solo del nombre.
4. Este documento es la especificación principal de la reconstrucción. Los documentos del paquete artístico describen recursos y limitaciones; sus referencias a conservar un motor anterior no aplican a este proyecto nuevo.
5. Una captura conceptual, si está adjunta, sirve para composición y atmósfera. Los textos incidentales dibujados en ella no son casos ni instrucciones del juego.
6. No afirmes haber visto adjuntos ausentes. Si falta un archivo indispensable, identificá cuál; continuá las partes independientes sin fingir que el arte está integrado.
7. Registrá brevemente las decisiones y empezá a implementar. No pidas confirmación por elecciones rutinarias dentro de este alcance.

## 1. Visión y experiencia del jugador

Nombre: **Turno de Guardia**.

Idioma: español rioplatense natural, con voseo y buena ortografía. Tono: noche tranquila, urgencias humanas y pequeños momentos de humor. El protagonista es **Nicolás Bentancor**, técnico de soporte, llamado Nico en la interfaz. El creador es **Wilson / WillTech**, en créditos discretos.

El jugador ocupa una mesa de soporte de una organización ficticia. Atiende llamadas, recibe correos y tickets, revisa equipos simulados, recoge pruebas, formula hipótesis, interviene y verifica el resultado con la persona afectada. También decide cuándo descansar durante el turno.

Debe sentirse como trabajar con una computadora dentro de una oficina: objetos físicos en la mesa y un sistema operativo ficticio funcional. Evitar aspecto de dashboard empresarial genérico o tablero de botones sin contexto.

La dificultad nace de interpretar información incompleta, distinguir declaraciones de comprobaciones, elegir pruebas y administrar tiempo compartido. El jugador no necesita conocer comandos de memoria. Los conocimientos técnicos se aprenden jugando y consultando el cuaderno.

Todos los equipos, direcciones, documentos, correos, terminales y servicios son simulados. No ejecutar comandos del sistema anfitrión, no conectarse a redes de una empresa ni abrir escritorios remotos reales. Explicalo de forma discreta en la ayuda, sin repetir avisos técnicos por toda la interfaz.

## 2. Alcance de la entrega

Implementá una **noche 1 completa**, de 23:00 a 07:00, con:

- Menú principal, continuar, nueva guardia, cómo se juega, opciones y créditos.
- Tutorial jugable opcional con un ticket de audio.
- Tres expedientes completos por canales distintos: teléfono, correo y ticket automático.
- Hasta dos expedientes activos simultáneamente, con pruebas separadas y un reloj común.
- Mesa ilustrada, teléfono, monitor, pizarra, cuaderno, documentos y accesorios.
- GuardiaOS con aplicaciones funcionales y ventanas que se abren, mueven, minimizan y cierran.
- Diálogos consecutivos, respuestas humanas y confirmación del resultado.
- Energía, estrés, necesidad de baño y cafeína; pausas y minijuegos breves.
- Historial, informe por caso, resumen de turno, guardado y restauración.
- Rejugabilidad del expediente 001 mediante tres causas coherentes.
- Una mejora del puesto por progreso, sin tienda ni economía.

No prometas una campaña infinita. Entregá esta noche terminada y dejá un sistema de contenido que permita agregar noches y casos sin reescribir pantallas. No muestres botones de capítulos inexistentes como si estuvieran disponibles.

## 3. Tecnología y estructura

Usá **Vite + React + TypeScript estricto**, con la escena compuesta por imágenes y capas DOM/CSS, y SVG para hilos y efectos pequeños. Aplicación local al navegador, sin backend, cuentas ni servicios pagos obligatorios.

Esta elección permite usar botones y textos accesibles mientras integramos las ilustraciones. No añadas Phaser, Godot ni otro motor en esta entrega por iniciativa propia. Si aparece una limitación comprobable, documentala con evidencia antes de proponer una migración.

Elegí versiones estables compatibles disponibles en el entorno; instalá y fijá dependencias con un lockfile. No copies números de versiones antiguas sin verificar compatibilidad. Preferí dependencias pocas y justificadas.

Separá responsabilidades, por ejemplo:

- `src/engine/`: reglas puras de casos, turno, tiempo, necesidades, hipótesis, consecuencias y minijuegos. Sin React, DOM, localStorage, temporizadores de UI ni importaciones de pantallas.
- `src/content/`: casos declarativos, diálogos, procedimientos, noches y configuración del puesto.
- `src/application/`: coordina motor, contenido y persistencia. Mantiene una única fuente de estado.
- `src/ui/scene/`: mesa, objetos accesibles y capas de ilustración.
- `src/ui/os/`: escritorio, ventanas y aplicaciones de GuardiaOS.
- `src/ui/panels/`: llamada, pizarra, cuaderno, pausas, informes y tutorial.
- `src/persistence/`: esquema de guardado, validación y migraciones futuras.
- `public/assets/`: derivados gráficos optimizados, con nombres estables.
- `tests/` y `e2e/`: pruebas del motor y recorridos críticos.

Podés ajustar nombres si mejora el proyecto; no conviertas esta lista en capas vacías sin utilidad.

El motor recibe acciones tipadas y devuelve estado/eventos. No dupliques el estado narrativo dentro de cada aplicación. Los resultados que muestran Correo, Red, Historial o Pizarra deben provenir del mismo expediente. La interfaz no inventa resultados para aparentar funcionalidad.

Creá `CLAUDE.md` breve con comandos reales, arquitectura, reglas y definición de terminado. Añadí pequeñas skills de proyecto para: diseño de casos, revisión de experiencia, integración de arte y comprobación de calidad. Usá el formato compatible con tu entorno y documentá cuándo aplicarlas. No instales hooks que consuman recursos o ejecuten suites completas por cada edición menor.

Definí comandos verificables: `dev`, `build`, `typecheck`, `lint`, `format:check`, `test`, `test:e2e` y `check`. `check` agrupa las verificaciones rápidas y build; e2e puede quedar separado si lo documentás. No declares cobertura cuando no existen tests.

## 4. Integración de las ilustraciones

El paquete contiene 24 PNG independientes:

| Archivo | Uso |
|---|---|
| `background.png` | Habitación, ventana y mesa sin objetos interactivos |
| `monitor.png` | Carcasa y pie; GuardiaOS se renderiza por separado |
| `telephone-base.png` | Base del teléfono sin auricular |
| `telephone-handset.png` | Auricular independiente |
| `keyboard.png`, `mouse.png` | Periféricos sobre la mesa |
| `corkboard.png` | Pizarra de corcho vacía |
| `notebook.png` | Cuaderno abierto |
| `manual.png` | Manual cerrado |
| `coffee-mug.png` | Taza |
| `desk-lamp.png` | Lámpara |
| `stress-ball.png`, `rubik-cube.png` | Accesos visuales a los minijuegos |
| `ticket-paper.png`, `memo-paper.png` | Documentos sin texto fijo |
| `sticky-note.png`, `pushpin.png` | Piezas de la pizarra |
| `hand-mouse.png` | Mano y mouse juntos |
| `hand-phone.png` | Mano y auricular juntos |
| `hand-coffee.png` | Mano y taza juntas |
| `cat-easter-egg.png` | Gato dormido para un easter egg local |
| `snack.png`, `plant.png`, `pen-holder.png` | Comida y accesorios |

Son ilustraciones detalladas con estética pixelada, no una grilla uniforme de sprites de 16 píxeles. No reemplazarlas por rectángulos CSS ni recrearlas con filas de caracteres. No aplicar `image-rendering: pixelated` indiscriminadamente.

### Revisión de recursos obligatoria

- El fondo mide 1672×941; los demás tienen dimensiones y márgenes distintos. Consultá el manifiesto real.
- Hay transparencias internas en algunos PNG, además del borde transparente. Un canal alfa presente no garantiza un recorte correcto. Inspeccioná sobre fondos claros y oscuros. Corregí el matte si la mesa atraviesa un objeto sólido; conservá el original y registrá el derivado.
- No uses un rectángulo negro enorme para ocultar una transparencia defectuosa fuera de la silueta.
- El interior del monitor debe tener un panel opaco bajo la interfaz.
- El auricular y su base necesitan ajuste de encastre. Las coordenadas del paquete son propuestas, no una calibración terminada.
- Las manos incluyen sus objetos. Al mostrar una pose, ocultá su duplicado independiente. Las poses no están alineadas como cuadros de una animación.
- La perspectiva de la mano con mouse puede necesitar corrección o reposicionamiento. No forzarla si parece desproporcionada.

Optimizar tamaño y peso antes de integrar. El paquete original pesa aproximadamente 35 MB y no debe cargarse entero al iniciar. Creá derivados WebP/PNG adecuados, conservá fuentes originales fuera de la carga inicial y cargá poses/documentos ampliados bajo demanda. Verificá que la optimización preserve los bordes.

Si falta una herramienta necesaria para corregir un recurso, declaralo y continuá con lo independiente. No presentes un placeholder como arte final ni vuelvas a generar toda la escena sin necesidad.

## 5. Composición de la mesa y cámara

Punto de vista: primera persona sentado, escritorio en perspectiva falsa 3D, cámara principalmente fija. Madera cálida, sombras azul petróleo, lluvia y ciudad nocturna, luz ámbar desde la izquierda y luz fría del monitor.

- Pizarra en pared a la izquierda; monitor a la derecha.
- Teclado debajo del monitor y mouse al alcance, con escala creíble.
- Teléfono a la izquierda, cuaderno en primer plano y documentos cerca.
- Taza, cubo y pelota accesibles pero secundarios.
- Lámpara y plantas sin tapar pruebas ni controles.
- Espacio reservado mediante configuración para un segundo monitor.

Evitar objetos flotantes, proporciones absurdas, grandes vacíos sin intención y etiquetas ovaladas siempre visibles. Usá sombras de contacto discretas. Los nombres aparecen al señalar o enfocar; táctil debe tener una alternativa clara.

Al seleccionar un objeto, mostrar un acercamiento breve y un panel plano legible. La información importante no debe deformarse sobre una perspectiva. Una acción recibe feedback inmediato, aunque termine una transición.

La mano es decoración ligada a acciones, nunca un cursor ni un elemento que siga al mouse. No debe tapar texto ni clics. En móvil puede omitirse sin perder acciones.

## 6. Fluidez y respuesta

La versión anterior se sentía lenta y tosca. Tratá esto como requisito de producto.

- Feedback visual de pulsación inmediato; no agregar esperas artificiales.
- Transiciones pequeñas de aproximadamente 100–180 ms; acercamientos/paneles de 180–280 ms como punto de partida, ajustable tras probar.
- Se puede cerrar o cambiar de objeto sin quedar atrapado en una cola de animaciones.
- No bloquear botones mientras se anima decoración.
- Nada de texto progresivo en menús, archivos ya leídos o resultados técnicos consultados. El efecto se reserva para conversaciones.
- Evitar renders globales por cada movimiento del mouse, lectura/escritura repetida de layout y filtros grandes animados.
- Pausar efectos decorativos en pestaña oculta. El reloj narrativo nunca depende del refresco visual.

Medí rendimiento en un recorrido real, con navegador, resolución y condiciones indicados. Como objetivos, buscá respuesta perceptible por debajo de 100 ms y animación cercana a 60 fps en el equipo de prueba cuando sea viable; no declares esos valores sin medirlos. Separá tirones, demora de reacción y lentitud narrativa.

## 7. Menú y primeros minutos

Menú principal dentro de la atmósfera de la oficina: título claro, fondo o vista de mesa, botones legibles. Opciones:

- Continuar, habilitado cuando existe una partida válida.
- Nueva guardia; confirmar únicamente si sobrescribe una partida activa.
- Cómo se juega: repetir tutorial en un espacio independiente del guardado de campaña.
- Opciones: sonido, volúmenes, texto progresivo, movimiento reducido y tamaño de texto si el layout lo admite.
- Créditos.

No reproducir sonido antes de una interacción del usuario. Respetar la preferencia guardada y las restricciones del navegador.

La primera nueva guardia ofrece práctica breve y jugable. Se puede omitir desde el comienzo. Si ya fue completada, no imponerla de nuevo.

## 8. Tutorial: «No se escucha el audio de la PC»

Caso independiente del expediente 001. Una persona se presenta durante la llamada; no revelar su nombre antes de esa intervención.

Secuencia aproximada:

1. Suena el teléfono. Resaltar discretamente el objeto y enseñar a atender.
2. Nico se presenta: «Mesa de ayuda, soporte técnico, habla Nicolás. Contame qué está pasando».
3. La persona explica que un video se reproduce pero no se escucha.
4. Pregunta breve para delimitar el problema.
5. Abrir el monitor y el equipo simulado de esa persona.
6. Revisar sonido: el dispositivo de salida está configurado en un monitor sin altavoces; hay auriculares disponibles.
7. Obtener una comprobación y verla en la pizarra.
8. Conectar esa comprobación con una hipótesis sencilla. Consultar el cuaderno mediante ayuda opcional.
9. Cambiar al dispositivo correcto en la interfaz simulada.
10. Hacer una prueba de sonido y preguntar por teléfono si ahora lo escucha.
11. Cerrar el ticket y entrar a la noche 1 con Elena.

Enseñar teléfono, monitor, pizarra y cuaderno mediante acciones reales. Una o dos frases por indicación, sin cadena de pantallas «Siguiente». Si se elige una opción equivocada, orientar sin castigar. Sin límite de acciones ni penalización; no consumir tiempo de la campaña.

Guardar el avance de la práctica. Recargar, omitir o repetir no debe romper ni borrar la campaña. Al repetir desde el menú, volver al menú al terminar salvo que el usuario elija iniciar una guardia.

## 9. GuardiaOS

Sistema operativo ficticio inspirado en computadoras de escritorio clásicas, con identidad propia: barra de tareas, menú de aplicaciones, ventanas, selección, estados y menús contextuales. No copiar marcas ni depender de un SO real.

Ventanas: abrir, activar al frente, mover, minimizar, restaurar y cerrar. Mantener dentro del área útil al redimensionar. Una ventana minimizada conserva su contexto. No duplicar instancias por clics repetidos. Evitar que una ventana quede fuera de alcance o tape permanentemente la barra.

Arrastrar con mouse o touch; alternativa mediante botones/teclado. Clic derecho y también botón «⋯»/Shift+F10 para menús contextuales. Puntero real del navegador, sin cursor dibujado aparte. Redimensionado de ventanas es opcional: no debe retrasar el funcionamiento de las operaciones anteriores.

Aplicaciones y funciones concretas:

| Aplicación | Debe permitir |
|---|---|
| Centro de tickets | Ver pendientes, tomar caso, prioridad, plazo, canal, responsable, estado y cierre |
| Correo | Leer mensajes, ver remitente conocido, adjuntos simulados y respuestas contextuales |
| Equipos y red | Elegir PC/servidor/dispositivo; ver propiedades; probar alcance, IP y nombre |
| Cuentas y permisos | Ver identidad, grupos y acceso efectivo del caso; aplicar intervención autorizada |
| Impresoras | Elegir impresora, ver cola, trabajos, estado, controlador y prueba de impresión |
| Servicios | Consultar servicio concreto e iniciar/reiniciar cuando corresponda |
| Eventos | Filtrar registros relevantes por equipo/hora; resultados consistentes con el caso |
| Archivos | Abrir ticket, aviso y manual; propiedades y contenido de archivos ficticios |
| Navegador | Sitios locales simulados, portal interno y base de conocimiento; sin conexión externa necesaria |
| Historial | Hora, origen, equipo, acción y resultado; separado por expediente y vista general |
| Procedimientos | Consulta contextual de conocimiento general |
| Consola | Comandos simulados opcionales y ayuda; equivalentes a acciones de la GUI |

Cada app existe porque aporta algo a los casos. No completar ventanas con lorem ipsum, gráficas decorativas o botones sin efecto. Acciones no disponibles explican por qué. No es necesario implementar un explorador o navegador universal.

El acceso remoto es una ventana simulada del equipo elegido, con nombre visible, escritorio reducido, panel pertinente y opción de desconectar. Distinguir siempre el equipo de Nico del remoto. No usar una captura estática como si fuese una PC funcional.

Los comandos de consola se analizan mediante una lista segura y finita. Nada de eval, shell o ejecución arbitraria. Releer resultados guardados es gratis; ejecutar una nueva prueba muestra su costo.

## 10. Tiempo, casos simultáneos y calendario

Una única hora narrativa de 23:00 a 07:00. Las acciones técnicas y pausas consumen minutos simulados; leer, pensar, cambiar ventanas o conectar notas no consume tiempo. No usar además un límite oculto de 12 acciones: evitar dos sistemas de castigo que se contradigan.

Mostrar costo antes de confirmar una intervención. Una acción costosa avanza el turno una sola vez y afecta todos los plazos. Procesar en orden cualquier llegada, devolución de llamada o vencimiento atravesado por ese avance. No perder eventos cuando una pausa salta varias horas del calendario.

Hasta dos casos activos, más una bandeja de pendientes. Cambiar de caso conserva ventanas, pruebas y progreso, y muestra claramente el expediente activo. La hora avanza para ambos aunque investiguemos uno solo. Nunca mezclar hipótesis o resultados de dos expedientes.

Propuesta inicial de calendario, a balancear con recorridos:

- 23:00: expediente 001 por teléfono; plazo orientativo 00:30.
- 23:20: expediente 002 por correo; plazo orientativo 02:00.
- 01:00: expediente 003 automático; plazo orientativo 04:00.
- 07:00: fin de turno y traspaso de pendientes.

Los plazos no borran automáticamente el caso. Producen una consecuencia o escalamiento comprensible. Si todo está resuelto, ofrecer cerrar la guardia o avanzar al próximo evento sin obligar a mirar horas vacías. Esperar siempre es una elección explícita.

Documentá minutos iniciales de pruebas, intervenciones y pausas. Balanceá para que haya margen de aprender, pero que reiniciar todo y probar al azar tenga un costo real.

## 11. Diseño de los tres expedientes

Antes de escribir grandes diálogos, creá una ficha breve de cada caso con: síntoma, causa real, alternativas plausibles, matriz de resultados por prueba, declaraciones, intervenciones, verificación, costos y consecuencias. La interfaz consume esa definición.

### Expediente 001 — Impresión detenida, Elena, teléfono

Necesidad humana: Elena debe imprimir documentación antes de un cierre operativo. Está apurada pero coopera. No convertirla en un obstáculo caricaturesco.

Tres variantes deterministas:

| Causa | Evidencia técnica que la distingue | Intervención coherente |
|---|---|---|
| Controlador defectuoso tras un cambio | Nombre/IP accesibles; servicio puede caer al procesar trabajos; eventos y registro de cambios relacionan el fallo con el controlador | Revertir a versión conocida, recuperar servicio y verificar impresión |
| Trabajo trabado en la cola | Red correcta; servicio estable; un trabajo bloquea la cola; otros registros no respaldan caída por controlador | Cancelar el trabajo identificado, gestionar reenvío y verificar |
| Nombre de servidor apunta a dirección vieja | Acceso por IP correcto y por nombre incorrecto; resolución y aviso de cambio permiten comparar | Corregir el registro o configuración simulada y renovar resolución según alcance; verificar por nombre |

La cola puede mostrar un error también en la variante de controlador: una pista llamativa no debe resolver todo por sí sola. Reiniciar el servicio puede ayudar temporalmente sin corregir la causa. Explicar la diferencia entre reiniciar PC, impresora y servicio.

Semillas de comprobación explícitas: 7 para controlador, 1 para trabajo y 2 para nombre. Podés implementar estas como fixtures de QA y usar RNG determinista para otras partidas; documentá cómo se seleccionan. El tutorial es fijo.

Preguntas útiles: desde cuándo, mensaje exacto, si pasa en otras PC, qué reinició realmente, si hubo cambios. Las respuestas deben concordar con la variante. No ofrecer una conclusión correcta solo por conocer la semilla.

### Expediente 002 — Carpeta compartida, correo

Una persona necesita acceder a una carpeta del equipo. Diseñá un caso completo con causa principal de pertenencia a grupo/permisos pendiente tras un cambio de función. Comparar identidad, conectividad, recurso y permisos efectivos. La PC llega al servidor pero el acceso se deniega.

No resolver dando administrador a todo el mundo ni quitando seguridad. Debe existir una solicitud o autorización ficticia que justifique el acceso; el jugador aplica el grupo apropiado y renueva la sesión/token simulado cuando corresponde. Si falta esa autorización en una ruta, escalar es una salida válida.

Correo con asunto, relato, datos útiles y adjunto pertinente. Respuestas predefinidas contextuales para pedir información o confirmar acceso. El ticket se resuelve cuando el recurso abre y la persona confirma; no solo cuando cambia un checkbox.

### Expediente 003 — Aplicación interna caída, ticket automático

Una alerta informa fallo del portal interno. Caso completo con servicio de aplicación detenido después de mantenimiento. Distinguir conectividad, resolución, respuesta HTTP y proceso/servicio. El navegador puede mostrar un error 503 simulado sin afirmar que ese código por sí solo prueba la causa.

Correlacionar alerta, eventos y mantenimiento. Recuperar el servicio según procedimiento, comprobar página/operación de salud y comunicar el resultado por el canal del caso. Una comprobación desde el navegador de Nico no reemplaza toda validación si el síntoma corresponde a otro equipo.

No inflar el alcance con tres variantes adicionales para cada expediente. Primero entregar estas tres historias completas; el esquema permite extenderlas después.

### Reglas comunes

Separar observado, declarado e inferido. Cada prueba debe responder una pregunta concreta. Las pruebas repetidas sin cambio de estado no otorgan puntos ni nuevas pistas idénticas; permiten releer gratis. Después de una intervención, repetir una comprobación puede producir un resultado nuevo y consumir el costo anunciado.

Una hipótesis necesita una combinación razonable de pruebas, no acumular cualquier cantidad. Documentar qué alternativas quedan abiertas. Permitir intervenir equivocándose, con consecuencias claras y recuperables cuando proceda; la interfaz explica el riesgo sin revelar la verdad oculta.

## 12. Pizarra física de pruebas

Debe seguir siendo una pizarra en la pared con papelitos y conexiones. No sustituirla por un cuaderno o una lista abstracta.

Tres procedencias visibles:

- **Dijo la persona**: declaraciones, redactadas como tales.
- **Comprobé**: resultados de pruebas realizadas por Nico.
- **Intenté**: intervenciones y su resultado, incluso cuando fallan.

Ejemplos: «Elena dice que reinició la impresora y sigue igual», «El servidor responde por IP», «Reinicié el servicio: volvió a detenerse al procesar el trabajo».

Elegir hipótesis y después seleccionar notas para conectarlas. Permitir clic y teclado; arrastrar puede ser adicional. Las conexiones se pueden quitar. Los hilos terminan en anclajes explícitos de las chinches y siguen unidos al ampliar, redimensionar y usar zoom del navegador.

Mostrar relaciones justificadas por las pruebas conocidas: apoya, no distingue, contradice. No consultar la causa oculta para colorear conexiones como si el tablero fuera un detector mágico. No descartar automáticamente una hipótesis basándose solo en una afirmación incierta de la persona.

Una lectura breve explica qué sabemos y qué falta comprobar, sin decir la próxima solución exacta. «Tomar como hipótesis de trabajo» establece la interpretación actual para el caso. La fuerza del respaldo se calcula a partir de evidencias pertinentes.

## 13. Cuaderno del técnico

Objeto independiente sobre la mesa. Contiene conocimiento general: procedimientos, causas habituales, preguntas útiles y apuntes aprendidos. No contiene las respuestas ocultas de la partida.

Ejemplos: comparar alcance por nombre y por IP; distinguir servicio detenido de cola bloqueada; verificar identidad antes de cambiar permisos; preguntar qué dispositivo se reinició. Definir términos técnicos al alcance de un jugador nuevo.

Consultar es gratis. Al cerrar casos, agregar un apunte breve basado en lo aprendido, sin repetir toda la historia. El manual físico puede ser un acceso a referencia general, mientras el cuaderno reúne procedimientos y aprendizaje; mantener clara esa distinción.

## 14. Diálogo, confianza y teléfono

Mostrar una intervención por vez. No adelantar párrafos futuros, opciones futuras ni nombres que todavía no se conocen. Cuando alguien se presenta, actualizar su identificación. Si el ticket ya identifica al remitente, sí se puede mostrar el dato conocido.

Texto progresivo opcional: frases cortas, duración máxima aproximada de dos segundos por línea; clic/Enter/Espacio completa la línea visible sin activar además una respuesta. Movimiento reducido muestra texto completo. El historial conserva intervenciones ya ocurridas.

Elena puede volver a llamar por urgencia ligada al tiempo narrativo. Ofrecer respuestas como:

- «Entiendo la urgencia. Todavía estoy comprobando la causa».
- «Ya comprobé que…», citando evidencia real.
- «Encontré una causa probable; voy a verificar la solución», solo con respaldo suficiente.
- «¿Podés probar de nuevo y decirme qué pasa?» después de una intervención.

No ofrecer «ya está resuelto» antes de verificar. Tranquilizar no es apretar infinitamente un botón para ganar confianza: una mejora por evento pertinente, con un límite. No cobrar tiempo por repetir lectura ni castigar a quien necesita más tiempo para leer.

Cerrar con confirmación de la persona o prueba apropiada al canal. Diferenciar conversación, prueba técnica y verificación final. La confianza afecta saludos o cierre, no revela pistas exclusivas que vuelvan insoluble un caso.

## 15. Nico: energía, estrés, baño y café

Cuatro variables comprensibles y deterministas, ligadas a acciones y minutos narrativos, no al tiempo real frente a la pantalla. Si existe tensión global, derivarla del contexto o distinguirla claramente: no duplicar medidores de estrés con nombres diferentes.

HUD discreto «Nico: tranquilo / cansado / necesita una pausa»; al seleccionarlo, ver valores y explicaciones. No saturar la pantalla con barras permanentes ni colocar «ansiedad» como diagnóstico médico.

Pausas elegibles con costo y efecto visibles:

- Café: mejora energía a corto plazo, aumenta cafeína y puede aumentar estrés/necesidad de baño al repetir.
- Comer: recupera energía y consume minutos.
- Baño: reduce necesidad y consume minutos.
- Patio/aire: baja estrés, con pequeño momento narrativo.
- Fumar: opción narrativa adulta dentro de la pausa exterior, si se incluye; no da un beneficio superior al aire libre ni introduce una economía de cigarrillos.

Los medidores están acotados. Necesidades altas pueden aumentar moderadamente el costo narrativo de ciertas tareas o afectar comentarios, con reglas visibles y balanceadas. Nunca introducir input lag, borrar pruebas, esconder herramientas, forzar accidentes humillantes ni bloquear el caso por una necesidad.

Las pausas usan un panel breve y contextual, no requieren construir nuevas habitaciones 3D. Al volver, procesar novedades del turno. El resumen final menciona descansos y autocuidado sin moralizar.

## 16. Pelota, cubo y gato

Pelota: compresión breve con mouse/teclado, un pequeño descanso con efecto limitado. Definir costo narrativo al iniciar o finalizar la pausa; no permitir reducir estrés infinitamente sin que pase tiempo.

Cubo: minijuego real de 3×3, con estado de sus seis caras y movimientos legales que actualicen las caras adyacentes. Puede mostrarse mediante una red 2D clara con una cara seleccionada y botones de giro; no exige motor 3D. Permitir mezclar mediante movimientos legales, girar en ambos sentidos, deshacer y salir conservando progreso. El sprite de mesa solo abre el minijuego. No fingir un cubo interactivo cambiando colores al azar. No hace falta solver automático ni exigir resolverlo para avanzar la historia.

Gato: easter egg en una página ficticia local del navegador. Usar la ilustración del paquete; una respiración CSS discreta es suficiente. Es una ilustración animada, no un video real. Sin llamadas externas a YouTube ni descargas obligatorias. Recompensa pequeña y limitada, respetando movimiento reducido.

## 17. Progreso y segundo monitor

Configuración del puesto mediante slots; una sola escena debe admitir uno o dos monitores. El primer turno se juega perfectamente con uno.

Desbloquear el segundo por completar la primera noche según una condición simple y explicada, por ejemplo dos casos correctamente verificados. Mostrarlo disponible al volver al puesto o al rejugar; no obligar a esperar una noche 2 inexistente.

El segundo monitor puede reutilizar la carcasa con ajuste de escala y mostrar correo/historial junto a la aplicación principal. Comparte estado y motor; no duplica el caso ni otorga respuestas. En móvil, representar la mejora como un acceso rápido útil, sin encoger dos pantallas hasta volverlas ilegibles.

Sin monedas, tienda, microtransacciones ni mejoras de relleno. Las mejoras deben cambiar algo que el jugador pueda usar.

## 18. Resultados, guardado y reinicio

Resultados por caso: resuelto y verificado, resuelto con costo, escalado con fundamento, sin resolver. No todos los escalamientos son fracasos; explicar si eran apropiados.

Informe: causa real al cerrar, hipótesis del jugador, pruebas encontradas/faltantes, intervenciones, consecuencias, tiempo utilizado, confirmación y confianza. No mostrar la causa real al consultar un expediente todavía abierto.

Resumen de noche: casos, plazos, consecuencias, pausas, estado de Nico y mejora desbloqueada. Opción de rejugar con otra semilla y volver al menú.

Guardado versionado y validado en almacenamiento local. Separar preferencias, perfil/progreso, campaña y práctica. Guardar después de acciones significativas, no cada frame ni cada píxel de arrastre. Guardado roto se detecta con aviso y recuperación segura. Como este proyecto empieza de cero, no inventar migraciones a formatos previos que no se recibieron.

Recargar debe conservar minuto, casos, pruebas, intervenciones, necesidades, progreso del cubo y estado tutorial pertinente. No duplicar recompensas, llamadas, costos ni eventos al restaurar. Reiniciar confirma sobrescritura de campaña, pero permite conservar ajustes y tutorial completado.

## 19. Accesibilidad y tamaños

Teclado completo: Tab, Enter/Espacio, Escape y flechas donde corresponda. Foco visible y restauración al cerrar paneles. Diálogos modales bien delimitados; no atrapar foco en ventanas normales del escritorio si no corresponde.

Texto legible, contraste suficiente, áreas táctiles razonables y ninguna información transmitida solo por color. Anuncios aria-live para eventos relevantes sin repetir cada frame ni cada letra del efecto de escritura.

Respetar `prefers-reduced-motion` y permitir ajuste manual. Sonidos nunca indispensables para enterarse de una llamada. No confundir atributos ARIA presentes con prueba real de lector de pantalla: informar lo que se comprobó.

Objetivos de layout: 1366×768, 1920×1080, 3440×1440 y 390×844. Mantener proporción de ilustraciones. Ultrawide puede usar márgenes ambientados; móvil necesita paneles y navegación propios, sin reducir toda la mesa hasta dejar texto microscópico. No debe haber scroll horizontal accidental.

## 20. Sonido y ambiente

Sonidos breves y discretos: teléfono, notificación, tecla/clic suave y confirmación. Ambiente de lluvia opcional. Si no hay recursos de audio con procedencia clara, usar síntesis sencilla o dejar el ambiente silencioso; no fingir que se escuchó un sonido que solo se comprobó técnicamente.

Control de volumen y silencio persistentes. Evitar que muchos avisos suenen a la vez. Sonido y animación no alteran las reglas, el reloj ni las pruebas.

## 21. Calidad que hay que demostrar

Pruebas de motor relevantes:

- Determinismo y tres variantes del 001.
- Pruebas coherentes antes/después de una intervención.
- Una acción avanza el reloj una sola vez y afecta plazos de ambos casos.
- Eventos atravesados por saltos de tiempo y recargas no se pierden ni duplican.
- Pruebas e hipótesis de distintos casos no se mezclan.
- Cierre correcto requiere verificación; intervención equivocada produce consecuencia coherente.
- Necesidades acotadas y sin beneficios infinitos por repetir acciones gratuitas.
- Guardado corrupto, versión incompatible y restauración.
- Cubo: movimiento e inverso restauran estado; cuatro giros de una cara restauran estado; conteos de colores válidos; mezcla por movimientos legales.

Recorridos de navegador, si el entorno permite ejecutarlos:

1. Primera partida con tutorial y transición a Elena.
2. Tutorial omitido y repetido sin sobrescribir campaña.
3. Recarga a mitad de práctica y de guardia.
4. Un recorrido limpio por cada causa del expediente 001.
5. Ruta con intervención equivocada, recuperación y resultado con costo.
6. Correo/permisos y alerta/aplicación completos.
7. Dos casos activos, avance de tiempo y prioridades.
8. Pizarra con teclado e hilos alineados después de resize y zoom 125%.
9. Ventanas movidas/minimizadas/restauradas y menú contextual accesible.
10. Pausas, minijuegos, mejora y cierre de noche.
11. Layouts representativos, sin controles inaccesibles ni errores de consola.

No hay una cantidad obligatoria de tests: importa qué comprueban. No fabricar números ni reportar una captura como prueba de animación. Guardar los scripts e2e útiles en el repositorio, no solo en un scratchpad temporal.

Revisión visual independiente: proporciones, objetos apoyados, bordes transparentes, textos, manos, encastre de teléfono, pantalla opaca, iluminación coherente. La build en verde no aprueba el arte.

Revisión de rendimiento independiente: captura o perfil del recorrido que se siente lento, duración de tareas largas cuando existan, respuesta al abrir/mover/cerrar y tamaños de recursos. No afirmar que funciona a 60 fps por haber pasado Playwright.

Si no hay navegador, audio o lector de pantalla disponible, indicarlo y completar las comprobaciones que sí se puedan realizar. No declarar esas áreas verificadas.

## 22. Orden de implementación

Trabajá en estas etapas, continuando autónomamente dentro del alcance. No hace falta pedirme autorización entre cada una. Si aparece un bloqueo real, explicá qué falta y dejá el resto revisable.

**A. Base y decisiones.** Crear proyecto, scripts, estructura mínima, CLAUDE.md, fichas de casos y matriz de requisitos. Verificar que inicia y compila. Mantener breve esta etapa.

**B. Escena visual e interacción básica.** Integrar fondo, monitor, teléfono y disposición de la mesa con arte real; optimizar recursos; probar abrir/cerrar, foco y respuesta. Tomar una captura temprana. Corregir proporciones y transparencia antes de extender un mal patrón.

**C. Recorrido vertical completo.** Menú, tutorial y expediente 001 desde atender hasta verificar/cerrar. GuardiaOS, pizarra, cuaderno y guardado deben participar de verdad. Mostrar una versión jugable y continuar.

**D. Turno y canales.** Añadir reloj compartido, correo, ticket automático, casos 002/003, dos activos, historial, plazos e informes. Comprobar una noche completa.

**E. Vida y progreso.** Estado de Nico, pausas, pelota, cubo, gato y segundo monitor. Mantener reglas simples y visibles, sin perjudicar la respuesta de los controles.

**F. Pulido y entrega.** Revisar arte, diálogos, tiempos, móvil, ultrawide, accesibilidad, sonido y rendimiento. Ejecutar comprobaciones, corregir riesgos concretos y preparar instrucciones de inicio.

Cada etapa debe dejar el proyecto ejecutable. Si el contexto de la sesión se agota, escribir `docs/PROGRESS.md` con hecho/verificado/pendiente, archivos relevantes y siguiente acción exacta. No empezar de nuevo ni releer innecesariamente todo el repositorio al continuar.

## 23. Entrega final esperada

- Código del juego completo dentro del alcance y recursos locales optimizados.
- Comandos reales de instalación, inicio, build y pruebas.
- `CLAUDE.md`, ficha de casos, arquitectura breve, decisiones visuales, progreso y roadmap de futuras noches.
- Capturas del menú, mesa, GuardiaOS, llamada y pizarra en tamaños representativos; grabación breve si es posible.
- Resultados de verificaciones realmente ejecutadas, con límites claros.
- Qué quedó pendiente si una capacidad del entorno lo impidió, sin esconderlo detrás de «completo».
- Una explicación breve para el usuario: cómo jugar, cómo retomar, cómo probar semillas y dónde agregar casos.

El criterio de terminado es que una persona nueva pueda orientarse con el tutorial, disfrutar una guardia completa, entender sus decisiones y percibir controles ágiles y una escena visual coherente. Empezá ahora inspeccionando los adjuntos y construyendo la etapa A; avanzá hasta completar la entrega.
