// 디버그 오버레이 (?debug=1). FPS · 장면 · 화면 배율 · 메모리 · 텍스처 수를 보여 준다.
// 12문서 12절의 치트 패널 · 갤러리 · 시뮬레이터 UI 는 해당 마일스톤에서 이 씬에 붙인다.

import Phaser from 'phaser';
import { RAMPS, SPECIAL } from '../art/palette';
import { currentLayout } from '../ui/Layout';
import { FONT_EM } from '../ui/PixelText';

export class DebugOverlay extends Phaser.Scene {
  private text!: Phaser.GameObjects.Text;
  private visibleOverlay = true;

  constructor() {
    super('DebugOverlay');
  }

  create(): void {
    // 안전 영역이 아니라 화면 왼쪽 위에 붙인다
    this.text = this.add
      .text(3, 3, '', {
        fontFamily: 'Galmuri9',
        fontSize: `${FONT_EM[9]}px`,
        color: SPECIAL.TOXIC,
        backgroundColor: SPECIAL.INK,
        padding: { x: 2, y: 1 },
        lineSpacing: 1,
      })
      .setDepth(10_000)
      .setResolution(1);
    this.time.addEvent({ delay: 250, loop: true, callback: () => this.refresh() });
    this.refresh();
    this.input.keyboard?.on('keydown-BACKTICK', () => {
      this.visibleOverlay = !this.visibleOverlay;
      this.text.setVisible(this.visibleOverlay);
    });
  }

  private refresh(): void {
    const loop = this.game.loop;
    const fps = loop.actualFps;
    const layout = currentLayout();
    const active = this.game.scene
      .getScenes(true)
      .map((s) => s.scene.key)
      .filter((k) => k !== 'DebugOverlay' && k !== 'UIOverlay');
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    const lines = [
      `FPS ${fps.toFixed(1)}  (${(1000 / Math.max(fps, 1)).toFixed(1)}ms)`,
      `scene ${active.join(',') || '-'}`,
      `screen x${layout.k}  ${layout.logicalW}x${layout.logicalH}  css ${layout.cssW}x${layout.cssH}`,
      `textures ${this.textures.getTextureKeys().length}${mem ? `  heap ${(mem.usedJSHeapSize / 1048576).toFixed(1)}MB` : ''}`,
    ];
    this.text.setText(lines.join('\n'));
    this.text.setColor(fps >= 55 ? SPECIAL.TOXIC : fps >= 40 ? RAMPS.R9[3] : RAMPS.R7[3]);
  }
}
