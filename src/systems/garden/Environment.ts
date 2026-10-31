// 시간 · 날씨 · 계절 · 구역 환경 (04문서 1-2 · 1-1)
//  낮/밤은 기기의 현지 시각(06–20 낮), 날씨는 날짜를 시드로 하루 단위 결정, 계절은 실제 월.

import { localParts, type LocalParts } from '../../core/Clock';
import { makeRng } from '../../core/Rng';
import type { GardenSettings } from '../../core/GameState';
import type { SongGenre, ZoneId } from '../../core/schema';
import { WEATHER } from '../../data/care';
import { ZONES, type Humidity, type ZoneTemp } from '../../data/zones';

export type Weather = 'SUNNY' | 'CLOUDY' | 'RAIN' | 'FOG' | 'SNOW' | 'RAINBOW';
export type Season = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER';

export const isNightAt = (p: LocalParts): boolean =>
  p.hourFloat < WEATHER.daylight[0] || p.hourFloat >= WEATHER.daylight[1];

export function seasonOf(month: number): Season {
  if (month >= 3 && month <= 5) return 'SPRING';
  if (month >= 6 && month <= 8) return 'SUMMER';
  if (month >= 9 && month <= 11) return 'AUTUMN';
  return 'WINTER';
}

/** 그날의 날씨(날짜 시드). 비 다음 날은 10% 확률로 무지개. */
export function weatherOn(parts: LocalParts, prevDay?: LocalParts): Weather {
  const roll = (p: LocalParts): Weather => {
    const season = seasonOf(p.month);
    const rng = makeRng('daily', 'weather', p.dateKey);
    const table: [Weather, number][] = [
      ['SUNNY', 40],
      ['CLOUDY', 25],
      ['RAIN', 20],
      ['FOG', 10],
      ['SNOW', season === 'WINTER' ? 15 : 0],
    ];
    return rng.weighted(
      table.map((t) => t[0]),
      table.map((t) => t[1]),
    );
  };
  const today = roll(parts);
  if (prevDay && roll(prevDay) === 'RAIN' && today !== 'RAIN') {
    if (makeRng('daily', 'rainbow', parts.dateKey).chance(WEATHER.rainbowAfterRain))
      return 'RAINBOW';
  }
  return today;
}

export function weatherAt(ms: number, offsetMin?: number): Weather {
  return weatherOn(localParts(ms, offsetMin), localParts(ms - 86_400_000, offsetMin));
}

export interface WorldSnapshot {
  night: boolean;
  weather: Weather;
  season: Season;
}

export function worldAt(ms: number, offsetMin?: number): WorldSnapshot {
  const p = localParts(ms, offsetMin);
  return { night: isNightAt(p), weather: weatherAt(ms, offsetMin), season: seasonOf(p.month) };
}

export interface PlantEnv {
  zone: ZoneId;
  /** 1–3 */
  light: number;
  temp: ZoneTemp;
  humidity: Humidity;
  night: boolean;
  weather: Weather;
  season: Season;
  music: SongGenre | null;
  /** 달빛 창에서 밤을 보내는 중 */
  moonExposure: boolean;
  outdoor: boolean;
}

const TEMPS: ZoneTemp[] = ['COOL', 'MID', 'WARM'];
const stepTemp = (t: ZoneTemp, step: number): ZoneTemp =>
  TEMPS[Math.max(0, Math.min(2, TEMPS.indexOf(t) + step))];
const clampLight = (n: number) => Math.max(1, Math.min(3, n));

/** 구역 + 월드 + 집 설정 → 그 구역 식물이 느끼는 환경. potTempStep · potHumidityStep 은 화분 효과(05문서). */
export function envFor(
  zone: ZoneId,
  world: WorldSnapshot,
  house: GardenSettings,
  pot: { tempStep?: number; humidityStep?: number } = {},
): PlantEnv {
  const z = ZONES[zone];
  let light: number;
  let temp: ZoneTemp;
  let humidity: Humidity;

  if (zone === 'OUTDOOR') {
    const w = world.weather;
    light = world.night ? 1 : w === 'SUNNY' || w === 'RAINBOW' ? 3 : w === 'CLOUDY' ? 2 : 1;
    temp =
      world.weather === 'SNOW' || world.season === 'WINTER'
        ? 'COOL'
        : world.season === 'SUMMER'
          ? 'WARM'
          : 'MID';
    humidity = w === 'RAIN' ? 'WET' : w === 'SUNNY' ? 'DRY' : 'NORMAL';
  } else if (zone === 'MOONLIGHT') {
    light = 1; // 낮에는 약한 빛 · 밤에는 달빛(moonExposure 로 따로 센다)
    temp = 'COOL';
    humidity = 'NORMAL';
  } else {
    // 블라인드: 열기 +1 · 반 0 · 닫기 -1
    const blind = house.blinds[zone] ?? 'HALF';
    const base = z.light === 0 ? 2 : z.light;
    light = clampLight(base + (blind === 'OPEN' ? 1 : blind === 'CLOSED' ? -1 : 0));
    // 맑은 날 창가 선반은 빛 +1 (04문서 1-2)
    if (zone === 'WINDOW' && world.weather === 'SUNNY') light = clampLight(light + 1);
    if (world.night && zone !== 'STOVE') light = Math.min(light, 1);
    temp = z.temp === 'WEATHER' ? 'MID' : z.temp;
    humidity = z.humidity === 'WEATHER' ? 'NORMAL' : z.humidity;
    // 집 전체 난로(+1) · 선풍기(-1)
    temp = stepTemp(temp, (house.stove ? 1 : 0) - (house.fan ? 1 : 0));
  }
  temp = stepTemp(temp, pot.tempStep ?? 0);
  if (pot.humidityStep) {
    const order: Humidity[] = ['DRY', 'NORMAL', 'WET'];
    const i = order.indexOf(humidity);
    if (i >= 0) humidity = order[Math.max(0, Math.min(2, i + pot.humidityStep))];
  }
  return {
    zone,
    light,
    temp,
    humidity,
    night: world.night,
    weather: world.weather,
    season: world.season,
    music: house.music,
    moonExposure: zone === 'MOONLIGHT' && world.night,
    outdoor: zone === 'OUTDOOR',
  };
}
