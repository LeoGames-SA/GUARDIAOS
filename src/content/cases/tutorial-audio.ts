import type { CaseDef, ProbeResult, World } from '../../engine/types';

/** Práctica — «No se escucha el audio de la PC». Fija, sin tiempo ni penalizaciones. */
const isFixed = (w: World) => w.output === 'headset';

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
      world: { hyp: 'out', output: 'hdmi', volume: 80 },
      keyProbes: ['t-output'],
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
      pertinent: [{ probe: 't-output', what: 'dispositivos conectados' }],
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
  learned:
    'Audio: antes de tocar el volumen, fijate a qué dispositivo sale el sonido. Un monitor por HDMI puede no tener parlantes.',
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
      label: '¿Qué tenés conectado para escuchar?',
      line: '¿Tenés parlantes o auriculares conectados?',
      cost: 1,
      run: (): ProbeResult => ({
        summary: 'Auriculares en el cajón; monitor sin saber.',
        reply:
          'Hay unos auriculares enchufados, pero están en el cajón. Y el monitor… no sé si tiene parlantes.',
        note: 'Marta dice que hay auriculares conectados y no sabe si el monitor tiene parlantes',
        relations: { out: 'supports' },
      }),
    },
    {
      id: 't-output',
      kind: 'test',
      app: 'remote',
      target: 'PC-REC-01',
      label: 'Revisar el dispositivo de salida de sonido',
      asks: '¿A qué dispositivo manda el sonido la PC?',
      cost: 1,
      run: (w): ProbeResult =>
        w.output === 'headset'
          ? {
              summary: 'Salida predeterminada: Auriculares USB.',
              note: 'La salida de PC-REC-01 ya es Auriculares USB',
              relations: {},
            }
          : {
              summary:
                'Salida predeterminada: Monitor HDMI (sin altavoces). También conectado: Auriculares USB.',
              detail: [
                '● Monitor HDMI — predeterminado — sin altavoces',
                '○ Auriculares USB — conectado, disponible',
              ],
              note: 'La salida de sonido de PC-REC-01 es el monitor HDMI, que no tiene altavoces',
              relations: { out: 'supports', broken: 'neutral' },
            },
    },
    {
      id: 't-volume',
      kind: 'test',
      app: 'remote',
      target: 'PC-REC-01',
      label: 'Revisar volumen y silencio',
      asks: '¿El sonido está silenciado?',
      cost: 1,
      run: (w): ProbeResult => ({
        summary: `Volumen ${String(w.volume)} %, sin silenciar.`,
        note: `El volumen de PC-REC-01 está al ${String(w.volume)} % y sin silencio`,
        relations: { mute: 'contradicts' },
      }),
    },
    {
      id: 'i-volume',
      kind: 'intervention',
      app: 'remote',
      target: 'PC-REC-01',
      label: 'Subir el volumen al máximo',
      cost: 1,
      risk: 'Si el sonido va a otro dispositivo, el volumen no cambia nada.',
      requires: (c) => (c.world.volume === 100 ? 'El volumen ya está al máximo.' : null),
      run: (): ProbeResult => ({
        summary: 'Volumen al 100 %. Marta sigue sin escuchar.',
        note: 'Subí el volumen al máximo: sigue sin escucharse',
        relations: { mute: 'contradicts' },
        world: { volume: 100 },
      }),
    },
    {
      id: 'i-headset',
      kind: 'intervention',
      app: 'remote',
      target: 'PC-REC-01',
      label: 'Elegir «Auriculares USB» como salida',
      cost: 1,
      risk: 'Cambia la salida predeterminada de esa PC. Se puede volver atrás.',
      requires: (c) => (c.world.output === 'headset' ? 'Ya es la salida elegida.' : null),
      run: (): ProbeResult => ({
        summary: 'Salida predeterminada: Auriculares USB.',
        note: 'Cambié la salida de sonido a Auriculares USB',
        relations: { out: 'supports' },
        world: { output: 'headset' },
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
      run: (w): ProbeResult =>
        w.output === 'headset'
          ? {
              summary: 'Sonido de prueba enviado a Auriculares USB: el medidor de nivel se movió.',
              note: 'El sonido de prueba llega a los Auriculares USB',
              relations: { broken: 'contradicts' },
            }
          : {
              summary:
                'Sonido de prueba enviado a Monitor HDMI: el medidor se mueve, pero el monitor no tiene altavoces.',
              note: 'El sonido de prueba sale hacia el monitor HDMI',
              relations: { out: 'supports' },
            },
    },
    {
      id: 'v-hear',
      kind: 'verify',
      app: 'phone',
      label: '¿Ahora lo escuchás?',
      line: 'Ponete los auriculares y probá de nuevo el video. ¿Ahora lo escuchás?',
      cost: 1,
      requires: (c) =>
        c.done('i-headset') || c.done('i-volume') ? null : 'Primero cambiá algo en su equipo.',
      run: (w): ProbeResult =>
        w.output === 'headset'
          ? {
              summary: 'Marta confirma que se escucha.',
              reply: '¡Sí! Ahora se escucha perfecto. ¡Gracias!',
              note: 'Marta confirma que ahora se escucha',
              confirms: true,
            }
          : {
              summary: 'Sigue sin escuchar.',
              reply: 'Mmm, no. Sigue sin escucharse nada.',
              note: 'Marta dice que sigue sin escucharse',
            },
    },
  ],
  isFixed,
};
