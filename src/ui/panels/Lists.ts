// 모달 안에 넣는 페이지 넘김 목록. 한 쪽에 5줄, 쪽이 여러 개면 ◀ ▶ 버튼이 붙는다.

import type Phaser from 'phaser';
import { SPECIAL } from '../../art/palette';
import { t } from '../../i18n';
import { Button } from '../Button';
import { iconTexture } from '../IconTex';
import { pixelText } from '../PixelText';
import type { ModalDef } from '../Modal';

export interface ListRow {
  label: string;
  /** 오른쪽 끝에 붙는 글자(개수 등) */
  right?: string;
  /** 버튼 앞 아이콘 이름(IconGen) */
  icon?: string;
  /** 없으면 글자만 있는 줄 */
  onClick?: () => void;
  disabled?: boolean;
}

const ROW_H = 22;

export function pagedList(rows: ListRow[], perPage = 5): NonNullable<ModalDef['build']> {
  const pages = Math.max(1, Math.ceil(rows.length / perPage));
  return (
    scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    top: number,
    width: number,
  ) => {
    let page = 0;
    const holder = scene.add.container(0, top);
    parent.add(holder);
    const pager = pages > 1;
    const draw = () => {
      holder.removeAll(true);
      rows.slice(page * perPage, (page + 1) * perPage).forEach((row, i) => {
        const y = i * ROW_H;
        const label = row.right ? `${row.label}  ${row.right}` : row.label;
        if (row.onClick) {
          holder.add(
            new Button(scene, width / 2, y + 10, {
              w: width,
              h: 20,
              label,
              icon: row.icon ? iconTexture(scene, row.icon) : undefined,
              disabled: row.disabled,
              onClick: row.onClick,
            }),
          );
        } else {
          holder.add(pixelText(scene, 2, y + 2, label, { size: 11, color: SPECIAL.INK }));
        }
      });
      if (pager) {
        const y = perPage * ROW_H + 4;
        holder.add([
          new Button(scene, 28, y + 10, {
            w: 48,
            h: 20,
            label: '◀',
            disabled: page === 0,
            onClick: () => {
              page = Math.max(0, page - 1);
              draw();
            },
          }),
          new Button(scene, width - 28, y + 10, {
            w: 48,
            h: 20,
            label: '▶',
            disabled: page >= pages - 1,
            onClick: () => {
              page = Math.min(pages - 1, page + 1);
              draw();
            },
          }),
          pixelText(scene, width / 2, y + 4, t('list.page', { page: page + 1, pages }), {
            size: 11,
            anchorX: 0.5,
            color: SPECIAL.INK,
          }),
        ]);
      }
    };
    draw();
    return Math.min(perPage, Math.max(rows.length, 1)) * ROW_H + (pager ? 30 : 0);
  };
}
