// ZzFX - Zuper Zmall Zound Zynth - Micro Edition (v1.4.0)
// MIT License - Copyright 2019 Frank Force
// https://github.com/KilledByAPixel/ZzFX
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
// associated documentation files (the "Software"), to deal in the Software without restriction,
// including without limitation the rights to use, copy, modify, merge, publish, distribute,
// sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions: The above copyright notice and this
// permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
//
// 이 파일은 원본 ZzFXMicro.js 의 샘플 생성 알고리즘을 TypeScript 로 옮긴 것이다.
// 달라진 점: ① 재생(AudioContext)과 샘플 생성을 분리했다(생성은 순수 함수라 테스트 가능).
// ② 무작위 함수를 주입할 수 있다. ③ 전역 볼륨(zzfxV)을 상수로 뺐다.

/** [음량, 무작위, 주파수, 어택, 서스테인, 릴리스, 파형, 파형곡률, 슬라이드, 델타슬라이드, 음높이 점프,
 *  점프 시각, 반복, 노이즈, 변조, 비트크러시, 딜레이, 서스테인 음량, 디케이, 트레몰로, 필터] */
export type ZzfxParams = number[];

export const ZZFX_SAMPLE_RATE = 44100;
/** 원본의 zzfxV. 실제 음량은 AudioBus 가 따로 조절한다. */
export const ZZFX_VOLUME = 0.3;

export function zzfxG(
  params: ZzfxParams,
  random: () => number = Math.random,
  sampleRate: number = ZZFX_SAMPLE_RATE,
): Float32Array {
  // 원본 ZzFX 의 구조분해 대입을 그대로 둔다(업스트림과 줄 단위로 대조하기 쉽게). 일부만 다시 대입된다.
  /* eslint-disable prefer-const */
  let [
    volume = 1,
    randomness = 0.05,
    frequency = 220,
    attack = 0,
    sustain = 0,
    release = 0.1,
    shape = 0,
    shapeCurve = 1,
    slide = 0,
    deltaSlide = 0,
    pitchJump = 0,
    pitchJumpTime = 0,
    repeatTime = 0,
    noise = 0,
    modulation = 0,
    bitCrush = 0,
    delay = 0,
    sustainVolume = 1,
    decay = 0,
    tremolo = 0,
    filter = 0,
  ] = params;
  /* eslint-enable prefer-const */

  const PI2 = Math.PI * 2;
  const abs = Math.abs;
  const sign = (v: number) => (v < 0 ? -1 : 1);
  const startSlide = (slide *= (500 * PI2) / sampleRate / sampleRate);
  let startFrequency = (frequency *=
    ((1 + randomness * 2 * random() - randomness) * PI2) / sampleRate);
  let modOffset = 0;
  let repeat = 0;
  let crush = 0;
  let jump = 1;
  const b: number[] = [];
  let t = 0;
  let i = 0;
  let s = 0;
  let f: number;

  // biquad 저역/고역 통과 필터
  const quality = 2;
  const w = (PI2 * abs(filter) * 2) / sampleRate;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / 2 / quality;
  const a0 = 1 + alpha;
  const a1 = (-2 * cos) / a0;
  const a2 = (1 - alpha) / a0;
  const b0 = (1 + sign(filter) * cos) / 2 / a0;
  const b1 = -(sign(filter) + cos) / a0;
  const b2 = b0;
  let x2 = 0;
  let x1 = 0;
  let y2 = 0;
  let y1 = 0;

  // 샘플레이트로 환산
  const minAttack = 9; // 어택이 0일 때 '팝' 소리 방지
  attack = attack * sampleRate || minAttack;
  decay *= sampleRate;
  sustain *= sampleRate;
  release *= sampleRate;
  delay *= sampleRate;
  deltaSlide *= (500 * PI2) / sampleRate ** 3;
  modulation *= PI2 / sampleRate;
  pitchJump *= PI2 / sampleRate;
  pitchJumpTime *= sampleRate;
  repeatTime = (repeatTime * sampleRate) | 0;
  volume *= ZZFX_VOLUME;

  // 파형 생성
  const length = (attack + decay + sustain + release + delay) | 0;
  for (; i < length; b[i++] = s * volume) {
    if (!(++crush % ((bitCrush * 100) | 0))) {
      s = shape
        ? shape > 1
          ? shape > 2
            ? shape > 3
              ? shape > 4
                ? +((t / PI2) % 1 < shapeCurve / 2) * 2 - 1 // 5 사각(듀티)
                : Math.sin(t ** 3) // 4 노이즈
              : Math.max(Math.min(Math.tan(t), 1), -1) // 3 탄젠트
            : 1 - (((((2 * t) / PI2) % 2) + 2) % 2) // 2 톱니
          : 1 - 4 * abs(Math.round(t / PI2) - t / PI2) // 1 삼각
        : Math.sin(t); // 0 사인

      s =
        (repeatTime ? 1 - tremolo + tremolo * Math.sin((PI2 * i) / repeatTime) : 1) *
        (shape > 4 ? s : sign(s) * abs(s) ** shapeCurve) *
        (i < attack
          ? i / attack
          : i < attack + decay
            ? 1 - ((i - attack) / decay) * (1 - sustainVolume)
            : i < attack + decay + sustain
              ? sustainVolume
              : i < length - delay
                ? ((length - i - delay) / release) * sustainVolume
                : 0);

      s = delay
        ? s / 2 +
          (delay > i
            ? 0
            : ((i < length - delay ? 1 : (length - i) / delay) * b[(i - delay) | 0]) / 2 / volume)
        : s;

      if (filter) s = y1 = b2 * x2 + b1 * (x2 = x1) + b0 * (x1 = s) - a2 * y2 - a1 * (y2 = y1);
    }

    f = (frequency += slide += deltaSlide) * Math.cos(modulation * modOffset++);
    t += f + f * noise * (((i * i * PI2) % 2) - 1);

    if (jump && ++jump > pitchJumpTime) {
      frequency += pitchJump;
      startFrequency += pitchJump;
      jump = 0;
    }

    if (repeatTime && !(++repeat % repeatTime)) {
      frequency = startFrequency;
      slide = startSlide;
      jump ||= 1;
    }
  }

  return Float32Array.from(b);
}
