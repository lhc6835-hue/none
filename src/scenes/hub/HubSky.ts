// 허브의 하늘 · 날씨 · 낮밤 · 4겹 패럴랙스 (10문서 1절 2·31–33번).
// 하늘(0.2) · 먼 언덕(0.4) · 온실 본체(1.0) · 앞쪽 잎사귀(1.2). 실제 시각과 날짜 시드 날씨를 따른다.
// 알파 블렌딩 없이 팔레트 안의 색만 쓴다(밤은 한 단계 어두운 색으로 바꿔 굽는다).

import Phaser from 'phaser';
import {
  H,
  INT_OFF,
  SKY_W,
  cloudTexture,
  foregroundTexture,
  hillTexture,
  interiorTexture,
  moonTexture,
  phaseAt,
  skyTexture,
  sunTexture,
  weatherTextures,
  type DayPhase,
} from '../../art/HubArt';
import type { ParticleQuality } from '../../core/Settings';
import { Rng } from '../../core/Rng';
import type { Weather } from '../../systems/garden/Environment';

const DEPTH = {
  sky: 0,
  celestial: 1,
  clouds: 2,
  hills: 3,
  interior: 4,
  weather: 40,
  fg: 50,
} as const;

interface Drop {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
}

interface CloudSprite {
  img: Phaser.GameObjects.Image;
  speed: number;
}

