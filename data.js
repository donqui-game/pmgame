/* 데이터: 출생 확률, 구역, 무기, 스킬, 적. 수치는 모두 임시값 (설계서 v0.4 기준) */
(function (root) {
  'use strict';

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
    // 맨손
    { id: 'punch', name: '주먹', weapon: 'fist', type: 'attack', stars: 1, power: [2, 4], desc: '기본 공격' },
    { id: 'kick', name: '발차기', weapon: 'fist', type: 'attack', stars: 2, power: [4, 8], desc: '중간 위력' },
    { id: 'dodge', name: '회피', weapon: 'fist', type: 'evade', power: [3, 7], desc: '회피 성공 시 빛 +1' },
  ];

  const SKILLS = {};
  SKILL_LIST.forEach(function (s) {
    s.hits = s.hits || 1;
    s.stars = s.type === 'attack' ? s.stars : 0;
    s.cost = s.type === 'attack' ? s.stars : 0;
    SKILLS[s.id] = s;
  });

  const WEAPONS = {
    dagger: { id: 'dagger', name: '단검', desc: '빠르고 가벼운 칼날. 연타와 회피가 특기.', skills: ['stab', 'flurry', 'vital', 'twist'] },
    sword: { id: 'sword', name: '장검', desc: '균형 잡힌 칼. 안정적인 방어를 갖췄다.', skills: ['slash', 'cleave', 'finisher', 'guard'] },
    blunt: { id: 'blunt', name: '둔기', desc: '묵직한 한 방. 방어를 뚫고 동점도 이긴다.', skills: ['bash', 'crush', 'brace'] },
    fist: { id: 'fist', name: '맨손', desc: '아무것도 들지 않은 주먹과 발.', skills: ['punch', 'kick', 'dodge'] },
  };

  const ENEMIES = [
    { id: 'e9', grade: '9급', name: '거리의 부랑자', hp: 60, str: 5, agi: 5, wang: 0, shin: false, weapon: 'fist' },
    { id: 'e6', grade: '6급', name: '초보 해결사', hp: 120, str: 10, agi: 8, wang: 0, shin: false, weapon: 'sword' },
    { id: 'e3', grade: '3급', name: '숙련 해결사', hp: 220, str: 20, agi: 15, wang: 1, shin: false, weapon: 'blunt' },
    { id: 'e1', grade: '1급', name: '이름난 해결사', hp: 400, str: 35, agi: 25, wang: 3, shin: true, weapon: 'dagger' },
  ];

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

  const DATA = { SKILLS: SKILLS, SKILL_LIST: SKILL_LIST, WEAPONS: WEAPONS, ENEMIES: ENEMIES, BIRTH: BIRTH };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DATA;
  } else {
    root.PMG = root.PMG || {};
    root.PMG.DATA = DATA;
  }
})(typeof window !== 'undefined' ? window : globalThis);
