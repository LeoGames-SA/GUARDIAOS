import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { gestureAngle, resolveGesture, snapQuarter, type Px, type V3 } from '../src/ui/panels/cubeGesture';
import { mulberry32 } from '../src/engine/rng';

// Misma cámara que el cubo 3D: lienzo cuadrado de 500 px.
const camera = new PerspectiveCamera(30, 1, 0.1, 100);
camera.position.set(0, 0, 11.5);
camera.updateMatrixWorld();
camera.updateProjectionMatrix();
const SIZE = 500;

function projector(q: Quaternion) {
  return (p: V3): Px => {
    const v = new Vector3(...p).applyQuaternion(q).project(camera);
    return [((v.x + 1) / 2) * SIZE, ((1 - v.y) / 2) * SIZE];
  };
}
function rotate(p: V3, axis: number, angle: number): V3 {
  const e = new Vector3(0, 0, 0).setComponent(axis, 1);
  const v = new Vector3(...p).applyAxisAngle(e, angle);
  return [v.x, v.y, v.z];
}

describe('gestos del cubo', () => {
  it('un clic (menos que el umbral) no decide nada', () => {
    expect(resolveGesture([0, 0, 1.5], [0, 0, 1], [0, 0, 1], [3, 2], projector(new Quaternion()))).toBeNull();
  });

  it('desde muchas orientaciones, la capa acompaña al dedo sobre cada pegatina visible', () => {
    const rand = mulberry32(42);
    let checked = 0;
    for (let k = 0; k < 40; k++) {
      const q = new Quaternion(rand() - 0.5, rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
      const project = projector(q);
      for (let axisN = 0; axisN < 3; axisN++)
        for (const s of [1, -1]) {
          const n: V3 = [0, 0, 0];
          n[axisN] = s;
          // Cara visible: la normal apunta hacia la cámara.
          const nWorld = new Vector3(...n).applyQuaternion(q);
          const center = new Vector3(...n).multiplyScalar(1.5).applyQuaternion(q);
          const toCam = camera.position.clone().sub(center).normalize();
          if (nWorld.dot(toCam) < 0.35) continue;
          for (const u of [-1, 0, 1])
            for (const v of [-1, 0, 1]) {
              const cubie: V3 = [0, 0, 0];
              const others = [0, 1, 2].filter((i) => i !== axisN);
              cubie[axisN] = s;
              cubie[others[0]!] = u;
              cubie[others[1]!] = v;
              const point: V3 = [...cubie];
              point[axisN] = 1.5 * s;
              for (let a = 0; a < 8; a++) {
                const ang = (a / 8) * Math.PI * 2;
                const drag: Px = [Math.cos(ang) * 40, Math.sin(ang) * 40];
                const g = resolveGesture(point, n, cubie, drag, project)!;
                expect(g).not.toBeNull();
                expect(g.axis).not.toBe(axisN);
                expect(g.layer).toBe(cubie[g.axis]);
                const angle = gestureAngle(g, drag, point, project);
                const p0 = project(point);
                const p1 = project(rotate(point, g.axis, angle));
                const target: Px = [p0[0] + drag[0], p0[1] + drag[1]];
                // El punto tocado se acerca al dedo y se mueve hacia donde va (nunca al revés).
                expect(Math.hypot(p1[0] - target[0], p1[1] - target[1])).toBeLessThan(40);
                if (Math.abs(angle) > 0.02) {
                  const m: Px = [p1[0] - p0[0], p1[1] - p0[1]];
                  const cos = (m[0] * drag[0] + m[1] * drag[1]) / (Math.hypot(...m) * 40);
                  expect(cos).toBeGreaterThan(0);
                }
                checked++;
              }
            }
        }
    }
    expect(checked).toBeGreaterThan(2000);
  });

  it('encaje: gestos cortos vuelven, gestos largos completan el cuarto de vuelta', () => {
    expect(snapQuarter(0.3)).toBe(0);
    expect(snapQuarter(0.9)).toBe(1);
    expect(snapQuarter(-1.2)).toBe(-1);
  });
});
