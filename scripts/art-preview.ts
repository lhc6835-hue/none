// 아트 미리보기: 브라우저 없이 식물 스프라이트를 PNG 시트로 뽑아 눈으로 확인한다.
//   npx tsx scripts/art-preview.ts [출력.png] [옵션]
//   --family=VINE        계열만          --ids=P001,P004   특정 종만
//   --stages=2,5         단계 선택(기본 1–5)   --variant     색변이 램프   --sil   실루엣 모드
//   --frames=idle0,hit   프레임 선택(기본 idle0)   --scale=4   확대 배율(정수)
// 얼굴(FaceRenderer)은 faces=1 옵션으로 덧그린다.

import { writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { PALETTE_SET, SPECIAL, toInt } from '../src/art/palette';
import { drawFace } from '../src/art/FaceRenderer';
import { generatePlant, type FrameName } from '../src/art/PlantSpriteGen';
import { PLANT_BASE } from '../src/data/plants';
import type { Stage } from '../src/art/bodies/Ctx';

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, v] = a.slice(2).split('=');
      return [k, v ?? '1'];
    }),
);
const out = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'art-preview.png';
const scale = Number(args.scale ?? 4);
const stages = (args.stages ?? '1,2,3,4,5').split(',').map(Number) as Stage[];
const frames = (args.frames ?? 'idle0').split(',') as FrameName[];
const ids = args.ids?.split(',');
const list = PLANT_BASE.filter((p) =>
  ids ? ids.includes(p.id) : args.family ? p.family === args.family : true,
);
const bg = toInt(args.bg ? (args.bg as string) : '#' + SPECIAL.CREAM.slice(1));

const CELL_W = 28;
const CELL_H = 36;
const gridCols = args.cols ? Number(args.cols) : 0; // --cols=N: 종을 N열 격자로(첫 단계 · 첫 프레임만)
const cols = gridCols || stages.length * frames.length;
const W = cols * CELL_W;
const H = (gridCols ? Math.ceil(list.length / gridCols) : list.length) * CELL_H;
const png = new PNG({ width: W * scale, height: H * scale });
const put = (x: number, y: number, color: number) => {
  for (let j = 0; j < scale; j++) {
    for (let i = 0; i < scale; i++) {
      const o = ((y * scale + j) * png.width + x * scale + i) * 4;
      png.data[o] = (color >> 16) & 255;
      png.data[o + 1] = (color >> 8) & 255;
      png.data[o + 2] = color & 255;
      png.data[o + 3] = 255;
    }
  }
};
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(x, y, bg);

let stray = 0;
list.forEach((plant, index) => {
  const row = gridCols ? Math.floor(index / gridCols) : index;
  let col = gridCols ? index % gridCols : 0;
  for (const stage of gridCols ? stages.slice(0, 1) : stages) {
    const sprite = generatePlant(plant, stage, args.variant === '1');
    for (const f of gridCols ? frames.slice(0, 1) : frames) {
      const fr = sprite.frames[f];
      const ox = col * CELL_W + Math.floor((CELL_W - sprite.w) / 2);
      const oy = row * CELL_H + CELL_H - sprite.h - 1;
      const g = fr.grid;
      for (let y = 0; y < g.h; y++) {
        for (let x = 0; x < g.w; x++) {
          const c = g.px[y * g.w + x];
          if (!c) continue;
          if (!PALETTE_SET.has(c)) stray++;
          put(ox + x, oy + y, args.sil ? toInt(SPECIAL.INK) : toInt(c));
        }
      }
      if (args.faces && !args.sil) {
        for (const d of drawFace(plant.look.face, fr.host, 'default', [0, 0], fr.bodyColor)) {
          put(ox + d.x, oy + d.y, toInt(d.color));
        }
      }
      col++;
    }
  }
});
writeFileSync(out, PNG.sync.write(png));
console.log(`${list.length}종 → ${out} (${png.width}×${png.height}) 팔레트 밖 픽셀 ${stray}`);
