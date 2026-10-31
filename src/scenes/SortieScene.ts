// 출격 준비 화면 (06문서 2절 · 08문서 5절): 챕터 지도에서 스테이지를 고르고, 난이도 · 덱 · 정원사 도구를 정한 뒤 나간다.

import Phaser from 'phaser';
import { enemyTexture } from '../art/EnemyArt';
import { PixelCanvas } from '../art/PixelCanvas';
import { RAMPS, SPECIAL } from '../art/palette';
import type { GameState } from '../core/GameState';
import { DIFFICULTY, DIFFICULTY_ORDER, type DifficultyId } from '../data/battle/difficulty';
import { ENEMIES } from '../data/battle/enemies';
import { STAGES } from '../data/battle/stages';
import { t } from '../i18n';
import { plantDisplayName } from '../i18n/names';
import { GARDEN_TOOLS } from '../systems/battle/GardenTools';
import { deckSlots } from '../systems/battle/Loadouts';
import { enemiesOf, recommendDeck, tagsOf } from '../systems/battle/Recommend';
import { stageUnlocked } from '../systems/battle/Rewards';
import { Button } from '../ui/Button';
import { ensurePanel } from '../ui/Frames';
import { iconTexture } from '../ui/IconTex';
import { applySafeArea, setBackdrop } from '../ui/Layout';
import { pixelText } from '../ui/PixelText';
import { getApp } from './context';
import * as deckBar from './sortie/DeckBar';
import { candidates, deckPickerModal } from './sortie/DeckPicker';
import { overlay } from './UIOverlay';

const NODES: [number, number][] = [
  [34, 150],
  [84, 98],
  [138, 150],
  [190, 92],
  [236, 144],
  [262, 62],
];
const MAP_X = 8;
const MAP_Y = 30;
const MAP_W = 296;
const MAP_H = 196;

export class SortieScene extends Phaser.Scene {
  state!: GameState;
  stageIndex = 0;
  difficulty: DifficultyId = 'NORMAL';
  deck: string[] = [];
  tools: string[] = [];
  info: Phaser.GameObjects.Container | undefined;
  deckBox: Phaser.GameObjects.Container | undefined;
  nodeBox: Phaser.GameObjects.Container | undefined;

  constructor() {
    super('Sortie');
  }

  create(): void {
    const app = getApp(this);
    if (!app.services.state) {
      this.scene.start('Title');
      return;
    }
    this.state = app.services.state;
    setBackdrop(RAMPS.R4[0]);
    applySafeArea(this);
    this.cameras.main.setBackgroundColor(RAMPS.R4[0]);

    // 마지막으로 고른 것 복원
    const lo = this.state.loadout;
    this.difficulty = (DIFFICULTY_ORDER as string[]).includes(lo.difficulty)
      ? (lo.difficulty as DifficultyId)
      : 'NORMAL';
    this.tools = lo.tools.filter((id) => GARDEN_TOOLS[id]?.unlockLevel <= this.state.player.level);
    for (const d of Object.values(GARDEN_TOOLS))
      if (
        this.tools.length < 2 &&
        d.unlockLevel <= this.state.player.level &&
        !this.tools.includes(d.id)
      )
        this.tools.push(d.id);
    this.tools = this.tools.slice(0, 2);
    const ok = new Set(candidates(this.state).map((p) => p.uid));
    this.deck = lo.deck.filter((u) => ok.has(u)).slice(0, deckSlots(this.state.player.level));
    // 가장 앞서간 스테이지를 기본으로
    this.stageIndex = 0;
    STAGES.forEach((_, i) => {
      if (stageUnlocked(this.state, STAGES, i)) this.stageIndex = i;
    });
    this.stageIndex = Math.min(this.stageIndex, STAGES.length - 1);

    this.add.image(0, 0, this.background()).setOrigin(0, 0).setDepth(0);
    this.header();
    this.buildMap();
    this.refresh();
    const kb = this.input.keyboard;
    if (kb) {
      const esc = (): void => this.back();
      kb.on('keydown-ESC', esc);
      this.events.once('shutdown', () => kb.off('keydown-ESC', esc));
    }
  }

  /** 풀밭 배경(16×16 타일을 바둑판으로 굽는다) */
  private background(): string {
    const key = 'sortie:bg';
    if (this.textures.exists(key)) return key;
    const c = new PixelCanvas(640, 360);
    c.rect(0, 0, 640, 360, RAMPS.R4[0]);
    c.rect(0, 0, 640, 24, RAMPS.R10[1]);
    c.rect(0, 232, 640, 128, RAMPS.R10[1]);
    // 지도 풀밭
    c.rect(MAP_X, MAP_Y, MAP_W, MAP_H, RAMPS.R1[1]);
    for (let y = 0; y < MAP_H; y += 4)
      for (let x = (y / 4) % 2 ? 2 : 0; x < MAP_W; x += 8)
        c.px(MAP_X + x, MAP_Y + y, (x + y) % 3 === 0 ? RAMPS.R1[2] : RAMPS.R1[0]);
    return c.toTexture(this, key);
  }

