// 얼굴 매트릭스: 얼굴 유형 12종(행) × 표정 16종(열)을 한 장으로 뽑아 눈으로 검수한다.
//   npx tsx scripts/face-matrix.ts [출력.png] [--scale=4]
// 호스트는 둥근 몸(15×12). 각 유형의 눈 간격 · 입 길이는 그 유형을 쓰는 첫 종의 값을 쓴다.

import { writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { drawFace, EXPRESSIONS } from '../src/art/FaceRenderer';
import type { FaceHost } from '../src/art/PlantSpriteGen';
import { RAMPS, SPECIAL, toInt } from '../src/art/palette';
import { PLANT_BASE } from '../src/data/plants';

const scale = Number((process.argv.find((a) => a.startsWith('--scale=')) ?? '--scale=4').slice(8));
const out = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'face-matrix.png';
const TYPES = [
  'F01',
  'F02',
  'F03',
  'F04',
  'F05',
  'F06',
  'F07',
  'F08',
  'F09',
  'F10',
  'F11',
  'F12',
] as const;

const CELL_W = 24;
const CELL_H = 20;
const W = EXPRESSIONS.length * CELL_W;
const H = TYPES.length * CELL_H;
const png = new PNG({ width: W * scale, height: H * scale });
const paint = (x: number, y: number, c: string) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const n = toInt(c);
  for (let j = 0; j < scale; j++) {
    for (let i = 0; i < scale; i++) {
      const o = ((y * scale + j) * png.width + x * scale + i) * 4;
      png.data[o] = (n >> 16) & 255;
      png.data[o + 1] = (n >> 8) & 255;
      png.data[o + 2] = n & 255;
      png.data[o + 3] = 255;
    }
  }
};
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) paint(x, y, SPECIAL.CREAM);

TYPES.forEach((type, row) => {
  const spec = PLANT_BASE.find((p) => p.look.face.type === type)?.look.face ?? { type, host: 'x' };
  EXPRESSIONS.forEach((expr, col) => {
    const ox = col * CELL_W + 4;
    const oy = row * CELL_H + 3;
    // 호스트 몸: 둥근 15×12 (외곽선 1px)
    const spans: ([number, number] | null)[] = [];
    for (let j = 0; j < 12; j++) {
      const half = Math.round(7.5 * Math.sqrt(Math.max(0.05, 1 - ((j - 5.5) / 6.2) ** 2)));
      spans.push([ox + 8 - half, ox + 8 + half]);
      for (let x = ox + 8 - half - 1; x <= ox + 8 + half + 1; x++) {
        const inner = x >= ox + 8 - half && x <= ox + 8 + half;
        paint(x, oy + j, inner ? RAMPS.R1[2] : RAMPS.R1[0]);
      }
    }
    const host: FaceHost = { x: ox + 1, y: oy, w: 15, h: 12, spans };
    for (const d of drawFace(spec, host, expr, [0, 0], RAMPS.R1[2], { time: 0.1 }))
      paint(d.x, d.y, d.color);
  });
});
writeFileSync(out, PNG.sync.write(png));
console.log(`얼굴 ${TYPES.length}유형 × 표정 ${EXPRESSIONS.length}종 → ${out}`);
