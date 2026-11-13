// 키보드·마우스·터치 입력. 조준 좌표는 내부 해상도(480x270) 기준.
import { VW, VH, SCALE } from './config.js';
import { unlockAudio } from './core/audio.js';

const JUMP_KEYS = ['KeyW', 'Space', 'ArrowUp'];
export const BTN = { // 화면 캔버스(960x540) 좌표
  left: { x: 74, y: VH * SCALE - 74, r: 46, label: '◀' },
  right: { x: 184, y: VH * SCALE - 74, r: 46, label: '▶' },
  jump: { x: VW * SCALE - 86, y: VH * SCALE - 86, r: 56, label: 'jump' },
  restart: { x: VW * SCALE - 40, y: 40, r: 26, label: 'restart' },
};

export function createInput(canvas) {
  const keys = new Set();
  const touch = { left: false, right: false, jump: false };
  const pointers = new Map();
  const I = {
    mx: VW / 2 + 60, my: VH / 2, mouseDown: false,
    touchMode: matchMedia('(pointer: coarse)').matches,
    jumpBuf: 0, pressed: false, restart: false,
    get left() { return keys.has('KeyA') || keys.has('ArrowLeft') || touch.left; },
    get right() { return keys.has('KeyD') || keys.has('ArrowRight') || touch.right; },
    get jumpHeld() { return JUMP_KEYS.some(k => keys.has(k)) || touch.jump; },
    get fire() { return I.mouseDown; },
    touch,
    jumpBuffered() { return I.jumpBuf > 0; },
    consumeJump() { I.jumpBuf = 0; },
    tick() { if (I.jumpBuf > 0) I.jumpBuf--; },
    takePressed() { const p = I.pressed; I.pressed = false; return p; },
    takeRestart() { const r = I.restart; I.restart = false; return r; },
  };

  const point = e => {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (VW * SCALE) / r.width, y: (e.clientY - r.top) * (VH * SCALE) / r.height };
  };
  addEventListener('keydown', e => {
    unlockAudio();
    if (JUMP_KEYS.includes(e.code) && !keys.has(e.code)) I.jumpBuf = 7;
    keys.add(e.code);
    if (e.code === 'KeyR') I.restart = true;
    I.pressed = true;
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => { keys.clear(); I.mouseDown = false; pointers.clear(); refresh(); });

  canvas.addEventListener('mousemove', e => { const p = point(e); I.mx = p.x / SCALE; I.my = p.y / SCALE; });
  canvas.addEventListener('mousedown', e => {
    unlockAudio();
    const p = point(e); I.mx = p.x / SCALE; I.my = p.y / SCALE;
    if (e.button === 0) I.mouseDown = true;
    I.pressed = true;
  });
  addEventListener('mouseup', e => { if (e.button === 0 && !I.touchMode) I.mouseDown = false; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  // 터치: 왼쪽 아래 ◀ ▶, 오른쪽 아래 점프, 나머지는 누른 곳으로 조준·발사
  function hit(p) {
    for (const name of ['jump', 'restart']) {
      const b = BTN[name];
      if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + 14) return name;
    }
    if (p.x < 245 && p.y > VH * SCALE - 160) return p.x < 129 ? 'left' : 'right';
    return 'aim';
  }
  function refresh() {
    touch.left = touch.right = touch.jump = false;
    let aiming = false;
    for (const ptr of pointers.values()) {
      if (ptr.role === 'aim') { aiming = true; I.mx = ptr.x / SCALE; I.my = ptr.y / SCALE; }
      else touch[ptr.role] = true;
    }
    if (I.touchMode) I.mouseDown = aiming;
  }
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    e.preventDefault(); unlockAudio();
    I.touchMode = true; I.pressed = true;
    canvas.setPointerCapture?.(e.pointerId);
    const p = point(e), role = hit(p);
    if (role === 'restart') { I.restart = true; return; }
    if (role === 'jump') I.jumpBuf = 7;
    pointers.set(e.pointerId, { role, x: p.x, y: p.y });
    refresh();
  }, { passive: false });
  canvas.addEventListener('pointermove', e => {
    const ptr = pointers.get(e.pointerId);
    if (!ptr) return;
    e.preventDefault();
    const p = point(e); ptr.x = p.x; ptr.y = p.y;
    if (ptr.role === 'left' || ptr.role === 'right') { const r = hit(p); if (r === 'left' || r === 'right') ptr.role = r; }
    refresh();
  }, { passive: false });
  const end = e => { if (pointers.delete(e.pointerId)) refresh(); };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  return I;
}
