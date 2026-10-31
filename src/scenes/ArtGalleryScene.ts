// 아트 갤러리 (12문서 12절, ?debug=1 의 ?scene=ArtGallery): 100종 × 6단계(씨앗 · 발아 · 새싹 · 어린잎 · 성숙 · 개화)를
// 격자로 보여 준다. 표정 16종 순환 · 실루엣 모드 · 색변이 모드 · 얼굴 검수 오버레이(위반은 빨간 테두리) · 팔레트 검사.
// 디버그 도구라 화면 글자는 영문 약어를 쓴다(문자열 파일에 넣지 않는다).

import Phaser from 'phaser';
import { EXPRESSIONS, type Expression } from '../art/FaceRenderer';
import { validateFace } from '../art/FaceValidator';
import { strayColors } from '../art/GridCanvas';
import { FRAME_NAMES } from '../art/PlantSpriteGen';
import { RAMPS, SPECIAL, toInt } from '../art/palette';
import type { Stage } from '../art/bodies/Ctx';
import { GRADES } from '../data/grades';
import { PLANT_BASE } from '../data/plants';
import { Button } from '../ui/Button';
import { markTexture } from '../ui/IconTex';
import { applySafeArea, setBackdrop } from '../ui/Layout';
import { pixelText } from '../ui/PixelText';
import { PlantView } from '../ui/PlantView';
import { getApp } from './context';
import { overlay } from './UIOverlay';

type Mode = 'normal' | 'silhouette' | 'variant';
const MODES: Mode[] = ['normal', 'silhouette', 'variant'];

const GROUPS = 3;
const ROWS = 8;
const PER_PAGE = GROUPS * ROWS;
const CELL_W = 26;
const CELL_H = 36;
const LABEL_W = 22;
const GROUP_W = LABEL_W + CELL_W * 6 + 4;
const TOP = 20;
const STAGES: Stage[] = [1, 2, 3, 4, 5];

export interface GalleryStats {
  page: number;
  pages: number;
  cells: number;
  strays: number;
  faceIssues: number;
  generated: number;
}

export class ArtGalleryScene extends Phaser.Scene {
  private page = 0;
  private mode: Mode = 'normal';
  private exprIdx = 0;
  private check = true;
  private frozen = false;
  private layer!: Phaser.GameObjects.Container;
  private header!: Phaser.GameObjects.Text;
  stats: GalleryStats = {
    page: 0,
    pages: Math.ceil(PLANT_BASE.length / PER_PAGE),
    cells: 0,
    strays: 0,
    faceIssues: 0,
    generated: 0,
  };

  constructor() {
    super('ArtGallery');
  }

  create(): void {
    setBackdrop(RAMPS.R11[0]);
    applySafeArea(this);
    this.cameras.main.setBackgroundColor(RAMPS.R11[0]);
    this.layer = this.add.container(0, 0);
    this.header = pixelText(this, 200, 3, '', { size: 9, color: SPECIAL.PAPER });

    const labels: [string, () => void][] = [
      ['Prev', () => this.turn(-1)],
      ['Next', () => this.turn(1)],
      ['Expr', () => this.cycleExpr()],
      ['Mode', () => this.cycleMode()],
      ['Check', () => ((this.check = !this.check), this.rebuild())],
      ['Anim', () => ((this.frozen = !this.frozen), this.rebuild())],
      ['Back', () => overlay(this).transitionTo('ArtGallery', 'Title')],
    ];
    labels.forEach(([label, fn], i) => {
      new Button(this, 40 + i * 76, 344, { w: 68, h: 16, size: 9, label, onClick: fn });
    });
    this.input.keyboard?.on('keydown-RIGHT', () => this.turn(1));
    this.input.keyboard?.on('keydown-LEFT', () => this.turn(-1));
    this.input.keyboard?.on('keydown-E', () => this.cycleExpr());
    this.input.keyboard?.on('keydown-M', () => this.cycleMode());
    this.input.keyboard?.on('keydown-C', () => ((this.check = !this.check), this.rebuild()));
    this.rebuild();
  }

  private turn(d: number): void {
    this.page = (this.page + d + this.stats.pages) % this.stats.pages;
    this.rebuild();
  }

  private cycleExpr(): void {
    this.exprIdx = (this.exprIdx + 1) % EXPRESSIONS.length;
    this.rebuild();
  }

