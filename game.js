(() => {
'use strict';

// ─── 기본 설정 ───────────────────────────────────────────────
const CELL = 4;                 // 지형 칸 하나의 픽셀 크기
const TILE = 16;                // 레벨 설계용 타일 크기
const T = TILE / CELL;          // 타일 하나에 들어가는 칸 수
const GW = 520, GH = 136;       // 지형 칸 개수 (가로 2080px, 세로 544px)
const VW = 960, VH = GH * CELL; // 화면 크기

const EMPTY = 0, ROCK = 1, LIQ = 2, SOLID = 3;

const HARDEN_MIN = 70;          // 이 시간(틱)이 지나고 멈춰 있으면 굳는다
const HARDEN_MAX = 200;         // 이 시간이 지나면 무조건 굳는다
const SOLID_LIFE = 40 * 60;     // 굳은 덩어리가 버티는 시간
const CRACK_WARN = 180;         // 부서지기 전 금이 가는 시간

const GRAVITY = 0.35, MAX_FALL = 8;
const TANK_MAX = 100, SHOT_COST = 6, TANK_REGEN = 0.22, FIRE_CD = 7;
const BLOB_SPEED = 8.5, BLOB_GRAV = 0.18, SPLAT_CELLS = 22;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ─── 지형 격자 ───────────────────────────────────────────────
const N = GW * GH;
const grid = new Uint8Array(N);
const age = new Uint16Array(N);   // 액체가 된 뒤 지난 시간
const rest = new Uint8Array(N);   // 움직이지 않은 시간
const born = new Uint32Array(N);  // 굳은 시각
const noise = new Uint8Array(N);
for (let i = 0; i < N; i++) noise[i] = (Math.random() * 256) | 0;
let liquids = [];

const terrainCanvas = document.createElement('canvas');
terrainCanvas.width = GW; terrainCanvas.height = GH;
const tctx = terrainCanvas.getContext('2d');
const img = tctx.createImageData(GW, GH);
const pix = new Uint32Array(img.data.buffer);

const rgb = (r, g, b) => (255 << 24) | (b << 16) | (g << 8) | r;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

function isSolidAt(x, y) {
  if (x < 0 || x >= GW) return true;
  if (y < 0 || y >= GH) return false;
  const g = grid[y * GW + x];
  return g === ROCK || g === SOLID;
}
function filledAt(x, y) {
  if (x < 0 || x >= GW) return true;
  if (y < 0 || y >= GH) return false;
  return grid[y * GW + x] !== EMPTY;
}
function emptyAt(x, y) {
  return x >= 0 && x < GW && y >= 0 && y < GH && grid[y * GW + x] === EMPTY;
}

// ─── 레벨 ────────────────────────────────────────────────────
function rectT(tx, ty, tw, th) {
  for (let y = ty * T; y < (ty + th) * T; y++)
    for (let x = tx * T; x < (tx + tw) * T; x++)
      if (x >= 0 && x < GW && y >= 0 && y < GH) grid[y * GW + x] = ROCK;
}

const signs = [
  { tx: 3, ty: 19, lines: ['A/D 이동 · W/스페이스 점프', '마우스로 조준하고 클릭하면 액체를 쏴요', '액체는 흐르다가 잠시 뒤에 굳어요'] },
  { tx: 15, ty: 17, lines: ['낭떠러지 옆면에 쏘면 달라붙어서 굳어요', '굳은 덩어리를 밟고 건너가요'] },
  { tx: 33, ty: 16, lines: ['돌진하는 적 앞에 벽을 세우면 부딪혀서 기절해요', '적을 세 번 맞히면 통째로 굳어서 발판이 돼요'] },
  { tx: 36, ty: 22.5, lines: ['절벽에 덩어리를 붙여서 계단을 만들어요'] },
  { tx: 52, ty: 12, lines: ['포탑의 탄은 굳은 벽이 막아줘요', '벽은 맞을수록 깎여요'] },
  { tx: 72, ty: 20, lines: ['굳은 것은 시간이 지나면 부서져요', '탱크는 쉬면 다시 차요'] },
  { tx: 97, ty: 19, lines: ['높은 벽은 발판을 붙여서 올라가요'] },
];

function buildLevel() {
  grid.fill(EMPTY);
  liquids = [];
  rectT(0, 0, 1, 34);       // 왼쪽 벽
  rectT(0, 27, 24, 7);      // 시작 땅
  rectT(12, 24, 4, 3);      // 작은 턱
  //   24~32: 첫 낭떠러지
  rectT(32, 27, 18, 7);     // 두 번째 땅
  rectT(50, 19, 22, 15);    // 절벽
  rectT(72, 27, 8, 7);      // 절벽 아래
  //   80~96: 큰 낭떠러지와 가운데 기둥
  rectT(87, 23, 3, 11);
  rectT(96, 27, 34, 7);     // 마지막 땅
  rectT(110, 22, 2, 5);     // 높은 벽
  rectT(122, 25, 2, 2);     // 포탑 받침
  rectT(129, 0, 1, 34);     // 오른쪽 벽
}

// ─── 게임 상태 ───────────────────────────────────────────────
let tick = 0, state = 'play', startTick = 0, winTick = 0;
let player, enemies, blobs, orbs, particles, checkpoints, cpIndex, goal;
let camX = 0, shake = 0;

function makePlayer(x, y) {
  return { x, y, w: 12, h: 20, vx: 0, vy: 0, onGround: false, hitWall: false,
    hp: 3, tank: TANK_MAX, fireCd: 0, coyote: 0, invuln: 0, knock: 0,
    dead: false, deathT: 0, recoil: 0, aim: 0 };
}
function charger(tx, ty) {
  return { type: 'charger', x: tx * TILE, y: ty * TILE - 16, w: 20, h: 16, vx: 0, vy: 0,
    dir: -1, state: 'patrol', t: 0, coat: 0, coatT: 0, flash: 0, onGround: false, hitWall: false, dead: false };
}
function turret(tx, ty) {
  return { type: 'turret', x: tx * TILE, y: ty * TILE - 16, w: 16, h: 16,
    t: 90, coat: 0, coatT: 0, flash: 0, aim: Math.PI, dead: false };
}

function resetGame() {
  buildLevel();
  tick = 0; startTick = 0; state = 'play';
  player = makePlayer(3 * TILE, 27 * TILE - 20);
  enemies = [charger(42, 27), charger(62, 19), turret(68, 19),
             charger(103, 27), charger(117, 27), turret(122.5, 25)];
  blobs = []; orbs = []; particles = [];
  checkpoints = [3, 34, 52, 74, 98].map(tx => ({ x: tx * TILE, active: false }));
  checkpoints[0].active = true; cpIndex = 0;
  goal = { x: 127 * TILE };
  camX = 0;
}

// ─── 입력 ────────────────────────────────────────────────────
const keys = new Set();
let jumpBuf = 0;
const JUMP_KEYS = ['KeyW', 'Space', 'ArrowUp'];
addEventListener('keydown', e => {
  if (JUMP_KEYS.includes(e.code) && !keys.has(e.code)) jumpBuf = 6;
  keys.add(e.code);
  if (e.code === 'KeyR') resetGame();
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); mouse.down = false; });

const mouse = { x: VW / 2, y: VH / 2, down: false };
function setMouse(e) {
  const r = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) * VW / r.width;
  mouse.y = (e.clientY - r.top) * VH / r.height;
}
canvas.addEventListener('mousemove', setMouse);
canvas.addEventListener('mousedown', e => { setMouse(e); if (e.button === 0) mouse.down = true; });
addEventListener('mouseup', e => { if (e.button === 0) mouse.down = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());

// ─── 터치 조작 ───────────────────────────────────────────────
// 왼쪽 아래 ◀ ▶ 이동, 오른쪽 아래 점프, 나머지 화면은 누른 곳으로 조준·발사
let touchMode = matchMedia('(pointer: coarse)').matches;
const touch = { left: false, right: false, jump: false };
const pointers = new Map(); // pointerId → { role, x, y }
const BTN = {
  left:    { x: 74,       y: VH - 74, r: 46, label: '◀' },
  right:   { x: 184,      y: VH - 74, r: 46, label: '▶' },
  jump:    { x: VW - 86,  y: VH - 86, r: 56, label: '점프' },
  restart: { x: VW - 40,  y: 40,      r: 26, label: '처음' },
};
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * VW / r.width, y: (e.clientY - r.top) * VH / r.height };
}
function hitButton(p) {
  for (const name of ['jump', 'restart']) {
    const b = BTN[name];
    if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + 14) return name;
  }
  // 이동 버튼은 손가락이 미끄러져도 놓치지 않게 넓은 직사각형으로 판정
  if (p.x < 245 && p.y > VH - 160) return p.x < 129 ? 'left' : 'right';
  return 'aim';
}
function refreshTouch() {
  touch.left = touch.right = touch.jump = false;
  let aiming = false;
  for (const ptr of pointers.values()) {
    if (ptr.role === 'left') touch.left = true;
    else if (ptr.role === 'right') touch.right = true;
    else if (ptr.role === 'jump') touch.jump = true;
    else if (ptr.role === 'aim') { aiming = true; mouse.x = ptr.x; mouse.y = ptr.y; }
  }
  mouse.down = aiming;
}
canvas.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse') return;
  e.preventDefault();
  touchMode = true;
  canvas.setPointerCapture?.(e.pointerId);
  if (state === 'win') { resetGame(); return; }
  const p = canvasPoint(e);
  const role = hitButton(p);
  if (role === 'restart') { resetGame(); return; }
  if (role === 'jump') jumpBuf = 6;
  pointers.set(e.pointerId, { role, x: p.x, y: p.y });
  refreshTouch();
}, { passive: false });
canvas.addEventListener('pointermove', e => {
  const ptr = pointers.get(e.pointerId);
  if (!ptr) return;
  e.preventDefault();
  const p = canvasPoint(e);
  ptr.x = p.x; ptr.y = p.y;
  if (ptr.role === 'left' || ptr.role === 'right') {
    const r = hitButton(p);
    if (r === 'left' || r === 'right') ptr.role = r;
  }
  refreshTouch();
}, { passive: false });
function endPointer(e) {
  if (!pointers.delete(e.pointerId)) return;
  refreshTouch();
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

function drawTouchControls() {
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const [name, b] of Object.entries(BTN)) {
    const on = touch[name];
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = on ? 'rgba(127, 242, 220, 0.35)' : 'rgba(214, 210, 245, 0.12)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = on ? 'rgba(127, 242, 220, 0.9)' : 'rgba(214, 210, 245, 0.35)';
    ctx.stroke();
    ctx.fillStyle = on ? '#e6fffb' : 'rgba(214, 210, 245, 0.75)';
    ctx.font = `bold ${name === 'jump' ? 18 : name === 'restart' ? 14 : 24}px "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
    ctx.fillText(b.label, b.x, b.y + 1);
  }
  ctx.restore();
}

// ─── 충돌 ────────────────────────────────────────────────────
function boxHits(x, y, w, h) {
  const x0 = Math.floor(x / CELL), x1 = Math.floor((x + w - 0.001) / CELL);
  const y0 = Math.floor(y / CELL), y1 = Math.floor((y + h - 0.001) / CELL);
  for (let cy = y0; cy <= y1; cy++)
    for (let cx = x0; cx <= x1; cx++)
      if (isSolidAt(cx, cy)) return true;
  return false;
}
function liquidInBox(e) {
  let n = 0;
  const x0 = Math.floor(e.x / CELL), x1 = Math.floor((e.x + e.w - 1) / CELL);
  const y0 = Math.floor(e.y / CELL), y1 = Math.floor((e.y + e.h - 1) / CELL);
  for (let cy = y0; cy <= y1; cy++)
    for (let cx = x0; cx <= x1; cx++)
      if (cx >= 0 && cx < GW && cy >= 0 && cy < GH && grid[cy * GW + cx] === LIQ) n++;
  return n;
}

function moveEntity(e, stepUp) {
  e.hitWall = false;
  let rem = Math.abs(e.vx);
  const sx = Math.sign(e.vx);
  while (rem > 0) {
    const s = Math.min(1, rem) * sx; rem -= 1;
    if (!boxHits(e.x + s, e.y, e.w, e.h)) { e.x += s; continue; }
    let stepped = false;
    if (e.onGround) {
      for (let u = 1; u <= stepUp; u++) {
        if (!boxHits(e.x + s, e.y - u, e.w, e.h)) { e.x += s; e.y -= u; stepped = true; break; }
      }
    }
    if (!stepped) { e.hitWall = true; e.vx = 0; break; }
  }
  e.onGround = false;
  rem = Math.abs(e.vy);
  const sy = Math.sign(e.vy);
  while (rem > 0) {
    const s = Math.min(1, rem) * sy; rem -= 1;
    if (!boxHits(e.x, e.y + s, e.w, e.h)) { e.y += s; continue; }
    if (sy > 0) e.onGround = true;
    e.vy = 0; break;
  }
  if (!e.onGround && e.vy >= 0 && boxHits(e.x, e.y + 1, e.w, e.h)) e.onGround = true;
}

// 액체가 굳으면서 몸 안에 박히면 위로 밀어낸다
function unstick(e) {
  if (!boxHits(e.x, e.y, e.w, e.h)) return;
  for (let u = 1; u <= 28; u++) {
    if (!boxHits(e.x, e.y - u, e.w, e.h)) { e.y -= u; return; }
  }
}

// ─── 액체 ────────────────────────────────────────────────────
function neighborsFilled(x, y) {
  let n = 0;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      if ((dx || dy) && filledAt(x + dx, y + dy)) n++;
  return n;
}

function touchesSolid(x, y) {
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      if ((dx || dy) && isSolidAt(x + dx, y + dy)) return true;
  return false;
}

function splat(px, py, count = SPLAT_CELLS) {
  let sx = clamp(Math.floor(px / CELL), 0, GW - 1);
  let sy = clamp(Math.floor(py / CELL), 0, GH - 1);
  if (grid[sy * GW + sx] !== EMPTY) {
    let found = false;
    for (let r = 1; r <= 3 && !found; r++)
      for (let dy = -r; dy <= r && !found; dy++)
        for (let dx = -r; dx <= r && !found; dx++)
          if (emptyAt(sx + dx, sy + dy)) { sx += dx; sy += dy; found = true; }
    if (!found) return;
  }
  const start = sy * GW + sx;
  const queue = [start];
  const seen = new Set([start]);
  let placed = 0;
  while (queue.length && placed < count) {
    const i = queue.shift();
    if (grid[i] !== EMPTY) continue;
    const x = i % GW, y = (i / GW) | 0;
    if ((x - sx) ** 2 + (y - sy) ** 2 > 22) continue;
    grid[i] = LIQ; age[i] = 0; rest[i] = 0;
    liquids.push(i); placed++;
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let k = nb.length - 1; k > 0; k--) {
      const j = (Math.random() * (k + 1)) | 0; [nb[k], nb[j]] = [nb[j], nb[k]];
    }
    for (const [dx, dy] of nb) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= GW || ny < 0 || ny >= GH) continue;
      const ni = ny * GW + nx;
      if (!seen.has(ni)) { seen.add(ni); queue.push(ni); }
    }
  }
  for (let k = 0; k < 6; k++) {
    spawnParticle(px, py, (Math.random() - 0.5) * 4, -Math.random() * 3, 18, '#9ef7e4', 0.25);
  }
}

function updateLiquid() {
  // 아래쪽부터 처리해야 위의 액체가 자연스럽게 따라 내려온다
  liquids.sort((a, b) => b - a);
  const next = [];
  for (let i of liquids) {
    if (grid[i] !== LIQ) continue;
    const x = i % GW, y = (i / GW) | 0;
    const a = ++age[i];
    if (y >= GH - 1) { grid[i] = EMPTY; continue; } // 화면 아래로 흘러 나감

    const n = neighborsFilled(x, y);
    const touchesWall = touchesSolid(x, y);
    let j = i;
    if (grid[i + GW] === EMPTY) {
      // 끈적한 액체: 벽에 닿았거나 덩어리 안쪽이면 아주 천천히 처진다
      const p = touchesWall ? 0.025 : n >= 3 ? 0.05 : n >= 2 ? 0.3 : 1;
      if (Math.random() < p) j = i + GW;
    } else if (Math.random() < (touchesWall ? 0.05 : n >= 5 ? 0.12 : 0.4)) {
      const d = Math.random() < 0.5 ? -1 : 1;
      if (emptyAt(x + d, y + 1)) j = i + GW + d;
      else if (emptyAt(x - d, y + 1)) j = i + GW - d;
      else if (Math.random() < 0.3 && emptyAt(x + d, y)) j = i + d;
    }

    if (j !== i) {
      grid[j] = LIQ; grid[i] = EMPTY;
      age[j] = a; rest[j] = 0; i = j;
    } else if (rest[i] < 255) rest[i]++;

    if ((a > HARDEN_MIN && rest[i] > 8) || a > HARDEN_MAX) {
      grid[i] = SOLID; born[i] = tick;
    } else next.push(i);
  }
  liquids = next;
}

function decaySolids() {
  for (let i = 0; i < N; i++) {
    if (grid[i] === SOLID && tick - born[i] > SOLID_LIFE) {
      grid[i] = EMPTY;
      if (Math.random() < 0.15) {
        const x = (i % GW) * CELL, y = ((i / GW) | 0) * CELL;
        spawnParticle(x, y, (Math.random() - 0.5) * 1.5, -Math.random(), 40, '#3f8f96', 0.3);
      }
    }
  }
}

function erode(px, py, r) {
  const cx = Math.floor(px / CELL), cy = Math.floor(py / CELL);
  let removed = 0;
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      const x = cx + dx, y = cy + dy;
      if (x < 0 || x >= GW || y < 0 || y >= GH) continue;
      const i = y * GW + x;
      if (grid[i] === SOLID || grid[i] === LIQ) {
        grid[i] = EMPTY; removed++;
        if (Math.random() < 0.4) spawnParticle(x * CELL, y * CELL, (Math.random() - 0.5) * 3, -Math.random() * 2.5, 30, '#4aa3a8', 0.3);
      }
    }
  return removed;
}

// ─── 파티클 ──────────────────────────────────────────────────
function spawnParticle(x, y, vx, vy, life, color, g = 0.2) {
  if (particles.length > 700) return;
  particles.push({ x, y, vx, vy, life, max: life, color, g });
}
function updateParticles() {
  for (const p of particles) { p.vy += p.g; p.x += p.vx; p.y += p.vy; p.life--; }
  particles = particles.filter(p => p.life > 0);
}

// ─── 플레이어 ────────────────────────────────────────────────
function gunOrigin() { return { x: player.x + player.w / 2, y: player.y + 8 }; }
function aimDir() {
  const o = gunOrigin();
  const dx = mouse.x + camX - o.x, dy = mouse.y - o.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

function hurtPlayer(fromX) {
  const p = player;
  if (p.invuln > 0 || p.dead || state !== 'play') return;
  p.hp--; p.invuln = 90; p.knock = 12;
  p.vx = (p.x + p.w / 2 < fromX ? -1 : 1) * 4.2; p.vy = -4;
  shake = 6;
  for (let k = 0; k < 10; k++) spawnParticle(p.x + 6, p.y + 10, (Math.random() - 0.5) * 5, -Math.random() * 4, 25, '#ff8a5c', 0.25);
  if (p.hp <= 0) killPlayer();
}
function killPlayer() {
  const p = player;
  p.dead = true; p.deathT = 60;
  for (let k = 0; k < 24; k++) spawnParticle(p.x + 6, p.y + 10, (Math.random() - 0.5) * 6, -Math.random() * 6, 40, '#f08c46', 0.3);
}
function respawn() {
  const cp = checkpoints[cpIndex];
  const hp = 3;
  player = makePlayer(cp.x, 0);
  player.hp = hp;
  // 체크포인트 위치에서 땅 위를 찾는다
  let y = 0;
  while (y < VH && !boxHits(player.x, y + 1, player.w, player.h)) y += 1;
  player.y = Math.min(y, VH - 40);
  player.invuln = 60;
}

function updatePlayer() {
  const p = player;
  if (p.dead) { if (--p.deathT <= 0) respawn(); return; }

  const left = keys.has('KeyA') || keys.has('ArrowLeft') || touch.left;
  const right = keys.has('KeyD') || keys.has('ArrowRight') || touch.right;
  const dir = (right ? 1 : 0) - (left ? 1 : 0);
  const inLiq = liquidInBox(p) > 6;

  const maxSp = 2.4 * (inLiq ? 0.5 : 1);
  const acc = p.onGround ? 0.55 : 0.3;
  if (p.knock > 0) p.knock--;
  else p.vx += clamp(dir * maxSp - p.vx, -acc, acc);

  if (p.onGround) p.coyote = 6; else if (p.coyote > 0) p.coyote--;
  if (jumpBuf > 0) jumpBuf--;
  if (jumpBuf > 0 && p.coyote > 0) {
    p.vy = -6.6 * (inLiq ? 0.75 : 1);
    jumpBuf = 0; p.coyote = 0; p.onGround = false;
    for (let k = 0; k < 5; k++) spawnParticle(p.x + 6, p.y + p.h, (Math.random() - 0.5) * 2, -Math.random(), 14, '#d9d4ff', 0.05);
  }
  const jumpHeld = JUMP_KEYS.some(k => keys.has(k)) || touch.jump;
  p.vy += GRAVITY * (p.vy < 0 && !jumpHeld ? 2.2 : 1);
  if (inLiq) p.vy = Math.min(p.vy, 2.5);
  p.vy = Math.min(p.vy, MAX_FALL);

  moveEntity(p, 8);

  // 발사
  const a = aimDir();
  p.aim = Math.atan2(a.y, a.x);
  if (p.fireCd > 0) p.fireCd--;
  if (p.recoil > 0) p.recoil--;
  if (mouse.down && p.fireCd === 0 && p.tank >= SHOT_COST && state === 'play') {
    const o = gunOrigin();
    blobs.push({ x: o.x + a.x * 10, y: o.y + a.y * 10, vx: a.x * BLOB_SPEED, vy: a.y * BLOB_SPEED, dead: false });
    p.tank -= SHOT_COST; p.fireCd = FIRE_CD; p.recoil = 4;
  }
  p.tank = Math.min(TANK_MAX, p.tank + TANK_REGEN);
  if (p.invuln > 0) p.invuln--;

  if (p.y > VH + 30) killPlayer();

  for (let k = cpIndex + 1; k < checkpoints.length; k++) {
    if (p.x > checkpoints[k].x - 8) {
      cpIndex = k; checkpoints[k].active = true;
      for (let q = 0; q < 12; q++) spawnParticle(checkpoints[k].x + 4, p.y, (Math.random() - 0.5) * 3, -Math.random() * 3, 30, '#7ff2dc', 0.1);
    }
  }
  if (p.x + p.w > goal.x && state === 'play') { state = 'win'; winTick = tick; }
}

// ─── 발사체 ──────────────────────────────────────────────────
function overlaps(px, py, e) { return px >= e.x && px < e.x + e.w && py >= e.y && py < e.y + e.h; }

function updateBlobs() {
  for (const b of blobs) {
    b.vy += BLOB_GRAV;
    const steps = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) / 2));
    for (let s = 0; s < steps && !b.dead; s++) {
      const nx = b.x + b.vx / steps, ny = b.y + b.vy / steps;
      if (nx < 0 || nx >= GW * CELL || ny >= VH) { b.dead = true; break; }
      for (const e of enemies) {
        if (!e.dead && overlaps(nx, ny, e)) { coatEnemy(e, nx, ny); b.dead = true; break; }
      }
      if (b.dead) break;
      if (ny >= 0) {
        const g = grid[Math.floor(ny / CELL) * GW + Math.floor(nx / CELL)];
        if (g !== EMPTY) { splat(b.x, b.y); b.dead = true; break; }
      }
      b.x = nx; b.y = ny;
    }
  }
  blobs = blobs.filter(b => !b.dead);
}

function updateOrbs() {
  for (const o of orbs) {
    o.life--;
    for (let s = 0; s < 2 && !o.dead; s++) {
      o.x += o.vx / 2; o.y += o.vy / 2;
      const cx = Math.floor(o.x / CELL), cy = Math.floor(o.y / CELL);
      if (o.life <= 0 || cx < 0 || cx >= GW || cy < 0 || cy >= GH) { o.dead = true; break; }
      if (grid[cy * GW + cx] !== EMPTY) {
        erode(o.x, o.y, 2);
        for (let k = 0; k < 5; k++) spawnParticle(o.x, o.y, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, 14, '#ff5d6c', 0);
        o.dead = true; break;
      }
      const p = player;
      if (!p.dead && overlaps(o.x, o.y, { x: p.x - 2, y: p.y - 2, w: p.w + 4, h: p.h + 4 })) {
        hurtPlayer(o.x); o.dead = true; break;
      }
    }
  }
  orbs = orbs.filter(o => !o.dead);
}

// ─── 적 ──────────────────────────────────────────────────────
function coatEnemy(e, x, y) {
  e.coat++; e.coatT = 240; e.flash = 6;
  for (let k = 0; k < 6; k++) spawnParticle(x, y, (Math.random() - 0.5) * 3, -Math.random() * 2, 16, '#9ef7e4', 0.2);
  if (e.coat >= 3) petrify(e);
}

function petrify(e) {
  e.dead = true;
  const x0 = Math.floor(e.x / CELL), x1 = Math.floor((e.x + e.w - 1) / CELL);
  const y0 = Math.floor(e.y / CELL), y1 = Math.floor((e.y + e.h - 1) / CELL);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      if (x < 0 || x >= GW || y < 0 || y >= GH) continue;
      if ((x === x0 || x === x1) && y === y0) continue; // 모서리를 둥글게
      const i = y * GW + x;
      if (grid[i] === EMPTY || grid[i] === LIQ) { grid[i] = SOLID; born[i] = tick; }
    }
  shake = 4;
  for (let k = 0; k < 18; k++) spawnParticle(e.x + e.w / 2, e.y + e.h / 2, (Math.random() - 0.5) * 5, -Math.random() * 4, 30, '#9ef7e4', 0.2);
}

function groundAhead(e) {
  const fx = e.dir > 0 ? e.x + e.w + 1 : e.x - 1;
  return isSolidAt(Math.floor(fx / CELL), Math.floor((e.y + e.h + 2) / CELL));
}

function updateEnemies() {
  const p = player;
  const pcx = p.x + p.w / 2;
  for (const e of enemies) {
    if (e.dead) continue;
    if (e.flash > 0) e.flash--;
    if (e.coatT > 0) e.coatT--;
    else if (e.coat > 0) { e.coat--; e.coatT = 240; }
    const slow = 1 - e.coat * 0.28;
    const ecx = e.x + e.w / 2;

    if (e.type === 'charger') {
      switch (e.state) {
        case 'patrol':
          if (e.hitWall || (e.onGround && !groundAhead(e))) e.dir *= -1;
          e.vx = e.dir * 0.7 * slow;
          if (!p.dead && Math.abs((p.y + p.h) - (e.y + e.h)) < 40 &&
              (pcx - ecx) * e.dir > 0 && Math.abs(pcx - ecx) < 200) { e.state = 'windup'; e.t = 28; }
          break;
        case 'windup':
          e.vx = 0;
          if (--e.t <= 0) { e.state = 'charge'; e.t = 90; }
          break;
        case 'charge':
          e.vx = e.dir * 3.6 * slow;
          if (e.hitWall) {
            const fx = e.dir > 0 ? e.x + e.w + 3 : e.x - 3;
            erode(fx, e.y + e.h / 2, 3);
            e.state = 'stun'; e.t = 100; shake = 7;
            for (let k = 0; k < 8; k++) spawnParticle(fx, e.y + 6, -e.dir * Math.random() * 3, -Math.random() * 3, 20, '#ffe08a', 0.15);
          } else if (--e.t <= 0) e.state = 'patrol';
          break;
        case 'stun':
          e.vx = 0;
          if (--e.t <= 0) e.state = 'patrol';
          break;
      }
      e.vy = Math.min(e.vy + GRAVITY, MAX_FALL);
      moveEntity(e, 4);
      if (e.y > VH + 40) e.dead = true;
      if (!p.dead && e.state !== 'stun' &&
          p.x < e.x + e.w && p.x + p.w > e.x && p.y < e.y + e.h && p.y + p.h > e.y) hurtPlayer(ecx);
    } else if (e.type === 'turret') {
      const dx = pcx - ecx, dy = (p.y + 10) - (e.y + 6);
      const dist = Math.hypot(dx, dy);
      if (!p.dead && dist < 380) {
        e.aim = Math.atan2(dy, dx);
        if (--e.t <= 0) {
          const sp = 2.6 * slow + 0.4;
          orbs.push({ x: ecx + Math.cos(e.aim) * 10, y: e.y + 6 + Math.sin(e.aim) * 10,
            vx: Math.cos(e.aim) * sp, vy: Math.sin(e.aim) * sp, life: 360, dead: false });
          e.t = 110;
        }
      }
    }
  }
}

// ─── 업데이트 ────────────────────────────────────────────────
function update() {
  tick++;
  if (state === 'play') {
    updatePlayer();
    updateEnemies();
    updateBlobs();
    updateOrbs();
  }
  updateLiquid();
  if (tick % 15 === 0) decaySolids();
  if (!player.dead) unstick(player);
  for (const e of enemies) if (!e.dead && e.type === 'charger') unstick(e);
  updateParticles();

  const target = player.x + player.w / 2 - VW / 2 + (mouse.x - VW / 2) * 0.15;
  camX += (target - camX) * 0.12;
  camX = clamp(camX, 0, GW * CELL - VW);
  if (shake > 0) shake *= 0.85;
  if (shake < 0.3) shake = 0;
}

// ─── 그리기 ──────────────────────────────────────────────────
const stars = Array.from({ length: 70 }, () => ({ x: Math.random() * 2400, y: Math.random() * 260, s: Math.random() < 0.2 ? 2 : 1 }));

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#171a35'); g.addColorStop(1, '#3a2c55');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = '#c9c4ff';
  for (const s of stars) {
    const x = ((s.x - camX * 0.05) % 2400 + 2400) % 2400;
    if (x < VW) ctx.fillRect(Math.round(x), s.y, s.s, s.s);
  }
  const layers = [
    { par: 0.15, base: 230, amp: 40, col: '#2a2449', f1: 140, f2: 53 },
    { par: 0.35, base: 170, amp: 30, col: '#251e3e', f1: 90, f2: 37 },
  ];
  for (const L of layers) {
    ctx.fillStyle = L.col;
    for (let x = 0; x < VW; x += 8) {
      const wx = x + camX * L.par;
      const h = L.base + Math.sin(wx / L.f1) * L.amp + Math.sin(wx / L.f2) * L.amp * 0.35;
      ctx.fillRect(x, VH - h, 8, h);
    }
  }
}

function drawTerrain() {
  for (let i = 0; i < N; i++) {
    const g = grid[i];
    if (g === EMPTY) { pix[i] = 0; continue; }
    const n = noise[i];
    if (g === ROCK) {
      const top = i >= GW && grid[i - GW] === EMPTY;
      const top2 = i >= 2 * GW && grid[i - GW] === ROCK && grid[i - 2 * GW] === EMPTY && n < 140;
      if (top) pix[i] = rgb(104, 160, 96);
      else if (top2) pix[i] = rgb(74, 122, 74);
      else { const v = n >> 5; pix[i] = rgb(44 + v, 38 + v, 60 + v); }
    } else if (g === LIQ) {
      const a = age[i];
      const t = Math.min(1, a / HARDEN_MIN);
      let r = lerp(150, 70, t), gg = lerp(255, 205, t), b = lerp(232, 205, t);
      if (a > HARDEN_MIN * 0.6 && ((tick + i * 7) & 15) === 0) { r = 220; gg = 255; b = 250; }
      pix[i] = rgb(r | 0, gg | 0, b | 0);
    } else {
      const x = i % GW, y = (i / GW) | 0;
      const edge = !filledAt(x, y - 1) || !filledAt(x - 1, y) || !filledAt(x + 1, y) || !filledAt(x, y + 1);
      const v = n >> 6;
      let r = 38 + v * 4, gg = 118 + v * 5, b = 128 + v * 4;
      if (edge) { r = 92; gg = 190; b = 192; }
      if (!filledAt(x, y - 1)) { r = 150; gg = 230; b = 224; }
      const left = SOLID_LIFE - (tick - born[i]);
      if (left < CRACK_WARN && (n % 4 === 0 || ((n + (tick >> 3)) % 9 === 0))) { r *= 0.45; gg *= 0.45; b *= 0.5; }
      pix[i] = rgb(r | 0, gg | 0, b | 0);
    }
  }
  tctx.putImageData(img, 0, 0);
  ctx.drawImage(terrainCanvas, -Math.round(camX), 0, GW * CELL, GH * CELL);
}

const TOUCH_SIGN = {
  'A/D 이동 · W/스페이스 점프': '◀ ▶ 버튼으로 이동 · 점프 버튼으로 점프',
  '마우스로 조준하고 클릭하면 액체를 쏴요': '화면을 누르면 그쪽으로 액체를 쏴요',
};
function drawSigns() {
  ctx.font = '13px "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
  ctx.textBaseline = 'top';
  for (const s of signs) {
    const x = Math.round(s.tx * TILE - camX), y = s.ty * TILE;
    if (x > VW || x < -420) continue;
    s.lines.forEach((line, k) => {
      if (touchMode && TOUCH_SIGN[line]) line = TOUCH_SIGN[line];
      ctx.fillStyle = '#0b0b18'; ctx.fillText(line, x + 1, y + k * 17 + 1);
      ctx.fillStyle = '#d6d2f5'; ctx.fillText(line, x, y + k * 17);
    });
  }
}

function drawFlags() {
  for (const cp of checkpoints) {
    const x = Math.round(cp.x - camX);
    let gy = 0;
    const cx = Math.floor((cp.x + 2) / CELL);
    while (gy < GH && !isSolidAt(cx, gy)) gy++;
    const y = gy * CELL;
    ctx.fillStyle = '#8a86a8'; ctx.fillRect(x, y - 28, 2, 28);
    ctx.fillStyle = cp.active ? '#7ff2dc' : '#544f72';
    ctx.fillRect(x + 2, y - 28, 10, 7);
  }
  const gx = Math.round(goal.x - camX), gy = 27 * TILE;
  ctx.fillStyle = '#d9d4ff'; ctx.fillRect(gx, gy - 56, 3, 56);
  const wave = Math.sin(tick / 8) * 2;
  ctx.fillStyle = '#ffd25e';
  ctx.fillRect(gx + 3, gy - 56 + wave * 0.5, 22, 7);
  ctx.fillRect(gx + 3, gy - 49 + wave * 0.5, 18 + wave, 7);
}

function drawPlayer() {
  const p = player;
  if (p.dead) return;
  if (p.invuln > 0 && (tick >> 2) & 1) return;
  const x = Math.round(p.x - camX), y = Math.round(p.y);
  const face = Math.cos(p.aim) >= 0 ? 1 : -1;
  ctx.fillStyle = '#2a1a2a'; ctx.fillRect(x - 1, y - 1, p.w + 2, p.h + 2);
  ctx.fillStyle = '#f08c46'; ctx.fillRect(x, y, p.w, p.h - 5);
  ctx.fillStyle = '#c65e2c'; ctx.fillRect(x, y + p.h - 5, p.w, 5);
  // 등에 멘 탱크: 남은 양만큼 차오른다
  const tx = face > 0 ? x - 5 : x + p.w + 1;
  ctx.fillStyle = '#20343a'; ctx.fillRect(tx, y + 4, 4, 12);
  const fill = Math.round(12 * p.tank / TANK_MAX);
  ctx.fillStyle = '#7ff2dc'; ctx.fillRect(tx, y + 16 - fill, 4, fill);
  // 눈
  ctx.fillStyle = '#fff'; ctx.fillRect(x + (face > 0 ? 7 : 3), y + 5, 2, 3);
  // 총
  const o = gunOrigin();
  ctx.save();
  ctx.translate(Math.round(o.x - camX), Math.round(o.y));
  ctx.rotate(p.aim);
  ctx.fillStyle = '#3a5560'; ctx.fillRect(-p.recoil * 0.5, -2, 12, 4);
  ctx.fillStyle = '#7ff2dc'; ctx.fillRect(10 - p.recoil * 0.5, -2, 3, 4);
  ctx.restore();
}

function drawEnemies() {
  for (const e of enemies) {
    if (e.dead) continue;
    let x = Math.round(e.x - camX), y = Math.round(e.y);
    if (x < -40 || x > VW + 40) continue;
    if (e.type === 'charger') {
      if (e.state === 'windup') x += (tick & 2) ? 1 : -1;
      ctx.fillStyle = '#1c0f18'; ctx.fillRect(x - 1, y - 1, e.w + 2, e.h + 2);
      ctx.fillStyle = e.flash ? '#ffffff' : e.state === 'charge' ? '#e04a62' : '#b04664';
      ctx.fillRect(x, y, e.w, e.h);
      ctx.fillStyle = '#e8d6a0';
      const hx = e.dir > 0 ? x + e.w - 2 : x - 3;
      ctx.fillRect(hx, y + 2, 5, 3); // 뿔
      ctx.fillStyle = '#fff';
      ctx.fillRect(e.dir > 0 ? x + e.w - 7 : x + 4, y + 5, 3, 3);
      ctx.fillStyle = '#5a2236'; ctx.fillRect(x + 2, y + e.h - 3, 4, 3); ctx.fillRect(x + e.w - 6, y + e.h - 3, 4, 3);
      if (e.state === 'stun') {
        for (let k = 0; k < 3; k++) {
          const ang = tick / 8 + k * 2.1;
          ctx.fillStyle = '#ffe08a';
          ctx.fillRect(x + e.w / 2 + Math.cos(ang) * 10, y - 6 + Math.sin(ang) * 3, 3, 3);
        }
      }
    } else {
      ctx.fillStyle = '#1c0f18'; ctx.fillRect(x - 1, y + 5, e.w + 2, e.h - 4);
      ctx.fillStyle = e.flash ? '#fff' : '#7a7196'; ctx.fillRect(x, y + 6, e.w, e.h - 6);
      ctx.save();
      ctx.translate(x + e.w / 2, y + 6); ctx.rotate(e.aim);
      ctx.fillStyle = '#4b4566'; ctx.fillRect(0, -2, 13, 4);
      ctx.restore();
      ctx.fillStyle = e.t < 24 && (tick & 4) ? '#ff5d6c' : '#a8344a';
      ctx.fillRect(x + e.w / 2 - 2, y + 9, 4, 4);
    }
    if (e.coat > 0) {
      const h = Math.round(e.h * e.coat / 3);
      ctx.fillStyle = 'rgba(126, 242, 220, 0.6)';
      ctx.fillRect(x, y + e.h - h, e.w, h);
    }
  }
}

function drawShots() {
  for (const b of blobs) {
    const x = Math.round(b.x - camX), y = Math.round(b.y);
    ctx.fillStyle = '#9ef7e4'; ctx.fillRect(x - 3, y - 3, 6, 6);
    ctx.fillStyle = '#e6fffb'; ctx.fillRect(x - 2, y - 2, 2, 2);
  }
  for (const o of orbs) {
    const x = Math.round(o.x - camX), y = Math.round(o.y);
    ctx.fillStyle = '#ff5d6c'; ctx.fillRect(x - 3, y - 3, 6, 6);
    ctx.fillStyle = '#ffd0d6'; ctx.fillRect(x - 1, y - 1, 2, 2);
  }
  for (const p of particles) {
    ctx.globalAlpha = Math.min(1, p.life / p.max * 1.5);
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x - camX), Math.round(p.y), 3, 3);
  }
  ctx.globalAlpha = 1;
}

function drawAimPreview() {
  const p = player;
  if (p.dead || state !== 'play') return;
  const a = aimDir(), o = gunOrigin();
  let x = o.x + a.x * 10, y = o.y + a.y * 10, vx = a.x * BLOB_SPEED, vy = a.y * BLOB_SPEED;
  ctx.fillStyle = 'rgba(158, 247, 228, 0.35)';
  for (let k = 0; k < 40; k++) {
    vy += BLOB_GRAV; x += vx; y += vy;
    if (y >= 0 && filledAt(Math.floor(x / CELL), Math.floor(y / CELL))) break;
    if (y > VH || x < 0 || x > GW * CELL) break;
    if (k % 2 === 1) ctx.fillRect(Math.round(x - camX) - 1, Math.round(y) - 1, 2, 2);
  }
}

function drawHud() {
  const p = player;
  ctx.fillStyle = 'rgba(10, 10, 24, 0.55)'; ctx.fillRect(12, 12, 210, 46);
  ctx.font = '12px "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#d6d2f5'; ctx.fillText('액체 탱크', 20, 17);
  ctx.fillStyle = '#20343a'; ctx.fillRect(84, 19, 128, 10);
  ctx.fillStyle = p.tank >= SHOT_COST ? '#7ff2dc' : '#c35b6a';
  ctx.fillRect(84, 19, Math.round(128 * p.tank / TANK_MAX), 10);
  ctx.fillStyle = '#d6d2f5'; ctx.fillText('체력', 20, 37);
  for (let k = 0; k < 3; k++) {
    ctx.fillStyle = k < p.hp ? '#ff6f7d' : '#3b2f45';
    ctx.fillRect(84 + k * 18, 39, 12, 10);
  }
  ctx.fillStyle = 'rgba(214, 210, 245, 0.6)';
  if (touchMode) {
    ctx.textAlign = 'center';
    ctx.fillText('화면을 누른 곳으로 액체를 쏴요 · 누르고 있으면 연사', VW / 2, VH - 22);
    ctx.textAlign = 'left';
    if (state !== 'win') drawTouchControls();
  } else {
    ctx.fillText('A/D 이동 · W/스페이스 점프 · 마우스 조준 · 클릭 발사 · R 처음부터', 14, VH - 22);
  }

  if (state === 'win') {
    ctx.fillStyle = 'rgba(8, 8, 20, 0.7)'; ctx.fillRect(0, 0, VW, VH);
    ctx.textAlign = 'center';
    ctx.font = 'bold 40px "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
    ctx.fillStyle = '#ffd25e'; ctx.fillText('클리어!', VW / 2, VH / 2 - 50);
    ctx.font = '16px "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
    ctx.fillStyle = '#d6d2f5';
    ctx.fillText(`걸린 시간 ${((winTick - startTick) / 60).toFixed(1)}초`, VW / 2, VH / 2 + 4);
    ctx.fillText(touchMode ? '화면을 누르면 처음부터 다시 해요' : 'R 키를 누르면 처음부터 다시 해요', VW / 2, VH / 2 + 30);
    ctx.textAlign = 'left';
  }
}

function render() {
  ctx.save();
  if (shake) ctx.translate(Math.round((Math.random() - 0.5) * shake), Math.round((Math.random() - 0.5) * shake));
  drawBackground();
  drawSigns();
  drawFlags();
  drawTerrain();
  drawEnemies();
  drawPlayer();
  drawShots();
  drawAimPreview();
  ctx.restore();
  drawHud();
  if (touchMode && innerHeight > innerWidth) {
    ctx.fillStyle = 'rgba(8, 8, 20, 0.85)'; ctx.fillRect(0, 0, VW, VH);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 36px "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
    ctx.fillStyle = '#d6d2f5'; ctx.fillText('휴대폰을 가로로 돌려주세요', VW / 2, VH / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }
}

// ─── 루프 ────────────────────────────────────────────────────
resetGame();
const STEP = 1000 / 60;
let acc = 0, last = performance.now();
function frame(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= STEP) { update(); acc -= STEP; }
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// 테스트용 창구
window.__game = {
  get player() { return player; }, get enemies() { return enemies; },
  get state() { return state; }, get camX() { return camX; },
  countCells(type) { let n = 0; for (let i = 0; i < N; i++) if (grid[i] === type) n++; return n; },
  step(n = 1) { for (let k = 0; k < n; k++) update(); render(); },
  CELL, TILE, LIQ, SOLID,
};
})();
