// 전투 시뮬레이션 (06 · 12문서): 1/60초 고정 간격, 난수는 (스테이지 · 난이도 · 시도) 로 만든 RNG 만 쓴다.
// 같은 입력이면 같은 결과이고, 화면(BattleScene)은 이 상태를 읽어 그리기만 한다. Phaser 를 import 하지 않는다.

import { Rng } from '../../core/Rng';
import { DIFFICULTY, type DifficultyDef, type DifficultyId } from '../../data/battle/difficulty';
import type { StageDef } from '../../data/battle/stages';
import type { WaveGroup } from '../../data/battle/waves';
import type { DmgType } from '../../data/battle/types';
import { fieldTick, towerAttack } from './Attacks';
import { bloomTick } from './Bloom';
import { dealDamage, dotDamage } from './Damage';
import { enemyAI, spawnBossAdds } from './EnemyAI';
import { type GameMap, type Route, parseMap, posAt } from './Paths';
import { specialTick } from './SpecialHooks';
import { speedOf, tickStatus } from './Status';
import { toolTick, useTool as useToolImpl } from './GardenTools';
import { computeStats, familyOf, traitSum } from './Towers';
import {
  tk,
  TPS,
  type Enemy,
  type Field,
  type Loadout,
  type Phase,
  type PlaceResult,
  type Projectile,
  type SimEvent,
  type Summon,
  type TargetMode,
  type Tower,
} from './types';
import * as commands from './Commands';
import * as spawns from './Spawns';
import * as waveFlow from './WaveFlow';
import * as auras from './Auras';
import * as summary from './Summary';

export interface SimOptions {
  stage: StageDef;
  difficulty: DifficultyId;
  deck: Loadout[];
  seed?: string;
  attempt?: number;
  /** 화면이 없는 시뮬레이터는 이벤트를 쌓지 않는다 */
  recordEvents?: boolean;
  /** 정원사 도구 장착(슬롯 2칸) */
  tools?: string[];
}

export interface BattleResult {
  won: boolean;
  stars: 1 | 2 | 3;
  heartsLeft: number;
  maxHearts: number;
  seconds: number;
  kills: number;
  leaked: number;
  mvp: number | null;
  towers: { speciesId: string; dealt: number; support: number; kills: number; id: number }[];
}

export class BattleSim {
  readonly map: GameMap;
  readonly stage: StageDef;
  readonly diff: DifficultyDef;
  readonly rng: Rng;
  readonly deck: Loadout[];
  readonly toolIds: string[];
  tick = 0;
  phase: Phase = 'PREP';
  hearts: number;
  maxHearts: number;
  nutrient: number;
  enemies: Enemy[] = [];
  towers: Tower[] = [];
  projectiles: Projectile[] = [];
  fields: Field[] = [];
  summons: Summon[] = [];
  events: SimEvent[] = [];
  /** 웨이브 번호(1부터). 0 = 아직 시작 전 */
  wave = 0;
  totalWaves: number;
  kills = 0;
  leaked = 0;
  /** 출구까지 걸린 하트 손실 기록(패배 원인 팁) */
  leakBy: Record<string, number> = {};
  toolCd: number[] = [0, 0];
  nextUid = 1;
  nextTowerId = 1;
  spawnQueue: { at: number; e: string; entrance: number; wave: number; elite: boolean }[] = [];
  countdown: number;
  /** 웨이브별 남은 적 수(웨이브 클리어 보너스) */
  alivePerWave = new Map<number, number>();
  spawnedPerWave = new Map<number, number>();
  plannedPerWave = new Map<number, number>();
  placedCount = new Map<string, number>();
  firstPlaced = new Set<string>();
  synergyCache = new Map<string, number>();
  synergyDirty = true;
  readonly record: boolean;
  /** 개화기 · 시간정지 등으로 게임 시간이 멈춘 틱 수 */
  freeze = 0;
  /** 시너지 단계 변화 감지 */
  lastTier = new Map<string, number>();
  /** 사용자가 지금 부르기를 눌렀는가 */
  waveCalled = false;
  delayed: { at: number; fn: () => void }[] = [];

