/* 전투 엔진: 빛, 별, 합, 방어/회피, 흐트러짐, 신·망 획득 (설계서 v0.4) */
(function (root) {
  'use strict';

  const DATA = (typeof module !== 'undefined' && module.exports) ? require('./data.js') : root.PMG.DATA;
  const SKILLS = DATA.SKILLS;

  const LIGHT_START = 3;      // 시작 빛 최대치
  const LIGHT_CAP = 9;        // 빛 최대치 상한
  const LIGHT_GROW_EVERY = 3; // 3라운드마다 최대치 +1
  const STAGGER_RATIO = 0.5;  // 흐트러짐 게이지 = 최대 생명력의 50% (임시)
  const LUCK_CHANCE = 0.0001; // 매 합마다 0.01%로 신(心), 이미 있으면 망(望) 획득
  const WANG_MAX = 7;

  function randInt(rng, lo, hi) {
    return lo + Math.floor(rng() * (hi - lo + 1));
  }

  function createFighter(cfg) {
    const maxStagger = Math.max(1, Math.round(cfg.maxHp * STAGGER_RATIO));
    return {
      name: cfg.name,
      maxHp: cfg.maxHp, hp: cfg.hp != null ? Math.max(1, Math.min(cfg.maxHp, cfg.hp)) : cfg.maxHp,
      maxStagger: maxStagger, stagger: maxStagger,
      maxLight: LIGHT_START, light: LIGHT_START,
      str: Math.max(0, cfg.str != null ? cfg.str : 5), agi: Math.max(0, cfg.agi != null ? cfg.agi : 5),
      wang: Math.min(WANG_MAX, cfg.wang || 0),
      shin: !!cfg.shin,
      tattoo: cfg.tattoo || 0,
      skills: cfg.skills.slice(),
      staggered: false,
    };
  }

  function createBattle(playerCfg, enemyCfg, opts) {
    opts = opts || {};
    return {
      round: 1,
      player: createFighter(playerCfg),
      enemy: createFighter(enemyCfg),
      lethal: opts.lethal !== false,
      luck: opts.luck || Math.random,
      over: false,
      outcome: null, // win | defeat | death | draw | retreat
    };
  }

  // 합 위력 보너스: 망 +3씩, 강화문신 +1씩, 힘(공격 5당 +1), 민첩(회피 5당 +1)
  function bonusFor(f, skill) {
    let b = f.wang * 3 + f.tattoo;
    if (skill.type === 'attack') b += Math.floor(f.str / 5);
    else if (skill.type === 'evade') b += Math.floor(f.agi / 5);
    return b;
  }

  function rollDie(f, skill, rng) {
    const base = randInt(rng, skill.power[0], skill.power[1]);
    const bonus = bonusFor(f, skill);
    return { base: base, bonus: bonus, total: base + bonus };
  }

  // 라운드 시작: 3라운드마다 빛 최대치 +1, 빛 +1 충전 (1라운드는 가득 찬 상태로 시작)
  function beginRound(state) {
    if (state.round <= 1) return;
    [state.player, state.enemy].forEach(function (f) {
      if ((state.round - 1) % LIGHT_GROW_EVERY === 0) f.maxLight = Math.min(LIGHT_CAP, f.maxLight + 1);
      f.light = Math.min(f.maxLight, f.light + 1);
    });
  }

  function gainLight(f, n) {
    const before = f.light;
    f.light = Math.min(f.maxLight, f.light + n);
    return f.light - before;
  }

  // 피해 처리: 흐트러짐 중이면 x2, 신이 있으면 x0.9, 반올림 (최소 1). sm은 흐트러짐 게이지 추가 배수
  function applyDamage(target, raw, sm) {
    if (raw <= 0) return 0;
    let v = raw;
    if (target.staggered) v *= 2;
    if (target.shin) v *= 0.9;
    v = Math.max(1, Math.round(v));
    target.hp = Math.max(0, target.hp - v);
    target.stagger = Math.max(0, target.stagger - Math.round(v * (sm || 1)));
    return v;
  }

  function label(f, skill, die) {
    return f.name + '의 ' + skill.name + '(' + die.total + ')';
  }

  // 한 번의 합 판정. P/E 각각 스킬(ps/es)과 주사위(pd/ed)는 null일 수 있다.
  function clash(P, ps, pd, E, es, ed) {
    const rec = { pDie: pd, eDie: ed, dmgToP: 0, dmgToE: 0, pLight: 0, eLight: 0, kind: '', text: '' };
    const pAtk = !!ps && ps.type === 'attack';
    const eAtk = !!es && es.type === 'attack';

    if (!pd && !ed) { rec.kind = 'idle'; rec.text = '아무도 움직이지 못했다.'; return rec; }

    // 상대에게 주사위가 없는 경우 (흐트러짐 또는 남는 타수)
    if (pd && !ed) {
      if (pAtk) {
        rec.dmgToE = applyDamage(E, pd.total, ps.staggerMult);
        rec.kind = 'unopposed';
        rec.text = label(P, ps, pd) + ' 막을 수단 없이 적중 → ' + E.name + ' ' + rec.dmgToE + ' 피해';
      } else { rec.kind = 'idle'; rec.text = label(P, ps, pd) + ' 상대가 움직이지 않았다.'; }
      return rec;
    }
    if (!pd && ed) {
      if (eAtk) {
        rec.dmgToP = applyDamage(P, ed.total, es.staggerMult);
        rec.kind = 'unopposed';
        rec.text = label(E, es, ed) + ' 막을 수단 없이 적중 → ' + P.name + ' ' + rec.dmgToP + ' 피해';
      } else { rec.kind = 'idle'; rec.text = label(E, es, ed) + ' 상대가 움직이지 않았다.'; }
      return rec;
    }

    const head = label(P, ps, pd) + ' vs ' + label(E, es, ed) + ' — ';

    if (pAtk && eAtk) {
      let winner = 0;
      if (pd.total > ed.total) winner = 1;
      else if (ed.total > pd.total) winner = -1;
      else {
        const pt = ps.effect === 'tiebreak', et = es.effect === 'tiebreak';
        if (pt && !et) winner = 1; else if (et && !pt) winner = -1;
      }
      if (winner === 1) {
        rec.dmgToE = applyDamage(E, pd.total, ps.staggerMult); rec.kind = 'win';
        rec.text = head + P.name + ' 승리, ' + E.name + ' ' + rec.dmgToE + ' 피해';
      } else if (winner === -1) {
        rec.dmgToP = applyDamage(P, ed.total, es.staggerMult); rec.kind = 'lose';
        rec.text = head + E.name + ' 승리, ' + P.name + ' ' + rec.dmgToP + ' 피해';
      } else { rec.kind = 'tie'; rec.text = head + '동점, 서로 상쇄'; }
      return rec;
    }

    if (pAtk || eAtk) {
      const aSide = pAtk ? 'p' : 'e';
      const D = pAtk ? E : P;
      const as = pAtk ? ps : es, ds = pAtk ? es : ps;
      const ad = pAtk ? pd : ed, dd = pAtk ? ed : pd;
      let dmg = 0, kind = '', tail = '';
      if (ds.type === 'defense') {
        const eff = as.effect === 'pierce' ? Math.floor(dd.total * (1 - as.pierce)) : dd.total;
        dmg = Math.max(0, ad.total - eff);
        if (ad.total <= eff) {
          kind = 'guard';
          const g = gainLight(D, 1);
          tail = D.name + ' 방어 성공' + (g ? ', 빛 +1' : '');
          if (aSide === 'p') rec.eLight = g; else rec.pLight = g;
        } else {
          kind = 'guardPartial';
          tail = D.name + ' 방어했지만 ' + (as.effect === 'pierce' ? '관통되어 ' : '') + '일부가 뚫림';
        }
      } else { // evade
        if (dd.total > ad.total) {
          kind = 'evade';
          const g = gainLight(D, 1);
          tail = D.name + ' 회피 성공' + (g ? ', 빛 +1' : '');
          if (aSide === 'p') rec.eLight = g; else rec.pLight = g;
        } else {
          dmg = ad.total; kind = 'evadeFail';
          tail = D.name + ' 회피 실패';
        }
      }
      const dealt = dmg > 0 ? applyDamage(D, dmg, as.staggerMult) : 0;
      if (dealt > 0) tail += ' → ' + D.name + ' ' + dealt + ' 피해';
      if (aSide === 'p') rec.dmgToE = dealt; else rec.dmgToP = dealt;
      rec.kind = kind;
      rec.text = head + tail;
      return rec;
    }

    rec.kind = 'idle';
    rec.text = head + '둘 다 수비 자세, 아무 일도 없었다.';
    return rec;
  }

  function chooseEnemySkill(state, rng) {
    const e = state.enemy, p = state.player;
    if (e.staggered) return null;
    const usable = e.skills.filter(function (id) { return SKILLS[id].cost <= e.light; }).map(function (id) { return SKILLS[id]; });
    const attacks = usable.filter(function (s) { return s.type === 'attack'; });
    const others = usable.filter(function (s) { return s.type !== 'attack'; });
    if (!attacks.length) return others.length ? others[Math.floor(rng() * others.length)].id : null;
    if (p.staggered) {
      return attacks.reduce(function (a, b) { return b.stars > a.stars ? b : a; }).id;
    }
    if (others.length && rng() < 0.22) return others[Math.floor(rng() * others.length)].id;
    const total = attacks.reduce(function (s, a) { return s + a.stars; }, 0);
    let r = rng() * total;
    for (let i = 0; i < attacks.length; i++) {
      r -= attacks[i].stars;
      if (r < 0) return attacks[i].id;
    }
    return attacks[attacks.length - 1].id;
  }

  function canUse(state, fighter, skillId) {
    const s = SKILLS[skillId];
    return !!s && fighter.skills.indexOf(skillId) >= 0 && !fighter.staggered && s.cost <= fighter.light;
  }

  // 한 라운드 진행. 플레이어가 흐트러진 상태면 playerSkillId는 무시된다.
  function resolveRound(state, playerSkillId, rng) {
    if (state.over) throw new Error('전투가 이미 끝났다');
    rng = rng || Math.random;
    const P = state.player, E = state.enemy;
    const pStunned = P.staggered, eStunned = E.staggered;
    const report = { round: state.round, pSkill: null, eSkill: null, clashes: [], events: [], pStunned: pStunned, eStunned: eStunned };

    let ps = null, es = null;
    if (!pStunned) {
      if (!canUse(state, P, playerSkillId)) throw new Error('사용할 수 없는 스킬');
      ps = SKILLS[playerSkillId];
    }
    const eId = chooseEnemySkill(state, rng);
    es = eId ? SKILLS[eId] : null;
    if (ps) P.light -= ps.cost;
    if (es) E.light -= es.cost;
    report.pSkill = ps; report.eSkill = es;

    const n = Math.max(ps ? ps.hits : 0, es ? es.hits : 0);
    for (let i = 0; i < n; i++) {
      const pd = ps && i < ps.hits ? rollDie(P, ps, rng) : null;
      const ed = es && i < es.hits ? rollDie(E, es, rng) : null;
      report.clashes.push(clash(P, ps, pd, E, es, ed));
      // 플레이어는 매 합마다 0.01% 확률로 신(心)을 얻고, 이미 있으면 망(望)을 얻는다
      if (pd && state.luck() < LUCK_CHANCE) {
        if (!P.shin) { P.shin = true; report.events.push(P.name + '이(가) 신(心)을 얻었다! 받는 피해가 10% 줄어든다'); }
        else if (P.wang < WANG_MAX) { P.wang += 1; report.events.push(P.name + '이(가) 망(望)을 얻었다! 합 위력 +3 (현재 ' + P.wang + '망)'); }
      }
      if (P.hp <= 0 || E.hp <= 0) break;
    }

    // 흐트러짐 정리: 이번 라운드에 흐트러져 있던 쪽은 풀리고, 게이지가 0이 된 쪽은 다음 라운드부터 흐트러짐
    [[P, pStunned], [E, eStunned]].forEach(function (pair) {
      const f = pair[0], wasStunned = pair[1];
      if (wasStunned) {
        f.staggered = false; f.stagger = f.maxStagger;
        report.events.push(f.name + '의 흐트러짐이 풀렸다');
      } else if (f.stagger <= 0 && f.hp > 0) {
        f.staggered = true;
        report.events.push(f.name + ' 흐트러짐! 다음 라운드에 행동할 수 없고 피해를 2배로 받는다');
      }
    });

    const pDead = P.hp <= 0, eDead = E.hp <= 0;
    if (pDead || eDead) {
      state.over = true;
      if (pDead && eDead) state.outcome = state.lethal ? 'death' : 'draw';
      else if (eDead) state.outcome = 'win';
      else state.outcome = state.lethal ? 'death' : 'defeat';
    } else {
      state.round += 1;
      beginRound(state);
    }
    report.over = state.over;
    report.outcome = state.outcome;
    return report;
  }

  function retreat(state) {
    state.over = true;
    state.outcome = 'retreat';
  }

  const api = {
    LIGHT_START: LIGHT_START, LIGHT_CAP: LIGHT_CAP, WANG_MAX: WANG_MAX,
    createBattle: createBattle, resolveRound: resolveRound, retreat: retreat,
    canUse: canUse, bonusFor: bonusFor,
    _t: { clash: clash, applyDamage: applyDamage, rollDie: rollDie, beginRound: beginRound, createFighter: createFighter, chooseEnemySkill: chooseEnemySkill },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.PMG = root.PMG || {}; root.PMG.Battle = api; }
})(typeof window !== 'undefined' ? window : globalThis);
