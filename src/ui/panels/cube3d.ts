/**
 * Cubo 3×3 en 3D (three.js, se carga sólo al levantar el cubo). Dibuja el estado del
 * motor: 26 cubitos fijos con pegatinas que se recolorean después de cada giro, y una
 * capa que rota durante el gesto. No guarda estado propio más allá del último dibujado.
 */
import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  Scene,
  Shape,
  ShapeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Object3D,
} from 'three';
import { applyMove, layerMove, moveLayer, stickerGeometry, type Move } from '../../engine/cube';
import { gestureAngle, resolveGesture, snapQuarter, type Gesture, type Px, type V3 } from './cubeGesture';

const COLORS: Record<string, string> = {
  U: '#f1efe6',
  R: '#d63a2f',
  F: '#2fae4f',
  D: '#f4cf2c',
  L: '#f08a24',
  B: '#2d64c8',
};
const AXES = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)];
const QUARTER = Math.PI / 2;

export interface CubeView {
  setState(state: string): void;
  /** Anima un giro y lo aplica al dibujo; `onMove` se llama sólo si `commit`. */
  turn(move: Move, commit?: boolean, ms?: number): Promise<void>;
  rotateObject(dx: number, dy: number): void;
  busy(): boolean;
  /** Diagnóstico de sólo lectura (pruebas): orientación y pegatinas visibles en pantalla. */
  debug(): { q: number[]; stickers: { i: number; x: number; y: number; facing: number }[] };
  dispose(): void;
}

export interface CubeViewOptions {
  state: string;
  reduced: boolean;
  onMove: (m: Move) => void;
  /** Aviso de gesto: 'layer' (girando una capa), 'object' (girando el cubo) o null. */
  onGesture?: (g: 'layer' | 'object' | null) => void;
}

function roundedSquare(size: number, r: number) {
  const s = size / 2;
  const sh = new Shape();
  sh.moveTo(-s + r, -s);
  sh.lineTo(s - r, -s);
  sh.quadraticCurveTo(s, -s, s, -s + r);
  sh.lineTo(s, s - r);
  sh.quadraticCurveTo(s, s, s - r, s);
  sh.lineTo(-s + r, s);
  sh.quadraticCurveTo(-s, s, -s, s - r);
  sh.lineTo(-s, -s + r);
  sh.quadraticCurveTo(-s, -s, -s + r, -s);
  return new ShapeGeometry(sh, 4);
}