  private header(): void {
    new Button(this, 40, 12, {
      w: 64,
      h: 16,
      label: t('sortie.back'),
      size: 9,
      onClick: () => this.back(),
    }).setDepth(5);
    pixelText(this, 320, 6, t('sortie.chapter', { n: 1 }), {
      size: 11,
      bold: true,
      anchorX: 0.5,
      color: SPECIAL.PAPER,
    }).setDepth(5);
    pixelText(this, 632, 8, t('sortie.chapterName.1'), {
      size: 9,
      anchorX: 1,
      color: RAMPS.R9[4],
    }).setDepth(5);
  }

  // ===== 지도 =====
  private buildMap(): void {
    this.nodeBox?.destroy();
    const box = this.add.container(MAP_X, MAP_Y).setDepth(3);
    this.nodeBox = box;
    const g = this.add.graphics();
    box.add(g);
    // 점선 길
    g.fillStyle(0xa9915d, 1);
    for (let i = 0; i < NODES.length - 1; i++) {
      const [x1, y1] = NODES[i];
      const [x2, y2] = NODES[i + 1];
      const n = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 5);
      for (let k = 1; k < n; k++)
        g.fillRect(
          Math.round(x1 + ((x2 - x1) * k) / n),
          Math.round(y1 + ((y2 - y1) * k) / n),
          2,
          2,
        );
    }
    STAGES.forEach((st, i) => {
      const [x, y] = NODES[i];
      const open = stageUnlocked(this.state, STAGES, i);
      const sel = i === this.stageIndex;
      const size = st.boss ? 32 : 26;
      const node = this.add.container(x, y);
      node.add(
        this.add.image(0, 0, ensurePanel(this, sel ? 'leaf' : open ? 'wood' : 'stone', size, size)),
      );
      node.add(
        open
          ? pixelText(this, 0, 0, st.boss ? 'B' : String(st.index), {
              size: 11,
              bold: true,
              anchorX: 0.5,
              anchorY: 0.5,
            })
          : this.add.image(0, 0, iconTexture(this, 'lock')),
      );
      const stars = this.state.progress[st.id]?.stars ?? 0;
      for (let k = 0; k < 3; k++) {
        const s = this.add.image(-12 + k * 12, size / 2 + 8, iconTexture(this, 'star'));
        if (k >= stars) s.setTintFill(0x6b6b6b);
        node.add(s);
      }
      if (sel) {
        node.y -= 2;
        this.tweens.add({
          targets: node,
          y: y - 4,
          duration: 500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
      node.setSize(size, size);
      node.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, size, size),
        Phaser.Geom.Rectangle.Contains,
      );
      node.on('pointerdown', () => {
        const sfx = getApp(this).sfx;
        if (!open) {
          sfx.play('ui_error');
          overlay(this).toast(t('sortie.locked'));
          return;
        }
        sfx.play('ui_click');
        this.stageIndex = i;
        this.buildMap();
        this.refresh();
      });
      box.add(node);
    });
    // 다음 챕터 안내
    box.add(
      pixelText(this, MAP_W / 2, MAP_H - 12, t('sortie.moreChapters'), {
        size: 7,
        anchorX: 0.5,
        color: RAMPS.R1[3],
      }),
    );
  }

  // ===== 오른쪽 정보 + 아래 덱 =====
  refresh(): void {
    this.info?.destroy();
    this.deckBox?.destroy();
    const st = STAGES[this.stageIndex];
    const lv = this.state.player.level;
    const info = this.add.container(312, 30).setDepth(3);
    this.info = info;
    info.add(this.add.image(0, 0, ensurePanel(this, 'wood', 320, 196)).setOrigin(0, 0));
    info.add(pixelText(this, 10, 8, `${st.id}  ${t(`stage.${st.id}`)}`, { size: 14, bold: true }));
    const desc = pixelText(this, 10, 26, t(`stage.${st.id}.desc`), {
      size: 9,
      color: RAMPS.R10[1],
      wrapWidth: 300,
    });
    info.add(desc);
    // 적 미리보기
    const y0 = Math.round(26 + desc.height + 2);
    info.add(pixelText(this, 10, y0, t('sortie.enemies'), { size: 9, bold: true }));
    enemiesOf(st).forEach((id, k) => {
      const def = ENEMIES[id];
      if (!def) return;
      const x = 26 + k * 48;
      info.add(
        this.add.image(x, y0 + 26, enemyTexture(this, id, Math.min(20, def.size), 0, !!def.flying)),
      );
      info.add(
        pixelText(this, x, y0 + 38, t(def.nameKey), {
          size: 7,
          anchorX: 0.5,
          wrapWidth: 46,
          align: 'center',
        }),
      );
    });
    const tags = tagsOf(st);
    info.add(
      pixelText(
        this,
        10,
        y0 + 62,
        tags.length ? tags.map((x) => `#${t(`tag.${x}`)}`).join(' ') : t('tag.NONE'),
        {
          size: 9,
          color: RAMPS.R6[3],
        },
      ),
    );
    // 난이도
    info.add(pixelText(this, 10, 136, t('sortie.difficulty'), { size: 9, bold: true }));
    DIFFICULTY_ORDER.forEach((id, k) => {
      const d = DIFFICULTY[id];
      const lock = lv < d.unlockLevel;
      const sel = id === this.difficulty;
      info.add(
        new Button(this, 10 + 30 + k * 60, 160, {
          w: 56,
          h: 18,
          label: lock ? `Lv${d.unlockLevel}` : t(d.nameKey),
          size: 9,
          variant: sel ? 'primary' : 'default',
          icon: lock ? iconTexture(this, 'lock') : undefined,
          onClick: () => {
            if (lock) {
              getApp(this).sfx.play('ui_error');
              overlay(this).toast(t('sortie.diffLocked', { lv: d.unlockLevel }));
              return;
            }
            getApp(this).sfx.play('ui_click');
            this.difficulty = id;
            this.refresh();
          },
        }),
      );
    });
    const d = DIFFICULTY[this.difficulty];
    info.add(
      pixelText(
        this,
        10,
        180,
        t('sortie.diffLine', {
          hearts: d.hearts,
          hp: Math.round(d.hpMul * 100),
          reward: Math.round(d.rewardMul * 100),
        }),
        { size: 7, color: RAMPS.R10[1] },
      ),
    );

    this.buildDeck(st.id);
  }

