// 욕구 · 환경 → 식물의 평상시 표정과 잠 여부. 허브(선반)와 돌보기 화면이 같이 쓴다.

import type { Expression } from '../art/FaceRenderer';
import type { PlantInstance } from '../core/schema';
import type { PlantBase } from '../data/plants';
import type { PlantEnv } from '../systems/garden/Environment';
import { derivedStatuses, isSleeping } from '../systems/garden/Needs';

export function moodExpression(
  plant: PlantInstance,
  base: PlantBase,
  env: PlantEnv,
): { expression: Expression; sleeping: boolean } {
  const st = derivedStatuses(plant, base, env);
  const sleeping = plant.stage > 0 && isSleeping(plant, base, env);
  let expression: Expression = 'default';
  if (plant.stage === 0) expression = 'default';
  else if (sleeping) expression = 'sleep';
  else if (st.includes('THIRSTY')) expression = 'thirsty';
  else if (st.includes('HUNGRY')) expression = 'hungry';
  else if (st.includes('SULKY')) expression = 'sulk';
  else if (plant.flags.happy) expression = 'happy';
  return { expression, sleeping };
}
