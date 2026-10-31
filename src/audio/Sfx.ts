// 효과음 재생기 + 믹싱 규칙 (11문서 2절)
//  - 동시에 최대 12개. 넘치면 우선순위가 낮은 것부터 생략
//  - 같은 효과음은 40ms 안에 다시 재생하지 않는다
//  - 재생마다 음높이를 ±3% 흔든다
//  - 소리 생성은 시드 난수로 해서 언제나 같은 소리가 난다

import { Rng } from '../core/Rng';
import { SFX, type SfxDef, type SfxId } from '../data/sfx';
import type { AudioBus } from './AudioBus';
import { zzfxG, ZZFX_SAMPLE_RATE } from './zzfx';

export const MAX_VOICES = 12;
export const DEFAULT_COOLDOWN_MS = 40;
export const PITCH_JITTER = 0.03;

export interface SfxPlayOptions {
  pan?: number;
  gain?: number;
  /** 음높이 배율(콤보 음 등). 지터 위에 곱해진다. */
  pitch?: number;
}

/** 여러 음을 한 버퍼로 섞는다. */
export function renderSfx(id: SfxId): Float32Array {
  const def: SfxDef = SFX[id];
  const rng = new Rng(`sfx:${id}`);
  const parts = def.notes.map((n) => ({
    at: Math.round((n.at / 1000) * ZZFX_SAMPLE_RATE),
    data: zzfxG(n.params, () => rng.next()),
  }));
  const total = Math.max(...parts.map((p) => p.at + p.data.length));
  const out = new Float32Array(total);
  for (const p of parts) for (let i = 0; i < p.data.length; i++) out[p.at + i] += p.data[i];
  return out;
}

interface Voice {
  priority: number;
  source: AudioBufferSourceNode;
}

export class Sfx {
  private readonly cache = new Map<SfxId, Float32Array>();
  private readonly lastAt = new Map<SfxId, number>();
  private voices: Voice[] = [];
  private readonly jitter = new Rng('sfx-jitter');

  constructor(private readonly bus: AudioBus) {}

  /** 재생에 성공하면 true. 오디오가 아직 깨어나지 않았거나 믹싱 규칙에 막히면 false. */
  play(id: SfxId, opts: SfxPlayOptions = {}): boolean {
    if (!this.bus.ready) return false;
    const def: SfxDef = SFX[id];
    const now = this.bus.now;
    const last = this.lastAt.get(id);
    const cooldown = (def.cooldownMs ?? DEFAULT_COOLDOWN_MS) / 1000;
    if (last !== undefined && now - last < cooldown) return false;

    if (this.voices.length >= MAX_VOICES) {
      let lowest = 0;
      for (let i = 1; i < this.voices.length; i++) {
        if (this.voices[i].priority < this.voices[lowest].priority) lowest = i;
      }
      if (this.voices[lowest].priority >= def.priority) return false;
      this.voices[lowest].source.stop();
      this.voices.splice(lowest, 1);
    }

    let samples = this.cache.get(id);
    if (!samples) {
      samples = renderSfx(id);
      this.cache.set(id, samples);
    }
    const rate = (opts.pitch ?? 1) * (1 + this.jitter.range(-PITCH_JITTER, PITCH_JITTER));
    const source = this.bus.play(samples, { bus: 'sfx', pan: opts.pan, gain: opts.gain, rate });
    if (!source) return false;
    this.lastAt.set(id, now);
    const voice: Voice = { priority: def.priority, source };
    this.voices.push(voice);
    source.onended = () => {
      this.voices = this.voices.filter((v) => v !== voice);
    };
    return true;
  }

  get activeVoices(): number {
    return this.voices.length;
  }
}
