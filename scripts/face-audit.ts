// 얼굴 검수 보고: 모든 종 × 단계 × 색변이 × 대기 프레임에서 5-2 규칙 위반을 센다.
//   npx tsx scripts/face-audit.ts [--verbose]
import { PLANT_BASE } from '../src/data/plants';
import { validateFace } from '../src/art/FaceValidator';
import { generatePlant, type FrameName } from '../src/art/PlantSpriteGen';
import type { Stage } from '../src/art/bodies/Ctx';

const verbose = process.argv.includes('--verbose');
const counts: Record<string, number> = {};
const bySpecies = new Map<string, string[]>();
let checked = 0;
for (const plant of PLANT_BASE) {
  for (const stage of [1, 2, 3, 4, 5] as Stage[]) {
    for (const variant of [false, true]) {
      const sprite = generatePlant(plant, stage, variant);
      for (const f of ['idle0', 'idle1', 'idle2', 'idle3'] as FrameName[]) {
        checked++;
        const fr = sprite.frames[f];
        for (const issue of validateFace(plant.look.face, fr.host, fr.bodyColor, fr.grid)) {
          counts[issue.rule] = (counts[issue.rule] ?? 0) + 1;
          const key = `${plant.id} ${plant.look.body}/${plant.look.face.type} s${stage}${variant ? 'v' : ''}`;
          bySpecies.set(key, [
            ...(bySpecies.get(key) ?? []),
            `${f}:${issue.rule} ${issue.message}`,
          ]);
        }
      }
    }
  }
}
console.log(`검사 ${checked}건, 위반 종·단계 ${bySpecies.size}건`, counts);
if (verbose)
  for (const [k, v] of bySpecies) console.log(k, '→', [...new Set(v)].slice(0, 2).join(' | '));
process.exit(bySpecies.size === 0 ? 0 : 1);
