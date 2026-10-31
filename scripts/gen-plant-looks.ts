// 식물 100종의 외형(look) 데이터를 기획서 07-plants-1~4.md 의 표에서 뽑아 src/data/plants/*.ts 로 쓴다.
// 문서의 '형태 · 얼굴' · '색' 열이 원본이다. 문서를 고쳤다면 `npx tsx scripts/gen-plant-looks.ts` 를 다시 돌린다.
// 이름(i18n)도 같이 갱신한다: src/i18n/ko.json · en.json 의 plant.Pxxx.name

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const FAMILY_FILE: Record<string, string> = {
  VINE: 'vine',
  THORN: 'thorn',
  FUNGUS: 'fungus',
  BLOOM: 'bloom',
  FRUIT: 'fruit',
  EMBER: 'ember',
  FROST: 'frost',
  LUMEN: 'lumen',
  STORM: 'storm',
  SPIRIT: 'spirit',
};

const GRADE: Record<string, string> = {
  그늘: 'SHADE',
  이슬: 'DEW',
  햇살: 'SUN',
  노을: 'DUSK',
  달빛: 'MOON',
  별빛: 'STAR',
  오로라: 'AURORA',
  태초: 'ORIGIN',
};

/** 바디 플랜의 대표 얼굴 부위(02문서 6절 '얼굴 호스트'). art/bodies/* 가 같은 이름으로 부위를 등록한다. */
const PRIMARY_HOST: Record<string, string> = {
  BULB: 'bulb',
  STALK: 'head',
  ROSETTE: 'center',
  VINE: 'leaf',
  CAP: 'cap',
  PITCHER: 'pitcher',
  TRAP: 'trap',
  BUSH: 'mass',
  COLUMN: 'column',
  FLOWER: 'center',
  POD: 'fruit',
  FROND: 'curl',
  CRYSTAL: 'crystal',
  WISP: 'body',
  BONSAI: 'crown',
  LILY: 'flower',
};

const EN_NAMES =
  `Curly Vine|Tickle Grass|Noose Beanstalk|Snap Flytrap|Sticky Sundew|Tugline Pumpkin Vine|Maze Root|Cobweb Milkweed|Night Tendril|World-Wrap Vine|Prickly Cactus|Chestnut Hedgehog|Needle Pine|Rose Thornspear|Thistle Sentinel|Ironthorn Aloe|Needle-Rain Acacia|Silverspike Hedgehog Grass|Starthorn Agave|Thousand-Needle Thorn Tree|Pop Spore Mushroom|Squishy Morel|Poison-Sting Amanita|Dreaming Inkcap|Mycelium Web|Mushroom Cannon|Laughing Mushroom|Moonshadow Reishi|Starcluster Spore Colony|Mycelium King of Old|Honeypot Dandelion|Smiley Daisy|Chorus Morning Glory|Honeyscent Lavender|Enchanting Tulip|Nectar Camellia|Festival Hydrangea|Lullaby Lily of the Valley|Star-Candy Marigold|Flower of the Beginning 'First Spring'|Acorn Slinger Oak|Burst Balsam|Gourd Thrower|Pomegranate Scattershot|Rolling Coconut|Physalis Balloon Cannon|Durian Stink Bomb|Moonlight Grapes|Meteor Apple Tree|Aurora Fruit Tower|Ember Chili|Blazing Cockscomb|Matchstick Reed|Lava Cactus|Fireworks Lily|Brazier Lotus|Phoenix Feather Fern|Starfire Dragon Fruit|Sunherb 'Noon'|Ember of the Beginning 'First Fire'|Squirt Cattail|Frost Moss Ball|Ice Water Lily|Icicle Ivy|Snowflake Cluster|Whirlpool Lotus Leaf|Glacier Camellia|Moonlight Dewdrop|Starfrost Rime Tree|Permafrost Flower 'Hibernation'|Firefly Flower|Lightbulb Tuber|Mirror-Leaf Rubber Tree|Sunbeam Prism Flower|Lighthouse Lily|Rainbow Fountain Herb|Flash Evening Primrose|Moonlight Mirror Lotus|Constellation Orchid|Light of the Beginning 'First Dawn'|Zap Fern|Pinwheel Clover|Static Dandelion Fluff|Whirlwind Reed|Thunder Mint|Lightning Bamboo|Cloud Cotton|Starstorm Orchid|Aurora Lightning Willow|Wind of the Beginning 'First Breath'|Will-o'-Wisp Bellflower|Whisper Moss|Ghost Orchid|Underworld Spider Lily|Dream-Eater Lotus|Forget-Me-Not of Oblivion|Moonshadow Old Tree|Soulfire Lantern Herb|Starsoul Passionflower|Aurora Soul Tree 'Samsara'`.split(
    '|',
  );

