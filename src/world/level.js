// 스테이지 1 「바람언덕」: 하늘섬 다섯 개를 수액으로 이어 세계수 묘목까지 간다.
import { Terrain, fillRock } from './terrain.js';
import { hash2, vnoise } from '../core/rng.js';
import { LW, LH } from '../config.js';

// 떠 있는 섬: 울퉁불퉁한 평평한 윗면, 아래로 좁아지는 바위
function isle(t, x0, x1, top, depth, seed) {
  const cx = (x0 + x1) / 2, hw = (x1 - x0) / 2;
  for (let x = x0; x < x1; x++) {
    const u = (x - cx) / hw;
    const edge = Math.max(0, Math.abs(u) - 0.96) * 60;               // 끝이 살짝 둥글다
    const surf = top + Math.round((vnoise(x / 14, seed) - 0.5) * 3 + edge);
    const bot = top + 6 + depth * Math.pow(Math.max(0, 1 - u * u), 0.6) * (0.8 + 0.2 * vnoise(x / 6, seed + 1))
      + (hash2(x >> 1, 0, seed) < 0.15 ? 4 : 0);
    fillRock(t, x, surf, x + 1, Math.min(LH, Math.floor(bot)));
  }
}
const slab = (t, x0, x1, y0, y1) => fillRock(t, x0, y0, x1, y1);

export function buildLevel() {
  const t = new Terrain(LW, LH);

  isle(t, 0, 520, 270, 80, 1);          // 1. 시작 섬
  isle(t, 296, 372, 250, 10, 2);         //    작은 언덕
  isle(t, 640, 1004, 262, 70, 3);       // 2. 굴림이 섬
  isle(t, 996, 1400, 186, 150, 4);      // 3. 절벽 섬
  isle(t, 1470, 1532, 206, 26, 5);      // 4. 떠 있는 바위 두 개
  isle(t, 1610, 1672, 224, 30, 6);
  isle(t, 1800, 2760, 254, 85, 7);      // 5. 긴 섬
  slab(t, 2020, 2240, 150, 168);        //    머리 위 바위 지붕
  for (let x = 2030; x < 2230; x += 23) slab(t, x, x + 4, 168, 168 + 3 + (x % 7));
  slab(t, 2340, 2372, 176, 256);        //    높은 바위 기둥
  isle(t, 2668, 2702, 240, 4, 8);       //    포탑 받침
  isle(t, 2860, 3200, 244, 90, 9);      // 6. 세계수 묘목 섬

  const ground = x => t.groundY(x, 0);
  const spawn = { x: 60, y: ground(65) - 19 };
  const checkpoints = [60, 690, 1030, 1830, 2400, 2890].map(x => ({ x, y: ground(x + 2), lit: false }));
  checkpoints[0].lit = true;

  const enemies = [
    { type: 'rolly', x: 830 }, { type: 'pod', x: 1330 },
    { type: 'flit', x: 1545, y: 160 }, { type: 'flit', x: 1720, y: 175 },
    { type: 'grub', x: 1960 }, { type: 'rolly', x: 2190 },
    { type: 'rolly', x: 2520 }, { type: 'pod', x: 2680 },
    { type: 'flit', x: 2980, y: 175 },
  ];

  const signs = [
    { x: 30, y: 206, key: 'move' },
    { x: 360, y: 196, key: 'stick' },
    { x: 690, y: 196, key: 'rolly' },
    { x: 920, y: 200, key: 'stairs' },
    { x: 1040, y: 112, key: 'pod' },
    { x: 1408, y: 126, key: 'flit' },
    { x: 1840, y: 186, key: 'grub' },
    { x: 2400, y: 122, key: 'decay' },
  ];

  const goal = { x: 3090, y: ground(3090) };
  t.paint();
  return { terrain: t, spawn, checkpoints, enemies, signs, goal };
}
