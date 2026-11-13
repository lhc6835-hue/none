// 색은 ImageData와 같은 순서(ABGR)의 32비트 정수로 다룬다.
export const rgba = (r, g, b, a = 255) => (((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;
export const chR = c => c & 255;
export const chG = c => (c >>> 8) & 255;
export const chB = c => (c >>> 16) & 255;
export const chA = c => c >>> 24;

export function hex(s) {
  s = s.replace('#', '');
  if (s.length === 3) s = [...s].map(ch => ch + ch).join('');
  const n = parseInt(s, 16);
  return rgba((n >> 16) & 255, (n >> 8) & 255, n & 255);
}
export function mix(a, b, t) {
  return rgba(chR(a) + (chR(b) - chR(a)) * t, chG(a) + (chG(b) - chG(a)) * t, chB(a) + (chB(b) - chB(a)) * t);
}
export const css = c => `rgb(${chR(c)},${chG(c)},${chB(c)})`;
const ramp = (...hs) => hs.map(hex);

// 게임 전체 팔레트. 여기 없는 색은 쓰지 않는다.
export const PAL = {
  ink: hex('#120d1f'),
  white: hex('#fffaf0'),
  // 수액: 액체일 때 (어두움 → 밝음)
  sapL: ramp('#8a3a10', '#c25d16', '#ec8a1c', '#ffb436', '#ffd666', '#fff3c4'),
  // 호박: 굳었을 때
  sapS: ramp('#3d1608', '#6e2c0e', '#9c4a17', '#c87224', '#eba146', '#ffd98c', '#fff1c8'),
  grass: ramp('#1f4d45', '#2f6e4f', '#4a9a58', '#7cc463', '#b8ea86'),
  dirt: ramp('#2a1b33', '#382443', '#4a3150', '#5e405e'),
  stone: ramp('#16111f', '#211a31', '#2d2542', '#3b3254', '#4f456b', '#6a5f88'),
  flower: ramp('#ff8fb1', '#ffe08a', '#9fe0ff', '#f6f0ff'),
  rolly: ramp('#231d36', '#3f3659', '#5f557f', '#867ba9', '#b6acd6'),
  pod: ramp('#2a1434', '#4f2668', '#7a3d90', '#a75fb4', '#d69adc'),
  leaf: ramp('#17362d', '#245d47', '#3a875a', '#69b568'),
  moth: ramp('#38314f', '#5d5679', '#8a82a6', '#bdb6d4', '#ece8f6'),
  grub: ramp('#43354f', '#736181', '#a28cae', '#cfbed8', '#f1e8f4'),
  red: ramp('#4d1020', '#a1213a', '#ff4d5e', '#ffa0a8'),
  teal: ramp('#0f3f45', '#1c7c80', '#33b8a6', '#8be8d4'),
  brass: ramp('#5a3414', '#b97a2e', '#f4c86a', '#fff0b8'),
  cream: ramp('#7d6a58', '#bfa98a', '#efe3c8', '#fffaf0'),
  cloud: ramp('#6f6aa0', '#9b8fc0', '#cbb6d8', '#f2d9e4', '#fff3f4'),
  far: ramp('#3f4886', '#525d9b', '#6872ad', '#8e95c6', '#c6cbeb', '#eef0ff'),
  isle: ramp('#1f2552', '#283063', '#333c76', '#414b8a', '#56609e'),
  isleTop: ramp('#2a4f5c', '#3b6f6a', '#5a9476'),
  tree: ramp('#272c63', '#313873', '#3e4686', '#4d5698'),
  falls: ramp('#7f93d0', '#b4c4f2', '#e6eeff'),
  sky: ramp('#0a0c28', '#121640', '#1b2258', '#262f72', '#36438a', '#4b5ba0',
            '#6873b2', '#8b8bc0', '#b399c0', '#d7a6b6', '#efb8a8', '#f8d2a6'),
};