interface Row {
  id: string;
  name: string;
  grade: string;
  family: string;
  body: string;
  face: string;
  hostHint: string;
  ramps: { main: string; sub: string; accent?: string; special?: string };
  variantRamps: { main: string; sub: string };
  flags: Record<string, boolean>;
  care: string;
}

/** 아이디 문자열의 고정 해시(FNV-1a). 종마다 얼굴 미세 조정값을 안정적으로 정한다. */
function fnv(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  return h;
}

function parseColor(text: string): Pick<Row, 'ramps' | 'variantRamps' | 'flags'> {
  const open = text.indexOf('(');
  const head = open < 0 ? text : text.slice(0, open);
  const variant = open < 0 ? '' : text.slice(open + 1, text.lastIndexOf(')'));
  const flags: Record<string, boolean> = {};
  const parts = head.split('+').map((s) => s.trim());
  const ramps = (parts[0].match(/R\d+/g) ?? []) as string[];
  let special: string | undefined;
  let accent = ramps[2];
  const setSpecial = (s: string) => (special ??= s);
  for (const p of parts.slice(1)) {
    if (p.includes('별')) setSpecial('STARGOLD');
    else if (p.includes('오로라')) setSpecial('AURORA');
    else if (p.includes('태초')) setSpecial('ORIGIN');
    else if (p === '은') setSpecial('SILVER');
    else if (p === '형광') flags.toxicGlow = true;
    else if (p === '시안') setSpecial('ARCANE');
    else if (p === '노랑') accent = 'R9';
    else if (p.includes('개화 시')) {
      accent = (p.match(/R\d+/) ?? ['R6'])[0];
      flags.accentOnBloom = true;
    }
  }
  // 형광은 단독이면 특수 램프(독 형광), 다른 특수와 같이 나오면 장식 플래그로만 둔다.
  if (flags.toxicGlow && !special) special = 'TOXIC';
  if (head.includes('반투명')) flags.translucent = true;
  const v = (variant.match(/R\d+/g) ?? []) as string[];
  return {
    ramps: {
      main: ramps[0],
      sub: ramps[1],
      ...(accent ? { accent } : {}),
      ...(special ? { special } : {}),
    },
    variantRamps: { main: v[0], sub: v[1] },
    flags,
  };
}

