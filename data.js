/* 정적 데이터: 상수, 계급표, 무기·스킬·화풍, 출생 확률. 수치는 모두 임시값 (설계서 v0.4) */
(function (root) {
  'use strict';

  /* ---------- 상수 ---------- */
  const CONST = {
    AP_MAX: 3,                 // 하루 행동 횟수
    QUESTS_PER_RANK: 30,       // 한 계급을 올리는 데 필요한 성공 의뢰 수 (평판 보상 기준)
    EXAM_FEE_RATIO: 0.1,       // 승급 응시료 = 요구 평판의 10% (안)
    TRIBUTE_RATIO: 0.15,       // 엄지 상납금
    BONUS_FIXER: 0.05,         // 해결사 의뢰 보상 +5%
    BONUS_THUMB: 0.10,         // 엄지 의뢰 보상 +10%
    PROMOTE_POINTS: 3,         // 승급 시 능력치 포인트
    STAT_CAP: 60,
    BLOOD_PACK_PRICE: 40,
    BLOOD_PACK_EFFECT: 50,
    DRAW_BLOOD_EFFECT: 35,
    THIRST_RATE: { 3: 8, 2: 11, 1: 14 }, // 혈귀 등급별 하루 혈기 증가
    REGEN_RATIO: 0.10,         // 하루가 지나면 최대 생명력의 10% 회복
    SAVE_KEY: 'pm-city-life-v1',
  };

  /* ---------- 스킬 ---------- */
  const SKILL_LIST = [
    // 단검
    { id: 'stab', name: '찌르기', weapon: 'dagger', type: 'attack', stars: 1, power: [2, 4], desc: '낮은 위력, 안정적' },
    { id: 'flurry', name: '연속 베기', weapon: 'dagger', type: 'attack', stars: 2, power: [2, 4], hits: 2, desc: '2회 연속 판정' },
    { id: 'vital', name: '급소 일격', weapon: 'dagger', type: 'attack', stars: 3, power: [7, 13], desc: '높은 위력' },
    { id: 'twist', name: '몸 비틀기', weapon: 'dagger', type: 'evade', power: [3, 7], desc: '회피 성공 시 빛 +1' },
    // 장검
    { id: 'slash', name: '가로 베기', weapon: 'sword', type: 'attack', stars: 1, power: [2, 4], desc: '낮은 위력, 안정적' },
    { id: 'cleave', name: '내려치기', weapon: 'sword', type: 'attack', stars: 2, power: [4, 8], desc: '중간 위력' },
    { id: 'finisher', name: '필살 참격', weapon: 'sword', type: 'attack', stars: 3, power: [7, 13], desc: '높은 위력' },
    { id: 'guard', name: '막기', weapon: 'sword', type: 'defense', power: [3, 6], desc: '방어 성공 시 빛 +1' },
    // 둔기
    { id: 'bash', name: '후려치기', weapon: 'blunt', type: 'attack', stars: 2, power: [4, 8], effect: 'pierce', pierce: 0.5, desc: '방어 값 50% 관통' },
    { id: 'crush', name: '분쇄', weapon: 'blunt', type: 'attack', stars: 3, power: [7, 13], effect: 'tiebreak', desc: '동점이면 승리' },
    { id: 'brace', name: '버티기', weapon: 'blunt', type: 'defense', power: [3, 6], desc: '방어 성공 시 빛 +1' },
    // 창
    { id: 'jab', name: '창 찌르기', weapon: 'spear', type: 'attack', stars: 1, power: [3, 5], desc: '긴 사거리로 안정적' },
    { id: 'lunge', name: '돌진 찌르기', weapon: 'spear', type: 'attack', stars: 2, power: [4, 8], effect: 'pierce', pierce: 0.3, desc: '방어 값 30% 관통' },
    { id: 'impale', name: '관통', weapon: 'spear', type: 'attack', stars: 3, power: [8, 13], desc: '가장 깊게 꿰뚫는다' },
    { id: 'deflect', name: '흘려내기', weapon: 'spear', type: 'defense', power: [3, 6], desc: '방어 성공 시 빛 +1' },
    // 도끼
    { id: 'rend', name: '걸어 찢기', weapon: 'axe', type: 'attack', stars: 1, power: [2, 5], staggerMult: 1.5, desc: '흐트러짐 게이지를 1.5배 깎음' },
    { id: 'chop', name: '내려찍기', weapon: 'axe', type: 'attack', stars: 2, power: [4, 9], desc: '묵직한 일격' },
    { id: 'hew', name: '통째로 쪼개기', weapon: 'axe', type: 'attack', stars: 3, power: [8, 14], desc: '가장 큰 위력' },
    { id: 'shield', name: '방패 들기', weapon: 'axe', type: 'defense', power: [4, 7], desc: '방어 성공 시 빛 +1' },
    // 맨손
    { id: 'punch', name: '주먹', weapon: 'fist', type: 'attack', stars: 1, power: [2, 4], desc: '기본 공격' },
    { id: 'kick', name: '발차기', weapon: 'fist', type: 'attack', stars: 2, power: [4, 8], desc: '중간 위력' },
    { id: 'dodge', name: '회피', weapon: 'fist', type: 'evade', power: [3, 7], desc: '회피 성공 시 빛 +1' },
    // 약지 화풍: 점묘파
    { id: 'dot', name: '점 찍기', school: 'dots', type: 'attack', stars: 1, power: [2, 4], desc: '낮은 위력, 안정적' },
    { id: 'rain', name: '점의 폭우', school: 'dots', type: 'attack', stars: 2, power: [1, 3], hits: 3, desc: '3회 연속 판정' },
    { id: 'pointfinish', name: '점묘 완성', school: 'dots', type: 'attack', stars: 3, power: [7, 13], desc: '높은 위력' },
    // 야수파
    { id: 'smear', name: '원색 번짐', school: 'fauve', type: 'attack', stars: 1, power: [1, 6], desc: '위력 범위가 넓음' },
    { id: 'fury', name: '격정의 붓질', school: 'fauve', type: 'attack', stars: 2, power: [2, 12], desc: '높은 상한, 큰 편차' },
    { id: 'riot', name: '색의 폭주', school: 'fauve', type: 'attack', stars: 3, power: [3, 20], desc: '매우 넓은 위력 범위' },
    // 신체파
    { id: 'slam', name: '몸 던지기', school: 'body', type: 'attack', stars: 1, power: [2, 4], staggerMult: 1.5, desc: '흐트러짐 게이지를 1.5배 깎음' },
    { id: 'morph', name: '육체 변형', school: 'body', type: 'attack', stars: 2, power: [5, 9], desc: '변형된 몸으로 위력 상승' },
    { id: 'collapse', name: '형상 붕괴', school: 'body', type: 'attack', stars: 3, power: [6, 11], staggerMult: 2, desc: '흐트러짐 게이지를 2배 깎음' },
    // 입체파
    { id: 'facet', name: '면 분할', school: 'cubism', type: 'attack', stars: 1, power: [2, 4], desc: '낮은 위력, 안정적' },
    { id: 'shift', name: '시점 해체', school: 'cubism', type: 'attack', stars: 2, power: [2, 4], hits: 2, desc: '2회 연속 판정' },
    { id: 'multi', name: '다면 일격', school: 'cubism', type: 'attack', stars: 3, power: [4, 7], hits: 2, desc: '2회 연속 판정, 높은 합계' },
  ];

  const SKILLS = {};
  SKILL_LIST.forEach(function (s) {
    s.hits = s.hits || 1;
    s.stars = s.type === 'attack' ? s.stars : 0;
    s.cost = s.type === 'attack' ? s.stars : 0;
    SKILLS[s.id] = s;
  });

  const WEAPONS = {
    fist: { id: 'fist', name: '맨손', price: 0, desc: '아무것도 들지 않은 주먹과 발.', skills: ['punch', 'kick', 'dodge'] },
    dagger: { id: 'dagger', name: '단검', price: 120, desc: '빠르고 가벼운 칼날. 연타와 회피가 특기.', skills: ['stab', 'flurry', 'vital', 'twist'] },
    sword: { id: 'sword', name: '장검', price: 300, desc: '균형 잡힌 칼. 안정적인 방어를 갖췄다.', skills: ['slash', 'cleave', 'finisher', 'guard'] },
    blunt: { id: 'blunt', name: '둔기', price: 300, desc: '묵직한 한 방. 방어를 뚫고 동점도 이긴다.', skills: ['bash', 'crush', 'brace'] },
    spear: { id: 'spear', name: '창', price: 450, desc: '찌르기 중심. 방어 일부를 관통한다.', skills: ['jab', 'lunge', 'impale', 'deflect'] },
    axe: { id: 'axe', name: '도끼', price: 600, desc: '흐트러짐을 노리는 무거운 날.', skills: ['rend', 'chop', 'hew', 'shield'] },
  };

  const SCHOOLS = {
    dots: { id: 'dots', name: '점묘파', desc: '잔 타수를 촘촘히 쌓는 화풍.', skills: ['dot', 'rain', 'pointfinish'] },
    fauve: { id: 'fauve', name: '야수파', desc: '편차가 크지만 터지면 크게 터지는 화풍.', skills: ['smear', 'fury', 'riot'] },
    body: { id: 'body', name: '신체파', desc: '몸 자체를 무기로 삼아 흐트러짐을 노리는 화풍.', skills: ['slam', 'morph', 'collapse'] },
    cubism: { id: 'cubism', name: '입체파', desc: '여러 각도에서 연속으로 파고드는 화풍.', skills: ['facet', 'shift', 'multi'] },
  };

  /* ---------- 계급표 ---------- */
  const FIXER_STEPS = [
    ['9급', 0, 9], ['8급', 250, 8], ['7급', 750, 7], ['6급', 1350, 6], ['5급', 2700, 5],
    ['4급', 3250, 4], ['3급', 5000, 3], ['2급', 7500, 2], ['1급', 12500, 1], ['특색', 50000, 0],
  ];
  const FIXER_GRADES = FIXER_STEPS.map(function (s) { return { name: s[0], rep: s[1], grade: s[2] }; });

  function ranks(list) { return list.map(function (r) { return { name: r[0], rep: r[1] }; }); }

  const CAREERS = {
    fixer: { id: 'fixer', kind: 'fixer', name: '해결사', ranks: ranks(FIXER_STEPS.map(function (s) { return [s[0], s[1]]; })),
      desc: '의뢰를 받아 먹고 사는 길. 의뢰 보상금이 5% 늘어난다.', join: null },
    thumb: { id: 'thumb', kind: 'finger', name: '엄지', ranks: ranks([
      ['솔다토 프리모', 0], ['솔다토 세칸도', 250], ['솔다토 테르조', 1250], ['솔다토 콰르토', 1750],
      ['카포 프리모', 2250], ['카포 세칸도', 3550], ['카포 테르조', 5000], ['카포 콰르토', 8600],
      ['언더보스', 12500], ['콘실리에레', 35000], ['대부', 50000]]),
      desc: '의뢰 보상금이 10% 늘지만, 의뢰 전투에서 지면 의뢰 보상의 15%를 상납금으로 바친다.',
      join: { conn: '뒷세계', val: 2 } },
    index: { id: 'index', kind: 'finger', name: '검지', ranks: ranks([
      ['수행자', 0], ['전령', 5250], ['대행자', 12500], ['신탁 대행자', 51000]]),
      desc: '매일 지령이 떨어진다. 완수하면 평판과 보상, 못 하면 평판이 깎인다.',
      join: { conn: '상류', val: 2 } },
    middle: { id: 'middle', kind: 'finger', name: '중지', ranks: ranks([
      ['작은 아우', 0], ['큰 아우', 5000], ['작은 형님/누님', 12500], ['큰 형님/누님', 50000]]),
      desc: '전투에서 진 적이 앙갚음 장부에 오른다. 장부의 적을 이기면 강화문신을 새긴다.',
      join: { conn: '뒷세계', val: 2 } },
    ring: { id: 'ring', kind: 'finger', name: '약지', ranks: ranks([
      ['스튜던트', 0], ['도슨트', 12500], ['마에스트로', 52000]]),
      desc: '화풍(점묘파, 야수파, 신체파, 입체파)을 고르고 화풍 고유의 스킬을 얻는다.',
      join: { conn: '상류', val: 2 } },
    pinky: { id: 'pinky', kind: 'finger', name: '소지', ranks: ranks([
      ['제자', 0], ['지살성', 13000], ['천강성', 50000]]),
      desc: '수련장에서 훈련할 수 있다. 지살성이 되면 신(心)과 1망(望)을 얻고, 소지에 남거나 다른 손가락으로 이적할 수 있다.',
      join: { conn: '소지', val: 3 } },
    L: { id: 'L', kind: 'corp', name: 'L사', ranks: ranks([['1등급', 0], ['2등급', 500], ['3등급', 2000], ['4등급', 6000], ['5등급', 15000]]),
      desc: '입사 시험을 통과하면 직급에 따른 일급을 받는다. (체질 6 이상 필요)',
      join: { stat: 'con', val: 6 }, wage: [40, 80, 160, 300, 600] },
    W: { id: 'W', kind: 'corp', name: 'W사', ranks: ranks([['1등급', 0], ['2등급', 500], ['3등급', 2000], ['4등급', 6000], ['5등급', 15000]]),
      desc: '입사 시험을 통과하면 직급에 따른 일급을 받는다. (민첩 6 이상 필요)',
      join: { stat: 'agi', val: 6 }, wage: [40, 80, 160, 300, 600] },
  };

  /* ---------- 등급별 수치 ---------- */
  const GRADE = {
    an: { 9: 30, 8: 50, 7: 80, 6: 120, 5: 180, 4: 260, 3: 380, 2: 600, 1: 1000, 0: 2000 },
    living: { 9: 10, 8: 10, 7: 10, 6: 20, 5: 20, 4: 20, 3: 40, 2: 40, 1: 40, 0: 80 },
    enemyHp: { 9: 35, 8: 50, 7: 65, 6: 80, 5: 100, 4: 120, 3: 140, 2: 170, 1: 210, 0: 300 },
    enemyWang: { 9: 0, 8: 0, 7: 0, 6: 0, 5: 0, 4: 0, 3: 1, 2: 2, 1: 3, 0: 5 },
  };

  /* ---------- 출생 ---------- */
  const BIRTH = {
    types: [
      { id: 'citizen', name: '평범한 시민', p: 0.90 },
      { id: 'pinky', name: '소지 출신 가문', p: 0.07 },
      { id: 'hyeolgwi', name: '혈귀', p: 0.03 },
    ],
    hyeolgwiGrades: [
      { grade: 3, p: 0.60, bonus: 2 },
      { grade: 2, p: 0.30, bonus: 4 },
      { grade: 1, p: 0.10, bonus: 6 },
    ],
    zones: [
      { id: 'alley', name: '뒷골목', p: 0.35, hp: 110, an: 50, conn: { type: '뒷세계', val: 2 },
        story: '좁은 골목의 젖은 벽 사이에서 첫 울음을 울었다.' },
      { id: 'residential', name: '일반 주거지', p: 0.50, hp: 100, an: 150, conn: null,
        story: '낡았지만 불이 켜진 주거지의 작은 방에서 태어났다.' },
      { id: 'rich', name: '부유 지구', p: 0.15, hp: 90, an: 500, conn: { type: '상류', val: 2 },
        story: '높은 담장 안쪽, 조용한 부유 지구에서 태어났다.' },
    ],
    pinky: { hp: 100, an: 100, conn: { type: '소지', val: 3 },
      story: '소지의 이름을 가진 가문에서 태어났다. 태어나자마자 이름의 무게가 따라붙었다.' },
    hyeolgwi: { hp: 100, an: 100,
      story: '첫 울음과 함께, 피에 대한 갈증도 함께 태어났다.' },
    baseStat: 5,
  };

  const DATA = {
    CONST: CONST, SKILLS: SKILLS, SKILL_LIST: SKILL_LIST, WEAPONS: WEAPONS, SCHOOLS: SCHOOLS,
    FIXER_GRADES: FIXER_GRADES, CAREERS: CAREERS, GRADE: GRADE, BIRTH: BIRTH,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DATA;
  } else {
    root.PMG = root.PMG || {};
    root.PMG.DATA = DATA;
  }
})(typeof window !== 'undefined' ? window : globalThis);