export function createCubeView(canvas: HTMLCanvasElement, opts: CubeViewOptions): CubeView {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 11.5);
  // Luz cálida desde la izquierda (la lámpara del puesto) y un relleno frío del monitor.
  scene.add(new AmbientLight(0xffffff, 1.1));
  const key = new DirectionalLight(0xffe0b0, 2.2);
  key.position.set(-6, 7, 8);
  scene.add(key);
  const fill = new DirectionalLight(0x79b5c7, 0.8);
  fill.position.set(6, -2, 5);
  scene.add(fill);

  const root = new Group();
  root.quaternion.setFromAxisAngle(new Vector3(1, 0, 0), 0.45);
  root.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -0.62));
  scene.add(root);

  const bodyGeo = new BoxGeometry(0.97, 0.97, 0.97);
  const bodyMat = new MeshStandardMaterial({ color: 0x141414, roughness: 0.55, metalness: 0.05 });
  const stickerGeo = roundedSquare(0.82, 0.12);
  const materials = new Map<string, MeshStandardMaterial>();
  const matFor = (c: string) => {
    let m = materials.get(c);
    if (!m) {
      m = new MeshStandardMaterial({ color: new Color(COLORS[c] ?? '#888'), roughness: 0.35 });
      materials.set(c, m);
    }
    return m;
  };

  const cubies = new Map<string, Group>();
  const stickerMeshes: Mesh[] = [];
  const bodyMeshes: Mesh[] = [];
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) {
        if (!x && !y && !z) continue;
        const g = new Group();
        g.position.set(x, y, z);
        g.userData.pos = [x, y, z];
        const body = new Mesh(bodyGeo, bodyMat);
        body.userData = { pos: [x, y, z] };
        g.add(body);
        bodyMeshes.push(body);
        root.add(g);
        cubies.set(`${x},${y},${z}`, g);
      }
  for (let i = 0; i < 54; i++) {
    const { p, n } = stickerGeometry(i);
    const cubie = cubies.get(p.join(','))!;
    const m = new Mesh(stickerGeo, matFor('U'));
    const normal = new Vector3(...n);
    m.position.copy(normal).multiplyScalar(0.487);
    m.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), normal);
    m.userData = { index: i, normal: n, pos: p };
    cubie.add(m);
    stickerMeshes.push(m);
  }

  let state = '';
  const setState = (s: string) => {
    if (s === state) return;
    state = s;
    for (const m of stickerMeshes) m.material = matFor(s[m.userData.index as number]!);
    invalidate();
  };

  // Dibujo a pedido: sin bucle continuo cuando nada cambia.
  let frame = 0;
  let disposed = false;
  function invalidate() {
    if (frame || disposed) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      renderer.render(scene, camera);
    });
  }
  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // El cubo entra completo aunque el lienzo sea angosto.
    camera.fov = w < h ? 30 * (h / w) ** 0.8 : 30;
    camera.updateProjectionMatrix();
    invalidate();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  // ---- capas
  let pivot: Group | null = null;
  let pivotAxis = 0;
  const beginLayer = (axis: number, layer: number) => {
    pivot = new Group();
    pivotAxis = axis;
    root.add(pivot);
    for (const c of cubies.values()) if ((c.userData.pos as number[])[axis] === layer) pivot.attach(c);
  };
  const setLayerAngle = (a: number) => {
    pivot?.quaternion.setFromAxisAngle(AXES[pivotAxis]!, a);
    invalidate();
  };
  const endLayer = () => {
    if (!pivot) return;
    for (const c of [...pivot.children]) {
      root.attach(c);
      const [x, y, z] = c.userData.pos as number[];
      c.position.set(x!, y!, z!);
      c.quaternion.identity();
    }
    root.remove(pivot);
    pivot = null;
    invalidate();
  };
  let animating = false;
  const animateAngle = (from: number, to: number, ms: number) =>
    new Promise<void>((resolve) => {
      if (opts.reduced || ms <= 0) {
        setLayerAngle(to);
        resolve();
        return;
      }
      const t0 = performance.now();
      const step = (t: number) => {
        if (disposed) return resolve();
        const k = Math.min(1, (t - t0) / ms);
        const e = 1 - (1 - k) ** 3;
        setLayerAngle(from + (to - from) * e);
        if (k < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  const commit = (move: Move, notify: boolean) => {
    endLayer();
    setState(applyMove(state, move));
    if (notify) opts.onMove(move);
  };

  let queue = Promise.resolve();
  let pending = 0;
  const turn = (move: Move, notify = true, ms = 170) => {
    pending++;
    queue = queue.then(async () => {
      pending--;
      if (disposed) return;
      animating = true;
      const { axis, layer, sign } = moveLayer(move);
      beginLayer(axis, layer);
      await animateAngle(0, sign * QUARTER, ms);
      commit(move, notify);
      animating = false;
    });
    return queue;
  };

  // ---- gestos
  // Arrastrar sobre el cubo gira la capa tocada; arrastrar en el espacio libre gira el objeto.
  const ray = new Raycaster();
  const ndc = new Vector2();
  type Drag =
    | { kind: 'object'; x: number; y: number; id: number }
    | {
        kind: 'pending' | 'layer';
        id: number;
        x0: number;
        y0: number;
        point: V3;
        normal: V3;
        cubie: V3;
        g?: Gesture;
        angle: number;
      };
  let drag: Drag | null = null;

  const project = (p: V3): Px => {
    root.updateMatrixWorld();
    const v = new Vector3(...p).applyMatrix4(root.matrixWorld).project(camera);
    const r = canvas.getBoundingClientRect();
    return [((v.x + 1) / 2) * r.width, ((1 - v.y) / 2) * r.height];
  };
  const rotateObject = (dx: number, dy: number) => {
    const qy = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), dx * 0.01);
    const qx = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), dy * 0.01);
    root.quaternion.premultiply(qy).premultiply(qx);
    invalidate();
  };
  const round = (v: Vector3): V3 => [Math.round(v.x), Math.round(v.y), Math.round(v.z)];

  const onDown = (e: PointerEvent) => {
    if (drag || animating || pending > 0 || e.button > 0) return;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    scene.updateMatrixWorld();
    ray.setFromCamera(ndc, camera);
    // Pegatinas y cuerpos: tocar la ranura negra entre pegatinas también toma la capa.
    const hit = ray.intersectObjects([...stickerMeshes, ...bodyMeshes], false)[0];
    canvas.setPointerCapture(e.pointerId);
    if (hit) {
      const obj = hit.object as Object3D;
      const cubie = (obj.userData.pos as V3).map(Math.round) as V3;
      let normal: V3 | null = obj.userData.normal ? (obj.userData.normal as V3) : null;
      if (!normal && hit.face) normal = round(hit.face.normal.clone());
      const k = normal ? normal.findIndex((c) => c !== 0) : -1;
      // Sólo caras exteriores (la normal apunta hacia afuera del cubo en ese cubito).
      if (normal && k >= 0 && cubie[k] === normal[k]) {
        const local = root.worldToLocal(hit.point.clone());
        const point: V3 = [local.x, local.y, local.z];
        point[k] = 1.5 * normal[k]!;
        drag = {
          kind: 'pending',
          id: e.pointerId,
          x0: e.clientX,
          y0: e.clientY,
          point,
          normal,
          cubie,
          angle: 0,
        };
        return;
      }
    }
    drag = { kind: 'object', x: e.clientX, y: e.clientY, id: e.pointerId };
    opts.onGesture?.('object');
  };
  const onMove = (e: PointerEvent) => {
    const d = drag;
    if (!d || e.pointerId !== d.id) return;
    if (d.kind === 'object') {
      rotateObject(e.clientX - d.x, e.clientY - d.y);
      d.x = e.clientX;
      d.y = e.clientY;
      return;
    }
    const mv: Px = [e.clientX - d.x0, e.clientY - d.y0];
    if (d.kind === 'pending') {
      // Umbral: un clic no gira nada. Superado, el eje queda fijo hasta soltar.
      const g = resolveGesture(d.point, d.normal, d.cubie, mv, project);
      if (!g) return;
      d.g = g;
      d.kind = 'layer';
      beginLayer(g.axis, g.layer);
      opts.onGesture?.('layer');
    }
    d.angle = gestureAngle(d.g!, mv, d.point, project);
    setLayerAngle(d.angle);
  };
  const onUp = async (e: PointerEvent) => {
    const d = drag;
    if (!d || e.pointerId !== d.id) return;
    drag = null;
    opts.onGesture?.(null);
    if (d.kind !== 'layer' || !d.g) return;
    const target = snapQuarter(d.angle);
    animating = true;
    await animateAngle(d.angle, target * QUARTER, 120);
    if (disposed) return;
    if (target) commit(layerMove(d.g.axis, d.g.layer, target), true);
    else endLayer();
    animating = false;
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  setState(opts.state);

  return {
    setState: (s) => {
      if (!animating && !drag && pending === 0) setState(s);
      else queue = queue.then(() => setState(s));
    },
    turn,
    rotateObject,
    busy: () => animating || pending > 0 || Boolean(drag),
    debug: () => {
      const r = canvas.getBoundingClientRect();
      return {
        q: root.quaternion.toArray() as number[],
        stickers: stickerMeshes.map((m) => {
          const i = m.userData.index as number;
          const { p, n } = stickerGeometry(i);
          const c: V3 = [p[0] + n[0] * 0.5, p[1] + n[1] * 0.5, p[2] + n[2] * 0.5];
          const [x, y] = project(c);
          const nw = new Vector3(...n).applyQuaternion(root.quaternion);
          const cw = new Vector3(...c).applyMatrix4(root.matrixWorld);
          const facing = nw.dot(camera.position.clone().sub(cw).normalize());
          return { i, x: x + r.left, y: y + r.top, facing };
        }),
      };
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      bodyGeo.dispose();
      stickerGeo.dispose();
      bodyMat.dispose();
      for (const m of materials.values()) m.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
