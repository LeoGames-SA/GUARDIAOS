import type { CaseDef, ProbeResult, World } from '../../engine/types';

/** Expediente 003 — Portal interno caído (alerta automática). Causa: servicio sin iniciar tras mantenimiento. */
const isFixed = (w: World) => w.appRunning === true;

export const case003: CaseDef = {
  id: 'c003',
  number: '003',
  title: 'Portal del Personal sin servicio',
  channel: 'auto',
  contact: {
    name: 'Monitor de servicios',
    short: 'el monitor',
    role: 'Alerta automática',
    device: 'SRV-APP-02',
  },
  knownAtStart: true,
  teaser: 'Alerta MON-5531: el portal responde HTTP 503.',
  summary:
    'El monitor automático detectó que el Portal del Personal responde con error 503 desde las 00:52. El turno de la mañana lo usa para cargar novedades y turnos.',
  arrival: 120,
  deadline: 300,
  devices: ['SRV-APP-02', 'SRV-BD-01', 'PC-SOP-01'],
  message: {
    id: 'c003-m0',
    at: 120,
    from: 'Monitor de servicios <monitor@mutualsur.local>',
    to: 'Guardia de soporte',
    subject: '[ALERTA] MON-5531 · portal.mutualsur.local · HTTP 503',
    body: [
      'Estado: CRÍTICO desde 00:52.',
      'Comprobación: GET https://portal.mutualsur.local/salud desde la red de sucursales.',
      'Resultado: 503 Servicio no disponible (3 de 3 intentos).',
      'Este aviso se genera automáticamente. Actualizá el ticket con el diagnóstico y la resolución.',
    ],
  },
  variants: [
    {
      id: 'stopped',
      cause: 'El servicio de la aplicación quedó detenido después del mantenimiento',
      explanation:
        'A las 00:30 se aplicó un parche con reinicio en SRV-APP-02. El servidor web arrancó, pero el servicio PortalPersonal tenía inicio manual y no se levantó: el servidor web respondía 503 porque no tenía a quién pasarle los pedidos. El 503 por sí solo no probaba la causa; los servicios y eventos sí.',
      world: { cause: 'stopped', hyp: 'svc', appRunning: false, autoStart: false },
      keyProbes: ['t-services', 't-events', 't-db'],
    },
  ],
  pickVariant: () => 'stopped',
  hypotheses: [
    {
      id: 'svc',
      label: 'Servicio de la aplicación detenido tras el mantenimiento',
      detail: 'El servidor está vivo, pero el proceso del portal no está corriendo.',
      pertinent: [
        { probe: 't-services', what: 'servicios de SRV-APP-02' },
        { probe: 't-events', what: 'eventos del reinicio' },
      ],
    },
    {
      id: 'net',
      label: 'Falla de red o de DNS hacia el portal',
      detail: 'Los equipos no llegan al servidor o el nombre apunta a otro lado.',
      pertinent: [{ probe: 't-ping', what: 'alcance y resolución del nombre' }],
    },
    {
      id: 'db',
      label: 'Base de datos del portal caída',
      detail: 'La aplicación no puede leer sus datos.',
      pertinent: [{ probe: 't-db', what: 'conexión a la base de datos' }],
    },
    {
      id: 'off',
      label: 'El servidor no volvió después del reinicio',
      detail: 'El equipo quedó apagado o colgado.',
      pertinent: [
        { probe: 't-ping', what: 'alcance del servidor' },
        { probe: 't-portal', what: 'respuesta HTTP' },
      ],
    },
  ],
  deadlineText:
    'A las 04:00 el portal seguía caído: el turno mañana no pudo cargar novedades y Supervisión pidió un informe.',
  escalation: {
    label: 'Escalar a Guardia de Sistemas (llamada de emergencia)',
    appropriate: () => false,
    explain: () =>
      'El procedimiento de guardia cubre iniciar el servicio: despertar a Sistemas no hacía falta.',
  },
  closeNeeds: [{ flag: 'published', reason: 'Falta comunicar el resultado en el ticket de la alerta.' }],
  checklist: [
    {
      probe: 'i-autostart',
      text: 'Dejar el servicio con inicio automático, como indica el procedimiento posterior al mantenimiento',
    },
    { probe: 't-health', text: 'Comprobar la página de salud además del monitor externo' },
  ],
  learned:
    'Un 503 dice que el servidor web contesta pero no puede atender. Correlacioná alerta, mantenimiento y eventos; mirá qué servicio no arrancó antes de reiniciar todo el servidor.',
  probes: [
    {
      id: 't-ping',
      kind: 'test',
      app: 'network',
      target: 'SRV-APP-02',
      label: 'Probar alcance por nombre (portal.mutualsur.local)',
      asks: '¿El nombre resuelve bien y el servidor está en la red?',
      cost: 2,
      console: ['ping portal.mutualsur.local', 'ping portal'],
      run: (): ProbeResult =>
        t(
          'portal.mutualsur.local [10.20.1.30]: responde, 1 ms. Coincide con el inventario.',
          'portal.mutualsur.local resuelve a 10.20.1.30 y responde',
          { net: 'contradicts', off: 'contradicts' },
        ),
    },
    {
      id: 't-portal',
      kind: 'test',
      app: 'browser',
      target: 'SRV-APP-02',
      label: 'Abrir el portal desde tu navegador',
      asks: '¿Qué responde el portal a un pedido web?',
      cost: 1,
      run: (w): ProbeResult =>
        w.appRunning
          ? t('El portal carga normalmente.', 'El portal carga desde el navegador de Nico', {})
          : t(
              '503 Servicio no disponible (lo devuelve el servidor web).',
              'El portal devuelve 503 desde el navegador de Nico: el servidor web contesta',
              { off: 'contradicts', net: 'contradicts' },
            ),
    },
    {
      id: 't-health',
      kind: 'test',
      app: 'browser',
      target: 'SRV-APP-02',
      label: 'Abrir /salud desde tu navegador',
      asks: '¿La aplicación informa que está sana?',
      cost: 1,
      run: (w): ProbeResult =>
        w.appRunning
          ? t(
              '200 OK · aplicación: ok · base de datos: ok.',
              'La página /salud responde 200 desde el navegador de Nico',
              {},
            )
          : t('503 Servicio no disponible.', 'La página /salud también devuelve 503', {}),
    },
    {
      id: 't-services',
      kind: 'test',
      app: 'services',
      target: 'SRV-APP-02',
      label: 'Consultar servicios de SRV-APP-02',
      asks: '¿Qué procesos del portal están corriendo?',
      cost: 1,
      console: ['servicios srv-app-02', 'servicios portal'],
      run: (w): ProbeResult =>
        t(
          w.appRunning ? 'Todos los servicios en ejecución.' : 'PortalPersonal está detenido.',
          w.appRunning
            ? 'En SRV-APP-02 el servicio PortalPersonal ya está en ejecución'
            : 'En SRV-APP-02 el servidor web corre, pero PortalPersonal está detenido (inicio manual)',
          w.appRunning ? {} : { svc: 'supports', off: 'contradicts' },
          [
            'Servidor web · En ejecución · Automático',
            `PortalPersonal (aplicación) · ${w.appRunning ? 'En ejecución' : 'Detenido'} · ${w.autoStart ? 'Automático' : 'Manual'}`,
            'Conector de base de datos · En ejecución · Automático',
          ],
        ),
    },
    {
      id: 't-db',
      kind: 'test',
      app: 'services',
      target: 'SRV-BD-01',
      label: 'Probar conexión a la base de datos (SRV-BD-01:5432)',
      asks: '¿La base de datos del portal atiende conexiones?',
      cost: 2,
      console: ['bd srv-bd-01'],
      run: (): ProbeResult =>
        t(
          'SRV-BD-01:5432 acepta conexiones. Latencia 3 ms.',
          'La base de datos SRV-BD-01 acepta conexiones',
          { db: 'contradicts' },
        ),
    },
    {
      id: 't-events',
      kind: 'test',
      app: 'events',
      target: 'SRV-APP-02',
      label: 'Filtrar eventos de SRV-APP-02 (00:30 → 01:00)',
      asks: '¿Qué pasó en el servidor durante el mantenimiento?',
      cost: 3,
      console: ['eventos srv-app-02', 'eventos portal'],
      run: (): ProbeResult =>
        t(
          '4 eventos.',
          'Eventos de SRV-APP-02: reinicio 00:33 por mantenimiento; PortalPersonal no se inició (inicio manual)',
          { svc: 'supports', off: 'contradicts' },
          [
            '00:31 · Info · Parche de seguridad instalado; reinicio programado',
            '00:33 · Info · Sistema reiniciado',
            '00:36 · Info · Servidor web iniciado',
            '00:36 · Advertencia · PortalPersonal no se inició: tipo de inicio «Manual»',
          ],
        ),
    },
    {
      id: 'd-maintenance',
      kind: 'document',
      app: 'files',
      target: 'SRV-APP-02',
      label: 'Aviso de mantenimiento programado',
      asks: '¿Hubo trabajos planificados esta noche?',
      cost: 0,
      run: (): ProbeResult =>
        t(
          'Aviso de mantenimiento',
          'Aviso: mantenimiento en SRV-APP-02 a las 00:30 (parche con reinicio)',
          { svc: 'supports' },
          [
            'Ventana: hoy 00:30 – 00:45 · SRV-APP-02',
            'Tarea: parche de seguridad mensual con reinicio.',
            'Después del reinicio: verificar que PortalPersonal quede en ejecución y con inicio automático.',
            'Responsable: Sistemas (no presencial).',
          ],
        ),
    },
    {
      id: 'i-start-app',
      kind: 'intervention',
      app: 'services',
      target: 'SRV-APP-02',
      label: 'Iniciar el servicio PortalPersonal',
      cost: 2,
      risk: 'Inicia la aplicación; no reinicia el servidor ni corta otros servicios.',
      console: ['iniciar servicio portal', 'iniciar servicio srv-app-02 portalpersonal'],
      requires: (c) => (c.world.appRunning ? 'PortalPersonal ya está en ejecución.' : null),
      run: (): ProbeResult => ({
        ...tr(
          'PortalPersonal en ejecución. El servidor web ya tiene a quién pasarle los pedidos.',
          'Inicié PortalPersonal: quedó en ejecución',
          { svc: 'supports' },
        ),
        world: { appRunning: true },
      }),
    },
    {
      id: 'i-autostart',
      kind: 'intervention',
      app: 'services',
      target: 'SRV-APP-02',
      label: 'Configurar PortalPersonal con inicio automático',
      cost: 1,
      risk: 'Sólo cambia el tipo de inicio. El procedimiento posterior al mantenimiento lo pide.',
      requires: (c) => (c.world.autoStart ? 'Ya tiene inicio automático.' : null),
      run: (): ProbeResult => ({
        ...tr('Tipo de inicio: Automático.', 'Dejé PortalPersonal con inicio automático', {
          svc: 'supports',
        }),
        world: { autoStart: true },
      }),
    },
    {
      id: 'i-restart-web',
      kind: 'intervention',
      app: 'services',
      target: 'SRV-APP-02',
      label: 'Reiniciar el servidor web',
      cost: 3,
      risk: 'Corta por unos segundos todas las páginas del servidor.',
      run: (w): ProbeResult =>
        tr(
          w.appRunning
            ? 'El servidor web se reinició. El portal sigue respondiendo.'
            : 'El servidor web se reinició. Sigue devolviendo 503.',
          w.appRunning
            ? 'Reinicié el servidor web: el portal sigue bien'
            : 'Reinicié el servidor web: el portal sigue en 503',
          w.appRunning ? {} : { svc: 'supports' },
        ),
    },
    {
      id: 'i-reboot',
      kind: 'intervention',
      app: 'remote',
      target: 'SRV-APP-02',
      label: 'Reiniciar SRV-APP-02 completo',
      cost: 12,
      risk: 'Corta todos los servicios del servidor, incluida la mensajería interna, durante varios minutos.',
      run: (w): ProbeResult => ({
        ...tr(
          w.autoStart
            ? 'El servidor reinició y todos los servicios volvieron.'
            : 'El servidor reinició. El servidor web volvió; PortalPersonal sigue detenido (inicio manual).',
          w.autoStart
            ? 'Reinicié SRV-APP-02: volvió todo'
            : 'Reinicié SRV-APP-02 completo: PortalPersonal volvió a quedar detenido',
          w.autoStart ? {} : { svc: 'supports' },
        ),
        world: { appRunning: w.autoStart === true },
        wrong: true,
        consequence: 'El reinicio completo cortó 12 minutos la mensajería interna del edificio.',
      }),
    },
    {
      id: 'v-monitor',
      kind: 'verify',
      app: 'tickets',
      target: 'SRV-APP-02',
      label: 'Pedir revalidación al monitor externo',
      asks: '¿El portal responde bien desde la red de sucursales, donde se detectó la falla?',
      cost: 2,
      requires: (c) =>
        ['i-start-app', 'i-restart-web', 'i-reboot'].some(c.done)
          ? null
          : 'Todavía no cambiaste nada: la alerta seguiría igual.',
      run: (w): ProbeResult =>
        w.appRunning
          ? {
              summary: 'Monitor: 200 OK desde la red de sucursales (3 de 3). Alerta en recuperación.',
              note: 'El monitor externo confirma 200 OK desde sucursales',
              confirms: true,
              flags: ['monitorOk'],
            }
          : {
              summary: 'Monitor: sigue 503 desde sucursales (3 de 3).',
              note: 'El monitor externo sigue viendo 503 desde sucursales',
            },
    },
    {
      id: 'c-publish',
      kind: 'communicate',
      app: 'tickets',
      target: 'SRV-APP-02',
      label: 'Publicar diagnóstico y resolución en el ticket',
      cost: 1,
      requires: (c) =>
        c.flags.includes('monitorOk') ? null : 'Publicá la resolución cuando el monitor la haya confirmado.',
      run: (): ProbeResult => ({
        summary: 'Actualización publicada en MON-5531 y enviada a la lista de avisos del turno mañana.',
        flags: ['published'],
      }),
    },
  ],
  isFixed,
};

function t(
  summary: string,
  note: string,
  relations: ProbeResult['relations'],
  detail?: string[],
): ProbeResult {
  return { summary, note, relations, ...(detail ? { detail } : {}) };
}
function tr(summary: string, note: string, relations: ProbeResult['relations']): ProbeResult {
  return { summary, note, relations };
}
