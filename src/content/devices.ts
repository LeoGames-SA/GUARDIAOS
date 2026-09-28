/** Inventario simulado de Mutual Sur. Nada de esto se conecta a una red real. */
export interface DeviceDef {
  id: string;
  name: string;
  kind: 'pc' | 'server' | 'printer';
  hostname: string;
  ip: string;
  location: string;
  owner?: string;
  os: string;
  notes?: string;
  /** Se puede abrir por acceso remoto simulado. */
  remote?: boolean;
}

export const DEVICES: Record<string, DeviceDef> = {
  'PC-SOP-01': {
    id: 'PC-SOP-01',
    name: 'Tu equipo (mesa de soporte)',
    kind: 'pc',
    hostname: 'pc-sop-01',
    ip: '10.20.9.21',
    location: 'Mesa de soporte, planta baja',
    owner: 'Nicolás Bentancor',
    os: 'GuardiaOS 4.2',
  },
  'PC-REC-01': {
    id: 'PC-REC-01',
    name: 'PC de Recepción',
    kind: 'pc',
    hostname: 'pc-rec-01',
    ip: '10.20.2.11',
    location: 'Recepción, planta baja',
    owner: 'Recepción',
    os: 'GuardiaOS Estación 11',
    remote: true,
  },
  'PC-ADM-07': {
    id: 'PC-ADM-07',
    name: 'PC de Administración 07',
    kind: 'pc',
    hostname: 'pc-adm-07',
    ip: '10.20.3.47',
    location: 'Administración, 2.º piso',
    owner: 'Elena Suárez',
    os: 'GuardiaOS Estación 11',
    remote: true,
  },
  'SRV-IMP-01': {
    id: 'SRV-IMP-01',
    name: 'Servidor de impresión',
    kind: 'server',
    hostname: 'srv-impresion',
    ip: '10.20.0.15',
    location: 'Sala de servidores',
    os: 'GuardiaOS Server 9',
    notes: 'Inventario actualizado: dirección vigente 10.20.0.15.',
  },
  'IMP-ADM-02': {
    id: 'IMP-ADM-02',
    name: 'Impresora Administración 2.º piso',
    kind: 'printer',
    hostname: 'imp-adm-02',
    ip: '10.20.3.200',
    location: 'Administración, 2.º piso',
    os: 'Firmware 3.8',
    notes: 'Publicada a través de srv-impresion.',
  },
  'PC-CMP-04': {
    id: 'PC-CMP-04',
    name: 'PC de Compras 04',
    kind: 'pc',
    hostname: 'pc-cmp-04',
    ip: '10.20.4.33',
    location: 'Compras, 1.er piso',
    owner: 'Tomás Ibarra',
    os: 'GuardiaOS Estación 11',
    remote: true,
  },
  'SRV-ARCH-01': {
    id: 'SRV-ARCH-01',
    name: 'Servidor de archivos',
    kind: 'server',
    hostname: 'srv-archivos',
    ip: '10.20.0.20',
    location: 'Sala de servidores',
    os: 'GuardiaOS Server 9',
  },
  'SRV-APP-02': {
    id: 'SRV-APP-02',
    name: 'Servidor del portal interno',
    kind: 'server',
    hostname: 'portal.mutualsur.local',
    ip: '10.20.1.30',
    location: 'Sala de servidores',
    os: 'GuardiaOS Server 9',
    notes: 'Aloja el Portal del Personal (turnos, novedades, recibos).',
  },
  'SRV-BD-01': {
    id: 'SRV-BD-01',
    name: 'Servidor de base de datos',
    kind: 'server',
    hostname: 'srv-bd-01',
    ip: '10.20.1.40',
    location: 'Sala de servidores',
    os: 'GuardiaOS Server 9',
  },
};