function parseDocs(): Row[] {
  const rows: Row[] = [];
  for (const file of ['07-plants-1', '07-plants-2', '07-plants-3', '07-plants-4']) {
    let family = '';
    for (const line of readFileSync(`docs/${file}.md`, 'utf8').split('\n')) {
      const fam = line.match(/^## 계열 \d+\. \S+ \((\w+)\)/);
      if (fam) family = fam[1];
      if (!/^\| P\d{3} \|/.test(line)) continue;
      const c = line
        .trim()
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((s) => s.trim());
      const form = c[3].match(/^(\w+) · (F\d\d)\((.*)\)$/);
      if (!form) throw new Error(`형태 · 얼굴 형식 오류: ${c[0]} ${c[3]}`);
      rows.push({
        id: c[0],
        name: c[1],
        grade: GRADE[c[2]],
        family,
        body: form[1],
        face: form[2],
        hostHint: form[3],
        ...parseColor(c[4]),
        care: c[8],
      });
    }
  }
  return rows;
}

const NUTRIENT: Record<string, string> = {
  초록: 'GREEN',
  쑥쑥: 'GROW',
  달콤: 'SWEET',
  튼튼: 'STRONG',
};
const MUSIC: Record<string, string> = {
  자장가: 'LULLABY',
  왈츠: 'WALTZ',
  행진곡: 'MARCH',
  빗소리: 'RAIN',
  재즈풍: 'JAZZ',
  신비: 'MYSTIC',
};
const PHRASE: Record<string, string> = {
  응원: 'CHEER',
  칭찬: 'PRAISE',
  전투: 'BATTLE',
  위로: 'COMFORT',
};
const UNIQUE: Record<string, string> = {
  P040: 'SPRING_WALTZ',
  P060: 'CHARCOAL_HEAT',
  P080: 'MOON_WINDOW_SHIFT',
  P090: 'FAN_BREATH',
};

/** 07문서 '돌봄' 열: 빛 · 물 · 온도 · 활동 시간 · ♥영양제 [· 🎵음악 · 💬말 · +밤 노출 · 고유 조건] */
function careOf(row: Row): string {
  const text = row.care;
  const tokens = text
    .replace(/\(.*?\)/g, '')
    .split(' · ')
    .map((t) => t.trim());
  const light = Number(text.match(/빛(\d)/)?.[1]);
  const water = text.includes('물적게') ? 'LOW' : text.includes('물보통') ? 'MID' : 'HIGH'; // 수조 종은 물을 많이 좋아함
  const temp = text.includes('서늘') ? 'COOL' : text.includes('따뜻') ? 'WARM' : 'MID';
  const nutrient = NUTRIENT[text.match(/♥(초록|쑥쑥|달콤|튼튼)/)?.[1] ?? ''];
  if (!light || !nutrient) throw new Error(`돌봄 열을 읽지 못했습니다: ${row.id} ${text}`);
  const care: Record<string, unknown> = {
    light,
    water,
    temp,
    active: tokens.includes('밤') ? 'NIGHT' : 'DAY',
    favoriteNutrient: nutrient,
  };
  const music = text.match(/🎵(\S+)/)?.[1];
  const phrase = text.match(/💬(\S+)/)?.[1];
  if (music) care.music = MUSIC[music];
  if (phrase) care.phrase = PHRASE[phrase];
  if (text.includes('+밤 노출')) care.needsNightExposure = true;
  if (text.includes('지지대 필요') || row.body === 'VINE') care.needsStake = true;
  if (text.includes('수조')) care.aquatic = true;
  if (UNIQUE[row.id]) care.special = UNIQUE[row.id];
  return JSON.stringify(care);
}

function hostOf(row: Row): string {
  // 줄기에 얼굴이 붙는 분재형(도토리 투석참나무 · 달그림자 고목)만 예외
  if (row.body === 'BONSAI' && row.hostHint === '줄기') return 'trunk';
  // 수련은 꽃이 기본, 잎(수련잎)에 얼굴이 붙는 종만 'pad'
  if (row.body === 'LILY' && row.hostHint.includes('잎')) return 'pad';
  return PRIMARY_HOST[row.body];
}

function lookOf(row: Row): string {
  const h = fnv(row.id);
  const eyeSpread = Math.round((0.6 + (h % 41) / 100) * 100) / 100;
  const mouthLen = Math.round((0.5 + ((h >>> 8) % 71) / 100) * 100) / 100;
  const look = {
    body: row.body,
    ramps: row.ramps,
    variantRamps: row.variantRamps,
    parts: row.flags,
    face: { type: row.face, host: hostOf(row), eyeSpread, mouthLen },
    ...(row.flags.translucent || row.family === 'SPIRIT' ? { translucent: true } : {}),
  };
  return JSON.stringify(look);
}

const rows = parseDocs();
for (const r of rows) {
  if (!r.ramps.main || !r.ramps.sub || !r.variantRamps.main || !r.variantRamps.sub) {
    throw new Error(`색 열에서 램프를 읽지 못했습니다: ${r.id}`);
  }
}
if (rows.length !== 100) throw new Error(`식물이 100종이 아닙니다: ${rows.length}`);
mkdirSync('src/data/plants', { recursive: true });

const header = `// 자동 생성 파일 — scripts/gen-plant-looks.ts (원본: docs/07-plants-1~4.md 의 '형태 · 얼굴' · '색' 열).
// 직접 고치지 말고 문서나 스크립트를 고친 뒤 \`npx tsx scripts/gen-plant-looks.ts\` 를 다시 실행한다.
// 외형 미세 조정(eyeSpread · mouthLen · offset)과 parts 는 이 파일을 직접 고쳐도 되지만, 다시 생성하면 덮어쓴다.
`;

for (const [family, file] of Object.entries(FAMILY_FILE)) {
  const list = rows.filter((r) => r.family === family);
  const body = list
    .map(
      (r) =>
        `  { id: '${r.id}', nameKey: 'plant.${r.id}.name', grade: '${r.grade}', family: '${family}', look: ${lookOf(r)}, care: ${careOf(r)} },`,
    )
    .join('\n');
  writeFileSync(
    `src/data/plants/${file}.ts`,
    `${header}\nimport type { PlantBase } from './types';\n\nexport const ${family}_PLANTS: PlantBase[] = [\n${body}\n];\n`,
  );
}

// 이름 문자열
for (const lang of ['ko', 'en'] as const) {
  const path = `src/i18n/${lang}.json`;
  const table = JSON.parse(readFileSync(path, 'utf8')) as Record<string, string>;
  for (const key of Object.keys(table)) if (key.startsWith('plant.')) delete table[key];
  rows.forEach((r, i) => {
    table[`plant.${r.id}.name`] = lang === 'ko' ? r.name : EN_NAMES[i];
  });
  writeFileSync(path, JSON.stringify(table, null, 2) + '\n');
}

console.log(`식물 ${rows.length}종 → src/data/plants/*.ts, 이름 → i18n`);
