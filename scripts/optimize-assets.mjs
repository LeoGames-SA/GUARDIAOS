/**
 * Genera derivados livianos de art-source/assets en public/assets y
 * src/content/art-manifest.json. Los originales no se modifican.
 *
 * - Recorta el margen transparente (alfa <= 8) dejando 4 px de aire.
 * - monitor: la pantalla es semitransparente en el original; se rellena de
 *   forma opaca la región conectada al centro y se registra su rectángulo.
 * - Escala al ancho máximo de uso (≈1,5× el ancho en escena de 1672 px).
 */
import sharp from 'sharp';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const src = path.join(root, 'art-source/assets');
const out = path.join(root, 'public/assets');
const manifestOut = path.join(root, 'src/content/art-manifest.json');
await mkdir(out, { recursive: true });

// Ancho máximo del derivado (px) — suficiente para la escena a ~2560 px de ancho.
const maxWidth = {
  background: 1672, monitor: 1200, 'telephone-base': 620, 'telephone-handset': 260, keyboard: 760,
  mouse: 180, corkboard: 1200, notebook: 820, manual: 330, 'coffee-mug': 260, 'desk-lamp': 480,
  'stress-ball': 180, 'rubik-cube': 200, 'ticket-paper': 360, 'memo-paper': 300, 'sticky-note': 260,
  pushpin: 64, 'hand-mouse': 560, 'hand-phone': 520, 'hand-coffee': 560, 'cat-easter-egg': 760,
  snack: 330, plant: 420, 'pen-holder': 200,
};

const source = JSON.parse(await readFile(path.join(root, 'art-source/asset-manifest.json'), 'utf8'));
const result = {};

for (const asset of source.assets) {
  const file = path.join(src, path.basename(asset.file));
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const alpha = (x, y) => data[(y * W + x) * 4 + 3];
  let screen = null;

  if (asset.id === 'monitor') {
    // Relleno por inundación desde el centro sobre píxeles con alfa < 250.
    const seen = new Uint8Array(W * H);
    const stack = [[Math.floor(W / 2), Math.floor(H * 0.4)]];
    let minX = W, minY = H, maxX = 0, maxY = 0;
    while (stack.length) {
      const [x, y] = stack.pop();
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = y * W + x;
      if (seen[i] || data[i * 4 + 3] >= 250) continue;
      seen[i] = 1;
      data[i * 4 + 3] = 255;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    screen = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  }

  // Recorte al contenido visible.
  let bx0 = W, by0 = H, bx1 = 0, by1 = 0;
  if (asset.id === 'background') { bx0 = 0; by0 = 0; bx1 = W - 1; by1 = H - 1; }
  else for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (alpha(x, y) > 8) {
    if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y;
  }
  const pad = asset.id === 'background' ? 0 : 4;
  const left = Math.max(0, bx0 - pad), top = Math.max(0, by0 - pad);
  const width = Math.min(W, bx1 + pad + 1) - left, height = Math.min(H, by1 + pad + 1) - top;
  const targetW = Math.min(width, maxWidth[asset.id] ?? 600);
  const scale = targetW / width;

  const img = sharp(data, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left, top, width, height })
    .resize({ width: targetW });
  const outName = `${asset.id}.webp`;
  const res = await img.webp({ quality: asset.id === 'background' ? 88 : 86, alphaQuality: 100, effort: 5 })
    .toFile(path.join(out, outName));
  result[asset.id] = {
    file: `assets/${outName}`,
    width: res.width, height: res.height, bytes: res.size,
    // Proporción del recorte respecto del original (para trazabilidad).
    crop: { left, top, width, height },
    ...(screen && {
      screen: {
        x: +((screen.x - left) / width).toFixed(4), y: +((screen.y - top) / height).toFixed(4),
        w: +(screen.w / width).toFixed(4), h: +(screen.h / height).toFixed(4),
      },
    }),
    scale: +scale.toFixed(4),
  };
}
await writeFile(manifestOut, JSON.stringify(result, null, 2) + '\n');
const total = Object.values(result).reduce((s, r) => s + r.bytes, 0);
console.log(`Derivados: ${Object.keys(result).length}, ${(total / 1024).toFixed(0)} KiB en total.`);
