/* 이벤트 문구: 유년기, 일상, 의뢰, 적 이름. 모두 직접 쓴 문장이다.
   효과 키: str/con/agi(능력치), an(안), anMul(등급별 의뢰 보상의 배수), repMul(평판 보상의 배수),
            hpPct(최대 생명력 대비 증감), conn({연줄 종류: 증감}), infamy(악명) */
(function (root) {
  'use strict';

  const CHILDHOOD = [
    { id: 'alley-fight', title: '골목의 싸움판', text: '해 질 무렵, 골목 끝에서 또래 아이들이 한 아이를 둘러싸고 있다.',
      choices: [
        { label: '끼어든다', effects: { str: 1, conn: { '뒷세계': 1 } }, result: '얻어맞기도 했지만, 골목 아이들 사이에서 이름이 조금 알려졌다.' },
        { label: '멀찍이서 지켜본다', effects: { agi: 1 }, result: '누가 먼저 움직이는지, 어디로 빠지는지 눈에 익혔다.' },
        { label: '돌아선다', effects: { an: 20 }, result: '대신 근처 가게에서 심부름 값을 벌었다.' },
      ] },
    { id: 'errand', title: '낯선 어른의 심부름', text: '코트 깃을 세운 어른이 작은 상자를 건네며 길 건너편에 전해 달라고 한다.',
      choices: [
        { label: '말없이 맡는다', effects: { an: 40, conn: { '뒷세계': 1 } }, result: '상자 속은 보지 않았다. 두툼한 심부름 값과 얼굴 하나를 얻었다.' },
        { label: '값을 흥정한다', effects: { an: 60, agi: 1 }, result: '입씨름 끝에 값을 올려 받았다. 말발은 달리기만큼 빠르다.' },
        { label: '거절한다', effects: { con: 1 }, result: '찜찜한 마음을 안고 돌아와 일찍 잠들었다. 몸은 오히려 가벼웠다.' },
      ] },
    { id: 'garden', title: '높은 담장', text: '부유 지구의 담장 너머로 따뜻한 불빛과 웃음소리가 새어 나온다.',
      choices: [
        { label: '담을 타고 올라 구경한다', effects: { agi: 1, conn: { '상류': 1 } }, result: '정원사에게 들켰지만, 사정을 들은 집사가 간식을 쥐여 주었다.' },
        { label: '문 앞에서 서성인다', effects: { conn: { '상류': 1 } }, result: '오가는 하인들 사이에서 낯을 익혔다.' },
        { label: '돌아간다', effects: { con: 1 }, result: '먼 길을 걸어 돌아오며 다리가 단단해졌다.' },
      ] },
    { id: 'winter', title: '굶주린 겨울', text: '한 달째 먹을 것이 모자란다. 집안 공기가 차갑다.',
      choices: [
        { label: '막노동을 구한다', effects: { con: 1, an: 30 }, result: '몸은 고됐지만 손에 쥔 돈이 생겼다.' },
        { label: '이웃에게 신세를 진다', effects: { an: 20, conn: { '상류': 1 } }, result: '이웃의 소개로 윗동네 가게에 한 번 심부름을 갔다.' },
        { label: '쓰레기장을 뒤진다', effects: { agi: 1, an: 10 }, result: '재빨리 숨고 재빨리 줍는 법을 배웠다.' },
      ] },
    { id: 'bookshop', title: '낡은 책방', text: '비를 피해 들어간 책방 주인이 말을 건다. 일손이 모자란다고 한다.',
      choices: [
        { label: '책을 읽어 주겠다고 한다', effects: { conn: { '상류': 1 } }, result: '단골손님 중 높은 집안 사람이 있었다. 이야기가 오가며 낯이 익었다.' },
        { label: '짐 정리를 돕는다', effects: { str: 1, an: 20 }, result: '무거운 책 상자를 옮기느라 팔이 굵어졌다.' },
        { label: '그냥 비만 피하고 나온다', effects: { con: 1 }, result: '젖은 옷으로 걸어 돌아오며 감기 한 번 걸리지 않았다.' },
      ] },
    { id: 'race', title: '달리기 시합', text: '시장 아이들이 골목 끝까지 누가 먼저 가는지 내기를 건다.',
      choices: [
        { label: '직접 뛴다', effects: { agi: 1 }, result: '숨이 차도록 달렸다. 다리가 가벼워진 느낌이다.' },
        { label: '판돈을 건다', effects: { an: 50 }, result: '운 좋게 맞혔다. 주머니가 묵직하다.' },
        { label: '응원하며 아이들과 어울린다', effects: { conn: { '뒷세계': 1 } }, result: '결과보다 누구와 친해졌느냐가 오래 남았다.' },
      ] },
    { id: 'load', title: '무거운 짐', text: '짐꾼이 비틀거리며 무거운 짐을 옮기고 있다.',
      choices: [
        { label: '끝까지 같이 들어 준다', effects: { str: 1 }, result: '어깨가 빠질 듯했지만 버텨냈다.' },
        { label: '같이 나눠 든다', effects: { conn: { '뒷세계': 1 }, an: 10 }, result: '짐꾼은 고맙다며 동료들에게 소개해 주었다.' },
        { label: '쉬엄쉬엄 쉬었다 간다', effects: { con: 1 }, result: '쉬어 가며 오래 걷는 요령을 익혔다.' },
      ] },
    { id: 'rumor', title: '도시의 소문', text: '시장에 소문이 돈다. 어느 손가락에서 새 사람을 찾고 있다고.',
      choices: [
        { label: '소문의 출처를 쫓는다', effects: { conn: { '뒷세계': 1 }, agi: 1 }, result: '발이 닳도록 돌아다닌 끝에 몇몇 이름을 알게 되었다.' },
        { label: '귀담아듣고 정리한다', effects: { conn: { '상류': 1 } }, result: '조각난 소문을 맞춰 보니 윗선에 닿는 길이 보였다.' },
        { label: '흘려듣는다', effects: { con: 1 }, result: '쓸데없는 걱정 없이 푹 잤다.' },
      ] },
  ];

  const DAILY = [
    { id: 'wallet', title: '길바닥의 지갑', text: '발밑에 두툼한 지갑이 떨어져 있다. 주위에는 아무도 없다.',
      choices: [
        { label: '주인을 찾아 돌려준다', effects: { repMul: 0.5 }, result: '주인은 고마워하며 소문을 내 주었다.' },
        { label: '슬쩍 챙긴다', effects: { anMul: 1, infamy: 3 }, result: '주머니는 두둑해졌지만 찜찜한 기분이 따라붙는다.' },
      ] },
    { id: 'street-fight', title: '대로변의 소란', text: '골목 어귀에서 두 무리가 멱살을 잡고 있다.',
      choices: [
        { label: '말린다', effects: { hpPct: -0.08, repMul: 0.4 }, result: '몇 대 맞았지만 싸움은 가라앉았다. 지켜보던 이들의 눈빛이 달라졌다.' },
        { label: '지나친다', effects: {}, result: '모른 척 지나쳤다. 아무 일도 없었다.' },
      ] },
    { id: 'vendor', title: '짐이 무거운 상인', text: '단골 노점 상인이 수레를 끌며 숨을 몰아쉰다.',
      choices: [
        { label: '수레를 같이 민다', effects: { anMul: 0.4, conn: { '뒷세계': 1 } }, result: '상인은 약소하지만 값을 치르고 거래처를 소개해 주었다.' },
        { label: '인사만 하고 간다', effects: {}, result: '가볍게 인사하고 길을 갔다.' },
      ] },
    { id: 'clinic', title: '허름한 진료소', text: '골목 구석 진료소에서 의사가 약초 달인 물을 건넨다. 시음해 보라고 한다.',
      choices: [
        { label: '마셔 본다', effects: { hpPct: 0.15 }, result: '쓰지만 몸이 한결 가벼워졌다.' },
        { label: '정중히 사양한다', effects: { an: 15 }, result: '의사는 웃으며 대신 약초 포장 일을 맡겼다.' },
      ] },
    { id: 'invitation', title: '낯선 초대장', text: '문틈에 곱게 접힌 초대장이 꽂혀 있다. 저녁 모임 안내다.',
      choices: [
        { label: '참석한다', effects: { conn: { '상류': 1 }, anMul: -0.2 }, result: '비싼 자리였다. 지갑은 가벼워졌지만 얼굴을 익혔다.' },
        { label: '무시한다', effects: {}, result: '초대장을 접어 서랍에 넣었다.' },
      ] },
    { id: 'back-alley', title: '뒷골목의 제안', text: '그늘 속에서 누군가 낮은 목소리로 일손이 필요하다고 말한다.',
      choices: [
        { label: '귀를 기울인다', effects: { anMul: 0.8, infamy: 2, conn: { '뒷세계': 1 } }, result: '떳떳하진 않지만 돈이 된다. 얼굴도 알렸다.' },
        { label: '고개를 젓는다', effects: {}, result: '말없이 자리를 떴다.' },
      ] },
    { id: 'stray', title: '굶주린 개', text: '길가에서 마른 개가 빵집 쪽을 바라보고 있다.',
      choices: [
        { label: '빵을 사 준다', effects: { anMul: -0.1, hpPct: 0.1 }, result: '개가 졸졸 따라오는 길이 이상하게 든든했다.' },
        { label: '모른 척한다', effects: {}, result: '바쁜 걸음으로 가던 길을 갔다.' },
      ] },
    { id: 'sparring', title: '길거리 대련', text: '체격 좋은 사내가 팔을 걷어붙이고 상대를 구하고 있다. 판돈이 걸려 있다.',
      choices: [
        { label: '맞서 본다', effects: { hpPct: -0.12, anMul: 1.2 }, result: '아슬아슬하게 이겼다. 판돈이 손에 들어왔지만 온몸이 쑤신다.' },
        { label: '구경만 한다', effects: {}, result: '구경꾼 사이에서 대련을 지켜보았다.' },
      ] },
  ];

  const QUESTS = [
    { id: 'escort', title: '호위 의뢰', intro: '화물을 실은 수레와 함께 외곽 구역까지 가야 한다. 길목마다 노리는 눈이 있다.',
      choices: [
        { label: '정면에서 막아선다', kind: 'fight', mul: 1 },
        { label: '좁은 샛길로 돌아간다', kind: 'check', stat: 'agi', mul: 0.9 },
        { label: '짐을 함께 지고 서두른다', kind: 'check', stat: 'str', mul: 0.9 },
      ] },
    { id: 'debt', title: '채권 회수', intro: '돈을 갚지 않는 자의 집 앞이다. 문 안쪽에서 인기척이 느껴진다.',
      choices: [
        { label: '문을 걷어차고 들어간다', kind: 'fight', mul: 1 },
        { label: '끈질기게 눌러앉는다', kind: 'check', stat: 'con', mul: 0.9 },
        { label: '사정을 듣고 협상한다', kind: 'check', stat: 'conn', mul: 0.9 },
      ] },
    { id: 'sweep', title: '소굴 소탕', intro: '버려진 창고에 무리가 눌러앉았다. 주변 가게들이 해결을 부탁했다.',
      choices: [
        { label: '정문으로 쳐들어간다', kind: 'fight', mul: 1.15 },
        { label: '몰래 뒤로 돌아 들어간다', kind: 'check', stat: 'agi', mul: 1 },
      ] },
    { id: 'deliver', title: '급한 배달', intro: '해가 지기 전에 작은 꾸러미를 건너편 구역에 전해야 한다.',
      choices: [
        { label: '지름길로 서둘러 달린다', kind: 'check', stat: 'agi', mul: 0.9 },
        { label: '안전한 큰길로 천천히 간다', kind: 'safe', mul: 0.6 },
      ] },
    { id: 'guard', title: '야간 경비', intro: '밤새 창고를 지켜 달라는 의뢰다. 새벽에 수상한 그림자가 움직인다.',
      choices: [
        { label: '졸음을 참고 밤새 버틴다', kind: 'check', stat: 'con', mul: 0.9 },
        { label: '그림자를 먼저 친다', kind: 'fight', mul: 1 },
      ] },
    { id: 'bounty', title: '현상 수배', intro: '이름 높은 도망자의 몸값이 걸렸다. 행방은 이 구역 어딘가다.',
      choices: [
        { label: '추적해서 정면으로 붙잡는다', kind: 'fight', mul: 1.25 },
        { label: '길목에 함정을 판다', kind: 'check', stat: 'agi', mul: 1 },
      ] },
    { id: 'salvage', title: '잔해 수거', intro: '무너진 건물 잔해에서 값나가는 물건을 건져 달라는 의뢰다.',
      choices: [
        { label: '무너진 벽을 직접 걷어낸다', kind: 'check', stat: 'str', mul: 0.9 },
        { label: '잔해를 천천히 뒤진다', kind: 'safe', mul: 0.6 },
      ] },
  ];

  const ENEMY_NAMES = {
    A: ['골목 불량배', '빚쟁이 무리의 행동대원', '떠돌이 깡패', '수상한 짐꾼'],
    B: ['사설 경비원', '현상금 사냥꾼', '조직의 말단 간부', '독립 해결사'],
    C: ['이름난 해결사', '직속 집행자', '베테랑 용병', '정리 전문가'],
    D: ['특색급 해결사', '도시의 전설'],
  };

  const EVENTS = { CHILDHOOD: CHILDHOOD, DAILY: DAILY, QUESTS: QUESTS, ENEMY_NAMES: ENEMY_NAMES };
  if (typeof module !== 'undefined' && module.exports) module.exports = EVENTS;
  else { root.PMG = root.PMG || {}; root.PMG.EVENTS = EVENTS; }
})(typeof window !== 'undefined' ? window : globalThis);
