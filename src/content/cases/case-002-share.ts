import type { CaseDef, ProbeResult, World } from '../../engine/types';

/** Expediente 002 — Carpeta compartida (correo). Causa: alta de grupo pendiente tras cambio de función. */
const isFixed = (w: World) => (w.inEditors === true || w.inAdmin === true) && w.tokenFresh === true;

const world: World = {
  cause: 'membership',
  hyp: 'perm',
  inEditors: false,
  inAdmin: false,
  inLogistics: true,
  tokenFresh: true,
  passwordReset: false,
};

export const case002: CaseDef = {
  id: 'c002',
  number: '002',
  title: 'Sin acceso a la carpeta de Compras',
  channel: 'email',
  contact: { name: 'Tomás Ibarra', short: 'Tomás', role: 'Compras', device: 'PC-CMP-04' },
  knownAtStart: true,
  teaser: '«Acceso denegado» en \\\\srv-archivos\\Compras.',
  summary:
    'Tomás necesita la carpeta de Licitaciones de Compras para dejar lista una planilla antes de las 8. Le aparece «Acceso denegado».',
  arrival: 20,
  deadline: 180,
  devices: ['PC-CMP-04', 'SRV-ARCH-01', 'PC-SOP-01'],
  message: {
    id: 'c002-m0',
    at: 20,
    from: 'Tomás Ibarra <tibarra@mutualsur.local>',
    to: 'Soporte <soporte@mutualsur.local>',
    subject: 'No puedo entrar a la carpeta de Compras',
    body: [
      'Hola, buenas noches.',
      'Estoy terminando la planilla de la licitación de insumos y tengo que dejarla en \\\\srv-archivos\\Compras\\Licitaciones antes de las 8, que la revisa el comité.',
      'Cuando abro la carpeta me sale «Acceso denegado». Adjunto la captura.',
      'Estoy desde la PC de siempre. Gracias.',
      'Tomás Ibarra',
    ],
    attachments: [
      {
        name: 'acceso-denegado.png',
        description:
          'Captura: ventana «\\\\srv-archivos\\Compras no es accesible. No tiene permiso para usar este recurso de red. Acceso denegado.»',
      },
    ],
  },
  variants: [
    {
      id: 'membership',
      cause: 'Alta pendiente en el grupo de Compras tras el cambio de función',
      explanation:
        'Tomás pasó de Logística a Compras el lunes. RRHH aprobó la solicitud RRHH-2291 para agregarlo a GG_Compras_Editores y retirarlo de Logística, pero nadie aplicó el cambio. La red y la cuenta estaban bien: el servidor respondía y denegaba por permisos. Tras el alta, su sesión debía renovarse para incluir el grupo nuevo.',
      world,
      keyProbes: ['t-groups', 't-effective', 't-share-open', 't-requests'],
    },
  ],
  pickVariant: () => 'membership',
  hypotheses: [
    {
      id: 'perm',
      label: 'Falta la pertenencia al grupo tras el cambio de función',
      detail: 'La cuenta no está en el grupo que da acceso a la carpeta.',
      pertinent: [
        { probe: 't-groups', what: 'grupos de la cuenta' },
        { probe: 't-acl', what: 'permisos de la carpeta' },
        { probe: 't-effective', what: 'acceso efectivo' },
      ],
    },
    {
      id: 'net',
      label: 'Problema de red o de conexión al servidor',
      detail: 'La PC no llega al servidor de archivos.',
      pertinent: [
        { probe: 't-ping', what: 'alcance del servidor' },
        { probe: 't-share-open', what: 'respuesta del recurso compartido' },
      ],
    },
    {
      id: 'acct',
      label: 'Cuenta bloqueada o contraseña vencida',
      detail: 'La identidad no puede autenticarse.',
      pertinent: [{ probe: 't-identity', what: 'estado de la cuenta' }],
    },
    {
      id: 'down',
      label: 'Recurso caído o movido',
      detail: 'La carpeta no existe o el servicio de archivos no responde.',
      pertinent: [
        { probe: 't-share-open', what: 'respuesta del recurso compartido' },
        { probe: 't-events', what: 'registro de seguridad del servidor' },
      ],
    },
  ],
  deadlineText: 'A las 02:00 Tomás escribió a su jefa que no pudo avanzar con la planilla de la licitación.',
  escalation: {
    label: 'Escalar a Accesos y Seguridad (turno mañana)',
    appropriate: (c) => !c.flags.includes('authFound'),
    explain: (c) =>
      c.flags.includes('authFound')
        ? 'La solicitud RRHH-2291 ya autorizaba el alta: se podía resolver desde la guardia.'
        : 'Sin una autorización registrada, no correspondía cambiar permisos de noche: escalar era prudente.',
  },
  checklist: [
    { probe: 'i-remove-logistics', text: 'Retirar el acceso del puesto anterior, como indica la solicitud' },
    { probe: 't-requests', text: 'Verificar la autorización antes de cambiar permisos' },
  ],
  farewell: {
    nico: '',
    warm: '',
    costly: '',
    cold: '',
    mail: 'Tomás, confirmado: ya tenés acceso a la carpeta de Compras. Cierro el ticket; si algo falla, respondé este correo y lo retomo.',
  },
  learned:
    'Permisos: si el servidor responde «acceso denegado», la red anda. Compará grupos de la cuenta con los permisos del recurso, buscá la autorización y renová la sesión después del alta.',
  probes: [
    // ---------------------------------------------------------- correos
    {
      id: 'q-details',
      kind: 'question',
      app: 'mail',
      label: 'Pedir equipo, mensaje exacto y qué otras carpetas abre',
      line: 'Hola, Tomás. ¿Desde qué equipo estás? ¿Podés abrir otras carpetas del servidor, por ejemplo la de Logística?',
      cost: 6,
      run: (): ProbeResult =>
        mailSaid(
          'Estoy en la PC-CMP-04. La de Logística abre perfecto, la de Compras no. El mensaje es el de la captura.',
          'Tomás dice que desde PC-CMP-04 abre Logística pero no Compras',
          { perm: 'supports', net: 'contradicts', acct: 'contradicts' },
        ),
    },
    {
      id: 'q-role',
      kind: 'question',
      app: 'mail',
      label: 'Preguntar si hubo un cambio de puesto o una autorización',
      line: '¿Cambiaste de área o de tareas hace poco? ¿Alguien pidió formalmente tu acceso a Compras?',
      cost: 6,
      run: (): ProbeResult => ({
        ...mailSaid(
          'Sí, desde el lunes estoy en Compras (antes Logística). Laura Benítez, mi jefa, pidió el alta por RRHH. Me pasó el número: RRHH-2291.',
          'Tomás dice que pasó de Logística a Compras el lunes; su jefa pidió el alta (RRHH-2291)',
          { perm: 'supports' },
        ),
        flags: ['toldRequest'],
      }),
    },
    {
      id: 'q-relogin',
      kind: 'question',
      app: 'mail',
      label: 'Pedirle que cierre sesión y vuelva a entrar',
      line: 'Tomás, guardá lo que tengas abierto, cerrá sesión en la PC y volvé a entrar, por favor.',
      cost: 6,
      requires: (c) =>
        c.world.inEditors || c.world.inAdmin
          ? null
          : 'Todavía no hay cambios que requieran renovar la sesión.',
      run: (): ProbeResult => ({
        ...mailSaid('Listo, cerré sesión y volví a entrar.', 'Tomás cerró sesión y volvió a entrar', {}),
        world: { tokenFresh: true },
      }),
    },
    {
      id: 'c-update',
      kind: 'communicate',
      app: 'mail',
      label: 'Informar avance',
      line: 'Tomás, ya estoy revisando los permisos de la carpeta. Te aviso apenas tenga algo para probar.',
      cost: 2,
      run: (): ProbeResult => ({ summary: 'Correo enviado.', reply: 'Gracias, quedo atento.', trust: 1 }),
    },
    {
      id: 'v-try',
      kind: 'verify',
      app: 'mail',
      label: 'Pedirle que pruebe abrir la carpeta',
      line: '¿Podés probar abrir \\\\srv-archivos\\Compras\\Licitaciones ahora y contarme qué pasa?',
      cost: 6,
      requires: (c) =>
        ['i-add-editors', 'i-add-admin', 'i-reset-password', 'i-renew-session'].some(c.done) ||
        c.done('q-relogin')
          ? null
          : 'Todavía no cambiaste nada: probar de nuevo daría el mismo resultado.',
      run: (w): ProbeResult =>
        (w.inEditors || w.inAdmin) && w.tokenFresh
          ? {
              summary: 'Tomás confirma que abrió la carpeta y guardó la planilla.',
              reply: '¡Entré! Pude guardar la planilla en Licitaciones. Muchas gracias.',
              note: 'Tomás confirma que abrió Licitaciones y guardó la planilla',
              confirms: true,
            }
          : w.inEditors || w.inAdmin
            ? {
                summary: 'Sigue sin acceso.',
                reply: 'Sigue diciendo «Acceso denegado». No cerré sesión en ningún momento, por si sirve.',
                note: 'Tomás dice que sigue denegado; no cerró sesión desde el cambio',
                relations: {},
              }
            : {
                summary: 'Sigue sin acceso.',
                reply: 'Sigue igual, «Acceso denegado».',
                note: 'Tomás dice que sigue con «Acceso denegado»',
                relations: {},
              },
    },
    // ---------------------------------------------------------- pruebas
    {
      id: 't-identity',
      kind: 'test',
      app: 'accounts',
      target: 'tibarra',
      label: 'Ver identidad de tibarra',
      asks: '¿La cuenta existe, está habilitada y sin bloqueo?',
      cost: 1,
      console: ['usuario tibarra'],
      run: (): ProbeResult =>
        t(
          'Cuenta habilitada · sin bloqueo · contraseña vigente (vence en 41 días) · Departamento: Compras (actualizado el lunes por RRHH).',
          'La cuenta de tibarra está activa, sin bloqueo; RRHH ya figura Compras',
          { acct: 'contradicts', perm: 'supports' },
        ),
    },
    {
      id: 't-groups',
      kind: 'test',
      app: 'accounts',
      target: 'tibarra',
      label: 'Ver grupos de tibarra',
      asks: '¿A qué grupos pertenece hoy?',
      cost: 1,
      console: ['grupos tibarra'],
      run: (w): ProbeResult => {
        const groups = [
          'GG_Todos',
          ...(w.inLogistics ? ['GG_Logistica_Editores'] : []),
          ...(w.inEditors ? ['GG_Compras_Editores'] : []),
          ...(w.inAdmin ? ['GG_Compras_Admin'] : []),
        ];
        return w.inEditors || w.inAdmin
          ? t(
              `Grupos: ${groups.join(', ')}.`,
              `tibarra ya figura en ${w.inEditors ? 'GG_Compras_Editores' : 'GG_Compras_Admin'}`,
              {},
              groups,
            )
          : t(
              `Grupos: ${groups.join(', ')}.`,
              'tibarra sólo está en GG_Todos y GG_Logistica_Editores: ningún grupo de Compras',
              { perm: 'supports' },
              groups,
            );
      },
    },
    {
      id: 't-acl',
      kind: 'test',
      app: 'accounts',
      target: 'srv-archivos\\Compras',
      label: 'Ver permisos de \\\\srv-archivos\\Compras',
      asks: '¿Qué grupos tienen acceso a la carpeta?',
      cost: 2,
      console: ['permisos compras'],
      run: (): ProbeResult =>
        t(
          '3 entradas de permiso.',
          'La carpeta Compras da acceso a GG_Compras_Editores (modificar) y GG_Compras_Lectura (leer)',
          { perm: 'supports', down: 'contradicts' },
          [
            'GG_Compras_Editores · Modificar',
            'GG_Compras_Lectura · Leer',
            'GG_Compras_Admin · Control total',
          ],
        ),
    },
    {
      id: 't-effective',
      kind: 'test',
      app: 'accounts',
      target: 'tibarra',
      label: 'Calcular acceso efectivo de tibarra sobre Compras',
      asks: '¿Qué acceso le corresponde según sus grupos actuales?',
      cost: 2,
      console: ['acceso tibarra compras'],
      run: (w): ProbeResult =>
        w.inEditors || w.inAdmin
          ? t(
              `Acceso efectivo: ${w.inAdmin ? 'Control total' : 'Modificar'} (según el directorio).`,
              `Según el directorio, tibarra ya tiene acceso ${w.inAdmin ? 'total' : 'de modificación'} a Compras`,
              {},
            )
          : t(
              'Acceso efectivo: ninguno. Ningún grupo de la cuenta coincide con los permisos de la carpeta.',
              'El acceso efectivo de tibarra sobre Compras es «ninguno»',
              { perm: 'supports' },
            ),
    },
    {
      id: 't-ping',
      kind: 'test',
      app: 'network',
      target: 'SRV-ARCH-01',
      label: 'Probar alcance de srv-archivos desde PC-CMP-04',
      asks: '¿La PC de Tomás llega al servidor?',
      cost: 2,
      console: ['ping srv-archivos'],
      run: (): ProbeResult =>
        t('srv-archivos [10.20.0.20]: responde, 1 ms.', 'srv-archivos responde desde PC-CMP-04', {
          net: 'contradicts',
          down: 'contradicts',
        }),
    },
    {
      id: 't-share-open',
      kind: 'test',
      app: 'remote',
      target: 'PC-CMP-04',
      label: 'Abrir \\\\srv-archivos\\Compras desde la sesión de Tomás',
      asks: '¿Qué contesta el servidor cuando la PC pide la carpeta?',
      cost: 2,
      run: (w): ProbeResult =>
        (w.inEditors || w.inAdmin) && w.tokenFresh
          ? t(
              'La carpeta abre: Licitaciones, Proveedores, Órdenes.',
              'Desde la sesión de Tomás la carpeta Compras ya abre',
              {},
            )
          : t(
              'El servidor respondió: «Acceso denegado».',
              'El servidor responde a la PC de Tomás, pero deniega el acceso a Compras',
              { net: 'contradicts', down: 'contradicts', perm: 'supports' },
            ),
    },
    {
      id: 't-token',
      kind: 'test',
      app: 'remote',
      target: 'PC-CMP-04',
      label: 'Ver credenciales de la sesión actual',
      asks: '¿Qué grupos lleva la sesión abierta de Tomás?',
      cost: 1,
      console: ['sesion pc-cmp-04'],
      run: (w): ProbeResult =>
        w.tokenFresh
          ? t(
              `Sesión iniciada con los grupos vigentes${w.inEditors ? ' (incluye GG_Compras_Editores)' : ''}.`,
              w.inEditors
                ? 'La sesión de Tomás ya incluye GG_Compras_Editores'
                : 'La sesión de Tomás lleva sus grupos vigentes',
              {},
            )
          : t(
              'La sesión se inició a las 22:48: no incluye los grupos agregados después.',
              'La sesión de Tomás es anterior al alta: no incluye el grupo nuevo',
              { perm: 'supports' },
            ),
    },
    {
      id: 't-events',
      kind: 'test',
      app: 'events',
      target: 'SRV-ARCH-01',
      label: 'Filtrar registro de seguridad de SRV-ARCH-01 (23:00 → ahora)',
      asks: '¿El servidor registró los intentos de Tomás?',
      cost: 3,
      console: ['eventos srv-archivos'],
      run: (): ProbeResult =>
        t(
          '2 auditorías de acceso denegado.',
          'El registro de seguridad muestra accesos denegados a tibarra sobre Compras (23:05 y 23:12)',
          { perm: 'supports', net: 'contradicts', down: 'contradicts' },
          [
            '23:05 · Auditoría · Acceso denegado · tibarra · \\\\srv-archivos\\Compras · motivo: sin permiso',
            '23:12 · Auditoría · Acceso denegado · tibarra · \\\\srv-archivos\\Compras · motivo: sin permiso',
          ],
        ),
    },
    {
      id: 't-requests',
      kind: 'test',
      app: 'tickets',
      target: 'tibarra',
      label: 'Buscar solicitudes vinculadas a tibarra',
      asks: '¿Hay una autorización registrada para su acceso?',
      cost: 2,
      run: (): ProbeResult => ({
        ...t(
          '1 solicitud aprobada: RRHH-2291.',
          'Solicitud RRHH-2291 aprobada: alta de tibarra en GG_Compras_Editores y baja de Logística',
          { perm: 'supports' },
          [
            'RRHH-2291 · Cambio de función: Tomás Ibarra, Logística → Compras',
            'Aprobó: Laura Benítez (Jefa de Compras) · lunes 09:12',
            'Acción: agregar a GG_Compras_Editores · retirar de GG_Logistica_Editores',
            'Estado: aprobada, pendiente de ejecución',
          ],
        ),
        flags: ['authFound'],
      }),
    },
    // ---------------------------------------------------------- intervenciones
    {
      id: 'i-add-editors',
      kind: 'intervention',
      app: 'accounts',
      target: 'tibarra',
      label: 'Agregar tibarra a GG_Compras_Editores',
      cost: 3,
      risk: 'Da permiso de modificación en la carpeta de Compras. Requiere una autorización registrada.',
      console: ['agregar tibarra gg_compras_editores'],
      requires: (c) =>
        c.flags.includes('authFound')
          ? c.world.inEditors
            ? 'Ya pertenece a GG_Compras_Editores.'
            : null
          : 'Falta una autorización registrada para este cambio. Buscala en el Centro de tickets o escalá el caso.',
      run: (): ProbeResult => ({
        ...tr(
          'Agregado a GG_Compras_Editores. Las sesiones abiertas no ven el cambio hasta renovarse.',
          'Agregué a tibarra a GG_Compras_Editores (según RRHH-2291)',
          { perm: 'supports' },
        ),
        world: { inEditors: true, tokenFresh: false },
      }),
    },
    {
      id: 'i-add-admin',
      kind: 'intervention',
      app: 'accounts',
      target: 'tibarra',
      label: 'Agregar tibarra a GG_Compras_Admin',
      cost: 3,
      risk: 'Control total de la carpeta. No figura en ninguna autorización: queda como hallazgo de seguridad.',
      requires: (c) => (c.world.inAdmin ? 'Ya pertenece a GG_Compras_Admin.' : null),
      run: (): ProbeResult => ({
        ...tr(
          'Agregado a GG_Compras_Admin (control total).',
          'Agregué a tibarra a GG_Compras_Admin, sin autorización',
          { perm: 'supports' },
        ),
        world: { inAdmin: true, tokenFresh: false },
        wrong: true,
        consequence:
          'Se otorgó control total sin autorización: Seguridad lo registró como hallazgo y habrá que revertirlo.',
      }),
    },
    {
      id: 'i-remove-logistics',
      kind: 'intervention',
      app: 'accounts',
      target: 'tibarra',
      label: 'Retirar tibarra de GG_Logistica_Editores',
      cost: 2,
      risk: 'Deja de poder modificar la carpeta de Logística. La solicitud aprobada lo indica.',
      requires: (c) =>
        !c.world.inLogistics
          ? 'Ya no pertenece a Logística.'
          : c.flags.includes('authFound')
            ? null
            : 'Sin la solicitud a la vista, no corresponde retirar accesos.',
      run: (): ProbeResult => ({
        ...tr(
          'Retirado de GG_Logistica_Editores.',
          'Retiré a tibarra de GG_Logistica_Editores, como indica RRHH-2291',
          {},
        ),
        world: { inLogistics: false },
      }),
    },
    {
      id: 'i-reset-password',
      kind: 'intervention',
      app: 'accounts',
      target: 'tibarra',
      label: 'Restablecer la contraseña de tibarra',
      cost: 2,
      risk: 'Tomás tendrá que elegir una contraseña nueva y cerrar todo lo que tenga abierto.',
      requires: (c) => (c.world.passwordReset ? 'Ya se restableció esta noche.' : null),
      run: (): ProbeResult => ({
        ...tr(
          'Contraseña restablecida. Tomás tuvo que volver a iniciar sesión.',
          'Restablecí la contraseña de Tomás: tuvo que volver a entrar',
          { acct: 'neutral' },
        ),
        world: { passwordReset: true, tokenFresh: true },
        wrong: true,
        trust: -1,
        consequence:
          'Se restableció una contraseña que funcionaba: Tomás perdió tiempo y hubo que avisar a Seguridad.',
      }),
    },
    {
      id: 'i-renew-session',
      kind: 'intervention',
      app: 'remote',
      target: 'PC-CMP-04',
      label: 'Renovar credenciales de la sesión (remoto)',
      cost: 2,
      risk: 'Renueva los permisos de la sesión sin cerrarla. Tomás no pierde lo que tiene abierto.',
      console: ['renovar sesion pc-cmp-04'],
      requires: (c) => (c.world.tokenFresh ? 'La sesión ya tiene las credenciales vigentes.' : null),
      run: (): ProbeResult => ({
        ...tr(
          'Credenciales renovadas: la sesión ahora incluye los grupos actuales.',
          'Renové las credenciales de la sesión de Tomás',
          {},
        ),
        world: { tokenFresh: true },
      }),
    },
  ],
  isFixed,
};

function mailSaid(reply: string, note: string, relations: ProbeResult['relations']): ProbeResult {
  return { summary: 'Respuesta recibida.', reply, note, relations };
}
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
