/**
 * Conocimiento general del técnico. No contiene la causa de ninguna partida:
 * explica cómo pensar y qué comprobar. El cuaderno suma apuntes al cerrar casos.
 */
export interface Article {
  id: string;
  title: string;
  tags: string[];
  body: string[];
}

export const PROCEDURES: Article[] = [
  {
    id: 'name-vs-ip',
    title: 'Comparar alcance por nombre y por IP',
    tags: ['red', 'impresión', 'dns'],
    body: [
      'Si un equipo responde por IP pero no por su nombre, la red funciona y el problema está en la resolución de nombres (DNS).',
      'Compará la dirección que devuelve el nombre con la del inventario. Si difieren, el registro está desactualizado o la PC guarda una respuesta vieja en caché.',
      'Corregir el registro no alcanza si las PC conservan la dirección anterior: renová su caché o esperá a que expire.',
    ],
  },
  {
    id: 'queue-vs-service',
    title: 'Cola bloqueada o servicio detenido',
    tags: ['impresión', 'servicios'],
    body: [
      'Un trabajo en «Error» al frente de la cola puede frenar a todos los demás. Pero un servicio que se cae también deja trabajos en error: la cola sola no distingue.',
      'Mirá el estado del servicio y los eventos del servidor. Si el servicio cae cada vez que procesa algo, cancelar trabajos no lo arregla.',
      'Reiniciar el servicio puede parecer que funciona unos segundos. Si vuelve a caer, buscá qué cambió: controladores, actualizaciones.',
    ],
  },
  {
    id: 'what-restarted',
    title: 'Preguntar qué se reinició exactamente',
    tags: ['general', 'impresión'],
    body: [
      '«Reinicié todo» casi nunca es todo. Reiniciar la impresora no toca el servidor; reiniciar la PC no toca la cola del servidor.',
      'Reiniciar un servicio es distinto de reiniciar el equipo completo: afecta menos y no corta otros servicios.',
    ],
  },
  {
    id: 'identity-first',
    title: 'Verificar identidad y autorización antes de cambiar permisos',
    tags: ['permisos', 'seguridad'],
    body: [
      'Confirmá que la cuenta existe, está habilitada y no bloqueada. Después compará sus grupos con los permisos del recurso.',
      'Si el servidor contesta «acceso denegado», la red funciona: el servidor recibió el pedido y lo rechazó.',
      'Nunca agregues permisos de más «para que ande». Buscá una solicitud aprobada que indique qué grupo corresponde. Sin autorización, escalar es lo correcto.',
      'Después de agregar un grupo, la sesión abierta sigue con sus credenciales viejas: hay que renovarla o volver a iniciar sesión.',
    ],
  },
  {
    id: 'http-503',
    title: 'Qué dice (y qué no dice) un error 503',
    tags: ['web', 'servicios'],
    body: [
      'Un 503 significa que el servidor web contesta pero no puede atender el pedido. El equipo está encendido y la red llega.',
      'Por sí solo no dice por qué: puede faltar el proceso de la aplicación, la base de datos o haber sobrecarga.',
      'Correlacioná la hora de la alerta con mantenimientos y eventos. Mirá qué servicio no está corriendo antes de reiniciar el servidor entero.',
      'Probar desde tu navegador no reemplaza la verificación desde donde se detectó la falla (por ejemplo, el monitor externo).',
    ],
  },
  {
    id: 'audio-output',
    title: 'Sin sonido: revisar el dispositivo de salida',
    tags: ['audio', 'general'],
    body: [
      'Antes de subir el volumen, fijate a qué dispositivo va el sonido. Un monitor conectado por HDMI puede figurar como salida aunque no tenga parlantes.',
      'Hacé una prueba de sonido y confirmá con la persona que ahora escucha.',
    ],
  },
  {
    id: 'evidence',
    title: 'Declaraciones, comprobaciones e intentos',
    tags: ['general', 'pizarra'],
    body: [
      '«Dijo la persona» es valioso, pero puede estar incompleto o equivocado. No descartes una hipótesis sólo por una declaración.',
      '«Comprobé» es lo que viste con tus herramientas. Pesa más.',
      '«Intenté» registra lo que hiciste y qué pasó, incluso si falló. Un intento fallido también es información.',
      'Cada prueba debería responder una pregunta concreta. Repetir la misma prueba sin que nada cambie no agrega información.',
    ],
  },
  {
    id: 'verify',
    title: 'Cerrar con verificación',
    tags: ['general'],
    body: [
      'Un caso está resuelto cuando la persona afectada (o la prueba del canal) confirma que funciona, no cuando cambiaste una opción.',
      'Si el problema lo detectó un sistema automático, pedí la revalidación de ese sistema y comunicá el resultado en el ticket.',
    ],
  },
];