  private cycleMode(): void {
    this.mode = MODES[(MODES.indexOf(this.mode) + 1) % MODES.length];
    this.rebuild();
  }

  private rebuild(): void {
    this.layer.removeAll(true);
    // 실루엣은 밝은 배경에서 봐야 모양이 읽힌다
    const light = this.mode === 'silhouette';
    const bg = light ? SPECIAL.CREAM : RAMPS.R11[0];
    setBackdrop(bg);
    this.cameras.main.setBackgroundColor(bg);
    const ink = light ? SPECIAL.INK : SPECIAL.PAPER;
    this.header.setColor(ink);
    const { atlas } = getApp(this);
    const expr: Expression = EXPRESSIONS[this.exprIdx];
    const list = PLANT_BASE.slice(this.page * PER_PAGE, (this.page + 1) * PER_PAGE);
    let strays = 0;
    let faceIssues = 0;
    let cells = 0;
    const variant = this.mode === 'variant';

    list.forEach((plant, i) => {
      const group = Math.floor(i / ROWS);
      const row = i % ROWS;
      const gx = 4 + group * GROUP_W;
      const gy = TOP + row * CELL_H;
      const grade = GRADES[plant.grade];
      // 라벨: 도감 번호 + 등급 표식
      this.layer.add(pixelText(this, gx, gy + 6, plant.id.slice(1), { size: 7, color: ink }));
      this.layer.add(
        this.add.image(gx + 8, gy + 22, markTexture(this, grade.mark, grade.color)).setOrigin(0.5),
      );

      // 씨앗(단계 0)
      const seedKey = atlas.seed(plant.family, plant.grade);
      const seed = this.add
        .image(gx + LABEL_W + CELL_W / 2, gy + CELL_H - 4, seedKey)
        .setOrigin(0.5, 1);
      if (this.mode === 'silhouette') seed.setTintFill(toInt(SPECIAL.INK));
      this.layer.add(seed);
      cells++;

      STAGES.forEach((stage, s) => {
        const cx = gx + LABEL_W + CELL_W * (s + 1) + CELL_W / 2;
        const view = new PlantView(this, cx, gy + CELL_H - 3, {
          speciesId: plant.id,
          stage,
          variant,
          expression: expr,
          silhouette: this.mode === 'silhouette',
          still: this.frozen,
        });
        this.layer.add(view);
        cells++;
        const tex = atlas.plant(plant.id, stage, variant);
        for (const name of FRAME_NAMES) strays += strayColors(tex.sprite.frames[name].grid).length;
        const fr = tex.sprite.frames.idle0;
        const issues = validateFace(plant.look.face, fr.host, fr.bodyColor, fr.grid);
        faceIssues += issues.length;
        if (this.check && issues.length > 0) {
          const box = this.add
            .rectangle(cx, gy + CELL_H / 2, CELL_W - 1, CELL_H - 1)
            .setStrokeStyle(1, toInt(RAMPS.R7[3]));
          this.layer.add(box);
        }
      });
    });

    this.stats = {
      ...this.stats,
      page: this.page,
      cells,
      strays,
      faceIssues,
      generated: atlas.generated,
    };
    this.header.setText(
      `GALLERY ${this.page + 1}/${this.stats.pages}  expr:${EXPRESSIONS[this.exprIdx]}  mode:${this.mode}  palette:${strays === 0 ? 'OK' : `BAD ${strays}`}  face:${faceIssues === 0 ? 'OK' : `BAD ${faceIssues}`}`,
    );
  }

  /** 테스트용: 모든 페이지의 식물 100종 × 5단계 × 색변이 2종을 만들어 팔레트 · 얼굴 위반을 센다 */
  generateAll(): { sprites: number; strays: number; faceIssues: number } {
    const { atlas } = getApp(this);
    let sprites = 0;
    let strays = 0;
    let faceIssues = 0;
    for (const plant of PLANT_BASE) {
      for (const stage of STAGES) {
        for (const variant of [false, true]) {
          const tex = atlas.plant(plant.id, stage, variant);
          sprites++;
          for (const name of FRAME_NAMES)
            strays += strayColors(tex.sprite.frames[name].grid).length;
          const fr = tex.sprite.frames.idle0;
          faceIssues += validateFace(plant.look.face, fr.host, fr.bodyColor, fr.grid).length;
        }
      }
      atlas.seed(plant.family, plant.grade);
    }
    return { sprites, strays, faceIssues };
  }
}
