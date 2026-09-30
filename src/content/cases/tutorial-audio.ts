import type { CaseDef, CaseView, ProbeResult, World } from '../../engine/types';

/** Práctica — «No se escucha el audio de la PC». Fija, sin tiempo ni penalizaciones. */
const hears = (w: World) => w.output === 'headset' && w.muted !== true && Number(w.volume) > 0;
const isFixed = hears;

/** Salidas de sonido de PC-REC-01 (en orden alfabético, sin destacar ninguna). */
const OUTPUTS = [
  { id: 'analog', label: 'Altavoces (Realtek, salida analógica)', kind: 'analog' as const },
  { id: 'headset', label: 'Auriculares USB (Jabra Evolve 20)', kind: 'usb' as const },
  { id: 'hdmi', label: 'Monitor DELL P2419H (HDMI)', kind: 'hdmi' as const },
];
const outLabel = (id: unknown) => OUTPUTS.find((o) => o.id === id)?.label ?? String(id);
const connected = (c: CaseView) =>
  c.world.session === 'on' ? null : 'Primero conectate al equipo con la asistencia remota.';
const VOLUMES = ['0', '10', '20', '30', '40', '50', '60', '70', '80', '90', '100'] as const;

export const tutorialAudio: CaseDef = {
  id: 'p001',
  number: 'P-01',
  title: 'No se escucha el audio de la PC',
  channel: 'phone',
  contact: { name: 'Marta Quiroga', short: 'Marta', role: 'Recepción', device: 'PC-REC-01' },
  knownAtStart: false,
  practice: true,
  teaser: 'Un video se ve, pero no se escucha.',
  summary: 'En Recepción se ve un video de capacitación, pero no se escucha nada.',
  arrival: 0,
  deadline: null,
  devices: ['PC-REC-01', 'PC-SOP-01'],
  variants: [
    {
      id: 'hdmi',
      cause: 'La salida de sonido estaba en el monitor HDMI, que no tiene altavoces',
      explanation:
        'La PC mandaba el audio al monitor por HDMI. El monitor no tiene parlantes; los auriculares USB estaban conectados pero no eran la salida elegida.',
      world: { hyp: 'out', output: 'hdmi', volume: 80, muted: false, session: 'off' },
      keyProbes: ['t-output', 't-props'],
    },
  ],
  pickVariant: () => 'hdmi',
  hypotheses: [
    {
      id: 'out',
      label: 'El sonido sale por un dispositivo sin parlantes',
      detail: 'La PC manda el audio a un lugar donde nadie lo puede escuchar.',
      pertinent: [{ probe: 't-output', what: 'dispositivo de salida' }],
    },
    {
      id: 'mute',
      label: 'El volumen está en cero o silenciado',
      detail: 'El sonido existe, pero está apagado.',
      pertinent: [{ probe: 't-volume', what: 'volumen y silencio' }],
    },
    {
      id: 'broken',
      label: 'Los auriculares están rotos',
      detail: 'El dispositivo físico no funciona.',
      pertinent: [{ probe: 't-props', what: 'propiedades del dispositivo' }],
    },
  ],
  opening: {
    nico: 'Mesa de ayuda, soporte técnico, habla Nicolás. Contame qué está pasando.',
    contact: [
      'Hola… sí, buenas. Soy Marta Quiroga, de Recepción.',
      'Estoy por ver un video de capacitación. La imagen anda, pero no se escucha nada.',
    ],
  },
  deadlineText: '',
  escalation: {
    label: 'Escalar (práctica)',
    appropriate: () => false,
    explain: () => 'En la práctica no hace falta escalar: se puede resolver con las herramientas.',
  },
  farewell: {
    nico: 'Listo, Marta. Quedó configurado para los auriculares. Cualquier cosa, llamanos.',
    warm: '¡Gracias! Ahora sí puedo seguir con la capacitación. ¡Buenas noches!',
    costly: 'Gracias, ya se escucha. Buenas noches.',
    cold: 'Bueno, gracias.',
  },
  learned:
    'Audio: antes de tocar el volumen, fijate a qué dispositivo sale el sonido. Un monitor por HDMI puede no tener parlantes.',
  remote: {
    device: 'PC-REC-01',
    consent: { probe: 'q-assist', flag: 'assist-ok' },
    connect: 'r-connect',
    disconnect: 'r-disconnect',
    sound: {
      outputs: OUTPUTS,
      readOutput: 't-output',
      readVolume: 't-volume',
      readDevices: 't-devices',
      readProperties: 't-props',
      test: 't-sound',
      setOutput: 'i-output',
      setVolume: 'i-volume',
      setMute: 'i-mute',
    },
  },
  probes: [
    {
      id: 'q-what',
      kind: 'question',
      app: 'phone',
      label: '¿No se escucha sólo el video o nada?',
      line: '¿No se escucha sólo el video o ningún sonido de la PC?',
      cost: 1,
      run: (): ProbeResult => ({
        summary: 'Nada de nada.',
        reply: 'Nada de nada. Ni el video ni los sonidos de la compu.',
        note: 'Marta dice que no se escucha ningún sonido de la PC, no sólo el video',
        relations: { out: 'supports', mute: 'supports' },
      }),
    },
    {
      id: 'q-devices',
      kind: 'question',
      app: 'phone',
      label: '¿Qué usás para escuchar?',
      line: '¿Con qué escuchás normalmente? ¿Parlantes, auriculares?',
      cost: 1,
      run: (): ProbeResult => ({
        summary: 'Usa unos auriculares USB; el monitor no sabe si tiene parlantes.',
        reply:
          'Uso unos auriculares USB, los tengo enchufados acá. Y el monitor… no sé si tiene parlantes, nunca lo usé para eso.',
        note: 'Marta dice que escucha con auriculares USB y no sabe si el monitor tiene parlantes',
        relations: { out: 'supports' },
      }),
    },
    {
      id: 'q-assist',
      kind: 'question',
      app: 'phone',
      label: '¿Te puedo mandar una solicitud de asistencia para revisar el sonido?',
      line: '¿Te puedo mandar una solicitud de asistencia remota para revisar el sonido de tu PC?',
      cost: 1,
      run: (): ProbeResult => ({
        summary: 'Marta aceptó la solicitud de asistencia remota para PC-REC-01.',
        reply: 'Sí, dale. Me apareció un cartel de Mutual Sur… Listo, puse «Aceptar».',
        flags: ['assist-ok'],
      }),
    },
    {
      id: 'r-connect',
      kind: 'communicate',
      app: 'remote',
      target: 'PC-REC-01',
      label: 'Conectar a PC-REC-01 (asistencia remota)',
      cost: 1,
      requires: (c) =>
        !c.flags.includes('assist-ok')
          ? 'Falta que la persona acepte la solicitud de asistencia.'
          : c.world.session === 'on'
            ? 'Ya hay una sesión abierta con ese equipo.'
            : null,
      run: (): ProbeResult => ({
        summary: 'Sesión remota abierta en PC-REC-01, autorizada por Marta.',
        world: { session: 'on' },
      }),
    },
    {
      id: 'r-disconnect',
      kind: 'communicate',
      app: 'remote',
      target: 'PC-REC-01',
      label: 'Desconectar la sesión remota',
      cost: 0,
      requires: (c) => (c.world.session === 'on' ? null : 'No hay sesión abierta.'),
      run: (): ProbeResult => ({ summary: 'Sesión remota cerrada.', world: { session: 'off' } }),
    },
    {
      id: 't-output',
      kind: 'test',
      app: 'remote',
      target: 'PC-REC-01',
      label: 'Ver la salida de sonido seleccionada',
      asks: '¿A qué dispositivo manda el sonido la PC?',
      cost: 1,
      requires: connected,
      run: (w): ProbeResult => ({
        summary: `Salida seleccionada: ${outLabel(w.output)}.`,
        note: `La salida de sonido seleccionada en PC-REC-01 es «${outLabel(w.output)}»`,
        relations: w.output === 'headset' ? { out: 'contradicts' } : { out: 'supports' },
      }),
    },
    {
      id: 't-volume',
      kind: 'test',
      app: 'remote',
      target: 'PC-REC-01',
      label: 'Ver volumen y silencio',
      asks: '¿El sonido está silenciado o en cero?',
      cost: 1,
      requires: connected,
      run: (w): ProbeResult => {
        const off = w.muted === true || Number(w.volume) === 0;
        return {
          summary: `Volumen ${String(w.volume)} %${w.muted === true ? ', silenciado' : ', sin silenciar'}.`,
          note: `El volumen de PC-REC-01 está al ${String(w.volume)} %${w.muted === true ? ' y silenciado' : ' y sin silencio'}`,
          relations: { mute: off ? 'supports' : 'contradicts' },
        };
      },
    },
    {
      id: 't-devices',
      kind: 'test',
      app: 'remote',
      target: 'PC-REC-01',
      label: 'Ver las salidas disponibles',
      asks: '¿Qué dispositivos de salida tiene la PC?',
      cost: 1,
      requires: connected,
      run: (): ProbeResult => ({
        summary: `Salidas disponibles: ${OUTPUTS.map((o) => o.label).join(', ')}.`,
        note: 'PC-REC-01 tiene tres salidas de sonido: altavoces analógicos, auriculares USB y el monitor por HDMI',
        relations: { out: 'supports' },
      }),
    },
    {
      id: 't-props',
      kind: 'test',
      app: 'remote',
      target: 'PC-REC-01',
      label: 'Ver propiedades de una salida',
      asks: '¿Ese dispositivo puede reproducir sonido?',
      cost: 1,
      args: OUTPUTS.map((o) => o.id),
      requires: connected,
      run: (_w, _c, arg): ProbeResult =>
        arg === 'hdmi'
          ? {
              summary: 'Monitor DELL P2419H · conectado por HDMI · sin altavoces integrados.',
              note: 'El monitor DELL de PC-REC-01 no tiene altavoces integrados',
              relations: { out: 'supports' },
            }
          : arg === 'headset'
            ? {
                summary:
                  'Auriculares USB (Jabra Evolve 20) · conectado · el dispositivo funciona correctamente.',
                note: 'Los auriculares USB de PC-REC-01 figuran conectados y funcionando',
                relations: { broken: 'contradicts' },
              }
            : {
                summary: 'Altavoces (salida analógica) · no hay nada enchufado en el conector.',
                note: 'La salida analógica de PC-REC-01 no tiene nada enchufado',
                relations: {},
              },
    },
    {
      id: 'i-output',
      kind: 'intervention',
      app: 'remote',
      target: 'PC-REC-01',
      label: 'Elegir la salida de sonido',
      cost: 1,
      args: OUTPUTS.map((o) => o.id),
      risk: 'Cambia la salida de sonido de esa PC. Se puede volver atrás.',
      requires: (c, arg) => connected(c) ?? (c.world.output === arg ? 'Ya es la salida seleccionada.' : null),
      run: (_w, _c, arg): ProbeResult => ({
        summary: `Salida seleccionada: ${outLabel(arg)}.`,
        note: `Cambié la salida de sonido de PC-REC-01 a «${outLabel(arg)}»`,
        world: { output: arg ?? '' },
      }),
    },
    {
      id: 'i-volume',
      kind: 'intervention',
      app: 'remote',
      target: 'PC-REC-01',
      label: 'Cambiar el volumen',
      cost: 1,
      args: VOLUMES,
      requires: (c, arg) =>
        connected(c) ?? (String(c.world.volume) === arg ? 'El volumen ya está en ese valor.' : null),
      run: (_w, _c, arg): ProbeResult => ({
        summary: `Volumen de PC-REC-01: ${arg ?? ''} %.`,
        note: `Cambié el volumen de PC-REC-01 a ${arg ?? ''} %`,
        world: { volume: Number(arg) },
      }),
    },
    {
      id: 'i-mute',
      kind: 'intervention',
      app: 'remote',
      target: 'PC-REC-01',
      label: 'Silenciar o activar el sonido',
      cost: 1,
      args: ['on', 'off'],
      requires: (c, arg) =>
        connected(c) ?? ((c.world.muted === true) === (arg === 'on') ? 'Ya está así.' : null),
      run: (_w, _c, arg): ProbeResult => ({
        summary: arg === 'on' ? 'Sonido silenciado.' : 'Sonido activado.',
        note: arg === 'on' ? 'Silencié el sonido de PC-REC-01' : 'Activé el sonido de PC-REC-01',
        world: { muted: arg === 'on' },
      }),
    },
    {
      id: 't-sound',
      kind: 'test',
      app: 'remote',
      target: 'PC-REC-01',
      label: 'Reproducir sonido de prueba',
      asks: '¿El sonido llega al dispositivo elegido?',
      cost: 1,
      requires: connected,
      run: (w): ProbeResult => {
        const silent = w.muted === true || Number(w.volume) === 0;
        return {
          summary: silent
            ? `Sonido de prueba hacia ${outLabel(w.output)}: el medidor no se mueve (${w.muted === true ? 'silenciado' : 'volumen en 0'}).`
            : `Sonido de prueba hacia ${outLabel(w.output)}: el medidor de nivel se mueve.`,
          note: silent
            ? `El sonido de prueba no sale: ${w.muted === true ? 'está silenciado' : 'el volumen está en 0'}`
            : `El sonido de prueba sale hacia «${outLabel(w.output)}»`,
          relations: silent ? { mute: 'supports' } : {},
        };
      },
    },
    {
      id: 'v-hear',
      kind: 'verify',
      app: 'phone',
      label: '¿Ahora lo escuchás?',
      line: 'Probá de nuevo el video con los auriculares. ¿Ahora lo escuchás?',
      cost: 1,
      requires: (c) =>
        c.done('i-output') || c.done('i-volume') || c.done('i-mute')
          ? null
          : 'Primero cambiá algo en su equipo.',
      run: (w): ProbeResult =>
        hears(w)
          ? {
              summary: 'Marta confirma que se escucha.',
              reply: '¡Sí! Ahora se escucha perfecto en los auriculares. ¡Gracias!',
              note: 'Marta confirma que ahora se escucha en los auriculares',
              confirms: true,
            }
          : {
              summary: 'Sigue sin escuchar.',
              reply:
                w.output === 'headset'
                  ? 'Tengo los auriculares puestos, pero no se escucha nada.'
                  : 'Mmm, no. Sigue sin escucharse nada.',
              note: 'Marta dice que sigue sin escucharse',
            },
    },
  ],
  isFixed,
};
