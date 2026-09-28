import type { CaseDef, ProbeResult, World } from '../../engine/types';

/**
 * Expediente 001 — Impresión detenida (Elena, teléfono).
 * Tres causas deterministas. Semillas de QA: 7 → controlador, 1 → trabajo, 2 → nombre.
 */
const OLD_IP = '10.20.0.12';
const NEW_IP = '10.20.0.15';

const base: World = {
  serverIp: NEW_IP,
  dnsRecord: NEW_IP,
  pcCache: NEW_IP,
  driver: '6.0',
  driverToday: false,
  serviceRunning: true,
  serviceCrashes: false,
  stuckJob: false,
  elenaJobs: true,
  dnsFixed: false,
};

export const QA_SEEDS = { driver: 7, job: 1, dns: 2 } as const;

const isFixed = (w: World) =>
  w.pcCache === w.serverIp && w.stuckJob === false && w.serviceRunning === true && w.serviceCrashes === false;

const same = (w: World, cause: string) => w.cause === cause;

export const case001: CaseDef = {
  id: 'c001',
  number: '001',
  title: 'Impresión detenida',
  channel: 'phone',
  contact: { name: 'Elena Suárez', short: 'Elena', role: 'Administración', device: 'PC-ADM-07' },
  knownAtStart: false,
  teaser: 'No sale la documentación del cierre operativo.',
  summary:
    'Elena necesita imprimir la documentación del cierre operativo antes de las 00:30. Manda a imprimir y no sale nada.',
  arrival: 0,
  deadline: 90,
  devices: ['PC-ADM-07', 'SRV-IMP-01', 'IMP-ADM-02', 'PC-SOP-01'],
  variants: [
    {
      id: 'driver',
      cause: 'Controlador de impresión defectuoso tras la actualización a UniPrint 6.0',
      explanation:
        'A las 21:40 se instaló UniPrint 6.0 en el servidor. Desde entonces el servicio de cola cae cada vez que procesa un trabajo. El error en la cola era un síntoma, no la causa: revertir a 5.2 estabilizó el servicio.',
      world: { ...base, cause: 'driver', hyp: 'drv', driverToday: true, serviceRunning: false, serviceCrashes: true },
      keyProbes: ['t-service', 't-events-srv', 't-driver'],
    },
    {
      id: 'job',
      cause: 'Un trabajo trabado (planilla de J. Méndez) bloqueaba la cola',
      explanation:
        'El trabajo 412, una planilla enorme, quedó en error al frente de la cola y el servidor lo reintentaba sin fin. La red y el servicio estaban bien. Cancelarlo liberó la cola; lo correcto es avisar a su dueño para reenviarlo.',
      world: { ...base, cause: 'job', hyp: 'job', stuckJob: true },
      keyProbes: ['t-queue', 't-events-srv', 't-service'],
    },
    {
      id: 'dns',
      cause: 'El nombre srv-impresion seguía apuntando a la dirección vieja (10.20.0.12)',
      explanation:
        'A las 22:30 el servidor se migró a 10.20.0.15, pero el registro DNS quedó con la IP anterior. Por IP respondía; por nombre, no. Había que corregir el registro y renovar la caché de nombres de la PC.',
      world: { ...base, cause: 'dns', hyp: 'dns', dnsRecord: OLD_IP, pcCache: OLD_IP },
      keyProbes: ['t-ping-name', 't-ping-ip', 't-resolve'],
    },
  ],
  pickVariant: (seed) => {
    if (seed === QA_SEEDS.driver) return 'driver';
    if (seed === QA_SEEDS.job) return 'job';
    if (seed === QA_SEEDS.dns) return 'dns';
    return (['job', 'driver', 'dns'] as const)[seed % 3]!;
  },
  hypotheses: [
    {
      id: 'drv',
      label: 'Controlador defectuoso tras un cambio',
      detail: 'Una actualización del controlador hace fallar el procesamiento de trabajos en el servidor.',
      pertinent: [
        { probe: 't-driver', what: 'versión y fecha del controlador' },
        { probe: 't-service', what: 'estado del servicio de cola' },
        { probe: 't-events-srv', what: 'eventos del servidor' },
      ],
    },
    {
      id: 'job',
      label: 'Trabajo trabado en la cola',
      detail: 'Un trabajo en error bloquea a los que vienen detrás.',
      pertinent: [
        { probe: 't-queue', what: 'contenido de la cola' },
        { probe: 't-events-srv', what: 'eventos del servidor' },
      ],
    },
    {
      id: 'dns',
      label: 'El nombre del servidor apunta a una dirección vieja',
      detail: 'Los equipos buscan el servidor por nombre y llegan a una IP que ya no corresponde.',
      pertinent: [
        { probe: 't-ping-name', what: 'alcance por nombre' },
        { probe: 't-ping-ip', what: 'alcance por IP' },
        { probe: 't-resolve', what: 'resolución del nombre en la PC de Elena' },
      ],
    },
    {
      id: 'hw',
      label: 'Problema físico de la impresora',
      detail: 'Papel, tóner, atasco o equipo apagado.',
      pertinent: [
        { probe: 't-panel', what: 'panel de estado de la impresora' },
        { probe: 't-testpage', what: 'página de prueba desde el servidor' },
      ],
    },
  ],
  opening: {
    nico: 'Mesa de ayuda, soporte técnico, habla Nicolás. Contame qué está pasando.',
    contact: [
      'Hola, Nicolás. Soy Elena Suárez, de Administración.',
      'Tengo que imprimir la documentación del cierre operativo y no sale nada. Le doy imprimir y… nada.',
      'La necesito antes de las doce y media. ¿Me podés ayudar?',
    ],
  },
  callbacks: [
    {
      at: 40,
      lines: ['Nicolás, soy Elena otra vez. ¿Hay alguna novedad? En cincuenta minutos tengo que entregar esto.'],
    },
    { at: 75, lines: ['Perdón que insista… Me quedan quince minutos para el cierre. ¿Cómo vamos?'] },
  ],
  deadlineText: 'A las 00:30 Elena entregó la documentación del cierre incompleta; Administración lo dejó asentado.',
  escalation: {
    label: 'Escalar a Infraestructura (turno mañana)',
    appropriate: () => false,
    explain: () =>
      'Era resoluble desde la guardia con las herramientas disponibles; Elena quedó sin imprimir hasta la mañana.',
  },
  checklist: [
    { probe: 'i-notify-resend', text: 'Avisar al dueño del trabajo cancelado para que lo reenvíe', variants: ['job'] },
  ],
  learned:
    'Impresión: compará alcance por nombre y por IP, mirá la cola y el estado del servicio antes de tocar nada. Reiniciar el servicio puede tapar un controlador defectuoso por unos segundos.',
  probes: [
    // ---------------------------------------------------------- preguntas
    {
      id: 'q-since',
      kind: 'question',
      app: 'phone',
      label: '¿Desde cuándo pasa?',
      line: '¿Desde cuándo te pasa?',
      cost: 1,
      run: (w): ProbeResult =>
        same(w, 'driver')
          ? said('Desde hace un rato… A las diez y media imprimí sin problema, después ya no.', 'Elena dice que a las 22:30 imprimía bien y después dejó de salir')
          : same(w, 'job')
            ? said('Desde las diez y cuarto, más o menos. Antes andaba.', 'Elena dice que dejó de imprimir alrededor de las 22:15')
            : said('Desde las diez y media, creo. A las diez imprimí un recibo.', 'Elena dice que alrededor de las 22:30 dejó de imprimir'),
    },
    {
      id: 'q-message',
      kind: 'question',
      app: 'phone',
      label: '¿Qué mensaje aparece exactamente?',
      line: '¿Te aparece algún mensaje? Leémelo tal cual, por favor.',
      cost: 1,
      run: (w): ProbeResult =>
        same(w, 'driver')
          ? said('En la cola dice «Error – Imprimiendo» en mi documento, y se queda así.', 'Elena dice que su documento aparece como «Error – Imprimiendo»', { drv: 'supports', job: 'supports' })
          : same(w, 'job')
            ? said('Mis documentos dicen «En cola». Arriba hay uno que no es mío, con «Error».', 'Elena dice que arriba de sus documentos hay uno ajeno en «Error»', { job: 'supports' })
            : said('Dice «La impresora no está disponible». Después, «Esperando conexión».', 'Elena dice que aparece «Esperando conexión»', { dns: 'supports' }),
    },
    {
      id: 'q-others',
      kind: 'question',
      app: 'phone',
      label: '¿Le pasa a alguien más?',
      line: '¿Hay alguien más cerca que pueda probar imprimir?',
      cost: 1,
      run: (): ProbeResult =>
        said('Julián, que está al lado, probó recién y tampoco le sale.', 'Elena dice que a Julián, en la PC de al lado, tampoco le imprime'),
    },
    {
      id: 'q-restart',
      kind: 'question',
      app: 'phone',
      label: '¿Qué reiniciaste?',
      line: '¿Reiniciaste algo? ¿Qué cosa exactamente: la impresora, la PC…?',
      cost: 1,
      run: (): ProbeResult =>
        said('Apagué y prendí la impresora. Y reinicié la PC también, por las dudas.', 'Elena dice que reinició la impresora y la PC y sigue igual'),
    },
    {
      id: 'q-changes',
      kind: 'question',
      app: 'phone',
      label: '¿Hubo algún cambio hoy?',
      line: '¿Sabés si hoy cambiaron algo? Un aviso, una actualización…',
      cost: 1,
      run: (w): ProbeResult =>
        same(w, 'driver')
          ? said('A la tarde llegó un aviso de que iban a actualizar algo de las impresoras. No sé si lo hicieron.', 'Elena recuerda un aviso sobre una actualización de impresoras', { drv: 'supports' })
          : same(w, 'job')
            ? said('Que yo sepa, no. Bueno, Méndez estuvo imprimiendo el inventario anual, que es enorme.', 'Elena dice que no sabe de cambios; J. Méndez imprimió un inventario enorme', { job: 'supports' })
            : said('Llegó un correo de Sistemas sobre una migración de no sé qué servidor. Ni lo abrí.', 'Elena menciona un correo de Sistemas sobre una migración de servidor', { dns: 'supports' }),
    },
    // ---------------------------------------------------------- pruebas
    {
      id: 't-ping-name',
      kind: 'test',
      app: 'network',
      target: 'SRV-IMP-01',
      label: 'Probar alcance por nombre (srv-impresion)',
      asks: '¿El nombre del servidor lleva a un equipo que responde?',
      cost: 2,
      console: ['ping srv-impresion'],
      run: (w): ProbeResult => {
        const ip = String(w.dnsRecord);
        if (ip !== w.serverIp)
          return test(`srv-impresion [${ip}]: sin respuesta (4 de 4 perdidos).`, 'srv-impresion no responde por nombre: resuelve a 10.20.0.12', { dns: 'supports' }, [
            `Haciendo ping a srv-impresion [${ip}]`,
            'Tiempo de espera agotado. ×4',
          ]);
        return w.dnsFixed
          ? test(`srv-impresion [${ip}]: responde, 2 ms.`, 'Tras corregir el DNS, srv-impresion responde por nombre', { dns: 'supports' })
          : test(`srv-impresion [${ip}]: responde, 2 ms.`, 'srv-impresion responde por nombre (10.20.0.15)', { dns: 'contradicts' }, [
              `Haciendo ping a srv-impresion [${ip}]`,
              'Respuesta: tiempo=2 ms ×4',
            ]);
      },
    },
    {
      id: 't-ping-ip',
      kind: 'test',
      app: 'network',
      target: 'SRV-IMP-01',
      label: `Probar alcance por IP (${NEW_IP})`,
      asks: '¿El servidor está encendido y alcanzable en la red?',
      cost: 2,
      console: [`ping ${NEW_IP}`],
      run: (): ProbeResult =>
        test(`${NEW_IP}: responde, 1 ms.`, `El servidor de impresión responde por IP (${NEW_IP})`, { hw: 'neutral' }, [
          `Haciendo ping a ${NEW_IP}`,
          'Respuesta: tiempo=1 ms ×4',
        ]),
    },
    {
      id: 't-resolve',
      kind: 'test',
      app: 'network',
      target: 'PC-ADM-07',
      label: 'Resolver srv-impresion desde PC-ADM-07',
      asks: '¿A qué dirección llega la PC de Elena cuando busca el servidor?',
      cost: 1,
      console: ['nslookup srv-impresion'],
      run: (w): ProbeResult =>
        w.pcCache === w.serverIp
          ? test(`PC-ADM-07 resuelve srv-impresion → ${String(w.pcCache)} (coincide con el inventario).`, w.dnsFixed ? 'La PC de Elena ya resuelve srv-impresion a 10.20.0.15' : 'La PC de Elena resuelve srv-impresion a 10.20.0.15, como el inventario', w.dnsFixed ? { dns: 'supports' } : { dns: 'contradicts' })
          : test(`PC-ADM-07 resuelve srv-impresion → ${String(w.pcCache)}. El inventario dice ${String(w.serverIp)}.`, 'La PC de Elena resuelve srv-impresion a 10.20.0.12; el inventario dice 10.20.0.15', { dns: 'supports' }),
    },
    {
      id: 't-queue',
      kind: 'test',
      app: 'printers',
      target: 'IMP-ADM-02',
      label: 'Consultar la cola de IMP-ADM-02',
      asks: '¿Qué trabajos hay y en qué estado?',
      cost: 2,
      console: ['cola imp-adm-02'],
      run: (w): ProbeResult => {
        if (isFixed(w)) return test('Cola vacía. Los trabajos pendientes se imprimieron.', 'La cola de IMP-ADM-02 ya está vacía y avanzando', {});
        if (w.cause === 'driver')
          return w.elenaJobs
            ? test('2 trabajos. El primero está en «Error».', 'La cola muestra el trabajo de Elena en «Error» y otro detrás', { drv: 'supports', job: 'supports' }, [
                '#418 · Cierre_operativo.pdf · esuarez · Error – Imprimiendo',
                '#419 · Cierre_operativo (2).pdf · esuarez · En cola',
              ])
            : test('Cola vacía. El servicio de cola no está procesando.', 'La cola está vacía, pero el servicio sigue sin procesar', { drv: 'supports', job: 'contradicts' });
        if (w.cause === 'job')
          return test('4 trabajos. El #412 está en «Error» al frente; los demás esperan.', 'El trabajo 412 (J. Méndez) está en «Error» al frente de la cola; 3 esperan detrás', { job: 'supports' }, [
            '#412 · Planilla_stock_anual.xlsx · jmendez · Error – reintentando (0 de 38 págs.)',
            '#418 · Cierre_operativo.pdf · esuarez · En cola',
            '#419 · Cierre_operativo (2).pdf · esuarez · En cola',
            '#420 · Informe_guardia.docx · jperez · En cola',
          ]);
        return test('Cola del servidor vacía: no llegó ningún trabajo desde las 22:30.', 'La cola del servidor está vacía: no llegan trabajos desde las 22:30', { job: 'contradicts', dns: 'supports' });
      },
    },
    {
      id: 't-testpage',
      kind: 'test',
      app: 'printers',
      target: 'IMP-ADM-02',
      label: 'Imprimir página de prueba desde el servidor',
      asks: '¿El servidor puede imprimir directamente en la impresora?',
      cost: 3,
      run: (w): ProbeResult => {
        if (isFixed(w)) return test('Página de prueba impresa correctamente.', 'La página de prueba sale bien desde el servidor', { hw: 'contradicts' });
        if (w.serviceCrashes)
          return test('No salió. El servicio de cola se detuvo al procesar la página de prueba.', 'La página de prueba no salió: el servicio de cola cayó al procesarla', { drv: 'supports' }, undefined, { serviceRunning: false });
        if (w.stuckJob)
          return test('La página de prueba quedó en cola detrás del trabajo #412.', 'La página de prueba quedó esperando detrás del trabajo 412', { job: 'supports' });
        return test('La página de prueba salió bien desde el servidor.', 'Desde el servidor, la página de prueba sale bien', { drv: 'contradicts', job: 'contradicts', hw: 'contradicts', dns: 'supports' });
      },
    },
    {
      id: 't-driver',
      kind: 'test',
      app: 'printers',
      target: 'IMP-ADM-02',
      label: 'Ver controlador instalado',
      asks: '¿Qué versión de controlador usa y desde cuándo?',
      cost: 1,
      run: (w): ProbeResult =>
        w.driver === '5.2'
          ? test('UniPrint 5.2 · restaurado hoy.', 'El controlador está en UniPrint 5.2 (restaurado)', {})
          : w.driverToday
            ? test('UniPrint 6.0 · instalado hoy a las 21:40 · versión anterior: 5.2.', 'El controlador UniPrint 6.0 se instaló hoy a las 21:40', { drv: 'supports' })
            : test('UniPrint 6.0 · instalado el 20/09 (hace 8 días) · sin incidentes registrados.', 'UniPrint 6.0 está instalado desde hace 8 días', { drv: 'contradicts' }),
    },
    {
      id: 't-panel',
      kind: 'test',
      app: 'printers',
      target: 'IMP-ADM-02',
      label: 'Ver panel de estado de la impresora',
      asks: '¿La impresora física tiene algún problema?',
      cost: 1,
      run: (): ProbeResult =>
        test('IMP-ADM-02: Lista. Papel 80 %. Tóner 62 %. Sin atascos.', 'El panel de IMP-ADM-02 indica «Lista», con papel y tóner', { hw: 'contradicts' }),
    },
    {
      id: 't-service',
      kind: 'test',
      app: 'services',
      target: 'SRV-IMP-01',
      label: 'Consultar el servicio «Cola de impresión»',
      asks: '¿El servicio que procesa los trabajos está funcionando?',
      cost: 1,
      console: ['servicio srv-impresion cola'],
      run: (w): ProbeResult =>
        w.serviceRunning
          ? w.driver === '5.2' && w.cause === 'driver'
            ? test('Cola de impresión: En ejecución, estable desde la reversión.', 'El servicio de cola quedó estable tras revertir el controlador', { drv: 'supports' })
            : test('Cola de impresión: En ejecución desde las 18:02. Sin caídas.', 'El servicio de cola está en ejecución y estable desde las 18:02', { drv: 'contradicts' })
          : test('Cola de impresión: Detenido. Se detuvo inesperadamente a las 22:52.', 'El servicio de cola está detenido: se cayó a las 22:52', { drv: 'supports' }),
    },
    {
      id: 't-events-srv',
      kind: 'test',
      app: 'events',
      target: 'SRV-IMP-01',
      label: 'Filtrar eventos de SRV-IMP-01 (22:00 → ahora)',
      asks: '¿Qué registró el servidor alrededor del fallo?',
      cost: 3,
      console: ['eventos srv-impresion'],
      run: (w): ProbeResult =>
        w.cause === 'driver'
          ? test('4 eventos relevantes.', 'Eventos de SRV-IMP-01: el servicio de cola cae con error en uniprint6.dll desde las 22:47', { drv: 'supports' }, [
              '21:40 · Info · Controlador UniPrint 6.0 instalado',
              '22:47 · Error · «Cola de impresión» se detuvo inesperadamente. Módulo: uniprint6.dll',
              '22:48 · Info · Servicio reiniciado automáticamente',
              '22:52 · Error · «Cola de impresión» se detuvo inesperadamente. Módulo: uniprint6.dll',
            ])
          : w.cause === 'job'
            ? test('15 eventos, casi todos iguales.', 'Eventos de SRV-IMP-01: reintentos continuos del trabajo 412 desde las 22:14; el servicio no cae', { job: 'supports', drv: 'contradicts' }, [
                '18:02 · Info · Servicio «Cola de impresión» iniciado',
                '22:14 · Advertencia · El trabajo 412 no se pudo enviar a IMP-ADM-02; reintentando',
                '22:16 → ahora · Advertencia · (misma advertencia ×14)',
              ])
            : test('2 eventos informativos.', 'Eventos de SRV-IMP-01: sin errores y sin trabajos recibidos desde el cambio de IP de las 22:30', { dns: 'supports', drv: 'contradicts', job: 'contradicts' }, [
                '22:30 · Info · Dirección de red cambiada a 10.20.0.15',
                '22:31 · Info · «Cola de impresión» en ejecución',
                '(sin trabajos recibidos desde 22:30)',
              ]),
    },
    {
      id: 't-events-pc',
      kind: 'test',
      app: 'events',
      target: 'PC-ADM-07',
      label: 'Filtrar eventos de PC-ADM-07 (22:00 → ahora)',
      asks: '¿Qué ve la PC de Elena al intentar imprimir?',
      cost: 3,
      console: ['eventos pc-adm-07'],
      run: (w): ProbeResult =>
        w.cause === 'driver'
          ? test('1 advertencia.', 'Eventos de PC-ADM-07: el servidor no devolvió el estado del trabajo', {}, ['22:47 · Advertencia · \\\\srv-impresion no devolvió el estado del trabajo 418'])
          : w.cause === 'job'
            ? test('2 eventos informativos.', 'Eventos de PC-ADM-07: los trabajos llegan al servidor y quedan en espera', { dns: 'contradicts' }, ['22:58 · Info · Trabajo enviado a \\\\srv-impresion (en espera)', '22:59 · Info · Trabajo enviado a \\\\srv-impresion (en espera)'])
            : test('2 errores.', `Eventos de PC-ADM-07: no puede conectar con srv-impresion en ${OLD_IP}`, { dns: 'supports' }, [
                `22:41 · Error · No se pudo conectar con \\\\srv-impresion (${OLD_IP}): tiempo de espera agotado`,
                `22:58 · Error · No se pudo conectar con \\\\srv-impresion (${OLD_IP})`,
              ]),
    },
    {
      id: 'd-changes',
      kind: 'document',
      app: 'files',
      target: 'SRV-IMP-01',
      label: 'Registro de cambios de infraestructura',
      asks: '¿Qué se cambió recientemente?',
      cost: 0,
      run: (w): ProbeResult =>
        w.cause === 'driver'
          ? test('Registro de cambios', 'Registro de cambios: hoy a las 21:40 se actualizó el controlador a UniPrint 6.0', { drv: 'supports' }, [
              'Hoy 21:40 · SRV-IMP-01 · Actualización de controlador UniPrint 5.2 → 6.0 · Aplicada · Infraestructura',
              'Sábado 03:00 · SRV-ARCH-01 · Parche mensual · Programado',
            ])
          : w.cause === 'job'
            ? test('Registro de cambios', 'Registro de cambios: nada nuevo hoy en impresión (UniPrint 6.0 desde el 20/09)', { drv: 'contradicts' }, [
                'Hoy 20:00 · SRV-BACKUP · Cambio de horario de copias · Aplicado',
                '20/09 · SRV-IMP-01 · Actualización UniPrint 6.0 · Aplicada sin incidentes',
              ])
            : test('Registro de cambios', 'Registro de cambios: hoy a las 22:30 se migró srv-impresion de 10.20.0.12 a 10.20.0.15', { dns: 'supports' }, [
                'Hoy 22:30 · SRV-IMP-01 · Migración de red 10.20.0.12 → 10.20.0.15 · Aplicada · «El registro DNS se actualiza solo»',
                '20/09 · SRV-IMP-01 · Actualización UniPrint 6.0 · Aplicada sin incidentes',
              ]),
    },
    // ---------------------------------------------------------- intervenciones
    {
      id: 'i-restart-service',
      kind: 'intervention',
      app: 'services',
      target: 'SRV-IMP-01',
      label: 'Reiniciar el servicio «Cola de impresión»',
      cost: 3,
      risk: 'Los trabajos en curso se reintentan. No afecta la impresora ni la PC de Elena.',
      console: ['reiniciar servicio srv-impresion cola'],
      run: (w): ProbeResult => {
        if (w.serviceCrashes)
          return tried('El servicio arrancó y volvió a detenerse a los pocos segundos, al procesar el siguiente trabajo.', 'Reinicié el servicio de cola: volvió a detenerse al procesar el trabajo', { drv: 'supports' });
        if (w.stuckJob)
          return tried('El servicio se reinició. El trabajo #412 sigue primero en la cola, en «Error».', 'Reinicié el servicio de cola: el trabajo 412 sigue trabado primero', { job: 'supports', drv: 'contradicts' });
        if (w.cause === 'dns' && w.pcCache !== w.serverIp)
          return tried('El servicio se reinició sin errores. Siguen sin llegar trabajos de las PC.', 'Reinicié el servicio de cola: arrancó bien, pero siguen sin llegar trabajos', { dns: 'supports', drv: 'contradicts' });
        return tried('El servicio se reinició y sigue en ejecución.', 'Reinicié el servicio de cola: sigue estable', {});
      },
    },
    {
      id: 'i-cancel-job',
      kind: 'intervention',
      app: 'printers',
      target: 'IMP-ADM-02',
      label: 'Cancelar el trabajo que encabeza la cola',
      cost: 2,
      risk: 'El trabajo cancelado se pierde: su dueño tendrá que reenviarlo.',
      requires: (c) => (c.done('t-queue') ? null : 'Primero consultá la cola para identificar qué trabajo cancelar.'),
      run: (w): ProbeResult => {
        if (w.cause === 'driver' && w.elenaJobs)
          return {
            ...tried('Cancelé los trabajos en error. La cola quedó vacía, pero el servicio sigue detenido.', 'Cancelé el trabajo en error: la cola se vació, pero el servicio sigue sin procesar', { drv: 'supports', job: 'contradicts' }),
            world: { elenaJobs: false },
            wrong: true,
            trust: -1,
            consequence: 'Se cancelaron los documentos de Elena: tuvo que volver a enviarlos.',
          };
        if (w.stuckJob)
          return {
            ...tried('Cancelé el trabajo #412. La cola empezó a avanzar: salen los trabajos que esperaban.', 'Cancelé el trabajo 412: la cola empezó a avanzar', { job: 'supports' }),
            world: { stuckJob: false },
            flags: ['cancelled-412'],
          };
        return tried('La cola del servidor no tiene trabajos para cancelar.', 'Busqué un trabajo para cancelar: la cola del servidor está vacía', { job: 'contradicts' });
      },
    },
    {
      id: 'i-notify-resend',
      kind: 'communicate',
      app: 'printers',
      target: 'IMP-ADM-02',
      label: 'Avisar a J. Méndez que reenvíe su planilla',
      cost: 1,
      requires: (c) => (c.flags.includes('cancelled-412') ? null : 'Sólo tiene sentido si cancelaste un trabajo ajeno.'),
      run: (): ProbeResult => ({ summary: 'Dejé un correo a J. Méndez: su planilla se canceló y conviene reenviarla por partes.' }),
    },
    {
      id: 'i-rollback',
      kind: 'intervention',
      app: 'printers',
      target: 'IMP-ADM-02',
      label: 'Revertir el controlador a UniPrint 5.2',
      cost: 8,
      risk: 'Afecta a todas las impresoras de ese servidor. Si el controlador no era el problema, se pierde una actualización que habrá que reinstalar de día.',
      requires: (c) => (c.world.driver === '6.0' ? null : 'El controlador ya está en la versión 5.2.'),
      run: (w): ProbeResult =>
        w.cause === 'driver'
          ? {
              ...tried('Revertí a UniPrint 5.2 y reinicié el servicio según el procedimiento. El servicio está estable.', 'Revertí el controlador a UniPrint 5.2: el servicio quedó estable', { drv: 'supports' }),
              world: { driver: '5.2', serviceCrashes: false, serviceRunning: true },
            }
          : {
              ...tried('Revertí a UniPrint 5.2. No cambió nada visible.', 'Revertí el controlador a 5.2: nada cambió', { drv: 'contradicts' }),
              world: { driver: '5.2' },
              wrong: true,
              consequence: 'Se revirtió sin necesidad la actualización del controlador; hay que reinstalarla en horario diurno.',
            },
    },
    {
      id: 'i-fix-dns',
      kind: 'intervention',
      app: 'network',
      target: 'SRV-IMP-01',
      label: 'Corregir el registro DNS de srv-impresion → 10.20.0.15',
      cost: 5,
      risk: 'Un registro DNS afecta a todos los equipos que usan ese nombre. Las PC pueden conservar la dirección anterior en caché hasta 60 minutos.',
      console: ['dns srv-impresion 10.20.0.15'],
      run: (w): ProbeResult =>
        w.dnsRecord === w.serverIp
          ? tried('El registro ya apuntaba a 10.20.0.15. No cambié nada.', 'Revisé el registro DNS de srv-impresion: ya apuntaba a 10.20.0.15', { dns: 'contradicts' })
          : {
              ...tried('Registro corregido: srv-impresion → 10.20.0.15. Las PC con caché pueden tardar hasta 60 min en verlo.', 'Corregí el registro DNS de srv-impresion a 10.20.0.15', { dns: 'supports' }),
              world: { dnsRecord: NEW_IP, dnsFixed: true },
              schedule: [{ after: 60, world: { pcCache: NEW_IP }, text: 'Expiró la caché de nombres en PC-ADM-07.' }],
            },
    },
    {
      id: 'i-flush',
      kind: 'intervention',
      app: 'remote',
      target: 'PC-ADM-07',
      label: 'Renovar la caché de nombres (DNS) en PC-ADM-07',
      cost: 1,
      risk: 'Sin efectos secundarios: la PC vuelve a preguntar los nombres al servidor DNS.',
      console: ['ipconfig /flushdns'],
      run: (w): ProbeResult =>
        w.pcCache === w.dnsRecord
          ? tried(`Caché renovada. PC-ADM-07 resuelve srv-impresion → ${String(w.dnsRecord)}, igual que antes.`, `Renové la caché DNS de PC-ADM-07: resuelve ${String(w.dnsRecord)} como antes`, w.dnsRecord === w.serverIp ? {} : { dns: 'supports' })
          : {
              ...tried(`Caché renovada. PC-ADM-07 ahora resuelve srv-impresion → ${String(w.dnsRecord)}.`, `Renové la caché DNS de PC-ADM-07: ahora resuelve ${String(w.dnsRecord)}`, { dns: 'supports' }),
              world: { pcCache: String(w.dnsRecord) },
            },
    },
    {
      id: 'i-restart-pc',
      kind: 'intervention',
      app: 'remote',
      target: 'PC-ADM-07',
      label: 'Reiniciar PC-ADM-07 de forma remota',
      cost: 6,
      risk: 'Elena puede perder lo que tenga abierto sin guardar. Reiniciar la PC no reinicia el servidor ni la impresora.',
      run: (w): ProbeResult => {
        const helps = w.pcCache !== w.dnsRecord;
        return {
          ...tried(
            helps ? 'La PC reinició y renovó su caché de nombres.' : 'La PC reinició. Nada cambió en la impresión.',
            helps ? 'Reinicié la PC de Elena: renovó la caché de nombres' : 'Reinicié la PC de Elena: sigue sin imprimir',
            helps ? { dns: 'supports' } : {},
          ),
          world: { pcCache: String(w.dnsRecord) },
          wrong: !helps,
          trust: -1,
          consequence: 'Elena perdió cambios de una planilla abierta al reiniciar su PC.',
        };
      },
    },
    {
      id: 'i-restart-printer',
      kind: 'intervention',
      app: 'printers',
      target: 'IMP-ADM-02',
      label: 'Reiniciar la impresora desde su panel',
      cost: 3,
      risk: 'Reiniciar la impresora no toca el servidor ni la cola: sólo el equipo físico.',
      run: (): ProbeResult =>
        tried('La impresora reinició y volvió a «Lista». Nada cambió.', 'Reinicié la impresora desde su panel: sigue igual', { hw: 'contradicts' }),
    },
    // ---------------------------------------------------------- verificación
    {
      id: 'v-retry',
      kind: 'verify',
      app: 'phone',
      label: '¿Podés probar de nuevo y decirme qué pasa?',
      line: '¿Podés probar de nuevo y decirme qué pasa?',
      cost: 2,
      requires: (c) =>
        c.flags.includes('intervened') || ['i-restart-service', 'i-cancel-job', 'i-rollback', 'i-fix-dns', 'i-flush', 'i-restart-pc', 'i-restart-printer'].some(c.done)
          ? null
          : 'Todavía no cambiaste nada: probar de nuevo daría el mismo resultado.',
      run: (w): ProbeResult => {
        if (isFixed(w))
          return {
            summary: 'Elena confirma que imprime.',
            reply: w.elenaJobs ? '¡Ahí salió! Está imprimiendo todo. Gracias, Nicolás.' : 'Lo mandé de nuevo y… ¡salió! Gracias.',
            note: 'Elena confirma que ya imprime',
            confirms: true,
          };
        const reply =
          w.cause === 'driver'
            ? 'Nada. Vuelve a aparecer «Error».'
            : w.cause === 'job'
              ? 'Sigue igual: mis documentos quedan «En cola».'
              : 'Sigue diciendo «Esperando conexión».';
        return { summary: 'Sigue sin imprimir.', reply, note: `Elena probó de nuevo: ${reply.charAt(0).toLowerCase()}${reply.slice(1)}` };
      },
    },
  ],
  isFixed,
};

function said(reply: string, note: string, relations: ProbeResult['relations'] = {}): ProbeResult {
  return { summary: reply, reply, note, relations };
}

function test(
  summary: string,
  note: string,
  relations: ProbeResult['relations'],
  detail?: string[],
  world?: World,
): ProbeResult {
  return { summary, note, relations, ...(detail ? { detail } : {}), ...(world ? { world } : {}) };
}

function tried(summary: string, note: string, relations: ProbeResult['relations']): ProbeResult {
  return { summary, note, relations };
}
