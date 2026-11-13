// 상자 몸체의 이동과 충돌. 1px씩 밀어 보며 막히면 멈추고, 낮은 턱은 올라탄다.
export function moveBody(e, terrain, stepUp) {
  e.hitWall = false;
  let rem = Math.abs(e.vx);
  const sx = Math.sign(e.vx);
  while (rem > 0) {
    const s = Math.min(1, rem) * sx; rem -= 1;
    if (!terrain.boxHits(e.x + s, e.y, e.w, e.h)) { e.x += s; continue; }
    let stepped = false;
    if (e.onGround) {
      for (let u = 1; u <= stepUp; u++)
        if (!terrain.boxHits(e.x + s, e.y - u, e.w, e.h)) { e.x += s; e.y -= u; stepped = true; break; }
    }
    if (!stepped) { e.hitWall = true; e.vx = 0; break; }
  }
  const wasGround = e.onGround;
  e.onGround = false;
  e.landed = 0;
  rem = Math.abs(e.vy);
  const sy = Math.sign(e.vy);
  while (rem > 0) {
    const s = Math.min(1, rem) * sy; rem -= 1;
    if (!terrain.boxHits(e.x, e.y + s, e.w, e.h)) { e.y += s; continue; }
    if (sy > 0) { e.onGround = true; if (!wasGround) e.landed = e.vy; }
    else e.bonk = true;
    e.vy = 0; break;
  }
  if (!e.onGround && e.vy >= 0 && terrain.boxHits(e.x, e.y + 1, e.w, e.h)) e.onGround = true;
}

// 굳은 호박에 몸이 박히면 위로 빼낸다
export function unstick(e, terrain) {
  if (!terrain.boxHits(e.x, e.y, e.w, e.h)) return;
  for (let u = 1; u <= 30; u++)
    if (!terrain.boxHits(e.x, e.y - u, e.w, e.h)) { e.y -= u; return; }
}

export const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