  constructor(opts: SimOptions) {
    this.stage = opts.stage;
    this.diff = DIFFICULTY[opts.difficulty];
    this.map = parseMap(opts.stage.map);
    this.rng = new Rng(
      `battle:${opts.stage.id}:${opts.difficulty}:${opts.seed ?? ''}:${opts.attempt ?? 0}`,
    );
    this.deck = opts.deck;
    this.toolIds = opts.tools ?? ['SHOWER', 'SHOVEL'];
    this.record = opts.recordEvents ?? true;
    this.maxHearts = this.diff.hearts;
    this.hearts = this.maxHearts;
    this.nutrient = opts.stage.startNutrient;
    const base = opts.stage.waves.length;
    this.totalWaves = opts.stage.boss ? base : Math.max(1, base + this.diff.extraWaves);
    this.countdown = tk(opts.stage.prepTime);
  }

  // ===== 도우미 =====
  emit(ev: SimEvent): void {
    if (this.record && this.events.length < 6000) this.events.push(ev);
  }

  get time(): number {
    return this.tick / TPS;
  }

  towerById(id: number): Tower | null {
    return this.towers.find((t) => t.id === id) ?? null;
  }

  enemyByUid(uid: number): Enemy | null {
    return this.enemies.find((e) => e.uid === uid && e.alive) ?? null;
  }

  /** 계열 시너지 단계 0–3 (필드에 있는 같은 계열의 서로 다른 종 수 → 2 · 4 · 6종) */
  synergyTier(family: string): number {
    if (this.synergyDirty) this.recountSynergy();
    return this.synergyCache.get(family) ?? 0;
  }

  recountSynergy(): void {
    const sets = new Map<string, Set<string>>();
    for (const t of this.towers) {
      const f = familyOf(t.spec.id);
      if (!sets.has(f)) sets.set(f, new Set());
      sets.get(f)!.add(t.spec.id);
    }
    this.synergyCache.clear();
    for (const [f, set] of sets) {
      let n = set.size;
      for (const t of this.towers)
        if (familyOf(t.spec.id) === f && traitSum(t.load, 'extraSynergy') > 0) n += 1;
      const tier = n >= 6 ? 3 : n >= 4 ? 2 : n >= 2 ? 1 : 0;
      this.synergyCache.set(f, tier);
      if (tier !== (this.lastTier.get(f) ?? 0)) {
        if (tier > (this.lastTier.get(f) ?? 0)) this.emit({ t: 'synergy', family: f, tier });
        this.lastTier.set(f, tier);
      }
    }
    for (const f of [...this.lastTier.keys()]) if (!sets.has(f)) this.lastTier.set(f, 0);
    this.synergyDirty = false;
    for (const t of this.towers) this.refreshStats(t);
  }

  refreshStats(t: Tower): void {
    t.stats = computeStats(t, this.map.tiles[t.ty][t.tx], (f) => this.synergyTier(f));
  }

  /** 아군 오라 · 임시 버프를 합친 유효 능력치 */
  eff(t: Tower): { interval: number; range: number; dmg: number; crit: number } {
    let aspd = (t.aux.aAspd ?? 0) + (t.bloomLeft > 0 ? (t.aux.bloomAspd ?? 0) : 0);
    let range = t.aux.aRange ?? 0;
    let dmg = t.aux.aDmg ?? 0;
    let crit = t.aux.aCrit ?? 0;
    for (const b of t.buffs) {
      if (b.until > this.tick) {
        aspd += b.aspd;
        range += b.range;
        dmg += b.dmg;
        crit += b.crit;
      }
    }
    t.buffs = t.buffs.filter((b) => b.until > this.tick);
    return {
      interval: t.stats.interval / Math.max(0.2, 1 + aspd),
      range: t.stats.range * (1 + range) + (t.aux.rangeAdd ?? 0),
      dmg: 1 + dmg,
      crit: t.stats.crit + crit,
    };
  }

  critBonus(t: Tower): number {
    return (t.aux.aCrit ?? 0) + t.buffs.reduce((s, b) => (b.until > this.tick ? s + b.crit : s), 0);
  }

