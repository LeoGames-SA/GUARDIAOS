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
  turn(move: Move, commit?: boolean): Promise<void>;
  rotateObject(dx: number, dy: number): void;
  busy(): boolean;
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
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) {
        if (!x && !y && !z) continue;
        const g = new Group();
        g.position.set(x, y, z);
        g.userData.pos = [x, y, z];
        g.add(new Mesh(bodyGeo, bodyMat));
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
  const turn = (move: Move, notify = true) => {
    queue = queue.then(async () => {
      if (disposed) return;
      animating = true;
      const { axis, layer, sign } = moveLayer(move);
      beginLayer(axis, layer);
      await animateAngle(0, sign * QUARTER, 170);
      commit(move, notify);
      animating = false;
    });
    return queue;
  };

  // ---- gestos
  const ray = new Raycaster();
  const ndc = new Vector2();
  type Drag =
    | { kind: 'object'; x: number; y: number }
    | {
        kind: 'pending' | 'layer';
        x0: number;
        y0: number;
        n: number[];
        p: number[];
        axis?: number;
        layer?: number;
        dir?: Vector2;
        unit?: number;
        sign?: number;
        angle?: number;
      };
  let drag: Drag | null = null;

  const toScreen = (local: Vector3) => {
    root.updateMatrixWorld();
    const v = local.clone().applyMatrix4(root.matrixWorld).project(camera);
    const r = canvas.getBoundingClientRect();
    return new Vector2(((v.x + 1) / 2) * r.width, ((1 - v.y) / 2) * r.height);
  };
  const rotateObject = (dx: number, dy: number) => {
    const qy = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), dx * 0.01);
    const qx = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), dy * 0.01);
    root.quaternion.premultiply(qy).premultiply(qx);
    invalidate();
  };

  const onDown = (e: PointerEvent) => {
    if (animating || e.button > 0) return;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    scene.updateMatrixWorld();
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(stickerMeshes, false)[0];
    canvas.setPointerCapture(e.pointerId);
    if (hit) {
      const obj = hit.object as Object3D;
      drag = {
        kind: 'pending',
        x0: e.clientX,
        y0: e.clientY,
        n: obj.userData.normal as number[],
        p: obj.userData.pos as number[],
      };
    } else {
      drag = { kind: 'object', x: e.clientX, y: e.clientY };
      opts.onGesture?.('object');
    }
  };
  const onMove = (e: PointerEvent) => {
    const d = drag;
    if (!d) return;
    if (d.kind === 'object') {
      rotateObject(e.clientX - d.x, e.clientY - d.y);
      d.x = e.clientX;
      d.y = e.clientY;
      return;
    }
    const mv = new Vector2(e.clientX - d.x0, e.clientY - d.y0);
    if (d.kind === 'pending') {
      if (mv.length() < 8) return;
      // Elegir, entre los dos ejes de la cara tocada, el que mejor sigue al arrastre en pantalla.
      const n = new Vector3(...(d.n as [number, number, number]));
      const base = new Vector3(...(d.p as [number, number, number])).addScaledVector(n, 0.5);
      const s0 = toScreen(base);
      let best: { t: Vector3; dir: Vector2; len: number; score: number } | null = null;
      for (const t of AXES) {
        if (Math.abs(t.dot(n)) > 0.5) continue;
        const st = toScreen(base.clone().add(t)).sub(s0);
        const len = st.length();
        if (len < 1) continue;
        const dir = st.clone().divideScalar(len);
        const score = Math.abs(dir.dot(mv) / mv.length());
        if (!best || score > best.score) best = { t, dir, len, score };
      }
      if (!best) return;
      const a = new Vector3().crossVectors(n, best.t); // girar sobre a mueve la pegatina hacia +t
      const axis = [0, 1, 2].find((k) => Math.abs(a.getComponent(k)) > 0.5)!;
      Object.assign(d, {
        kind: 'layer',
        axis,
        layer: d.p[axis],
        dir: best.dir,
        unit: best.len,
        sign: Math.sign(a.getComponent(axis)),
        angle: 0,
      });
      beginLayer(axis, d.p[axis]!);
      opts.onGesture?.('layer');
    }
    if (d.kind === 'layer') {
      const along = mv.dot(d.dir!) / d.unit!;
      d.angle = Math.max(-QUARTER * 1.1, Math.min(QUARTER * 1.1, along * 0.95)) * d.sign!;
      setLayerAngle(d.angle);
    }
  };
  const onUp = async () => {
    const d = drag;
    drag = null;
    opts.onGesture?.(null);
    if (!d || d.kind !== 'layer') return;
    // Encajar: más de ~35° completa el cuarto de vuelta; si no, vuelve a su lugar.
    const target = Math.abs(d.angle!) > 0.6 ? Math.sign(d.angle!) : 0;
    animating = true;
    await animateAngle(d.angle!, target * QUARTER, 120);
    if (target) commit(layerMove(d.axis as 0 | 1 | 2, d.layer as -1 | 0 | 1, target as 1 | -1), true);
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
      if (!animating && !drag) setState(s);
      else queue = queue.then(() => setState(s));
    },
    turn,
    rotateObject,
    busy: () => animating || Boolean(drag),
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
