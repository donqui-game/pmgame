/* 출생 판정 */
(function (root) {
  'use strict';

  const DATA = (typeof module !== 'undefined' && module.exports) ? require('./data.js') : root.PMG.DATA;
  const B = DATA.BIRTH;

  function pick(table, rng) {
    const r = rng();
    let acc = 0;
    for (let i = 0; i < table.length; i++) {
      acc += table[i].p;
      if (r < acc) return table[i];
    }
    return table[table.length - 1];
  }

  function rollBirth(rng) {
    rng = rng || Math.random;
    const type = pick(B.types, rng);
    const stats = { str: B.baseStat, con: B.baseStat, agi: B.baseStat };
    const out = { type: type.id, typeName: type.name, zone: null, zoneName: null, grade: null,
      baseHp: 0, an: 0, conn: [], stats: stats, story: '' };

    if (type.id === 'citizen') {
      const z = pick(B.zones, rng);
      out.zone = z.id; out.zoneName = z.name;
      out.baseHp = z.hp; out.an = z.an;
      out.conn = z.conn ? [z.conn] : [];
      out.story = z.story;
    } else if (type.id === 'pinky') {
      out.baseHp = B.pinky.hp; out.an = B.pinky.an;
      out.conn = [B.pinky.conn];
      out.story = B.pinky.story;
    } else {
      const g = pick(B.hyeolgwiGrades, rng);
      out.grade = g.grade;
      stats.str += g.bonus; stats.con += g.bonus; stats.agi += g.bonus;
      out.baseHp = B.hyeolgwi.hp; out.an = B.hyeolgwi.an;
      out.story = B.hyeolgwi.story;
    }
    // 체질 1포인트마다 최대 생명력 +5 (시작값 5 기준)
    out.maxHp = out.baseHp + (stats.con - B.baseStat) * 5;
    return out;
  }

  const api = { rollBirth: rollBirth };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.PMG = root.PMG || {}; root.PMG.Birth = api; }
})(typeof window !== 'undefined' ? window : globalThis);