export const GLOSSARY: { term: string; def: string }[] = [
  { term: 'IP', def: 'Dirección numérica de un equipo en la red (por ejemplo, 10.20.0.15).' },
  { term: 'DNS', def: 'Servicio que traduce nombres (srv-impresion) a direcciones IP.' },
  {
    term: 'Caché DNS',
    def: 'Memoria temporal donde una PC guarda respuestas de nombres para no preguntar cada vez.',
  },
  { term: 'Ping', def: 'Prueba de alcance: pregunta a un equipo si responde en la red.' },
  {
    term: 'Cola de impresión',
    def: 'Lista de trabajos que esperan salir por una impresora, en el servidor.',
  },
  {
    term: 'Servicio',
    def: 'Programa que corre en segundo plano en un servidor (cola de impresión, portal, etc.).',
  },
  { term: 'Controlador', def: 'Software que traduce los trabajos al idioma de la impresora.' },
  { term: 'Grupo', def: 'Conjunto de cuentas que comparten permisos sobre recursos.' },
  { term: 'Permiso efectivo', def: 'El acceso real que resulta de sumar los grupos de una cuenta.' },
  {
    term: 'Sesión / credenciales',
    def: 'Al iniciar sesión, la PC guarda los grupos de la cuenta. Los cambios posteriores no se ven hasta renovarla.',
  },
  {
    term: 'HTTP 503',
    def: 'Respuesta web «Servicio no disponible»: el servidor contesta pero no puede atender.',
  },
  { term: 'Escalar', def: 'Pasar el caso a otro equipo con un informe. No siempre es un fracaso.' },
];

export const QUESTIONS: string[] = [
  '¿Desde cuándo pasa? ¿Antes funcionaba?',
  '¿Qué mensaje aparece, exactamente?',
  '¿Le pasa a alguien más?',
  '¿Qué reiniciaste, exactamente?',
  '¿Hubo algún cambio, aviso o actualización?',
];

export const MANUAL: Article[] = [
  {
    id: 'how',
    title: 'Cómo se juega',
    tags: [],
    body: [
      'Atendé llamadas, correos y alertas. Cada expediente tiene una causa que hay que descubrir con pruebas.',
      'Las pruebas e intervenciones consumen minutos del turno (23:00 a 07:00). Leer, pensar, mover ventanas y conectar notas es gratis.',
      'Todo lo que comprobás aparece en la pizarra. Elegí una hipótesis, conectá las notas que la apoyan o la contradicen y tomala como hipótesis de trabajo.',
      'Intervení, verificá con la persona (o con la prueba del canal) y cerrá el ticket. Podés tener hasta dos expedientes activos a la vez.',
    ],
  },
  {
    id: 'keys',
    title: 'Teclado',
    tags: [],
    body: [
      'Tab / Shift+Tab: recorrer objetos y controles. Enter o Espacio: activar.',
      'Escape: cerrar el panel abierto y volver al objeto de la mesa.',
      'Ventanas de GuardiaOS: con la barra de título enfocada, las flechas la mueven. Shift+F10 o la tecla de menú abre el menú contextual; también el botón «⋯».',
      'En una llamada: clic, Enter o Espacio completan la frase que se está escribiendo.',
    ],
  },
  {
    id: 'nico',
    title: 'Nico y las pausas',
    tags: [],
    body: [
      'Energía, estrés, baño y cafeína cambian con los minutos del turno, no con el tiempo real.',
      'Con energía menor a 25 o necesidad de baño mayor a 85, las pruebas e intervenciones cuestan 25 % más (se muestra en cada botón).',
      'Las pausas consumen minutos: el reloj avanza para todos los expedientes.',
    ],
  },
  {
    id: 'sim',
    title: 'Sobre la simulación',
    tags: [],
    body: [
      'Todos los equipos, direcciones, correos, terminales y servicios son ficticios. El juego no ejecuta comandos en tu computadora ni se conecta a ninguna red.',
      'Mutual Sur y sus personas son inventadas.',
    ],
  },
];
