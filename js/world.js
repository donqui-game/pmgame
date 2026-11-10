/* 세계 로직: 상태, 일과, 의뢰, 승급, 상점, 혈귀, 소속 효과, 저장. UI와 분리되어 Node에서도 테스트할 수 있다. */
(function (root) {
  'use strict';

  const isNode = typeof module !== 'undefined' && module.exports;
  const DATA = isNode ? require('./data.js') : root.PMG.DATA;
  const EV = isNode ? require('./events.js') : root.PMG.EVENTS;
  const Battle = isNode ? require('./battle.js') : root.PMG.Battle;
  const Birth = isNode ? require('./birth.js') : root.PMG.Birth;
  const C = DATA.CONST, GR = DATA.GRADE, CAREERS = DATA.CAREERS, WEAPONS = DATA.WEAPONS, SCHOOLS = DATA.SCHOOLS, SKILLS = DATA.SKILLS;
  const STATS = ['str', 'con', 'agi'];
  const STAT_NAMES = { str: '힘', con: '체질', agi: '민첩' };
  const CONN_TYPES = ['뒷세계', '상류', '소지'];
  const MAX_SLOTS = 5;
  const LEDGER_MAX = 10;

  /* ---------- 유틸 ---------- */
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function pickOne(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }
  function shuffle(arr, rng) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function log(G, text) {
    G.log.unshift({ day: G.day, text: text });
    if (G.log.length > 60) G.log.length = 60;
  }

  /* ---------- 등급·평판 ---------- */
  // 평판으로 환산한 해결사 등급 (9~1, 특색=0)
  function equivGrade(rep) {
    let g = 9;
    DATA.FIXER_GRADES.forEach(function (f) { if (rep >= f.rep) g = f.grade; });
    return g;
  }
  function gradeName(g) { return g === 0 ? '특색' : g + '급'; }

  // 해당 등급 의뢰의 평판 보상: (다음 등급 기준 - 이 등급 기준) / 30, 단 낮은 등급보다 적어지지 않게 한다
  const _repRewardCache = {};
  function repReward(g) {
    if (_repRewardCache[g] != null) return _repRewardCache[g];
    let v;
    if (g === 0) v = 1500;
    else {
      const list = DATA.FIXER_GRADES;
      let idx = 0;
      list.forEach(function (f, i) { if (f.grade === g) idx = i; });
      v = Math.round((list[idx + 1].rep - list[idx].rep) / C.QUESTS_PER_RANK);
      if (g < 9) v = Math.max(v, repReward(g + 1));
    }
    _repRewardCache[g] = v;
    return v;
  }

  /* ---------- 상태 ---------- */
  function totalConn(G) { return CONN_TYPES.reduce(function (s, k) { return s + (G.conn[k] || 0); }, 0); }
  function maxHp(G) { return G.birth.baseHp + (G.stats.con - DATA.BIRTH.baseStat) * 5; }
  function grade(G) { return equivGrade(G.rep); }

  function thirstLevel(G) { return G.thirst >= 75 ? 2 : G.thirst >= 50 ? 1 : 0; }
  function thirstPenalty(G) { return [0, 2, 4][thirstLevel(G)]; }
  function isHyeolgwi(G) { return G.birth.type === 'hyeolgwi'; }
  function effStat(G, s) {
    if (s === 'conn') return 5 + totalConn(G) * 2;
    const v = G.stats[s];
    return s === 'con' ? v : Math.max(0, v - thirstPenalty(G));
  }

  function career(G) { return G.career ? CAREERS[G.career.id] : null; }
  function rankName(G) { const c = career(G); return c ? c.ranks[G.career.rankIdx].name : '무직'; }
  function nextRank(G) { const c = career(G); if (!c) return null; return c.ranks[G.career.rankIdx + 1] || null; }
  function examFee(G) { const n = nextRank(G); return n ? Math.max(1, Math.round(n.rep * C.EXAM_FEE_RATIO)) : 0; }
  function questBonus(G) {
    if (!G.career) return 1;
    return G.career.id === 'fixer' ? 1 + C.BONUS_FIXER : G.career.id === 'thumb' ? 1 + C.BONUS_THUMB : 1;
  }

  function newGame(name, birth, rng) {
    rng = rng || Math.random;
    const conn = {}; CONN_TYPES.forEach(function (k) { conn[k] = 0; });
    birth.conn.forEach(function (c) { conn[c.type] = (conn[c.type] || 0) + c.val; });
    const G = {
      v: 1, name: name || '이름 없는 자', phase: 'childhood', day: 1, ap: C.AP_MAX, apMax: C.AP_MAX,
      birth: birth, stats: { str: birth.stats.str, con: birth.stats.con, agi: birth.stats.agi },
      hp: 0, an: birth.an, rep: 0, infamy: 0, thirst: 0, bloodPacks: 0,
      conn: conn, career: null, weapons: ['fist'], weapon: 'fist', slots: [], shin: false, wang: 0, tattoo: 0,
      ledger: [], directive: null, quests: [], uid: 1, childhood: { order: [], idx: 0 }, pendingPoints: 0,
      transferPrompt: false, todayEvent: null, log: [], dayStats: { quests: 0, wins: 0, earned: 0 },
      counters: { quests: 0, wins: 0, exams: 0, days: 0 }, pending: null, dead: false, deathCause: '',
    };
    G.hp = maxHp(G);
    G.childhood.order = shuffle(EV.CHILDHOOD.map(function (e) { return e.id; }), rng).slice(0, 3);
    setDefaultSlots(G);
    log(G, birth.story);
    return G;
  }

  /* ---------- 효과 적용 ---------- */
  function addStat(G, s, n) {
    const before = G.stats[s];
    G.stats[s] = clamp(G.stats[s] + n, 0, C.STAT_CAP);
    if (s === 'con') G.hp = clamp(G.hp + (G.stats[s] - before) * 5, 1, maxHp(G));
  }
  function applyEffects(G, eff) {
    const out = [];
    const g = grade(G);
    STATS.forEach(function (s) { if (eff[s]) { addStat(G, s, eff[s]); out.push(STAT_NAMES[s] + ' +' + eff[s]); } });
    if (eff.an) { G.an = Math.max(0, G.an + eff.an); out.push('안 ' + (eff.an > 0 ? '+' : '') + eff.an); }
    if (eff.anMul) {
      const v = Math.round(eff.anMul * GR.an[g]);
      G.an = Math.max(0, G.an + v); out.push('안 ' + (v >= 0 ? '+' : '') + v);
    }
    if (eff.repMul) {
      const v = Math.round(eff.repMul * repReward(g));
      G.rep += v; out.push('평판 +' + v);
    }
    if (eff.hpPct) {
      const v = Math.round(maxHp(G) * eff.hpPct);
      G.hp = clamp(G.hp + v, 1, maxHp(G)); out.push('생명력 ' + (v >= 0 ? '+' : '') + v);
    }
    if (eff.conn) Object.keys(eff.conn).forEach(function (k) { G.conn[k] = (G.conn[k] || 0) + eff.conn[k]; out.push(k + ' 연줄 +' + eff.conn[k]); });
    if (eff.infamy) { G.infamy += eff.infamy; out.push('악명 +' + eff.infamy); }
    return out;
  }

  /* ---------- 유년기 ---------- */
  function currentChildhood(G) {
    const id = G.childhood.order[G.childhood.idx];
    return id ? EV.CHILDHOOD.filter(function (e) { return e.id === id; })[0] : null;
  }
  function childhoodChoose(G, ci) {
    const ev = currentChildhood(G);
    if (!ev) return null;
    const ch = ev.choices[ci];
    const out = applyEffects(G, ch.effects);
    log(G, ev.title + ' — ' + ch.label + ': ' + ch.result);
    G.childhood.idx++;
    if (G.childhood.idx >= G.childhood.order.length) { G.phase = 'career'; G.pendingPoints = 5; }
    return { text: ch.result, effects: out };
  }
  function allocate(G, s) {
    if (G.pendingPoints <= 0 || G.stats[s] >= C.STAT_CAP) return false;
    G.pendingPoints--; addStat(G, s, 1); return true;
  }

  /* ---------- 소속 ---------- */
  function canJoin(G, id) {
    const c = CAREERS[id];
    if (!c) return { ok: false, reason: '없는 소속' };
    if (G.career && G.career.id === id) return { ok: false, reason: '이미 소속됨' };
    if (!c.join) return { ok: true };
    if (c.join.conn) {
      const have = G.conn[c.join.conn] || 0;
      return have >= c.join.val ? { ok: true } : { ok: false, reason: c.join.conn + ' 연줄 ' + c.join.val + ' 필요 (현재 ' + have + ')' };
    }
    if (c.join.stat) {
      const have = G.stats[c.join.stat];
      return have >= c.join.val ? { ok: true } : { ok: false, reason: STAT_NAMES[c.join.stat] + ' ' + c.join.val + ' 필요 (현재 ' + have + ')' };
    }
    return { ok: true };
  }
  function joinCareer(G, id, school) {
    const c = CAREERS[id];
    if (id === 'ring' && !SCHOOLS[school]) return { ok: false, reason: '화풍을 골라야 한다' };
    G.career = { id: id, rankIdx: 0, school: id === 'ring' ? school : null };
    G.phase = 'hub';
    setDefaultSlots(G);
    log(G, c.name + '에 들어섰다.' + (id === 'ring' ? ' 화풍: ' + SCHOOLS[school].name : ''));
    if (G.quests.length === 0) { G.quests = genQuests(G, Math.random); }
    if (id === 'index') G.directive = newDirective(G, Math.random);
    return { ok: true };
  }
  function canTransfer(G) {
    return !!(G.career && G.career.id === 'pinky' && G.career.rankIdx >= 1);
  }
  function transfer(G, id, school) {
    if (!canTransfer(G) || id === 'pinky' || CAREERS[id].kind !== 'finger') return { ok: false, reason: '이적할 수 없다' };
    if (id === 'ring' && !SCHOOLS[school]) return { ok: false, reason: '화풍을 골라야 한다' };
    G.career = { id: id, rankIdx: 0, school: id === 'ring' ? school : null };
    G.transferPrompt = false;
    G.directive = id === 'index' ? newDirective(G, Math.random) : null;
    setDefaultSlots(G);
    log(G, '소지를 떠나 ' + CAREERS[id].name + '로 이적했다. 평판은 그대로지만 계급은 최하위부터 다시 시작한다.');
    return { ok: true };
  }
  function stayPinky(G) { G.transferPrompt = false; }

  /* ---------- 스킬 슬롯 ---------- */
  function availableSkills(G) {
    const list = WEAPONS[G.weapon].skills.slice();
    if (G.career && G.career.school) list.push.apply(list, SCHOOLS[G.career.school].skills);
    return list;
  }
  function setDefaultSlots(G) {
    const av = availableSkills(G);
    // 공격 스킬 위주로 채우되 방어/회피를 하나는 포함
    const atk = av.filter(function (id) { return SKILLS[id].type === 'attack'; });
    const def = av.filter(function (id) { return SKILLS[id].type !== 'attack'; });
    const slots = def.slice(0, 1).concat(atk).slice(0, MAX_SLOTS);
    G.slots = slots;
  }
  function toggleSlot(G, id) {
    if (availableSkills(G).indexOf(id) < 0) return false;
    const i = G.slots.indexOf(id);
    if (i >= 0) {
      const rest = G.slots.filter(function (s) { return s !== id; });
      if (!rest.some(function (s) { return SKILLS[s].type === 'attack'; })) return false;
      G.slots = rest; return true;
    }
    if (G.slots.length >= MAX_SLOTS) return false;
    G.slots.push(id); return true;
  }

  /* ---------- 전투 구성 ---------- */
  function playerCfg(G) {
    let slots = G.slots.filter(function (id) { return availableSkills(G).indexOf(id) >= 0; });
    if (!slots.some(function (s) { return SKILLS[s].type === 'attack'; })) { setDefaultSlots(G); slots = G.slots; }
    return { name: G.name, maxHp: maxHp(G), hp: G.hp, str: effStat(G, 'str'), agi: effStat(G, 'agi'),
      wang: G.wang, shin: G.shin, tattoo: G.tattoo, skills: slots };
  }
  function enemyNameGroup(g) { return g >= 7 ? 'A' : g >= 4 ? 'B' : g >= 1 ? 'C' : 'D'; }
  function makeEnemy(g, rng, name) {
    const wp = g >= 7 ? ['fist', 'dagger'] : g >= 4 ? ['dagger', 'sword', 'blunt'] : ['sword', 'spear', 'axe', 'blunt'];
    const w = WEAPONS[pickOne(wp, rng)];
    const names = EV.ENEMY_NAMES[enemyNameGroup(g)];
    return {
      name: name || pickOne(names, rng), maxHp: GR.enemyHp[g],
      str: g === 0 ? 25 : 3 + (9 - g) * 2, agi: g === 0 ? 20 : Math.round(5 + (9 - g) * 1.5),
      wang: GR.enemyWang[g], skills: w.skills.filter(function (id) { return g < 8 || SKILLS[id].type === 'attack'; }), weaponName: w.name, grade: g,
    };
  }

  function startBattle(G, ctx, rng, luck) {
    rng = rng || Math.random;
    const enemy = ctx.enemy || makeEnemy(ctx.grade, rng, ctx.enemyName);
    ctx.enemy = enemy;
    G.pending = ctx;
    const b = Battle.createBattle(playerCfg(G), enemy, { lethal: ctx.lethal !== false, luck: luck });
    return b;
  }

  /* ---------- 일일 지령(검지) ---------- */
  function newDirective(G, rng) {
    const g = grade(G);
    const t = pickOne(['quests', 'wins', 'earn'], rng);
    let target, desc;
    if (t === 'quests') { target = 2 + Math.floor(rng() * 2); desc = '오늘 의뢰 ' + target + '건 완수'; }
    else if (t === 'wins') { target = 1 + Math.floor(rng() * 2); desc = '오늘 전투 ' + target + '회 승리'; }
    else { target = GR.an[g] * 2; desc = '오늘 의뢰로 ' + target + ' 안 벌기'; }
    return { type: t, target: target, desc: desc, an: GR.an[g], rep: Math.round(repReward(g) * 1.5) };
  }
  function directiveProgress(G) {
    const d = G.directive; if (!d) return 0;
    return d.type === 'quests' ? G.dayStats.quests : d.type === 'wins' ? G.dayStats.wins : G.dayStats.earned;
  }

  /* ---------- 의뢰 ---------- */
  function genQuests(G, rng) {
    const g = grade(G);
    const tpls = shuffle(EV.QUESTS.map(function (q) { return q.id; }), rng).slice(0, 3);
    const hardIdx = rng() < 0.35 ? Math.floor(rng() * 3) : -1;
    return tpls.map(function (id, i) {
      const hard = i === hardIdx && g > 0;
      return { uid: G.uid++, tpl: id, grade: hard ? g - 1 : g, hard: hard };
    });
  }
  function tplOf(id) { return EV.QUESTS.filter(function (q) { return q.id === id; })[0]; }
  function questNeed(g) { return 5 + (9 - g) * 2; }
  function questChance(G, q, choice) {
    return clamp(0.5 + (effStat(G, choice.stat) - questNeed(q.grade)) * 0.04, 0.12, 0.92);
  }
  function questReward(G, q, mul, extra) {
    return {
      an: Math.round(GR.an[q.grade] * mul * (extra || 1) * questBonus(G)),
      rep: Math.round(repReward(q.grade) * mul),
    };
  }
  function questDone(G, q, rew) {
    G.an += rew.an; G.rep += rew.rep;
    G.counters.quests++; G.dayStats.quests++; G.dayStats.earned += rew.an;
    if (G.counters.quests % 8 === 0) { G.pendingPoints++; log(G, '경험이 쌓여 능력치 포인트 +1'); }
  }
  function spendAP(G, n) { if (G.ap < n) return false; G.ap -= n; return true; }
  function removeQuest(G, uid) { G.quests = G.quests.filter(function (x) { return x.uid !== uid; }); }

  // 의뢰 선택지 실행. fight이면 { fight: ctx }를 돌려주고 UI가 전투를 연다.
  function chooseQuest(G, uid, ci, rng) {
    rng = rng || Math.random;
    const q = G.quests.filter(function (x) { return x.uid === uid; })[0];
    if (!q) return { ok: false, reason: '없는 의뢰' };
    if (G.ap < 1) return { ok: false, reason: '행동력이 없다' };
    const tpl = tplOf(q.tpl), ch = tpl.choices[ci];
    spendAP(G, 1);
    if (ch.kind === 'fight') {
      return { ok: true, fight: { kind: 'quest', uid: uid, grade: q.grade, lethal: true, mul: ch.mul, label: tpl.title + ' — ' + ch.label, quest: q } };
    }
    removeQuest(G, uid);
    if (ch.kind === 'safe') {
      const rew = questReward(G, q, ch.mul); questDone(G, q, rew);
      log(G, tpl.title + ' 완수 (+' + rew.an + '안, 평판 +' + rew.rep + ')');
      return { ok: true, success: true, text: '무사히 마쳤다.', reward: rew };
    }
    const p = questChance(G, q, ch);
    if (rng() < p) {
      const rew = questReward(G, q, ch.mul); questDone(G, q, rew);
      log(G, tpl.title + ' 성공 (+' + rew.an + '안, 평판 +' + rew.rep + ')');
      return { ok: true, success: true, text: '판단이 맞았다. 의뢰를 깔끔하게 마쳤다.', reward: rew, chance: p };
    }
    const loss = Math.ceil(maxHp(G) * 0.12);
    G.hp = Math.max(1, G.hp - loss);
    log(G, tpl.title + ' 실패 (생명력 -' + loss + ')');
    return { ok: true, success: false, text: '일이 틀어졌다. 보상은 없고, 상처만 남았다. (생명력 -' + loss + ')', hpLoss: loss, chance: p };
  }

  /* ---------- 승급 시험 / 입사 시험 ---------- */
  function canExam(G) {
    const n = nextRank(G);
    if (!n) return { ok: false, reason: '최고 계급이다' };
    if (G.rep < n.rep) return { ok: false, reason: '평판 ' + n.rep + ' 필요' };
    if (G.ap < 1) return { ok: false, reason: '행동력이 없다' };
    if (G.an < examFee(G)) return { ok: false, reason: '응시료 ' + examFee(G) + '안 필요' };
    return { ok: true };
  }
  function startExam(G) {
    const c = canExam(G);
    if (!c.ok) return c;
    const n = nextRank(G);
    G.an -= examFee(G); G.ap -= 1;
    return { ok: true, fight: { kind: 'exam', grade: equivGrade(n.rep), lethal: false, enemyName: '승급 시험관', label: '승급 시험: ' + n.name } };
  }
  function startCorpExam(G, id) {
    const c = canJoin(G, id);
    if (!c.ok) return c;
    return { ok: true, fight: { kind: 'corpExam', corp: id, grade: 9, lethal: false, enemyName: CAREERS[id].name + ' 입사 시험관', label: CAREERS[id].name + ' 입사 시험' } };
  }
  function startLedger(G, idx) {
    const e = G.ledger[idx];
    if (!e) return { ok: false, reason: '없는 항목' };
    if (G.ap < 1) return { ok: false, reason: '행동력이 없다' };
    G.ap -= 1;
    return { ok: true, fight: { kind: 'ledger', idx: idx, grade: e.grade, lethal: true, enemyName: e.name, label: '앙갚음: ' + e.name } };
  }

  /* ---------- 혈귀 ---------- */
  function buyPack(G) {
    if (!isHyeolgwi(G)) return { ok: false, reason: '혈귀가 아니다' };
    if (G.an < C.BLOOD_PACK_PRICE) return { ok: false, reason: '안이 모자라다' };
    G.an -= C.BLOOD_PACK_PRICE; G.bloodPacks++; return { ok: true };
  }
  function usePack(G) {
    if (!isHyeolgwi(G) || G.bloodPacks < 1) return { ok: false, reason: '혈액팩이 없다' };
    G.bloodPacks--; G.thirst = Math.max(0, G.thirst - C.BLOOD_PACK_EFFECT);
    log(G, '혈액팩으로 갈증을 달랬다.');
    return { ok: true };
  }
  function drawBlood(G, rng) {
    rng = rng || Math.random;
    if (!isHyeolgwi(G)) return { ok: false, reason: '혈귀가 아니다' };
    if (G.ap < 1) return { ok: false, reason: '행동력이 없다' };
    G.ap -= 1;
    G.thirst = Math.max(0, G.thirst - C.DRAW_BLOOD_EFFECT);
    G.infamy += 5;
    log(G, '밤길에서 사람의 피를 뽑아 갈증을 달랬다. 악명 +5');
    const p = clamp(0.2 + G.infamy * 0.01, 0.2, 0.8);
    if (rng() < p) {
      return { ok: true, fight: { kind: 'encounter', grade: grade(G), lethal: true, enemyName: '치안 요원', label: '치안 요원과 조우' } };
    }
    return { ok: true, text: '들키지 않았다.' };
  }

  /* ---------- 상점 ---------- */
  function buyWeapon(G, id) {
    const w = WEAPONS[id];
    if (!w || G.weapons.indexOf(id) >= 0) return { ok: false, reason: '이미 가졌다' };
    if (G.an < w.price) return { ok: false, reason: '안이 모자라다' };
    G.an -= w.price; G.weapons.push(id); log(G, w.name + '을(를) 샀다.');
    return { ok: true };
  }
  function equipWeapon(G, id) {
    if (G.weapons.indexOf(id) < 0) return false;
    G.weapon = id; setDefaultSlots(G); return true;
  }
  function healCostPerHp(G) { return 0.4 + (9 - grade(G)) * 0.1; }
  function healCost(G, hp) { return Math.ceil(hp * healCostPerHp(G)); }
  function heal(G, hpAmount) {
    const missing = maxHp(G) - G.hp;
    const n = Math.min(hpAmount, missing);
    if (n <= 0) return { ok: false, reason: '이미 멀쩡하다' };
    const cost = healCost(G, n);
    if (G.an < cost) return { ok: false, reason: '안이 모자라다' };
    G.an -= cost; G.hp += n;
    return { ok: true, healed: n, cost: cost };
  }

  /* ---------- 소지 훈련 ---------- */
  function trainChance(G, s) { return clamp(0.6 - (G.stats[s] - 5) * 0.02, 0.15, 0.6); }
  function trainStat(G, s, rng) {
    rng = rng || Math.random;
    if (!G.career || G.career.id !== 'pinky') return { ok: false, reason: '소지 전용이다' };
    if (G.ap < 1) return { ok: false, reason: '행동력이 없다' };
    if (G.stats[s] >= C.STAT_CAP) return { ok: false, reason: '더 오를 수 없다' };
    G.ap -= 1;
    if (rng() < trainChance(G, s)) {
      addStat(G, s, 1);
      log(G, '훈련으로 ' + STAT_NAMES[s] + '이(가) 올랐다.');
      return { ok: true, success: true };
    }
    return { ok: true, success: false };
  }

  /* ---------- 일일 이벤트 ---------- */
  function currentDaily(G) {
    return G.todayEvent ? EV.DAILY.filter(function (e) { return e.id === G.todayEvent; })[0] : null;
  }
  function dailyChoose(G, ci) {
    const ev = currentDaily(G);
    if (!ev) return null;
    const ch = ev.choices[ci];
    const out = applyEffects(G, ch.effects);
    G.todayEvent = null;
    log(G, ev.title + ' — ' + ch.label + ': ' + ch.result);
    return { text: ch.result, effects: out };
  }

  /* ---------- 하루 끝 ---------- */
  function endDay(G, rng) {
    rng = rng || Math.random;
    const lines = [];
    const g = grade(G);

    // 지령 판정
    if (G.career && G.career.id === 'index' && G.directive) {
      const d = G.directive;
      if (directiveProgress(G) >= d.target) {
        G.an += d.an; G.rep += d.rep;
        lines.push('지령 완수: ' + d.desc + ' (안 +' + d.an + ', 평판 +' + d.rep + ')');
      } else {
        const floor = career(G).ranks[G.career.rankIdx].rep;
        const loss = Math.min(Math.round(d.rep / 2), Math.max(0, G.rep - floor));
        G.rep -= loss;
        lines.push('지령 실패: ' + d.desc + ' (평판 -' + loss + ')');
      }
    }

    // 생활비·급여
    const living = GR.living[g];
    if (G.an >= living) { G.an -= living; lines.push('생활비 ' + living + '안'); }
    else {
      const hurt = Math.ceil(maxHp(G) * 0.1);
      G.an = 0; G.hp = Math.max(1, G.hp - hurt);
      lines.push('생활비를 내지 못해 굶었다 (생명력 -' + hurt + ')');
    }
    if (G.career && career(G).kind === 'corp') {
      const w = career(G).wage[G.career.rankIdx];
      G.an += w; lines.push('급여 +' + w + '안');
    }

    // 회복
    const reg = Math.round(maxHp(G) * C.REGEN_RATIO);
    G.hp = Math.min(maxHp(G), G.hp + reg);

    // 혈귀 갈증
    if (isHyeolgwi(G)) {
      G.thirst = Math.min(100, G.thirst + C.THIRST_RATE[G.birth.grade]);
      if (G.thirst >= 100) {
        const dmg = Math.round(maxHp(G) * 0.3);
        G.hp = Math.max(1, G.hp - dmg); G.infamy += 20; G.thirst = 60;
        lines.push('갈증이 폭주했다! 정신을 차려 보니 거리가 어지럽다. (생명력 -' + dmg + ', 악명 +20)');
      } else if (G.thirst >= 75) {
        const dmg = Math.round(maxHp(G) * 0.05);
        G.hp = Math.max(1, G.hp - dmg);
        lines.push('갈증이 몸을 갉아먹는다. (생명력 -' + dmg + ')');
      }
    }
    G.infamy = Math.max(0, G.infamy - 1);

    // 새 날
    G.day++; G.counters.days++; G.ap = G.apMax;
    G.dayStats = { quests: 0, wins: 0, earned: 0 };
    G.quests = genQuests(G, rng);
    if (G.career && G.career.id === 'index') G.directive = newDirective(G, rng);
    G.todayEvent = rng() < 0.55 ? pickOne(EV.DAILY, rng).id : null;
    lines.forEach(function (t) { log(G, t); });
    return lines;
  }

  /* ---------- 전투 종료 처리 ---------- */
  function addLedger(G, enemy) {
    G.ledger.push({ name: enemy.name, grade: enemy.grade });
    if (G.ledger.length > LEDGER_MAX) G.ledger.shift();
  }
  function lossPenalty(G, ctx, lines) {
    // 전투에서 졌을 때(도주·항복·비치명 패배) 소속별 효과
    if (G.career && G.career.id === 'thumb' && ctx.kind === 'quest') {
      const base = Math.round(GR.an[ctx.grade] * ctx.mul * questBonus(G));
      const t = Math.min(G.an, Math.round(base * C.TRIBUTE_RATIO));
      G.an -= t; lines.push('상납금 ' + t + '안을 바쳤다.');
    }
    if (G.career && G.career.id === 'middle' && ctx.kind !== 'ledger') {
      addLedger(G, ctx.enemy);
      lines.push(ctx.enemy.name + '의 이름이 앙갚음 장부에 올랐다.');
    }
  }

  function applyPromotion(G, lines) {
    const c = career(G);
    G.career.rankIdx++;
    G.pendingPoints += C.PROMOTE_POINTS;
    G.counters.exams++;
    lines.push('승급! ' + c.ranks[G.career.rankIdx].name + ' (능력치 포인트 +' + C.PROMOTE_POINTS + ')');
    if (c.id === 'pinky') {
      if (G.career.rankIdx === 1) {
        if (!G.shin) G.shin = true;
        G.wang = Math.max(G.wang, 1);
        lines.push('지살성이 되어 신(心)과 1망(望)을 얻었다!');
      }
      G.transferPrompt = true;
    }
    log(G, '승급: ' + c.ranks[G.career.rankIdx].name);
  }

  // 전투가 끝난 뒤 호출. ctx는 startBattle에 넘긴 값. 반환: { title, lines, tone }
  function finishBattle(G, ctx, b) {
    const P = b.player, lines = [];
    const out = b.outcome;
    G.pending = null;
    G.shin = P.shin; G.wang = P.wang;
    G.hp = Math.max(0, P.hp);
    let title = '', tone = 'neutral';

    if (out === 'death' || (out === 'draw' && ctx.lethal !== false)) {
      G.dead = true; G.hp = 0;
      G.deathCause = ctx.label + ' — ' + ctx.enemy.name + '에게 쓰러졌다.';
      log(G, G.deathCause);
      return { title: '쓰러졌다', lines: ['생명력이 바닥났다.'], tone: 'bad', dead: true };
    }
    if (out === 'draw') {
      G.hp = 1; title = '무승부'; lines.push('둘 다 쓰러졌다. 시험은 무효 처리된다.');
      return { title: title, lines: lines, tone: 'neutral' };
    }

    if (out === 'win') {
      G.counters.wins++;
      if (ctx.kind !== 'exam' && ctx.kind !== 'corpExam') G.dayStats.wins++;
      tone = 'good'; title = '승리';
      if (ctx.kind === 'quest') {
        removeQuest(G, ctx.uid);
        const rew = questReward(G, ctx.quest, ctx.mul, 1.2);
        questDone(G, ctx.quest, rew);
        lines.push('의뢰 완수. 안 +' + rew.an + ', 평판 +' + rew.rep + ' (전리품 포함)');
        log(G, ctx.label + ' 승리 (+' + rew.an + '안)');
      } else if (ctx.kind === 'exam') {
        applyPromotion(G, lines);
      } else if (ctx.kind === 'corpExam') {
        joinCareer(G, ctx.corp, null);
        lines.push(CAREERS[ctx.corp].name + ' 입사 시험에 합격했다.');
      } else if (ctx.kind === 'ledger') {
        G.ledger.splice(ctx.idx, 1);
        G.tattoo++;
        lines.push('앙갚음 완료. 강화문신을 새겼다. 합 위력 +1 (현재 +' + G.tattoo + ')');
        log(G, '강화문신 +1');
      } else if (ctx.kind === 'encounter') {
        G.infamy = Math.max(0, G.infamy - 3);
        lines.push('치안 요원을 따돌렸다. 악명 -3');
      }
      return { title: title, lines: lines, tone: tone };
    }

    // defeat / retreat
    tone = 'bad';
    title = out === 'retreat' ? '물러났다' : '패배';
    if (out === 'defeat') G.hp = 1;
    if (ctx.kind === 'quest') {
      removeQuest(G, ctx.uid);
      lines.push('의뢰는 실패했다. 보상은 없다.');
    } else if (ctx.kind === 'exam') {
      lines.push('시험에 떨어졌다. 응시료는 돌려받지 못한다. 다시 응시하려면 새로 응시료를 내야 한다.');
    } else if (ctx.kind === 'corpExam') {
      lines.push('입사 시험에 떨어졌다. 다시 도전할 수 있다.');
    } else if (ctx.kind === 'ledger') {
      lines.push('앙갚음에 실패했다. 이름은 장부에 남아 있다.');
    } else if (ctx.kind === 'encounter') {
      const fine = Math.round(G.an * 0.25);
      G.an -= fine; G.infamy += 3;
      lines.push('벌금으로 ' + fine + '안을 뜯겼다. 악명 +3');
    }
    lossPenalty(G, ctx, lines);
    log(G, ctx.label + ' — ' + title);
    return { title: title, lines: lines, tone: tone };
  }

  // 전투 도중 창을 닫았다가 다시 열면 도주(항복)로 처리
  function resolvePending(G) {
    if (!G.pending) return null;
    const ctx = G.pending;
    const fake = { outcome: 'retreat', player: { hp: G.hp, shin: G.shin, wang: G.wang } };
    return finishBattle(G, ctx, fake);
  }

  /* ---------- 저장 ---------- */
  function store() { try { return root.localStorage || null; } catch (e) { return null; } }
  function save(G) {
    const s = store(); if (!s) return false;
    try { s.setItem(C.SAVE_KEY, JSON.stringify(G)); return true; } catch (e) { return false; }
  }
  function hasSave() {
    const s = store(); if (!s) return false;
    try { return !!s.getItem(C.SAVE_KEY); } catch (e) { return false; }
  }
  function load() {
    const s = store(); if (!s) return null;
    try {
      const raw = s.getItem(C.SAVE_KEY);
      if (!raw) return null;
      const G = JSON.parse(raw);
      if (!G || G.v !== 1 || G.dead) return null;
      return G;
    } catch (e) { return null; }
  }
  function clearSave() { const s = store(); if (s) { try { s.removeItem(C.SAVE_KEY); } catch (e) { /* ignore */ } } }

  const api = {
    STATS: STATS, STAT_NAMES: STAT_NAMES, CONN_TYPES: CONN_TYPES, MAX_SLOTS: MAX_SLOTS,
    equivGrade: equivGrade, gradeName: gradeName, repReward: repReward,
    newGame: newGame, maxHp: maxHp, grade: grade, totalConn: totalConn, effStat: effStat,
    thirstLevel: thirstLevel, thirstPenalty: thirstPenalty, isHyeolgwi: isHyeolgwi,
    career: career, rankName: rankName, nextRank: nextRank, examFee: examFee, questBonus: questBonus,
    applyEffects: applyEffects, currentChildhood: currentChildhood, childhoodChoose: childhoodChoose, allocate: allocate,
    canJoin: canJoin, joinCareer: joinCareer, canTransfer: canTransfer, transfer: transfer, stayPinky: stayPinky,
    availableSkills: availableSkills, setDefaultSlots: setDefaultSlots, toggleSlot: toggleSlot,
    playerCfg: playerCfg, makeEnemy: makeEnemy, startBattle: startBattle, finishBattle: finishBattle, resolvePending: resolvePending,
    newDirective: newDirective, directiveProgress: directiveProgress,
    genQuests: genQuests, tplOf: tplOf, questNeed: questNeed, questChance: questChance, questReward: questReward, chooseQuest: chooseQuest,
    canExam: canExam, startExam: startExam, startCorpExam: startCorpExam, startLedger: startLedger,
    buyPack: buyPack, usePack: usePack, drawBlood: drawBlood,
    buyWeapon: buyWeapon, equipWeapon: equipWeapon, healCost: healCost, heal: heal,
    trainChance: trainChance, trainStat: trainStat,
    currentDaily: currentDaily, dailyChoose: dailyChoose, endDay: endDay,
    save: save, hasSave: hasSave, load: load, clearSave: clearSave,
    rollBirth: Birth.rollBirth,
  };
  if (isNode) module.exports = api;
  else { root.PMG = root.PMG || {}; root.PMG.World = api; }
})(typeof window !== 'undefined' ? window : globalThis);
