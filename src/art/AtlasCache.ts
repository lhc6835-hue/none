// 지연 생성 + LRU 캐시 (02문서 7절 6 · 12문서 9절). 부팅 때는 필요한 것만 만들고, 처음 필요할 때 만들어 캐시한다.
// 텍스처는 종 · 단계 · 색변이 단위의 아틀라스(프레임이 가로로 이어짐)로 등록한다.
// 사용 중인 텍스처(pin)는 내보내지 않는다.

import type Phaser from 'phaser';
import type { Stage } from './bodies/Ctx';
import { PLANT_BASE_BY_ID } from '../data/plants';
import type { FamilyId, GradeId } from '../core/schema';
import { atlasCanvas, gridToCanvas } from './GridCanvas';
import { FRAME_NAMES, generatePlant, type PlantSprite } from './PlantSpriteGen';
import { generateSeed } from './SeedSpriteGen';

export interface PlantTexture {
  key: string;
  sprite: PlantSprite;
}

interface Entry {
  sprite?: PlantSprite;
  lastUsed: number;
  pins: number;
}

export class AtlasCache {
  private readonly entries = new Map<string, Entry>();
  private tick = 0;
  /** 지금까지 새로 만든 아틀라스 수(테스트 · 디버그용) */
  generated = 0;

  constructor(
    private readonly textures: Phaser.Textures.TextureManager,
    private readonly max = 320,
  ) {}

  static plantKey(id: string, stage: Stage, variant: boolean): string {
    return `plant:${id}:${stage}:${variant ? 'v' : 'n'}`;
  }

  /** 식물 한 단계의 프레임 아틀라스. 없으면 지금 만든다. */
  plant(id: string, stage: Stage, variant = false): PlantTexture {
    const key = AtlasCache.plantKey(id, stage, variant);
    const hit = this.entries.get(key);
    if (hit?.sprite && this.textures.exists(key)) {
      hit.lastUsed = ++this.tick;
      return { key, sprite: hit.sprite };
    }
    const base = PLANT_BASE_BY_ID.get(id);
    if (!base) throw new Error(`없는 식물: ${id}`);
    const sprite = generatePlant(base, stage, variant);
    const canvas = atlasCanvas(FRAME_NAMES.map((n) => sprite.frames[n].grid));
    if (this.textures.exists(key)) this.textures.remove(key);
    const tex = this.textures.addCanvas(key, canvas);
    if (!tex) throw new Error(`텍스처를 만들 수 없습니다: ${key}`);
    FRAME_NAMES.forEach((name, i) => tex.add(name, 0, i * sprite.w, 0, sprite.w, sprite.h));
    this.entries.set(key, { sprite, lastUsed: ++this.tick, pins: 0 });
    this.generated++;
    this.evict();
    return { key, sprite };
  }

  /** 씨앗(단계 0) 텍스처 */
  seed(family: FamilyId, grade: GradeId): string {
    const key = `seed:${family}:${grade}`;
    if (!this.textures.exists(key)) {
      this.textures.addCanvas(key, gridToCanvas(generateSeed(family, grade)));
      this.generated++;
    }
    return key;
  }

  pin(key: string): void {
    const e = this.entries.get(key);
    if (e) e.pins++;
  }

  unpin(key: string): void {
    const e = this.entries.get(key);
    if (e && e.pins > 0) e.pins--;
  }

  get size(): number {
    return this.entries.size;
  }

  /** 용량을 넘으면 가장 오래 안 쓴 것부터 해제한다(사용 중인 것은 제외) */
  private evict(): void {
    if (this.entries.size <= this.max) return;
    const victims = [...this.entries]
      .filter(([, e]) => e.pins === 0)
      .sort((a, b) => a[1].lastUsed - b[1].lastUsed);
    for (const [key] of victims) {
      if (this.entries.size <= this.max) break;
      this.entries.delete(key);
      if (this.textures.exists(key)) this.textures.remove(key);
    }
  }
}
