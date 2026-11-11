/* 화면과 흐름: 시작 → 출생 → 유년기 → 소속 선택 → 허브(의뢰/계급/상점/장비/소속/기록) ↔ 전투 */
(function () {
  'use strict';

  const DATA = window.PMG.DATA, EV = window.PMG.EVENTS, Battle = window.PMG.Battle, W = window.PMG.World;
  const SKILLS = DATA.SKILLS, CAREERS = DATA.CAREERS, WEAPONS = DATA.WEAPONS, SCHOOLS = DATA.SCHOOLS, C = DATA.CONST;
  const app = document.getElementById('app');

  const S = {
    screen: 'title', G: null, name: '', birth: null, tab: 'quests', notice: null,
    openQuest: null, childResult: null, pickSchool: 'dots', joinSchool: 'dots',
    battle: null, ctx: null, report: null, log: [], flash: { p: false, e: false }, result: null, focus: null,
  };

  const esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };
  const pct = function (cur, max) { return Math.max(0, Math.min(100, (cur / max) * 100)); };
  const typeLabel = { attack: '공격', defense: '방어', evade: '회피' };
  const SN = W.STAT_NAMES;
  function commit() { if (S.G && !S.G.dead) W.save(S.G); }
  function stat(label, value) { return '<div class="stat"><b>' + esc(value) + '</b><span>' + esc(label) + '</span></div>'; }
  function noticeHtml() {
    if (!S.notice) return '';
    const n = S.notice;
    return '<div class="notice ' + (n.tone || '') + '" role="status"><h3>' + esc(n.title) + '</h3>' +
      (n.lines && n.lines.length ? '<ul>' + n.lines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>' : '') +
      '<div class="row"><button class="btn small" type="button" data-action="closeNotice">확인</button></div></div>';
  }
  function setNotice(title, lines, tone) { S.notice = { title: title, lines: lines || [], tone: tone || '' }; }

  /* ---------- 시작 / 출생 ---------- */
  function renderTitle() {
    const has = W.hasSave();
    app.innerHTML = '<section class="screen"><div><p class="eyebrow">프로젝트 문 세계관 팬 게임</p><h1>도시에서 살아가기</h1>' +
      '<p class="lead">출생은 운이다. 의뢰를 해결하고 평판을 쌓아 계급을 올리자. 죽으면 새 인생이 시작된다.</p></div>' +
      '<div class="row">' + (has ? '<button class="btn primary" type="button" data-action="continue">이어하기</button>' : '') +
      '<button class="btn' + (has ? '' : ' primary') + '" type="button" data-action="newGame">새 인생 시작</button></div></section>';
    S.focus = '.btn.primary';
  }
  function birthTitle(b) {
    if (b.type === 'citizen') return b.zoneName + '의 시민';
    if (b.type === 'pinky') return '소지 출신 가문';
    return '혈귀 ' + b.grade + '등급';
  }
  function renderBirth() {
    const b = S.birth;
    let body;
    if (!b) {
      body = '<form class="name-form" data-form="roll"><div class="field"><label for="name">이름</label>' +
        '<input id="name" type="text" maxlength="12" autocomplete="off" placeholder="이름을 입력" value="' + esc(S.name) + '"></div>' +
        '<button class="btn primary" type="submit">태어나기</button></form>';
    } else {
      const conn = b.conn.length ? b.conn.map(function (c) { return c.type + ' +' + c.val; }).join(', ') : '없음';
      body = '<article class="birth-card ' + b.type + '"><div class="row"><span class="badge">' + esc(b.typeName) + (b.grade ? ' · ' + b.grade + '등급' : '') + '</span>' +
        (b.zoneName ? '<span class="badge">' + esc(b.zoneName) + '</span>' : '') + '</div>' +
        '<h2 class="birth-title">' + esc(S.name || '이름 없음') + ', ' + esc(birthTitle(b)) + '</h2><p class="birth-story">' + esc(b.story) + '</p>' +
        '<div class="stat-grid">' + stat('생명력', b.maxHp) + stat('안', W.fa(b.an)) + stat('힘', b.stats.str) + stat('체질', b.stats.con) + stat('민첩', b.stats.agi) + stat('연줄', conn) + '</div>' +
        (b.type === 'hyeolgwi' ? '<p class="note">혈귀는 능력치가 높지만 혈기(갈증)가 쌓인다. 혈액팩을 사거나 사람의 피를 뽑아 달래야 한다.</p>' : '') +
        '</article><div class="row"><button class="btn primary" type="button" data-action="beginLife">이 인생을 살아간다 →</button></div>';
    }
    app.innerHTML = '<section class="screen"><div><p class="eyebrow">출생</p><h1>어디에서 태어날까</h1></div>' + body + '</section>';
    S.focus = b ? '[data-action="beginLife"]' : '#name';
  }

  /* ---------- 유년기 / 소속 선택 ---------- */
  function renderChildhood() {
    const G = S.G, ev = W.currentChildhood(G);
    const n = G.childhood.idx + 1, tot = G.childhood.order.length;
    let body;
    if (S.childResult) {
      body = '<div class="card"><p>' + esc(S.childResult.text) + '</p><p class="sub">' + esc(S.childResult.effects.join(' · ')) + '</p>' +
        '<div class="row"><button class="btn primary" type="button" data-action="childNext">' + (G.phase === 'career' ? '성장했다 →' : '다음 →') + '</button></div></div>';
    } else if (ev) {
      body = '<div class="card"><h3>' + esc(ev.title) + '</h3><p>' + esc(ev.text) + '</p><div class="choices">' +
        ev.choices.map(function (c, i) { return '<button class="choice" type="button" data-action="childChoose" data-idx="' + i + '"><b>' + esc(c.label) + '</b></button>'; }).join('') + '</div></div>';
    }
    app.innerHTML = '<section class="screen"><div><p class="eyebrow">유년기 ' + Math.min(n, tot) + ' / ' + tot + '</p><h1>어린 시절</h1></div>' + body + '</section>';
    S.focus = '.choice, [data-action="childNext"]';
  }

  function allocHtml(G) {
    if (!G.pendingPoints) return '';
    return '<div class="card good"><b>능력치 포인트 ' + G.pendingPoints + '</b><div class="pt-row">' +
      W.STATS.map(function (s) { return '<button class="btn small" type="button" data-action="alloc" data-stat="' + s + '">' + SN[s] + ' ' + G.stats[s] + ' +1</button>'; }).join('') + '</div>' +
      '<p class="sub">체질 1당 최대 생명력 +5, 힘은 공격 합 위력(5당 +1), 민첩은 회피 합 위력(5당 +1)에 영향을 준다.</p></div>';
  }

  function renderCareer() {
    const G = S.G;
    const ids = ['fixer', 'thumb', 'index', 'middle', 'ring', 'pinky', 'L', 'W'];
    const cards = ids.map(function (id) {
      const c = CAREERS[id], can = W.canJoin(G, id);
      let btn = '';
      if (can.ok) {
        const ringPick = id === 'ring' ? '<div class="row">' + Object.keys(SCHOOLS).map(function (k) {
          return '<button class="btn small" type="button" data-action="pickJoinSchool" data-id="' + k + '" aria-pressed="' + (S.joinSchool === k) + '">' + SCHOOLS[k].name + '</button>';
        }).join('') + '</div><p class="sub">' + esc(SCHOOLS[S.joinSchool].desc) + '</p>' : '';
        btn = ringPick + '<button class="btn primary" type="button" data-action="join" data-id="' + id + '">' + (c.kind === 'corp' ? '입사 시험 (비치명 전투)' : '이 길로 간다') + '</button>';
      } else btn = '<p class="sub">조건: ' + esc(can.reason) + '</p>';
      return '<div class="card' + (can.ok ? '' : ' hard') + '"><h3>' + esc(c.name) + ' <span class="tag">' + (c.kind === 'fixer' ? '해결사' : c.kind === 'corp' ? '기업' : '손가락') + '</span></h3><p class="sub">' + esc(c.desc) + '</p>' + btn + '</div>';
    }).join('');
    app.innerHTML = '<section class="screen"><div><p class="eyebrow">진로</p><h1>어느 길로 살아갈까</h1>' +
      '<p class="lead">능력치 포인트를 먼저 나누고, 소속을 고른다. 연줄이 없다면 해결사부터 시작해도 된다.</p></div>' +
      noticeHtml() + allocHtml(G) + '<div class="stat-grid">' + stat('힘', G.stats.str) + stat('체질', G.stats.con) + stat('민첩', G.stats.agi) +
      stat('뒷세계', G.conn['뒷세계']) + stat('상류', G.conn['상류']) + stat('소지', G.conn['소지']) + '</div>' +
      '<div class="grid2">' + cards + '</div></section>';
    S.focus = null;
  }

  /* ---------- 허브 ---------- */
  function statusHtml() {
    const G = S.G, g = W.grade(G), hp = W.maxHp(G);
    const c = W.career(G);
    let ap = '';
    for (let i = 0; i < G.apMax; i++) ap += '<i class="' + (i < G.ap ? 'on' : '') + '"></i>';
    const thirst = W.isHyeolgwi(G) ? '<div class="stat"><b>' + G.thirst + ' / 100</b><span>혈기' + (G.bloodPacks ? ' · 혈액팩 ' + G.bloodPacks : '') + '</span></div>' : '';
    return '<div class="status"><div class="status-top"><div class="who">' + esc(G.name) + '<small>' + esc(c.name) + ' · ' + esc(W.rankName(G)) + '</small></div>' +
      '<div class="ap" aria-label="행동력 ' + G.ap + '">' + G.day + '일차 &nbsp;' + ap + '</div></div>' +
      '<div class="meter"><div class="meter-head"><span>생명력</span><b>' + G.hp + ' / ' + hp + '</b></div><div class="bar hp"><i style="width:' + pct(G.hp, hp) + '%"></i></div></div>' +
      '<div class="status-grid">' + stat('안 (≈' + (G.an * 10).toLocaleString('ko-KR') + '원)', Number(G.an).toLocaleString('ko-KR')) + stat('평판', G.rep) + stat('환산 등급', W.gradeName(g)) +
      stat('힘 / 체질 / 민첩', W.effStat(G, 'str') + ' / ' + G.stats.con + ' / ' + W.effStat(G, 'agi')) + stat('악명', G.infamy) + thirst + '</div></div>';
  }

  function questTab(G) {
    let h = '';
    if (G.directive) {
      const d = G.directive;
      h += '<div class="card good"><h3>오늘의 지령 <span class="tag good">' + W.directiveProgress(G) + ' / ' + d.target + '</span></h3><p>' + esc(d.desc) + '</p><p class="sub">완수 시 ' + W.fa(d.an) + ', 평판 +' + d.rep + ' · 실패 시 평판 −' + Math.round(d.rep / 2) + '</p></div>';
    }
    h += '<p class="sub">의뢰는 환산 등급(' + W.gradeName(W.grade(G)) + ')에 맞춰 배정된다. 한 번 선택하면 행동력 1을 쓴다.</p>';
    if (!G.quests.length) h += '<div class="card"><p>오늘 받을 수 있는 의뢰가 더 없다. 하루를 마치자.</p></div>';
    G.quests.forEach(function (q) {
      const t = W.tplOf(q.tpl), rew = W.questReward(G, q, 1);
      const open = S.openQuest === q.uid;
      h += '<div class="card' + (q.hard ? ' hard' : '') + '"><h3>' + esc(t.title) + ' <span class="tag' + (q.hard ? ' hard' : '') + '">' + W.gradeName(q.grade) + (q.hard ? ' · 한 단계 위' : '') + '</span></h3>' +
        '<p class="sub">' + esc(t.intro) + '</p><p class="sub">기준 보상 ' + W.fa(rew.an) + ' · 평판 약 ' + rew.rep + '</p>';
      if (open) {
        h += t.choices.map(function (ch, i) {
          let how;
          if (ch.kind === 'fight') how = '전투 (패배 시 위험) · 전리품 +20%';
          else if (ch.kind === 'safe') how = '안전, 보상 ' + Math.round(ch.mul * 100) + '%';
          else how = (ch.stat === 'conn' ? '연줄' : SN[ch.stat]) + ' 판정 성공률 ' + Math.round(W.questChance(G, q, ch) * 100) + '%, 보상 ' + Math.round(ch.mul * 100) + '%';
          return '<button class="qchoice" type="button" data-action="doQuest" data-uid="' + q.uid + '" data-idx="' + i + '"' + (G.ap < 1 ? ' disabled' : '') + '><b>' + esc(ch.label) + '</b><small class="muted">' + esc(how) + '</small></button>';
        }).join('') + '<div class="row"><button class="btn small ghost" type="button" data-action="closeQuest">접기</button></div>';
      } else h += '<div class="row"><button class="btn small" type="button" data-action="openQuest" data-uid="' + q.uid + '">살펴보기</button></div>';
      h += '</div>';
    });
    return h;
  }

  function rankTab(G) {
    const c = W.career(G), nx = W.nextRank(G), idx = G.career.rankIdx;
    let h = '<div class="card"><h3>' + esc(c.name) + ' · ' + esc(W.rankName(G)) + '</h3>';
    if (nx) {
      const cur = c.ranks[idx].rep;
      h += '<p class="sub">다음 계급: ' + esc(nx.name) + ' (평판 ' + nx.rep + ') · 현재 평판 ' + G.rep + '</p>' +
        '<div class="progress"><i style="width:' + pct(G.rep - cur, Math.max(1, nx.rep - cur)) + '%"></i></div>' +
        '<p class="sub">승급 시험은 비치명 1대1 전투이며 응시료는 ' + W.fa(W.examFee(G)) + '이다. 상대는 ' + W.gradeName(W.equivGrade(nx.rep)) + ' 수준이다.</p>';
      const can = W.canExam(G);
      h += '<div class="row"><button class="btn primary" type="button" data-action="exam"' + (can.ok ? '' : ' disabled') + '>승급 시험 응시</button>' + (can.ok ? '' : '<span class="sub">' + esc(can.reason) + '</span>') + '</div>';
    } else h += '<p>최고 계급에 올랐다.</p>';
    h += '</div><div class="card"><h3>계급표</h3><table class="rank"><tbody>' + c.ranks.map(function (r, i) {
      return '<tr class="' + (i === idx ? 'cur' : i < idx ? 'done' : '') + '"><td>' + esc(r.name) + '</td><td>평판 ' + r.rep + '</td><td>' + W.gradeName(W.equivGrade(r.rep)) + ' 상당</td></tr>';
    }).join('') + '</tbody></table></div>';
    h += '<div class="card"><h3>해결사 환산표</h3><table class="rank"><tbody>' + DATA.FIXER_GRADES.map(function (f) {
      return '<tr class="' + (f.grade === W.grade(G) ? 'cur' : '') + '"><td>' + esc(f.grade === 0 ? '특색' : f.name) + '</td><td>평판 ' + f.rep + '</td></tr>';
    }).join('') + '</tbody></table></div>';
    return h;
  }

  function shopTab(G) {
    let h = '<div class="card"><h3>치료</h3><p class="sub">생명력 1당 ' + W.fa(W.healCost(G, 10) / 10) + '</p><div class="row">';
    const miss = W.maxHp(G) - G.hp;
    [10, 25, miss].forEach(function (n, i) {
      const amt = Math.min(n, miss);
      h += '<button class="btn small" type="button" data-action="heal" data-n="' + amt + '"' + (amt <= 0 ? ' disabled' : '') + '>' + (i === 2 ? '전부' : '+' + n) + ' (' + W.fa(amt > 0 ? W.healCost(G, amt) : 0) + ')</button>';
    });
    h += '</div></div><div class="card"><h3>무기</h3><div class="grid2">';
    Object.keys(WEAPONS).forEach(function (id) {
      const w = WEAPONS[id], own = G.weapons.indexOf(id) >= 0;
      h += '<div class="card"><b>' + esc(w.name) + '</b><p class="sub">' + esc(w.desc) + '</p><span class="mini-skills">' + w.skills.map(function (k) { return '<span>' + esc(SKILLS[k].name) + '</span>'; }).join('') + '</span>' +
        (own ? '<span class="tag good">보유</span>' : '<button class="btn small" type="button" data-action="buy" data-id="' + id + '"' + (G.an < w.price ? ' disabled' : '') + '>' + W.fa(w.price) + '에 구입</button>') + '</div>';
    });
    h += '</div></div>';
    if (W.isHyeolgwi(G)) {
      h += '<div class="card"><h3>혈액팩</h3><p class="sub">' + W.fa(C.BLOOD_PACK_PRICE) + ' · 혈기 −' + C.BLOOD_PACK_EFFECT + ' · 보유 ' + G.bloodPacks + '</p><div class="row">' +
        '<button class="btn small" type="button" data-action="buyPack"' + (G.an < C.BLOOD_PACK_PRICE ? ' disabled' : '') + '>구입</button>' +
        '<button class="btn small" type="button" data-action="usePack"' + (G.bloodPacks < 1 ? ' disabled' : '') + '>사용</button></div></div>';
    }
    return h;
  }

  function gearTab(G) {
    const av = W.availableSkills(G);
    let h = '<div class="card"><h3>장비</h3><div class="row">' + G.weapons.map(function (id) {
      return '<button class="btn small' + (G.weapon === id ? ' primary' : '') + '" type="button" data-action="equip" data-id="' + id + '">' + esc(WEAPONS[id].name) + '</button>';
    }).join('') + '</div></div>';
    h += '<div class="card"><h3>스킬 슬롯 <span class="tag">' + G.slots.length + ' / ' + W.MAX_SLOTS + '</span></h3><p class="sub">전투에 가져갈 스킬을 고른다. 무기 스킬과 화풍 스킬 중 최대 ' + W.MAX_SLOTS + '개. 공격 스킬은 최소 1개 필요하다.</p><div class="grid2">';
    av.forEach(function (id) {
      const s = SKILLS[id], on = G.slots.indexOf(id) >= 0;
      h += '<button class="slot ' + s.type + '" type="button" data-action="slot" data-id="' + id + '" aria-pressed="' + on + '"><b>' + esc(s.name) + (s.stars ? ' ' + '★'.repeat(s.stars) : '') + '</b>' +
        '<span class="sub">' + typeLabel[s.type] + ' · 빛 ' + s.cost + ' · 위력 ' + s.power[0] + '~' + s.power[1] + (s.hits > 1 ? ' ×' + s.hits : '') + '</span><span class="sub">' + esc(s.desc) + '</span></button>';
    });
    h += '</div></div><div class="card"><h3>몸 상태</h3><div class="stat-grid">' + stat('힘', G.stats.str) + stat('체질', G.stats.con) + stat('민첩', G.stats.agi) +
      stat('신(心)', G.shin ? '있음' : '없음') + stat('망(望)', G.wang + ' / ' + Battle.WANG_MAX) + stat('강화문신', G.tattoo) + '</div>' +
      '<p class="sub">연줄: ' + W.CONN_TYPES.map(function (k) { return k + ' ' + G.conn[k]; }).join(' · ') + '</p></div>';
    return h;
  }

  function careerTab(G) {
    const c = W.career(G);
    let h = '<div class="card"><h3>' + esc(c.name) + '</h3><p class="sub">' + esc(c.desc) + '</p></div>';
    if (G.career.school) h += '<div class="card"><h3>화풍: ' + esc(SCHOOLS[G.career.school].name) + '</h3><p class="sub">' + esc(SCHOOLS[G.career.school].desc) + '</p></div>';
    if (c.kind === 'corp') h += '<div class="card"><h3>급여</h3><p>하루 ' + W.fa(c.wage[G.career.rankIdx]) + '이 지급된다.</p></div>';
    if (G.career.id === 'pinky') {
      h += '<div class="card"><h3>수련장</h3><p class="sub">행동력 1을 쓰고 능력치를 1 올릴 기회를 얻는다. (소지 전용)</p><div class="row">' +
        W.STATS.map(function (s) { return '<button class="btn small" type="button" data-action="train" data-stat="' + s + '"' + (G.ap < 1 ? ' disabled' : '') + '>' + SN[s] + ' ' + G.stats[s] + ' · ' + Math.round(W.trainChance(G, s) * 100) + '%</button>'; }).join('') + '</div></div>';
      if (W.canTransfer(G)) {
        h += '<div class="card good"><h3>이적</h3><p class="sub">다른 손가락으로 옮길 수 있다. 평판은 그대로지만 계급은 최하위부터 시작하며 승급 시험을 다시 봐야 한다.</p><div class="row">' +
          ['thumb', 'index', 'middle', 'ring'].map(function (id) { return '<button class="btn small" type="button" data-action="transfer" data-id="' + id + '">' + CAREERS[id].name + '</button>'; }).join('') + '</div>' +
          '<div class="row"><span class="sub">약지 화풍:</span>' + Object.keys(SCHOOLS).map(function (k) { return '<button class="btn small" type="button" data-action="pickJoinSchool" data-id="' + k + '" aria-pressed="' + (S.joinSchool === k) + '">' + SCHOOLS[k].name + '</button>'; }).join('') + '</div></div>';
      }
    }
    if (G.career.id === 'middle') {
      h += '<div class="card"><h3>앙갚음 장부</h3><p class="sub">전투에서 진 상대가 적힌다. 장부의 적을 이기면 강화문신이 하나 늘어 합 위력이 +1 된다. (행동력 1)</p>';
      if (!G.ledger.length) h += '<p class="muted">비어 있다.</p>';
      G.ledger.forEach(function (e, i) {
        h += '<div class="row"><span>' + esc(e.name) + ' <span class="tag">' + W.gradeName(e.grade) + '</span></span><button class="btn small danger" type="button" data-action="ledger" data-idx="' + i + '"' + (G.ap < 1 ? ' disabled' : '') + '>도전</button></div>';
      });
      h += '</div>';
    }
    if (G.career.id === 'thumb') h += '<div class="card"><p class="sub">의뢰 보상 +10%. 의뢰 전투에서 지면 보상의 15%를 상납금으로 바친다.</p></div>';
    if (G.career.id === 'fixer') h += '<div class="card"><p class="sub">의뢰 보상 +5%.</p></div>';
    if (W.isHyeolgwi(G)) {
      const lv = W.thirstLevel(G);
      h += '<div class="card warn"><h3>혈기 ' + G.thirst + ' / 100</h3><div class="progress thirst"><i style="width:' + G.thirst + '%"></i></div>' +
        '<p class="sub">50 이상이면 힘·민첩 −2, 75 이상이면 −4에 매일 생명력이 깎인다. 100이 되면 폭주한다.' + (lv ? ' (현재 −' + W.thirstPenalty(G) + ')' : '') + '</p>' +
        '<div class="row"><button class="btn small" type="button" data-action="usePack"' + (G.bloodPacks < 1 ? ' disabled' : '') + '>혈액팩 사용 (' + G.bloodPacks + ')</button>' +
        '<button class="btn small danger" type="button" data-action="drawBlood"' + (G.ap < 1 ? ' disabled' : '') + '>사람의 피를 뽑는다 (악명↑, 치안 조우 위험)</button></div></div>';
    }
    return h;
  }

  function logTab(G) {
    return '<div class="card"><h3>기록</h3><ol class="logl">' + G.log.map(function (l) { return '<li><span class="muted">' + l.day + '일차</span> ' + esc(l.text) + '</li>'; }).join('') + '</ol></div>';
  }

  function renderHub() {
    const G = S.G;
    let top = '';
    if (G.transferPrompt) top += '<div class="alert">소지에서 새 계급에 올랐다. 소속 탭에서 다른 손가락으로 이적하거나, 그대로 소지에 남을 수 있다. <button class="btn small" type="button" data-action="stayPinky">소지에 남는다</button></div>';
    if (W.isHyeolgwi(G) && G.thirst >= 50) top += '<div class="alert red">혈기가 ' + G.thirst + '이다. 능력치가 떨어지고 있다.</div>';
    const ev = W.currentDaily(G);
    if (ev) {
      top += '<div class="card good"><h3>' + esc(ev.title) + '</h3><p>' + esc(ev.text) + '</p><div class="choices">' + ev.choices.map(function (c, i) {
        return '<button class="choice" type="button" data-action="daily" data-idx="' + i + '"><b>' + esc(c.label) + '</b></button>';
      }).join('') + '</div></div>';
    }
    const tabs = [['quests', '의뢰'], ['rank', '계급'], ['shop', '상점'], ['gear', '장비'], ['career', '소속'], ['log', '기록']];
    const body = { quests: questTab, rank: rankTab, shop: shopTab, gear: gearTab, career: careerTab, log: logTab }[S.tab](G);
    app.innerHTML = '<section class="screen">' + statusHtml() + noticeHtml() + allocHtml(G) + top +
      '<div class="tabs" role="tablist">' + tabs.map(function (t) { return '<button class="tab" role="tab" type="button" data-action="tab" data-tab="' + t[0] + '" aria-selected="' + (S.tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<div class="panel">' + body + '</div>' +
      '<div class="row"><button class="btn primary" type="button" data-action="endDay">하루 끝내기' + (G.ap > 0 ? ' (행동력 ' + G.ap + ' 남음)' : '') + '</button></div></section>';
    S.focus = null;
  }

  /* ---------- 전투 ---------- */
  function pips(f) {
    let h = '';
    for (let i = 1; i <= Battle.LIGHT_CAP; i++) h += '<span class="pip ' + (i <= f.light ? 'on' : (i <= f.maxLight ? 'cap' : 'locked')) + '"></span>';
    return '<div class="pips" role="img" aria-label="빛 ' + f.light + ', 최대 ' + f.maxLight + '">' + h + '</div><div class="pips-text">빛 ' + f.light + ' / ' + f.maxLight + '</div>';
  }
  function fighterPanel(f, side, sub) {
    const chips = [];
    if (f.shin) chips.push('<span class="chip shin" title="받는 피해 10% 감소">신(心)</span>');
    if (f.wang) chips.push('<span class="chip wang" title="합 위력 +3씩">망(望) ×' + f.wang + '</span>');
    if (f.tattoo) chips.push('<span class="chip tattoo" title="합 위력 +1씩">강화문신 ×' + f.tattoo + '</span>');
    chips.push('<span class="chip">힘 ' + f.str + '</span>', '<span class="chip">민첩 ' + f.agi + '</span>');
    const hit = S.flash[side === 'player' ? 'p' : 'e'] ? ' hit' : '';
    return '<div class="fighter ' + side + hit + '">' + (f.staggered ? '<span class="stun">흐트러짐</span>' : '') +
      '<div class="name">' + esc(f.name) + (sub ? ' <small>' + esc(sub) + '</small>' : '') + '</div>' +
      '<div class="meter"><div class="meter-head"><span>생명력</span><b>' + f.hp + ' / ' + f.maxHp + '</b></div><div class="bar hp"><i style="width:' + pct(f.hp, f.maxHp) + '%"></i></div></div>' +
      '<div class="meter"><div class="meter-head"><span>흐트러짐 게이지</span><b>' + f.stagger + ' / ' + f.maxStagger + '</b></div><div class="bar stg"><i style="width:' + pct(f.stagger, f.maxStagger) + '%"></i></div></div>' +
      '<div>' + pips(f) + '</div><div class="chips">' + chips.join('') + '</div></div>';
  }
  function skillTag(sk, who) {
    if (!sk) return who + ': <b>행동 불가</b>';
    return who + ': <b>' + esc(sk.name) + '</b>' + (sk.stars ? ' ' + '★'.repeat(sk.stars) : '');
  }
  function reportHtml(r) {
    if (!r) return '<h3>라운드 결과</h3><p class="muted">스킬을 골라 첫 라운드를 시작하자.</p>';
    let h = '<h3>라운드 ' + r.round + ' 결과</h3><div class="picks"><span>' + skillTag(r.pSkill, '나') + '</span><span>' + skillTag(r.eSkill, '상대') + '</span></div>' +
      '<ul class="clashes">' + r.clashes.map(function (c) { return '<li class="' + esc(c.kind) + '">' + esc(c.text) + '</li>'; }).join('') + '</ul>';
    if (r.events.length) h += '<ul class="events">' + r.events.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul>';
    return h;
  }
  function skillButtons(b) {
    const P = b.player;
    return P.skills.map(function (id, i) {
      const s = SKILLS[id], bonus = Battle.bonusFor(P, s), ok = Battle.canUse(b, P, id);
      return '<button class="skill ' + s.type + '" type="button" data-action="skill" data-skill="' + id + '"' + (ok ? '' : ' disabled title="빛이 부족하다"') + '>' +
        '<span class="top"><span class="nm">' + esc(s.name) + '</span><kbd>' + (i + 1) + '</kbd></span>' +
        '<span class="stars">' + (s.stars ? '★'.repeat(s.stars) : '&nbsp;') + '</span>' +
        '<span class="meta"><span>' + typeLabel[s.type] + '</span><span>빛 ' + s.cost + '</span><span>위력 ' + (s.power[0] + bonus) + '~' + (s.power[1] + bonus) + (s.hits > 1 ? ' ×' + s.hits : '') + '</span></span>' +
        '<span class="desc">' + esc(s.desc) + '</span></button>';
    }).join('');
  }
  function renderBattle() {
    const b = S.battle, ctx = S.ctx;
    const growIn = 3 - ((b.round - 1) % 3);
    const capNote = b.player.maxLight >= Battle.LIGHT_CAP ? '빛 최대치 상한' : '빛 최대치 증가까지 ' + growIn + '라운드';
    let action;
    if (b.over) {
      const r = S.result;
      action = '<div class="result ' + (r.tone === 'good' ? 'win' : r.dead ? 'death' : '') + '" role="status"><div class="big">' + esc(r.title) + '</div>' +
        r.lines.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('') +
        '<div class="row"><button class="btn primary" type="button" data-action="afterBattle">' + (r.dead ? '이 인생의 끝' : '돌아간다') + '</button></div></div>';
    } else if (b.player.staggered) {
      action = '<div class="callout"><b>흐트러졌다</b><p>이번 라운드에는 행동할 수 없고, 받는 피해가 2배가 된다.</p><div class="row"><button class="btn primary" type="button" data-action="skip">라운드 진행</button></div></div>';
    } else action = '<div class="skills">' + skillButtons(b) + '</div>';
    const lg = S.log.slice(-60).reverse().map(function (l) { return '<li' + (l.mark ? ' class="round-mark"' : '') + '>' + esc(l.t) + '</li>'; }).join('');
    app.innerHTML = '<section class="screen"><div><p class="eyebrow">' + esc(ctx.label) + (ctx.lethal === false ? ' · 비치명' : ' · 치명') + '</p></div>' +
      '<div class="topbar"><div class="round-badge">라운드 ' + b.round + '<small>' + esc(capNote) + '</small></div>' +
      (b.over ? '' : '<button class="btn small danger" type="button" data-action="retreat">' + (ctx.lethal === false ? '포기' : '도주(패배)') + '</button>') + '</div>' +
      '<div class="arena">' + fighterPanel(b.player, 'player', '') + '<div class="vs" aria-hidden="true">VS</div>' + fighterPanel(b.enemy, 'enemy', W.gradeName(ctx.enemy.grade)) + '</div>' +
      '<div class="report" aria-live="polite">' + reportHtml(S.report) + '</div>' + action +
      '<details class="log"><summary>전투 기록</summary><ol>' + lg + '</ol></details></section>';
    S.flash = { p: false, e: false };
    S.focus = b.over ? '.result .btn' : (b.player.staggered ? '[data-action="skip"]' : '.skill:not(:disabled)');
  }

  function launch(ctx) {
    S.ctx = ctx;
    S.battle = W.startBattle(S.G, ctx);
    S.report = null; S.result = null;
    S.log = [{ t: S.G.name + ' vs ' + ctx.enemy.name + ' — ' + ctx.label, mark: true }];
    commit();
    S.screen = 'battle';
    render();
  }
  function afterRound() {
    const b = S.battle;
    if (b.over && !S.result) {
      S.result = W.finishBattle(S.G, S.ctx, b);
      if (S.result.dead) W.clearSave(); else commit();
    }
  }
  function playRound(id) {
    const b = S.battle;
    if (b.over) return;
    let r;
    try { r = Battle.resolveRound(b, id); } catch (err) { return; }
    S.report = r;
    S.log.push({ t: '라운드 ' + r.round, mark: true });
    r.clashes.forEach(function (c) { S.log.push({ t: c.text }); });
    r.events.forEach(function (e) { S.log.push({ t: e }); });
    S.flash.p = r.clashes.some(function (c) { return c.dmgToP > 0; });
    S.flash.e = r.clashes.some(function (c) { return c.dmgToE > 0; });
    afterRound();
    render();
  }

  /* ---------- 사망 ---------- */
  function renderDead() {
    const G = S.G;
    app.innerHTML = '<section class="screen"><div><p class="eyebrow">사망</p><h1>' + esc(G.name) + '의 인생이 끝났다</h1><p class="lead">' + esc(G.deathCause) + '</p></div>' +
      '<div class="stat-grid">' + stat('살아낸 날', G.day) + stat('평판', G.rep) + stat('환산 등급', W.gradeName(W.grade(G))) + stat('계급', (CAREERS[G.career.id].name) + ' ' + W.rankName(G)) + stat('완수한 의뢰', G.counters.quests) + '</div>' +
      '<div class="row"><button class="btn primary" type="button" data-action="newGame">새 인생을 시작한다</button></div></section>';
    S.focus = '.btn.primary';
  }

  /* ---------- 흐름 ---------- */
  function render() {
    if (S.screen === 'title') renderTitle();
    else if (S.screen === 'birth') renderBirth();
    else if (S.screen === 'childhood') renderChildhood();
    else if (S.screen === 'career') renderCareer();
    else if (S.screen === 'hub') renderHub();
    else if (S.screen === 'battle') renderBattle();
    else if (S.screen === 'dead') renderDead();
    if (S.focus) {
      const el = app.querySelector(S.focus);
      if (el && el.focus) el.focus({ preventScroll: true });
    }
  }
  function enterByPhase() {
    const G = S.G;
    S.screen = G.phase === 'childhood' ? 'childhood' : G.phase === 'career' ? 'career' : 'hub';
  }
  function say(res, okTitle) {
    if (res && res.ok === false) setNotice(res.reason || '할 수 없다', [], 'bad');
    else if (okTitle) setNotice(okTitle, [], 'good');
  }

  const actions = {
    home: function () { S.screen = 'title'; S.notice = null; render(); },
    newGame: function () { S.screen = 'birth'; S.birth = null; S.G = null; render(); },
    continue: function () {
      const G = W.load();
      if (!G) { S.screen = 'birth'; render(); return; }
      S.G = G;
      if (G.pending) {
        const r = W.resolvePending(G);
        if (G.dead) { S.screen = 'dead'; W.clearSave(); render(); return; }
        setNotice('전투 도중 이탈', ['전투를 마치지 않고 떠나 도주(패배)로 처리되었다.'].concat(r ? r.lines : []), 'bad');
        commit();
      }
      enterByPhase(); render();
    },
    beginLife: function () {
      S.G = W.newGame(S.name || '이름 없음', S.birth);
      S.childResult = null; commit(); enterByPhase(); render();
    },
    childChoose: function (el) { S.childResult = W.childhoodChoose(S.G, Number(el.dataset.idx)); commit(); render(); },
    childNext: function () { S.childResult = null; enterByPhase(); render(); },
    alloc: function (el) { W.allocate(S.G, el.dataset.stat); commit(); render(); },
    pickJoinSchool: function (el) { S.joinSchool = el.dataset.id; render(); },
    join: function (el) {
      const id = el.dataset.id, c = CAREERS[id];
      if (c.kind === 'corp') { const r = W.startCorpExam(S.G, id); if (!r.ok) { setNotice(r.reason, [], 'bad'); render(); return; } launch(r.fight); return; }
      const r = W.joinCareer(S.G, id, S.joinSchool);
      if (!r.ok) { setNotice(r.reason, [], 'bad'); render(); return; }
      commit(); enterByPhase(); render();
    },
    closeNotice: function () { S.notice = null; render(); },
    tab: function (el) { S.tab = el.dataset.tab; render(); },
    openQuest: function (el) { S.openQuest = Number(el.dataset.uid); render(); },
    closeQuest: function () { S.openQuest = null; render(); },
    doQuest: function (el) {
      const res = W.chooseQuest(S.G, Number(el.dataset.uid), Number(el.dataset.idx));
      S.openQuest = null;
      if (res.fight) { launch(res.fight); return; }
      if (!res.ok) setNotice(res.reason, [], 'bad');
      else setNotice(res.success ? '의뢰 성공' : '의뢰 실패', [res.text].concat(res.reward ? ['+' + W.fa(res.reward.an) + ', 평판 +' + res.reward.rep] : []), res.success ? 'good' : 'bad');
      commit(); render();
    },
    exam: function () { const r = W.startExam(S.G); if (r.fight) { launch(r.fight); return; } say(r); render(); },
    ledger: function (el) { const r = W.startLedger(S.G, Number(el.dataset.idx)); if (r.fight) { launch(r.fight); return; } say(r); render(); },
    drawBlood: function () {
      const r = W.drawBlood(S.G);
      if (r.fight) { setNotice('치안 요원과 마주쳤다', ['피를 뽑다가 들켰다.'], 'bad'); launch(r.fight); return; }
      if (r.ok) setNotice('피를 뽑았다', [r.text, '혈기가 줄었다. 악명 +5'], ''); else say(r);
      commit(); render();
    },
    usePack: function () { say(W.usePack(S.G), '혈액팩을 사용했다'); commit(); render(); },
    buyPack: function () { say(W.buyPack(S.G), '혈액팩을 샀다'); commit(); render(); },
    buy: function (el) { say(W.buyWeapon(S.G, el.dataset.id), '구입했다'); commit(); render(); },
    equip: function (el) { W.equipWeapon(S.G, el.dataset.id); commit(); render(); },
    slot: function (el) { if (!W.toggleSlot(S.G, el.dataset.id)) setNotice('바꿀 수 없다', ['슬롯은 최대 ' + W.MAX_SLOTS + '개이고 공격 스킬이 최소 하나는 있어야 한다.'], 'bad'); commit(); render(); },
    heal: function (el) { const r = W.heal(S.G, Number(el.dataset.n)); if (r.ok) setNotice('치료를 받았다', ['생명력 +' + r.healed + ' (−' + W.fa(r.cost) + ')'], 'good'); else say(r); commit(); render(); },
    train: function (el) {
      const r = W.trainStat(S.G, el.dataset.stat);
      if (!r.ok) say(r); else setNotice(r.success ? '훈련 성공' : '훈련했지만 오르지 않았다', r.success ? [SN[el.dataset.stat] + ' +1'] : ['감만 잡았다.'], r.success ? 'good' : '');
      commit(); render();
    },
    transfer: function (el) {
      const r = W.transfer(S.G, el.dataset.id, S.joinSchool);
      if (!r.ok) say(r); else setNotice('이적했다', ['평판은 그대로, 계급은 최하위부터 다시 시작한다.'], 'good');
      commit(); render();
    },
    stayPinky: function () { W.stayPinky(S.G); commit(); render(); },
    daily: function (el) { const r = W.dailyChoose(S.G, Number(el.dataset.idx)); if (r) setNotice(r.text, r.effects, ''); commit(); render(); },
    endDay: function () {
      const lines = W.endDay(S.G);
      setNotice(S.G.day + '일차가 밝았다', lines, '');
      S.openQuest = null; commit(); render();
    },
    skill: function (el) { playRound(el.dataset.skill); },
    skip: function () { playRound(null); },
    retreat: function () {
      Battle.retreat(S.battle);
      S.log.push({ t: '도주했다.', mark: true });
      afterRound(); render();
    },
    afterBattle: function () {
      if (S.G.dead) { S.screen = 'dead'; S.battle = null; render(); return; }
      S.screen = 'hub'; S.battle = null;
      setNotice(S.result.title, S.result.lines, S.result.tone);
      S.result = null; render();
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
      S.birth = W.rollBirth();
      render();
    }
  });
  document.addEventListener('input', function (e) { if (e.target.id === 'name') S.name = e.target.value.trim(); });
  document.addEventListener('keydown', function (e) {
    if (S.screen !== 'battle' || !S.battle || S.battle.over) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const n = parseInt(e.key, 10);
    if (!n) return;
    const id = S.battle.player.skills[n - 1];
    if (id && Battle.canUse(S.battle, S.battle.player, id)) { e.preventDefault(); playRound(id); }
  });

  window.__PMG_STATE = S;
  render();
})();
