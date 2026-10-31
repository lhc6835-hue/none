// 이름 입력칸: 캔버스 위에 겹치는 HTML 입력창(한글 조합 입력을 쓰려면 DOM 입력이 필요하다).
// 안전 영역(640×360) 좌표로 자리를 주면 현재 화면 배율에 맞춰 놓고, 창 크기가 바뀌면 따라온다.

import type Phaser from 'phaser';
import { RAMPS, SPECIAL } from '../art/palette';
import { NAME_MAX } from '../systems/Naming';
import { safeLeft } from './Layout';

export class NameInput {
  readonly el: HTMLInputElement;
  private readonly onResize = () => this.place();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    private readonly w: number,
    private readonly h: number,
    initial: string,
    onEnter: () => void,
    placeholder = '',
  ) {
    const el = document.createElement('input');
    el.type = 'text';
    el.id = 'plant-name';
    el.value = initial;
    el.maxLength = NAME_MAX;
    el.placeholder = placeholder;
    el.autocomplete = 'off';
    el.spellcheck = false;
    Object.assign(el.style, {
      position: 'absolute',
      boxSizing: 'border-box',
      textAlign: 'center',
      fontFamily: 'Galmuri11, monospace',
      color: SPECIAL.INK,
      background: SPECIAL.CREAM,
      border: `2px solid ${RAMPS.R10[1]}`,
      outline: 'none',
      padding: '0',
      margin: '0',
      zIndex: '10',
      touchAction: 'auto',
      userSelect: 'text',
    } satisfies Partial<CSSStyleDeclaration>);
    el.addEventListener('keydown', (e) => {
      e.stopPropagation(); // 게임 단축키로 새지 않게
      if (e.key === 'Enter') onEnter();
    });
    // 게임 컨테이너 안에 넣어, 화면을 돌려 쓸 때 함께 돌아가게 한다
    (document.getElementById('game') ?? document.body).appendChild(el);
    this.el = el;
    this.place();
    window.addEventListener('resize', this.onResize);
    setTimeout(() => el.focus(), 60);
  }

  place(): void {
    const canvas = this.scene.game.canvas;
    // offset* 은 변형(회전)과 무관한 컨테이너 안쪽 좌표다
    const k = canvas.offsetWidth / this.scene.scale.width; // 논리 픽셀 1칸의 CSS 크기
    const el = this.el;
    el.style.left = `${canvas.offsetLeft + (safeLeft(this.scene) + this.x) * k}px`;
    el.style.top = `${canvas.offsetTop + this.y * k}px`;
    el.style.width = `${this.w * k}px`;
    el.style.height = `${this.h * k}px`;
    el.style.fontSize = `${12 * k}px`;
  }

  get value(): string {
    return this.el.value;
  }

  setValue(v: string): void {
    this.el.value = v;
    this.el.focus();
  }

  destroy(): void {
    window.removeEventListener('resize', this.onResize);
    this.el.remove();
  }
}
