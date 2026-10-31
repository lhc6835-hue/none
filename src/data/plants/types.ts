import type { FamilyId, GradeId, PlantLook, PlantSpecies } from '../../core/schema';

/** 식물 종의 기본 정보. M4 에서 전투 · 돌봄 · 획득 데이터를 합쳐 PlantSpecies 로 완성한다. */
export interface PlantBase {
  /** 'P001' */
  id: string;
  nameKey: string;
  grade: GradeId;
  family: FamilyId;
  look: PlantLook;
  /** 돌봄 취향(07문서 '돌봄' 열) */
  care: PlantSpecies['care'];
}