  buildDeck(stageId: string): void {
    deckBar.build(this, stageId);
  }

  cycleTool(slot: number): void {
    const lv = this.state.player.level;
    const open = Object.values(GARDEN_TOOLS)
      .filter((d) => d.unlockLevel <= lv)
      .map((d) => d.id);
    if (open.length <= 2) {
      getApp(this).sfx.play('ui_error');
      overlay(this).toast(t('sortie.moreTools'));
      return;
    }
    const others = this.tools.filter((_, i) => i !== slot);
    const choices = open.filter((id) => !others.includes(id));
    const cur = choices.indexOf(this.tools[slot]);
    this.tools[slot] = choices[(cur + 1) % choices.length];
    getApp(this).sfx.play('ui_click');
    this.refresh();
  }

  recommend(stageId: string): void {
    const st = STAGES.find((s) => s.id === stageId)!;
    const slots = deckSlots(this.state.player.level);
    const list = candidates(this.state);
    const app = getApp(this);
    if (list.length === 0) {
      app.sfx.play('ui_error');
      overlay(this).toast(t('sortie.noPlants'));
      return;
    }
    this.deck = recommendDeck(list, st, slots);
    app.sfx.play('stage_up');
    this.refresh();
  }

  openPicker(): void {
    const app = getApp(this);
    const ov = overlay(this);
    const slots = deckSlots(this.state.player.level);
    const now = app.services.clock.now();
    ov.openModal(
      deckPickerModal(
        this.state,
        this.deck,
        {
          slots,
          onChange: (uids) => {
            this.deck = uids;
          },
          onCare: (uid) => {
            ov.closeModal();
            ov.transitionTo('Sortie', 'Care', { uid });
          },
          askSulky: (p, take) => {
            // 점박이가 먼저 말려 준다. 창은 하나뿐이라 고르기 창을 닫고 물어본 뒤 다시 연다.
            ov.closeModal();
            this.time.delayedCall(180, () =>
              ov.openModal({
                title: t('sortie.sulkyTitle'),
                body: t('sortie.sulkyBody', { name: plantDisplayName(p) }),
                width: 260,
                buttons: [
                  {
                    label: t('sortie.sulkyCare'),
                    variant: 'primary',
                    onClick: () => ov.transitionTo('Sortie', 'Care', { uid: p.uid }),
                  },
                  {
                    label: t('sortie.sulkyTake'),
                    onClick: () => {
                      take();
                      this.time.delayedCall(180, () => this.openPicker());
                    },
                  },
                ],
              }),
            );
          },
        },
        now,
        () => this.refresh(),
      ),
    );
  }

  go(): void {
    const app = getApp(this);
    const st = STAGES[this.stageIndex];
    if (this.deck.length === 0) {
      app.sfx.play('ui_error');
      overlay(this).toast(t('sortie.needDeck'));
      return;
    }
    this.state.loadout = {
      deck: [...this.deck],
      tools: [...this.tools],
      difficulty: this.difficulty,
    };
    app.services.autoSave.flush('sortie');
    overlay(this).transitionTo('Sortie', 'Battle', {
      stageId: st.id,
      difficulty: this.difficulty,
      deckUids: [...this.deck],
      tools: [...this.tools],
    });
  }

  private back(): void {
    const app = getApp(this);
    this.state.loadout = {
      deck: [...this.deck],
      tools: [...this.tools],
      difficulty: this.difficulty,
    };
    app.services.autoSave.flush('sortieBack');
    overlay(this).transitionTo('Sortie', 'Hub');
  }

  /** 테스트에서 쓰는 도우미 */
  debugState(): { stage: string; difficulty: DifficultyId; deck: string[] } {
    return { stage: STAGES[this.stageIndex].id, difficulty: this.difficulty, deck: [...this.deck] };
  }
}
