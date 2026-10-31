// 오디오 버스 (11문서 1절)
//
//   [효과음] ─┐
//   [콧노래] ─┼─▶ SFX 버스(압축) ─┐
//   [배경음] ──▶ BGM 버스(저역통과 4.5kHz) ─┼─▶ 마스터(리미터) ─▶ 출력
//
// - 첫 입력(탭 · 클릭 · 키)에서 AudioContext 를 깨운다(브라우저 자동재생 정책).
// - 탭을 벗어나면 음소거, 돌아오면 0.5초에 걸쳐 원래 음량.
// - 음량 4종(전체 · 배경음 · 효과음 · 식물 콧노래)이 각 버스에 바로 반영된다.

import type { Settings } from '../core/Settings';
import { ZZFX_SAMPLE_RATE } from './zzfx';

export type BusId = 'sfx' | 'music' | 'hum';

export interface PlayOptions {
  bus?: BusId;
  /** 0–1 곱하기 음량 */
  gain?: number;
  /** -1(왼쪽) ~ +1(오른쪽) */
  pan?: number;
  /** 재생 속도(음높이). 1 = 그대로 */
  rate?: number;
}

const FADE_IN_SEC = 0.5;

export class AudioBus {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buses: Partial<Record<BusId, GainNode>> = {};
  private volumes: Settings['volume'] = { master: 0.8, music: 0.7, sfx: 0.9, hum: 0.8 };
  private hiddenMute = false;
  private onUnlock: (() => void) | undefined;

  /** 첫 입력에서 불린다. 이미 깨어 있으면 아무것도 하지 않는다. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor({ sampleRate: ZZFX_SAMPLE_RATE, latencyHint: 'interactive' });
    this.ctx = ctx;

    // 마스터: 리미터
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.1;
    const master = ctx.createGain();
    master.connect(limiter).connect(ctx.destination);
    this.master = master;

    // SFX 버스: 압축
    const sfxIn = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    sfxIn.connect(comp).connect(master);
    // 콧노래는 SFX 압축기를 같이 쓰되 음량은 따로 둔다.
    const humIn = ctx.createGain();
    humIn.connect(comp);
    // BGM 버스: 저역통과 4.5kHz
    const musicIn = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 4500;
    musicIn.connect(lp).connect(master);

    this.buses = { sfx: sfxIn, hum: humIn, music: musicIn };
    this.applyVolumes();
    this.onUnlock?.();
  }

  get ready(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  /** 컨텍스트 시각(초). 같은 소리 쿨다운 계산용. 깨어 있지 않으면 0. */
  get now(): number {
    return this.ctx?.currentTime ?? 0;
  }

  setUnlockListener(fn: () => void): void {
    this.onUnlock = fn;
  }

  setVolumes(v: Settings['volume']): void {
    this.volumes = { ...v };
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.hiddenMute ? 0 : this.volumes.master, t, 0.02);
    this.buses.sfx?.gain.setTargetAtTime(this.volumes.sfx, t, 0.02);
    this.buses.music?.gain.setTargetAtTime(this.volumes.music, t, 0.02);
    this.buses.hum?.gain.setTargetAtTime(this.volumes.hum, t, 0.02);
  }

  /** 탭이 숨겨지면 음소거, 돌아오면 0.5초에 걸쳐 복귀. */
  setHidden(hidden: boolean): void {
    this.hiddenMute = hidden;
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    if (hidden) {
      this.master.gain.setValueAtTime(0, t);
    } else {
      this.master.gain.setValueAtTime(0, t);
      this.master.gain.linearRampToValueAtTime(this.volumes.master, t + FADE_IN_SEC);
    }
  }

  /** ZzFX 샘플을 재생한다. 아직 깨어 있지 않으면 조용히 무시한다. */
  play(samples: Float32Array, opts: PlayOptions = {}): AudioBufferSourceNode | null {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return null;
    const bus = this.buses[opts.bus ?? 'sfx'];
    if (!bus) return null;

    const buffer = ctx.createBuffer(1, samples.length, ZZFX_SAMPLE_RATE);
    buffer.getChannelData(0).set(samples);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = opts.rate ?? 1;

    let node: AudioNode = source;
    if (opts.gain !== undefined && opts.gain !== 1) {
      const g = ctx.createGain();
      g.gain.value = opts.gain;
      node.connect(g);
      node = g;
    }
    if (opts.pan) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, opts.pan));
      node.connect(p);
      node = p;
    }
    node.connect(bus);
    source.start();
    return source;
  }
}
