// 테스트 도우미: 시간 · 날씨 계산 재노출과 고정 월드
import {
  envFor,
  seasonOf,
  weatherOn,
  type WorldSnapshot,
} from '../../src/systems/garden/Environment';

export { envFor, seasonOf, weatherOn };
export const defaultWorldForTest = (): WorldSnapshot => ({
  night: false,
  weather: 'CLOUDY',
  season: 'WINTER',
});