export class HubSky {
  private phase: DayPhase = 'DAY';
  private weather: Weather = 'SUNNY';
  private readonly layers: Phaser.GameObjects.GameObject[] = [];
  private sky!: Phaser.GameObjects.Image;
  private hills!: Phaser.GameObjects.Image;
  private fg!: Phaser.GameObjects.Image;
  private interior!: Phaser.GameObjects.Image;
  private sun: Phaser.GameObjects.Image | undefined;
  private moon: Phaser.GameObjects.Image | undefined;
  private clouds: CloudSprite[] = [];
  private drops: Drop[] = [];
  private fog: Phaser.GameObjects.Image[] = [];
  private hour = 12;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly world: Phaser.GameObjects.Container,
    private readonly particles: () => ParticleQuality,
  ) {
    weatherTextures(scene);
  }

  get currentPhase(): DayPhase {
    return this.phase;
  }

  get currentWeather(): Weather {
    return this.weather;
  }

  get isNight(): boolean {
    return this.phase === 'NIGHT';
  }

  /** 시각(0–24)과 날씨로 모든 겹을 다시 만든다(바뀐 경우에만 부른다) */
  build(hour: number, weather: Weather): void {
    for (const o of this.layers) o.destroy();
    this.layers.length = 0;
    this.clouds = [];
    this.drops = [];
    this.fog = [];
    this.hour = hour;
    this.phase = phaseAt(hour);
    this.weather = weather;
    const scene = this.scene;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.layers.push(o);
      return o;
    };

    this.sky = add(
      scene.add
        .image(-80, 0, skyTexture(scene, this.phase, weather === 'RAINBOW'))
        .setOrigin(0, 0)
        .setDepth(DEPTH.sky),
    );
    // 해 · 달: 낮 06–20 시는 해가 호를 그리고, 밤에는 달이 뜬다
    this.sun = undefined;
    this.moon = undefined;
    const { x: cx, y: cy } = this.arc();
    if (this.phase === 'NIGHT') {
      this.moon = add(scene.add.image(cx, cy, moonTexture(scene)).setDepth(DEPTH.celestial));
    } else if (weather !== 'RAIN' && weather !== 'SNOW') {
      this.sun = add(scene.add.image(cx, cy, sunTexture(scene)).setDepth(DEPTH.celestial));
    }

    // 구름: 날씨에 따라 수 · 색
    const rng = new Rng(`hub-clouds-${weather}`);
    const heavy = weather === 'RAIN' || weather === 'SNOW' || weather === 'CLOUDY';
    const count = { SUNNY: 3, CLOUDY: 7, RAIN: 9, FOG: 4, SNOW: 7, RAINBOW: 3 }[weather];
    for (let i = 0; i < count; i++) {
      const kind = heavy && (weather !== 'CLOUDY' || i % 2 === 0) ? 'heavy' : 'light';
      const img = add(
        scene.add
          .image(rng.int(0, SKY_W), rng.int(20, 130), cloudTexture(scene, kind, i % 3))
          .setOrigin(0, 0)
          .setDepth(DEPTH.clouds),
      );
      this.clouds.push({ img, speed: 2 + rng.int(0, 5) });
    }

    this.hills = add(
      scene.add.image(-80, 0, hillTexture(scene, this.phase)).setOrigin(0, 0).setDepth(DEPTH.hills),
    );
    this.interior = scene.add
      .image(-INT_OFF, 0, interiorTexture(scene, this.phase))
      .setOrigin(0, 0);
    this.layers.push(this.interior);
    this.world.addAt(this.interior, 0);
    this.fg = add(
      scene.add
        .image(-80, 0, foregroundTexture(scene, this.phase))
        .setOrigin(0, 0)
        .setDepth(DEPTH.fg),
    );

    // 날씨 입자
    const q = this.particles();
    const scale = q === 'HIGH' ? 1 : q === 'MID' ? 0.6 : 0.3;
    if (weather === 'RAIN') {
      for (let i = 0; i < Math.round(80 * scale); i++) this.addDrop('hub:rain', rng, 90, 260, add);
    }
    // 눈 · 안개 입자는 화면 전체에 흰 점이 깔려 보여서 뺐다(구름 수로만 날씨를 표현)
  }

  private addDrop(
    tex: string,
    rng: Rng,
    vx: number,
    vy: number,
    add: <T extends Phaser.GameObjects.GameObject>(o: T) => T,
  ): void {
    const img = add(
      this.scene.add
        .image(rng.int(-80, 720), rng.int(0, H), tex)
        .setOrigin(0, 0)
        .setDepth(DEPTH.weather),
    );
    this.drops.push({
      img,
      vx: tex === 'hub:rain' ? -vx * 0.15 : rng.int(-10, 10),
      vy: vy * (0.8 + rng.next() * 0.4),
    });
  }

  /** 시각이나 날씨가 바뀌었으면 다시 만든다. 바뀌었는지 돌려준다. */
  sync(hour: number, weather: Weather): boolean {
    if (phaseAt(hour) === this.phase && weather === this.weather) {
      this.hour = hour;
      return false;
    }
    this.build(hour, weather);
    return true;
  }

  /** 패럴랙스: 월드 pan(px)에 따라 각 겹의 x 를 옮긴다 */
  setPan(px: number): void {
    this.sky.x = Math.round(-80 - px * 0.2);
    this.hills.x = Math.round(-80 - px * 0.4);
    this.fg.x = Math.round(-80 - px * 1.2);
  }

  update(timeMs: number, deltaMs: number, px: number): void {
    const dt = deltaMs / 1000;
    const sx = Math.round(-80 - px * 0.2);
    const place = (o: Phaser.GameObjects.Image | undefined, tx: number, ty: number) => {
      if (o) o.setPosition(Math.round(sx + tx), Math.round(ty));
    };
    // 해 · 달은 계산 좌표(호)를 매번 하늘 오프셋에 얹는다
    const arc = this.arc();
    place(this.sun, arc.x, arc.y);
    place(this.moon, arc.x, arc.y);
    for (const c of this.clouds) {
      const bx = (c.img.getData('cx') as number | undefined) ?? c.img.x - sx;
      const nx = (bx + c.speed * dt) % (SKY_W + 80);
      c.img.setData('cx', nx);
      c.img.setPosition(Math.round(sx + nx - 40), c.img.y);
    }
    for (const d of this.drops) {
      d.img.x += d.vx * dt;
      d.img.y += d.vy * dt;
      if (d.img.y > H) {
        d.img.y = -6;
        d.img.x = Phaser.Math.Between(-80, 720);
      }
      if (d.img.x < -90) d.img.x = 720;
      if (d.img.x > 725) d.img.x = -80;
      if (d.img.texture.key === 'hub:snow') d.img.x += Math.sin(timeMs / 600 + d.img.y / 20) * 0.15;
      d.img.setPosition(Math.round(d.img.x), Math.round(d.img.y));
    }
    this.fog.forEach((f, i) => {
      f.x = Math.round(-80 + i * 800 - ((timeMs / 120) % 800));
    });
  }

  /** 해 · 달 호 좌표(하늘 텍스처 기준) */
  private arc(): { x: number; y: number } {
    const hour = this.hour;
    const night = this.phase === 'NIGHT';
    const t = night ? ((hour + 4) % 24) / 9 : Math.min(1, Math.max(0, (hour - 5) / 15));
    return {
      x: 120 + Math.min(1, Math.max(0, t)) * 760,
      y: 160 - Math.sin(Math.min(1, Math.max(0, t)) * Math.PI) * 120,
    };
  }

  destroy(): void {
    for (const o of this.layers) o.destroy();
    this.layers.length = 0;
  }
}
