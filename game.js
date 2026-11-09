/* 화면과 흐름 (1차 프로토타입: 출생 → 전투 시험) */
(function () {
  'use strict';

  const DATA = window.PMG.DATA;
  const Birth = window.PMG.Birth;
  const Battle = window.PMG.Battle;
  const SKILLS = DATA.SKILLS;
  const app = document.getElementById('app');

  const S = {
    screen: 'birth',
    name: '',
    birth: null,
    setup: { weapon: 'dagger', enemy: 0, lethal: true, shin: false, wang: 0, tattoo: 0 },
    battle: null,
    report: null,
    log: [],
    flash: { p: false, e: false },
    focusTarget: null,
  };

  const esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  const pct = function (cur, max) { return Math.max(0, Math.min(100, (cur / max) * 100)); };
  const typeLabel = { attack: '공격', defense: '방어', evade: '회피' };

  /* ---------- 출생 화면 ---------- */
  function birthTitle(b) {
    if (b.type === 'citizen') return b.zoneName + '의 시민';
    if (b.type === 'pinky') return '소지 출신 가문';
    return '혈귀 ' + b.grade + '등급';
  }

  function renderBirth() {
    const b = S.birth;
    let body;
    if (!b) {
      body =
        '<form class="name-form" data-form="roll">' +
        '<div class="field"><label for="name">이름</label>' +
        '<input id="name" type="text" maxlength="12" autocomplete="off" placeholder="이름을 입력" value="' + esc(S.name) + '"></div>' +
        '<button class="btn primary" type="submit">태어나기</button></form>';
    } else {
      const conn = b.conn.length ? b.conn.map(function (c) { return c.type + ' +' + c.val; }).join(', ') : '없음';
      const gradeNote = b.type === 'hyeolgwi'
        ? '<p class="note">혈귀의 혈기(갈증) 시스템은 2차 이후에 들어간다. 지금은 높은 능력치만 반영된다.</p>' : '';
      body =
        '<article class="birth-card ' + b.type + '" aria-live="polite">' +
        '<div class="row"><span class="badge">' + esc(b.typeName) + (b.grade ? ' · ' + b.grade + '등급' : '') + '</span>' +
        (b.type === 'citizen' ? '<span class="badge">' + esc(b.zoneName) + '</span>' : '') + '</div>' +
        '<h2 class="birth-title">' + esc(S.name || '이름 없음') + ', ' + esc(birthTitle(b)) + '</h2>' +
        '<p class="birth-story">' + esc(b.story) + '</p>' +
        '<div class="stat-grid">' +
        stat('생명력', b.maxHp) + stat('안', b.an) + stat('힘', b.stats.str) + stat('체질', b.stats.con) + stat('민첩', b.stats.agi) +
        stat('연줄', conn) + '</div>' + gradeNote + '</article>' +
        '<div class="row">' +
        '<button class="btn primary" type="button" data-action="toSetup">이 인생으로 전투 시험 →</button>' +
        '<button class="btn" type="button" data-action="reroll">다시 태어나기 (테스트용)</button></div>';
    }
    app.innerHTML =
      '<section class="screen">' +
      '<div><p class="eyebrow">1차 프로토타입</p><h1>어디에서 태어날까</h1>' +
      '<p class="lead">출생은 운이다. 대부분은 평범한 시민이지만, 아주 드물게 특별한 출생이 나온다.</p></div>' +
      body + '</section>';
    S.focusTarget = b ? '[data-action="toSetup"]' : '#name';
  }
  function stat(label, value) {
    return '<div class="stat"><b>' + esc(value) + '</b><span>' + esc(label) + '</span></div>';
  }

  /* ---------- 전투 설정 화면 ---------- */
  function renderSetup() {
    const st = S.setup;
    const weapons = Object.keys(DATA.WEAPONS).map(function (id) {
      const w = DATA.WEAPONS[id];
      return '<button class="choice" type="button" data-action="pickWeapon" data-id="' + id + '" aria-pressed="' + (st.weapon === id) + '">' +
        '<b>' + esc(w.name) + '</b><small>' + esc(w.desc) + '</small>' +
        '<span class="mini-skills">' + w.skills.map(function (k) { return '<span>' + esc(SKILLS[k].name) + '</span>'; }).join('') + '</span></button>';
    }).join('');
    const enemies = DATA.ENEMIES.map(function (e, i) {
      return '<button class="choice" type="button" data-action="pickEnemy" data-idx="' + i + '" aria-pressed="' + (st.enemy === i) + '">' +
        '<b>' + esc(e.name) + ' <small>' + esc(e.grade) + '</small></b>' +
        '<small>생명력 ' + e.hp + ' · ' + esc(DATA.WEAPONS[e.weapon].name) + (e.shin ? ' · 신' : '') + (e.wang ? ' · 망 ×' + e.wang : '') + '</small></button>';
    }).join('');
    const mode =
      '<button class="choice" type="button" data-action="pickMode" data-lethal="1" aria-pressed="' + st.lethal + '"><b>의뢰 전투</b><small>생명력이 0이 되면 사망한다. 도주하면 사망 없이 패배로 처리된다.</small></button>' +
      '<button class="choice" type="button" data-action="pickMode" data-lethal="0" aria-pressed="' + !st.lethal + '"><b>시험 전투</b><small>승급시험과 훈련 대련용. 져도 사망하지 않는다.</small></button>';

    app.innerHTML =
      '<section class="screen">' +
      '<div><p class="eyebrow">전투 시험</p><h1>무기와 상대를 고르자</h1>' +
      '<p class="lead">무기가 곧 스킬 세트다. 빛을 모았다 쓰고, 방어와 회피로 빛을 되찾으며 싸운다.</p></div>' +
      '<div><h2>무기</h2><div class="choices" style="margin-top:10px">' + weapons + '</div></div>' +
      '<div><h2>상대</h2><div class="choices" style="margin-top:10px">' + enemies + '</div></div>' +
      '<div><h2>전투 종류</h2><div class="choices" style="margin-top:10px">' + mode + '</div></div>' +
      '<details class="test"><summary>테스트 옵션 (신, 망, 강화문신)</summary><div class="test-grid">' +
      '<label class="check"><input type="checkbox" data-field="shin"' + (st.shin ? ' checked' : '') + '> 신(心) 보유</label>' +
      '<div class="field"><label for="wang">망(望) 개수 (0~7)</label><input id="wang" type="number" min="0" max="7" value="' + st.wang + '" data-field="wang"></div>' +
      '<div class="field"><label for="tattoo">강화문신 개수</label><input id="tattoo" type="number" min="0" max="50" value="' + st.tattoo + '" data-field="tattoo"></div>' +
      '</div></details>' +
      '<div class="row"><button class="btn primary" type="button" data-action="start">전투 시작</button>' +
      '<button class="btn" type="button" data-action="toBirth">출생으로 돌아가기</button></div>' +
      '</section>';
    S.focusTarget = '[data-action="start"]';
  }

  /* ---------- 전투 화면 ---------- */
  function pips(f) {
    let h = '';
    for (let i = 1; i <= Battle.LIGHT_CAP; i++) {
      h += '<span class="pip ' + (i <= f.light ? 'on' : (i <= f.maxLight ? 'cap' : 'locked')) + '"></span>';
    }
    return '<div class="pips" role="img" aria-label="빛 ' + f.light + ', 최대 ' + f.maxLight + '">' + h + '</div>' +
      '<div class="pips-text">빛 ' + f.light + ' / ' + f.maxLight + '</div>';
  }

  function fighterPanel(f, side, sub) {
    const chips = [];
    if (f.shin) chips.push('<span class="chip shin" title="받는 피해 10% 감소">신(心)</span>');
    if (f.wang) chips.push('<span class="chip wang" title="합 위력 +3씩">망(望) ×' + f.wang + '</span>');
    if (f.tattoo) chips.push('<span class="chip tattoo" title="합 위력 +1씩">강화문신 ×' + f.tattoo + '</span>');
    chips.push('<span class="chip">힘 ' + f.str + '</span>', '<span class="chip">민첩 ' + f.agi + '</span>');
    const hit = S.flash[side === 'player' ? 'p' : 'e'] ? ' hit' : '';
    return '<div class="fighter ' + side + hit + '">' +
      (f.staggered ? '<span class="stun">흐트러짐</span>' : '') +
      '<div class="name">' + esc(f.name) + (sub ? ' <small>' + esc(sub) + '</small>' : '') + '</div>' +
      '<div class="meter"><div class="meter-head"><span>생명력</span><b>' + f.hp + ' / ' + f.maxHp + '</b></div>' +
      '<div class="bar hp"><i style="width:' + pct(f.hp, f.maxHp) + '%"></i></div></div>' +
      '<div class="meter"><div class="meter-head"><span>흐트러짐 게이지</span><b>' + f.stagger + ' / ' + f.maxStagger + '</b></div>' +
      '<div class="bar stg"><i style="width:' + pct(f.stagger, f.maxStagger) + '%"></i></div></div>' +
      '<div>' + pips(f) + '</div>' +
      '<div class="chips">' + chips.join('') + '</div></div>';
  }

  function skillTag(sk, who) {
    if (!sk) return who + ': <b>행동 불가</b>';
    return who + ': <b>' + esc(sk.name) + '</b>' + (sk.stars ? ' ' + '★'.repeat(sk.stars) : '');
  }

  function reportHtml(r) {
    if (!r) return '<h3>라운드 결과</h3><p class="muted">스킬을 골라 첫 라운드를 시작하자.</p>';
    let h = '<h3>라운드 ' + r.round + ' 결과</h3>' +
      '<div class="picks"><span>' + skillTag(r.pSkill, '나') + '</span><span>' + skillTag(r.eSkill, '상대') + '</span></div>' +
      '<ul class="clashes">' + r.clashes.map(function (c) { return '<li class="' + esc(c.kind) + '">' + esc(c.text) + '</li>'; }).join('') + '</ul>';
    if (r.events.length) h += '<ul class="events">' + r.events.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul>';
    return h;
  }

  function skillButtons(b) {
    const P = b.player;
    return P.skills.map(function (id, i) {
      const s = SKILLS[id];
      const bonus = Battle.bonusFor(P, s);
      const lo = s.power[0] + bonus, hi = s.power[1] + bonus;
      const ok = Battle.canUse(b, P, id);
      const meta = [];
      meta.push('<span>' + typeLabel[s.type] + '</span>');
      meta.push('<span>빛 ' + s.cost + '</span>');
      meta.push('<span>위력 ' + lo + '~' + hi + (s.hits > 1 ? ' ×' + s.hits : '') + '</span>');
      return '<button class="skill ' + s.type + '" type="button" data-action="skill" data-skill="' + id + '"' + (ok ? '' : ' disabled title="빛이 부족하다"') + '>' +
        '<span class="top"><span class="nm">' + esc(s.name) + '</span><kbd>' + (i + 1) + '</kbd></span>' +
        '<span class="stars" aria-label="별 ' + s.stars + '개">' + (s.stars ? '★'.repeat(s.stars) : '&nbsp;') + '</span>' +
        '<span class="meta">' + meta.join('') + '</span>' +
        '<span class="desc">' + esc(s.desc) + '</span></button>';
    }).join('');
  }

  const OUTCOME = {
    win: { cls: 'win', title: '승리', text: '상대를 쓰러뜨렸다.' },
    defeat: { cls: '', title: '패배', text: '쓰러졌지만 목숨은 건졌다. (시험 전투)' },
    retreat: { cls: '', title: '도주', text: '전투에서 빠져나왔다. 패배로 처리되지만 사망은 아니다.' },
    death: { cls: 'death', title: '사망', text: '생명력이 0이 되었다. 이 인생은 여기서 끝난다. 새 캐릭터로 처음부터 시작한다.' },
    draw: { cls: '', title: '무승부', text: '서로 쓰러졌다.' },
  };

  function renderBattle() {
    const b = S.battle;
    const E = S.setup.enemy;
    const enemyInfo = DATA.ENEMIES[E];
    const growIn = 3 - ((b.round - 1) % 3);
    const capNote = b.player.maxLight >= Battle.LIGHT_CAP ? '빛 최대치 상한' : '다음 빛 최대치 증가까지 ' + growIn + '라운드';
    let action;
    if (b.over) {
      const o = OUTCOME[b.outcome];
      const buttons = b.outcome === 'death'
        ? '<button class="btn primary" type="button" data-action="restart">새 캐릭터로 처음부터</button>'
        : '<button class="btn primary" type="button" data-action="again">같은 조건으로 다시</button>' +
          '<button class="btn" type="button" data-action="toSetup">설정으로</button>';
      action = '<div class="result ' + o.cls + '" role="status"><div class="big">' + o.title + '</div><p>' + esc(o.text) + '</p><div class="row">' + buttons + '</div></div>';
    } else if (b.player.staggered) {
      action = '<div class="callout"><b>흐트러졌다</b><p>이번 라운드에는 행동할 수 없고, 받는 피해가 2배가 된다.</p>' +
        '<div class="row"><button class="btn primary" type="button" data-action="skip">라운드 진행</button></div></div>';
    } else {
      action = '<div class="skills">' + skillButtons(b) + '</div>';
    }
    const log = S.log.slice(-60).reverse().map(function (l) {
      return '<li' + (l.mark ? ' class="round-mark"' : '') + '>' + esc(l.t) + '</li>';
    }).join('');

    app.innerHTML =
      '<section class="screen">' +
      '<div class="topbar"><div class="round-badge">라운드 ' + b.round + '<small>' + esc(capNote) + '</small></div>' +
      (b.over ? '' : '<button class="btn small danger" type="button" data-action="retreat">도주</button>') + '</div>' +
      '<div class="arena">' + fighterPanel(b.player, 'player', '') +
      '<div class="vs" aria-hidden="true">VS</div>' +
      fighterPanel(b.enemy, 'enemy', enemyInfo.grade) + '</div>' +
      '<div class="report" aria-live="polite">' + reportHtml(S.report) + '</div>' +
      action +
      '<details class="log"><summary>전투 기록</summary><ol>' + log + '</ol></details>' +
      '</section>';
    S.flash = { p: false, e: false };
    S.focusTarget = b.over ? '.result .btn' : (b.player.staggered ? '[data-action="skip"]' : '.skill:not(:disabled)');
  }

  /* ---------- 흐름 ---------- */
  function render() {
    if (S.screen === 'birth') renderBirth();
    else if (S.screen === 'setup') renderSetup();
    else renderBattle();
    if (S.focusTarget) {
      const el = app.querySelector(S.focusTarget);
      if (el && typeof el.focus === 'function') el.focus({ preventScroll: true });
    }
  }

  function startBattle() {
    const st = S.setup, birth = S.birth;
    const weapon = DATA.WEAPONS[st.weapon];
    const en = DATA.ENEMIES[st.enemy];
    const pcfg = {
      name: S.name || '이름 없음', maxHp: birth.maxHp, str: birth.stats.str, agi: birth.stats.agi,
      wang: st.wang, tattoo: st.tattoo, shin: st.shin, skills: weapon.skills,
    };
    const ecfg = { name: en.name, maxHp: en.hp, str: en.str, agi: en.agi, wang: en.wang, shin: en.shin, skills: DATA.WEAPONS[en.weapon].skills };
    S.battle = Battle.createBattle(pcfg, ecfg, { lethal: st.lethal });
    S.report = null;
    S.log = [{ t: pcfg.name + ' vs ' + ecfg.name + ' — 전투 시작', mark: true }];
    S.screen = 'battle';
    render();
  }

  function playRound(skillId) {
    const b = S.battle;
    if (b.over) return;
    let r;
    try { r = Battle.resolveRound(b, skillId); } catch (err) { return; }
    S.report = r;
    S.log.push({ t: '라운드 ' + r.round, mark: true });
    r.clashes.forEach(function (c) { S.log.push({ t: c.text }); });
    r.events.forEach(function (e) { S.log.push({ t: e }); });
    S.flash.p = r.clashes.some(function (c) { return c.dmgToP > 0; });
    S.flash.e = r.clashes.some(function (c) { return c.dmgToE > 0; });
    render();
  }

  function resetAll() {
    S.screen = 'birth'; S.birth = null; S.battle = null; S.report = null; S.log = [];
    render();
  }

  const actions = {
    reroll: function () { S.birth = Birth.rollBirth(); render(); },
    toSetup: function () { S.screen = 'setup'; render(); },
    toBirth: function () { S.screen = 'birth'; render(); },
    home: function () { resetAll(); },
    restart: function () { resetAll(); },
    pickWeapon: function (el) { S.setup.weapon = el.dataset.id; render(); },
    pickEnemy: function (el) { S.setup.enemy = Number(el.dataset.idx); render(); },
    pickMode: function (el) { S.setup.lethal = el.dataset.lethal === '1'; render(); },
    start: startBattle,
    again: startBattle,
    skill: function (el) { playRound(el.dataset.skill); },
    skip: function () { playRound(null); },
    retreat: function () {
      Battle.retreat(S.battle);
      S.log.push({ t: '도주했다.', mark: true });
      render();
    },
  };

  document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const fn = actions[el.dataset.action];
    if (fn) fn(el);
  });

  document.addEventListener('submit', function (e) {
    if (e.target.dataset.form === 'roll') {
      e.preventDefault();
      const input = document.getElementById('name');
      S.name = input ? input.value.trim() : S.name;
      S.birth = Birth.rollBirth();
      render();
    }
  });

  document.addEventListener('input', function (e) {
    const t = e.target;
    if (t.id === 'name') S.name = t.value.trim();
  });

  document.addEventListener('change', function (e) {
    const t = e.target, f = t.dataset && t.dataset.field;
    if (!f) return;
    if (f === 'shin') S.setup.shin = t.checked;
    else if (f === 'wang') { S.setup.wang = Math.max(0, Math.min(7, parseInt(t.value, 10) || 0)); t.value = S.setup.wang; }
    else if (f === 'tattoo') { S.setup.tattoo = Math.max(0, Math.min(50, parseInt(t.value, 10) || 0)); t.value = S.setup.tattoo; }
  });

  document.addEventListener('keydown', function (e) {
    if (S.screen !== 'battle' || !S.battle || S.battle.over) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const n = parseInt(e.key, 10);
    if (!n) return;
    const id = S.battle.player.skills[n - 1];
    if (id && Battle.canUse(S.battle, S.battle.player, id)) { e.preventDefault(); playRound(id); }
  });

  render();
})();
