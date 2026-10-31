// 돌보기 화면의 고정 값: 식물 위치 · 배율 · 도구 목록 · 반응→표정 표.

import type { Expression } from '../../art/FaceRenderer';
import type { CareAction } from '../../data/care';
import type { Reaction } from '../../systems/garden/Care';
import {
  BoneTool,
  CompostTool,
  HandTool,
  MistTool,
  NutrientTool,
  PestTool,
  PruneTool,
  RepotTool,
  ScrubTool,
  SnackTool,
  StakeTool,
  TalkTool,
  WaterTool,
  type CareHost,
  type Tool,
  type ToolId,
} from './Tools';

export const PX = 430; // 식물 발밑(흙) 가운데
export const PY = 262;
export const SCALE = 2; // 월드 ×2

export interface ToolDef {
  id: ToolId;
  icon: string;
  action: CareAction;
  make: (h: CareHost) => Tool;
}

export const TOOLS: ToolDef[] = [
  { id: 'water', icon: 'can', action: 'WATER', make: (h) => new WaterTool(h) },
  { id: 'mist', icon: 'spray', action: 'MIST', make: (h) => new MistTool(h) },
  { id: 'nutrient', icon: 'ampoule', action: 'NUTRIENT', make: (h) => new NutrientTool(h) },
  { id: 'compost', icon: 'compost', action: 'COMPOST', make: (h) => new CompostTool(h) },
  { id: 'bone', icon: 'bone', action: 'BONE', make: (h) => new BoneTool(h) },
  { id: 'scrub', icon: 'brush', action: 'SCRUB', make: (h) => new ScrubTool(h) },
  { id: 'pest', icon: 'tweezers', action: 'PEST', make: (h) => new PestTool(h) },
  { id: 'prune', icon: 'scissors', action: 'PRUNE', make: (h) => new PruneTool(h) },
  { id: 'hand', icon: 'hand', action: 'PET', make: (h) => new HandTool(h) },
  { id: 'talk', icon: 'speech', action: 'TALK', make: (h) => new TalkTool(h) },
  { id: 'snack', icon: 'snack', action: 'SNACK', make: (h) => new SnackTool(h) },
  { id: 'repot', icon: 'pot', action: 'REPOT', make: (h) => new RepotTool(h) },
  { id: 'stake', icon: 'stake', action: 'STAKE', make: (h) => new StakeTool(h) },
];

export const REACTION_EXPR: Partial<Record<Reaction, Expression>> = {
  happy: 'happy',
  excited: 'excited',
  gulp: 'gulp',
  ticklish: 'ticklish',
  pain: 'pain',
  sulk: 'sulk',
  surprise: 'surprise',
  shy: 'shy',
};