  /** 독 · 화상 피해 증폭(달그림자 영지 · 화로 연꽃의 오라) */
  dotAmp(e: Enemy, type: DmgType): number {
    let m = 1;
    for (const t of this.towers) {
      if (t.down > 0) continue;
      if (
        t.spec.id === 'P028' &&
        (type === 'POISON' || type === 'FIRE') &&
        Math.hypot(t.x - e.x, t.y - e.y) <= this.eff(t).range
      ) {
        m *= (t.spec.p?.dotMul ?? 1.2) * (t.bloomLeft > 0 ? (t.aux.dotMulBloom ?? 1) : 1);
      }
      if (
        t.spec.id === 'P056' &&
        type === 'FIRE' &&
        Math.hypot(t.x - e.x, t.y - e.y) <= this.eff(t).range
      )
        m *= 1.1;
    }
    return m;
  }

  dot(e: Enemy, amount: number, type: DmgType): void {
    dotDamage(this, e, amount, type);
  }

  /** 반경 안의 (살아 있고 맞힐 수 있는) 적 */
  enemiesNear(
    x: number,
    y: number,
    r: number,
    o: { air?: boolean; ground?: boolean; hidden?: boolean } = {},
  ): Enemy[] {
    const out: Enemy[] = [];
    const r2 = r * r;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      if (dx * dx + dy * dy > r2) continue;
      if (o.air === false && e.flying) continue;
      if (o.ground === false && !e.flying) continue;
      if (e.stealth && e.revealed <= this.tick && !o.hidden) continue;
      out.push(e);
    }
    return out;
  }

  addProjectile(p: Omit<Projectile, 'id'>): Projectile {
    const proj = { ...p, id: this.nextUid++ };
    this.projectiles.push(proj);
    return proj;
  }

  addField(f: Omit<Field, 'id'>): Field {
    const field = { ...f, id: this.nextUid++ };
    this.fields.push(field);
    return field;
  }

  addSummon(s: Omit<Summon, 'id'>): Summon {
    const sm = { ...s, id: this.nextUid++ };
    this.summons.push(sm);
    return sm;
  }

  // ===== 웨이브 · 적 =====
  // ===== 배치 · 강화 · 회수 =====
  get secondsToNextWave(): number {
    return Number.isFinite(this.countdown) ? Math.max(0, this.countdown / TPS) : 0;
  }

  /** 몇 초 뒤에 실행할 일(운석 · 별자리 등). 같은 입력이면 같은 틱에 실행된다 */
  after(sec: number, fn: () => void): void {
    this.delayed.push({ at: this.tick + tk(sec), fn });
  }

  runDelayed(): void {
    if (!this.delayed.length) return;
    const due = this.delayed.filter((d) => d.at <= this.tick);
    if (!due.length) return;
    this.delayed = this.delayed.filter((d) => d.at > this.tick);
    for (const d of due) d.fn();
  }

  useTool(slot: number, x: number, y: number): boolean {
    return useToolImpl(this, slot, x, y);
  }

  // ===== 한 틱 =====
  step(): void {
    if (this.phase === 'WON' || this.phase === 'LOST') return;
    if (this.freeze > 0) {
      this.freeze--;
      return;
    }
    this.tick++;
    if (this.phase === 'PREP' && this.wave === 0 && this.countdown <= 0) this.phase = 'RUNNING';
    // 웨이브 시작 · 카운트다운
    if (this.phase === 'PREP') {
      this.countdown--;
      if (this.countdown <= 0) {
        this.phase = 'RUNNING';
        this.startWave();
      }
    } else if (Number.isFinite(this.countdown)) {
      this.countdown--;
      if (this.countdown <= 0 && this.wave < this.totalWaves) this.startWave();
    }
    // 출현
    while (this.spawnQueue.length && this.spawnQueue[0].at <= this.tick) {
      const q = this.spawnQueue.shift()!;
      this.spawnEnemy(q.e, q.entrance, q.wave, { elite: q.elite });
      this.spawnedPerWave.set(q.wave, (this.spawnedPerWave.get(q.wave) ?? 0) + 1);
    }
    // 양분 자연 증가: 3초마다 +4
    if (this.tick % tk(3) === 0) this.nutrient += 4;

    this.auraPass();
    for (const e of this.enemies) {
      if (!e.alive) continue;
      tickStatus(this, e);
      if (!e.alive) continue;
      enemyAI(this, e);
      if (!e.alive) continue;
      this.move(e);
    }
    for (const t of this.towers) {
      if (t.down > 0) {
        t.down--;
        if (t.down === 0) {
          t.hp = t.maxHp * 0.5;
          this.emit({ t: 'up', tower: t.id });
        }
        continue;
      }
      bloomTick(this, t);
      specialTick(this, t);
      towerAttack(this, t);
    }
    fieldTick(this);
    toolTick(this);
    this.enemies = this.enemies.filter((e) => e.alive || this.tick - e.hitTick < 3);
    this.enemies = this.enemies.filter((e) => e.alive);
    this.afterWave();
    if (this.hearts <= 0) {
      this.phase = 'LOST';
      this.emit({ t: 'end', won: false });
    }
  }

  move(e: Enemy): void {
    const sp = speedOf(this, e);
    const route = this.routeOf(e);
    e.s += sp / TPS;
    if (e.s < 0) e.s = 0;
    if (e.s >= route.length) {
      this.leak(e);
      return;
    }
    const p = posAt(route, e.s);
    e.x = p.x;
    e.y = p.y;
    // 은신 감지(빛 계열 사거리 안 · 바로 옆 칸)
    if (e.stealth) {
      for (const t of this.towers) {
        if (t.down > 0) continue;
        const r = t.spec.flags?.includes('DETECT')
          ? (t.spec.p?.detectAll ? 99 : this.eff(t).range) +
            (familyOf(t.spec.id) === 'LUMEN' && this.synergyTier('LUMEN') >= 2 ? 1 : 0)
          : 1.2;
        if (Math.hypot(t.x - e.x, t.y - e.y) <= r) e.revealed = this.tick + tk(1.5);
      }
    }
  }

  // ===== 결과 =====
  hurt(
    e: Enemy,
    amount: number,
    src: Tower | null,
    type: DmgType,
    o: { area?: boolean; ignoreArmor?: boolean; shatter?: number; crit?: boolean } = {},
  ): number {
    return dealDamage(this, e, amount, src, { type, ...o });
  }

  spawnAdds(e: Enemy, id: string, n: number): void {
    spawnBossAdds(this, e, id, n);
  }

  // ---- 길어진 부분은 하위 모듈이 맡는다 ----
  waveGroups(w: number): WaveGroup[] {
    return waveFlow.waveGroups(this, w);
  }
  startWave(): void {
    waveFlow.startWave(this);
  }
  afterWave(): void {
    waveFlow.afterWave(this);
  }
  auraPass(): void {
    auras.auraPass(this);
  }
  result(): BattleResult {
    return summary.result(this);
  }

  // ---- 길어진 부분은 하위 모듈이 맡는다 ----
  sameCount(speciesId: string): number {
    return commands.sameCount(this, speciesId);
  }
  placeCost(deckIndex: number): number {
    return commands.placeCost(this, deckIndex);
  }
  place(deckIndex: number, tx: number, ty: number): PlaceResult {
    return commands.place(this, deckIndex, tx, ty);
  }
  upgrade(id: number, branch?: 'A' | 'B'): boolean {
    return commands.upgrade(this, id, branch);
  }
  sell(id: number): number {
    return commands.sell(this, id);
  }
  setTarget(id: number, mode: TargetMode): void {
    commands.setTarget(this, id, mode);
  }
  toggleManualBloom(id: number): void {
    commands.toggleManualBloom(this, id);
  }
  fireBloom(id: number): boolean {
    return commands.fireBloom(this, id);
  }
  callWave(): boolean {
    return commands.callWave(this);
  }
  spawnEnemy(
    id: string,
    entrance: number,
    wave: number,
    opts: { elite?: boolean; s?: number; flyingRoute?: boolean } = {},
  ): Enemy {
    return spawns.spawnEnemy(this, id, entrance, wave, opts);
  }
  routeOf(e: Enemy): Route {
    return spawns.routeOf(this, e);
  }
  placeOnRoute(e: Enemy): void {
    spawns.placeOnRoute(this, e);
  }
  setFlying(e: Enemy, flying: boolean): void {
    spawns.setFlying(this, e, flying);
  }
  kill(e: Enemy, src: Tower | null): void {
    spawns.kill(this, e, src);
  }
  leak(e: Enemy): void {
    spawns.leak(this, e);
  }
}
