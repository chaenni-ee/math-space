// ===== 문제 생성기 =====
// 문제는 미리 저장해 두지 않고 매번 무작위로 만들어 냅니다.
// 문제 형식:
//   { kind: 통계용 유형 이름, key: 중복 방지용, type: 'mc'|'num'|'ox',
//     text, figure(SVG 문자열), options:[{label, svg}], answer, multi, unit, explain }
const Problems = (() => {
  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  function shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // 보기 목록(정답 표시 포함)을 섞어서 options/answer 만들기
  function mc(p, opts) {
    const sh = shuffle(opts);
    p.type = 'mc';
    p.options = sh.map(o => ({ label: o.label, svg: o.svg }));
    const idx = sh.map((o, i) => (o.ok ? i : -1)).filter(i => i >= 0);
    p.answer = p.multi ? idx : idx[0];
    return p;
  }

  const COUNT = { 면: 6, 모서리: 12, 꼭짓점: 8 };
  const randBox = () => { let a, h, d; do { a = R(2, 5); h = R(2, 4); d = R(2, 4); } while (a === h && h === d); return { a, h, d }; };

  // ================= 1차시: 직육면체와 정육면체 =================
  const L1 = [
    { // 면·모서리·꼭짓점의 수
      min: 0, w: 3,
      make() {
        const shape = pick(['직육면체', '정육면체']), part = pick(['면', '모서리', '꼭짓점']);
        const fig = shape === '직육면체' ? Fig.box({ ...randBox(), unit: 26 }) : Fig.box({ a: 3, h: 3, d: 3, unit: 28 });
        return {
          kind: '면·모서리·꼭짓점의 수', key: 'cnt' + shape + part, type: 'num',
          text: `${shape}의 <b>${part}</b>${part === '모서리' ? '는' : '은'} 모두 몇 개인가요?`, figure: fig, answer: COUNT[part], unit: '개',
          explain: `${shape}는 면 6개, 모서리 12개, 꼭짓점 8개예요.`,
        };
      },
    },
    { // 정의
      min: 0, w: 2,
      make() {
        const isCube = Math.random() < 0.5;
        const q = isCube ? '정사각형' : '직사각형';
        return mc({
          kind: '직육면체·정육면체의 뜻', key: 'def' + q,
          text: `<b>${q} 6개</b>로 둘러싸인 도형을 무엇이라고 하나요?`,
          explain: '직사각형 6개로 둘러싸인 도형은 직육면체, 정사각형 6개로 둘러싸인 도형은 정육면체예요.',
        }, [
          { label: '직육면체', ok: !isCube }, { label: '정육면체', ok: isCube },
          { label: q === '정사각형' ? '정사각형' : '직사각형', ok: false }, { label: '삼각기둥', ok: false },
        ]);
      },
    },
    { // 거꾸로 묻는 정의
      min: 0, w: 1,
      make() {
        const isCube = Math.random() < 0.5;
        const ans = isCube ? '정사각형 6개' : '직사각형 6개';
        return mc({
          kind: '직육면체·정육면체의 뜻', key: 'rdef' + isCube,
          text: `${isCube ? '정육면체' : '직육면체'}는 어떤 도형으로 둘러싸여 있나요?`,
          explain: '직육면체는 직사각형 6개, 정육면체는 정사각형 6개로 둘러싸여 있어요.',
        }, [
          { label: ans, ok: true },
          { label: isCube ? '직사각형 4개' : '정사각형 4개', ok: false },
          { label: isCube ? '정사각형 8개' : '직사각형 8개', ok: false },
          { label: '삼각형 6개', ok: false },
        ]);
      },
    },
    { // 그림에서 표시한 부분의 이름
      min: 0, w: 3,
      make() {
        const b = randBox();
        const part = pick(['면', '모서리', '꼭짓점']);
        const o = { ...b, unit: 28 };
        if (part === '면') o.face = pick(['front', 'top', 'right']);
        if (part === '모서리') o.edge = pick(Fig.EDGES.filter(e => e[0] !== 4 && e[1] !== 4));
        if (part === '꼭짓점') o.vertex = pick([0, 1, 2, 3, 5, 6, 7]);
        return mc({
          kind: '구성 요소 이름', key: 'part' + part + JSON.stringify(o),
          text: '그림에서 <span class="hl">표시한 부분</span>의 이름은 무엇인가요?', figure: Fig.box(o),
          explain: '선분으로 둘러싸인 부분은 면, 면과 면이 만나는 선분은 모서리, 모서리와 모서리가 만나는 점은 꼭짓점이에요.',
        }, ['면', '모서리', '꼭짓점'].map(x => ({ label: x, ok: x === part })));
      },
    },
    { // 용어의 뜻
      min: 0, w: 2,
      make() {
        const defs = [
          ['선분으로 둘러싸인 부분', '면'],
          ['면과 면이 만나는 선분', '모서리'],
          ['모서리와 모서리가 만나는 점', '꼭짓점'],
        ];
        const [d, ans] = pick(defs);
        return mc({
          kind: '구성 요소 이름', key: 'term' + ans,
          text: `직육면체에서 <b>${d}</b>을 무엇이라고 하나요?`,
          explain: defs.map(x => `${x[0]} → ${x[1]}`).join(', '),
        }, ['면', '모서리', '꼭짓점'].map(x => ({ label: x, ok: x === ans })));
      },
    },
    { // O/X
      min: 0, w: 3,
      make() {
        const bank = [
          ['정육면체는 직육면체라고 할 수 있어요.', true, '정사각형도 직사각형이므로 정육면체는 직육면체예요.'],
          ['직육면체는 정육면체라고 할 수 있어요.', false, '직사각형은 정사각형이 아닐 수 있으므로 직육면체를 정육면체라고 할 수 없어요.'],
          ['직육면체의 모서리는 길이가 모두 같아요.', false, '모서리의 길이가 모두 같은 것은 정육면체예요.'],
          ['정육면체의 모서리는 길이가 모두 같아요.', true, '정육면체는 정사각형 6개로 둘러싸여 모든 모서리의 길이가 같아요.'],
          ['직육면체의 면은 모두 직사각형이에요.', true, '직육면체는 직사각형 6개로 둘러싸인 도형이에요.'],
          ['직육면체와 정육면체는 꼭짓점의 수가 같아요.', true, '둘 다 꼭짓점이 8개예요.'],
          ['직육면체와 정육면체는 모서리의 수가 달라요.', false, '둘 다 모서리가 12개예요.'],
          ['정육면체의 면은 모두 크기가 같아요.', true, '정육면체는 크기가 같은 정사각형 6개로 둘러싸여 있어요.'],
          ['면과 면이 만나는 선분을 꼭짓점이라고 해요.', false, '면과 면이 만나는 선분은 모서리예요.'],
          ['모서리와 모서리가 만나는 점을 꼭짓점이라고 해요.', true, '맞아요! 모서리와 모서리가 만나는 점이 꼭짓점이에요.'],
          ['직육면체의 면은 모두 8개예요.', false, '직육면체의 면은 6개예요. 꼭짓점이 8개예요.'],
          ['정육면체의 꼭짓점은 모두 8개예요.', true, '정육면체의 꼭짓점은 8개예요.'],
        ];
        const [t, a, e] = pick(bank);
        return { kind: 'O/X 개념 확인', key: 'ox' + t, type: 'ox', text: t, answer: a, explain: e };
      },
    },
    { // 그림 보고 고르기
      min: 1, w: 3,
      make() {
        const v = pick(['cube', 'notBox', 'allBox']);
        const cub = () => { const b = randBox(); return Fig.box({ ...b, unit: 22, labels: { a: b.a + 'cm', h: b.h + 'cm', d: b.d + 'cm' }, maxW: 170 }); };
        const cube = () => { const n = R(2, 4); return Fig.box({ a: n, h: n, d: n, unit: 26, labels: { a: n + 'cm', h: n + 'cm', d: n + 'cm' }, maxW: 170 }); };
        const others = [Fig.triPrism, Fig.cylinder, Fig.pyramid, Fig.trapPrism];
        if (v === 'cube') return mc({
          kind: '모양 알아보기', key: 'pick-cube' + R(0, 99), text: '<b>정육면체</b>를 찾아 고르세요.',
          explain: '모든 모서리의 길이가 같고 정사각형 6개로 둘러싸인 것이 정육면체예요.',
        }, [{ svg: cube(), ok: true }, { svg: cub(), ok: false }, { svg: cub(), ok: false }, { svg: pick(others)(), ok: false }]);
        if (v === 'notBox') {
          const o = shuffle(others).slice(0, 1);
          return mc({
            kind: '모양 알아보기', key: 'pick-not' + R(0, 99), text: '<b>직육면체가 아닌 것</b>을 고르세요.',
            explain: '직사각형 6개로 둘러싸여 있지 않으면 직육면체가 아니에요. 정육면체도 직육면체예요!',
          }, [{ svg: cub(), ok: false }, { svg: cube(), ok: false }, { svg: cub(), ok: false }, { svg: o[0](), ok: true }]);
        }
        const o = shuffle(others).slice(0, 2);
        return mc({
          kind: '모양 알아보기', key: 'pick-all' + R(0, 99), multi: true, text: '<b>직육면체</b>를 <u>모두</u> 고르세요.',
          explain: '정육면체도 직사각형 6개로 둘러싸여 있으므로 직육면체예요.',
        }, [{ svg: cub(), ok: true }, { svg: cube(), ok: true }, { svg: o[0](), ok: false }, { svg: o[1](), ok: false }]);
      },
    },
    { // 한 꼭짓점·모서리·면 주변
      min: 1, w: 2,
      make() {
        const bank = [
          ['직육면체의 <b>한 꼭짓점에서 만나는 모서리</b>는 몇 개인가요?', 3, '한 꼭짓점에서 모서리 3개가 만나요.'],
          ['직육면체의 <b>한 꼭짓점에서 만나는 면</b>은 몇 개인가요?', 3, '한 꼭짓점에서 면 3개가 만나요.'],
          ['직육면체의 <b>한 모서리에서 만나는 면</b>은 몇 개인가요?', 2, '모서리는 면 2개가 만나는 선분이에요.'],
          ['직육면체의 <b>한 면을 둘러싼 모서리</b>는 몇 개인가요?', 4, '한 면은 사각형이므로 모서리 4개로 둘러싸여 있어요.'],
          ['직육면체의 <b>한 면에 있는 꼭짓점</b>은 몇 개인가요?', 4, '한 면은 사각형이므로 꼭짓점이 4개 있어요.'],
        ];
        const [t, a, e] = pick(bank);
        return { kind: '구성 요소 관계', key: 'rel' + t, type: 'num', text: t, answer: a, unit: '개', explain: e, figure: Fig.box({ ...randBox(), unit: 26 }) };
      },
    },
    { // 수 계산
      min: 1, w: 2,
      make() {
        const parts = shuffle(['면', '모서리', '꼭짓점']).slice(0, 2);
        const plus = Math.random() < 0.6;
        const [x, y] = plus ? parts : parts.sort((p, q) => COUNT[q] - COUNT[p]);
        const ans = plus ? COUNT[x] + COUNT[y] : COUNT[x] - COUNT[y];
        const shape = pick(['직육면체', '정육면체']);
        return {
          kind: '면·모서리·꼭짓점의 수', key: 'calc' + shape + x + y + plus, type: 'num',
          text: `${shape}의 <b>${x}의 수</b>${plus ? '와' : '에서'} <b>${y}의 수</b>${plus ? '를 더하면' : '를 빼면'} 얼마인가요?`,
          answer: ans, explain: `${x} ${COUNT[x]}개 ${plus ? '+' : '−'} ${y} ${COUNT[y]}개 = ${ans}`,
        };
      },
    },
    { // 공통점·차이점
      min: 1, w: 2,
      make() {
        if (Math.random() < 0.5) return mc({
          kind: '직육면체와 정육면체 비교', key: 'common',
          text: '직육면체와 정육면체의 <b>공통점이 아닌 것</b>은 무엇인가요?',
          explain: '모든 모서리의 길이가 같은 것은 정육면체뿐이에요.',
        }, [
          { label: '면이 6개예요.', ok: false }, { label: '모서리가 12개예요.', ok: false },
          { label: '꼭짓점이 8개예요.', ok: false }, { label: '모서리의 길이가 모두 같아요.', ok: true },
        ]);
        return mc({
          kind: '직육면체와 정육면체 비교', key: 'diff',
          text: '직육면체와 정육면체의 <b>다른 점</b>은 무엇인가요?',
          explain: '직육면체의 면은 직사각형, 정육면체의 면은 정사각형이에요. 면·모서리·꼭짓점의 수는 같아요.',
        }, [
          { label: '면의 모양', ok: true }, { label: '면의 수', ok: false },
          { label: '모서리의 수', ok: false }, { label: '꼭짓점의 수', ok: false },
        ]);
      },
    },
    { // 모서리 길이의 합
      min: 2, w: 2,
      make() {
        const v = R(0, 2);
        if (v === 0) {
          const n = R(2, 9);
          return { kind: '모서리 길이의 합', key: 'esum-c' + n, type: 'num', unit: 'cm',
            text: `한 모서리의 길이가 <b>${n} cm</b>인 정육면체의 <b>모든 모서리 길이의 합</b>은 몇 cm인가요?`,
            figure: Fig.box({ a: 3, h: 3, d: 3, unit: 26, labels: { a: n + 'cm' } }),
            answer: 12 * n, explain: `정육면체는 길이가 같은 모서리가 12개 → ${n} × 12 = ${12 * n}` };
        }
        if (v === 1) {
          const n = R(2, 9);
          return { kind: '모서리 길이의 합', key: 'esum-r' + n, type: 'num', unit: 'cm',
            text: `정육면체의 모든 모서리 길이의 합이 <b>${12 * n} cm</b>예요. 한 모서리의 길이는 몇 cm인가요?`,
            answer: n, explain: `모서리가 12개이므로 ${12 * n} ÷ 12 = ${n}` };
        }
        const b = randBox();
        return { kind: '모서리 길이의 합', key: 'esum-b' + JSON.stringify(b), type: 'num', unit: 'cm',
          text: '직육면체의 <b>모든 모서리 길이의 합</b>은 몇 cm인가요?',
          figure: Fig.box({ ...b, unit: 26, labels: { a: b.a + 'cm', h: b.h + 'cm', d: b.d + 'cm' } }),
          answer: 4 * (b.a + b.h + b.d), explain: `길이가 같은 모서리가 4개씩 3묶음 → (${b.a} + ${b.h} + ${b.d}) × 4 = ${4 * (b.a + b.h + b.d)}` };
      },
    },
  ];

  // ================= 2차시: 직육면체의 겨냥도 =================
  const VIS = [
    ['보이는 면', 3], ['보이지 않는 면', 3], ['보이는 모서리', 9],
    ['보이지 않는 모서리', 3], ['보이는 꼭짓점', 7], ['보이지 않는 꼭짓점', 1],
  ];
  // 일부러 틀리게 그린 겨냥도 (style: 모서리 번호 → solid/dash/none)
  function wrongSketch(b) {
    const hiddenIdx = Fig.EDGES.map((e, i) => (e[0] === 4 || e[1] === 4 ? i : -1)).filter(i => i >= 0);
    const visIdx = Fig.EDGES.map((e, i) => i).filter(i => !hiddenIdx.includes(i));
    const v = R(0, 3), st = {};
    if (v === 0) hiddenIdx.forEach(i => st[i] = 'solid');            // 안 보이는 모서리를 실선으로
    if (v === 1) st[pick(visIdx)] = 'dash';                            // 보이는 모서리를 점선으로
    if (v === 2) st[pick(visIdx)] = 'none';                            // 보이는 모서리 빠뜨림
    if (v === 3) st[pick(hiddenIdx)] = 'none';                         // 안 보이는 모서리 빠뜨림
    return Fig.box({ ...b, unit: 24, style: st, maxW: 160 });
  }
  const L2 = [
    { // 점종이에 겨냥도 완성하기
      min: 0, w: 5,
      make(level) {
        const pz = Sketch.makePuzzle(level);
        return {
          kind: '겨냥도 완성하기', key: 'draw' + pz.id, type: 'draw', puzzle: pz,
          text: '주어진 선에 이어 <b>직육면체의 겨냥도</b>를 완성하세요.',
          explain: '보이는 모서리는 실선, 보이지 않는 모서리 3개는 점선으로 그려요. 평행한 모서리는 길이가 같아요.',
        };
      },
    },
    { // 보이는/보이지 않는 개수
      min: 0, w: 3,
      make() {
        const [t, a] = pick(VIS);
        return { kind: '보이는 부분·보이지 않는 부분', key: 'vis' + t, type: 'num', unit: '개', answer: a,
          text: `직육면체의 겨냥도에서 <b>${t}</b>은 몇 개인가요?`.replace('모서리</b>은', '모서리</b>는'),
          figure: Fig.box({ ...randBox(), unit: 28 }),
          explain: '겨냥도에서 보이는 면 3개, 보이지 않는 면 3개 / 보이는 모서리 9개, 보이지 않는 모서리 3개 / 보이는 꼭짓점 7개, 보이지 않는 꼭짓점 1개예요.' };
      },
    },
    { // 그리는 규칙
      min: 0, w: 2,
      make() {
        const hid = Math.random() < 0.5;
        return mc({ kind: '겨냥도 그리는 방법', key: 'rule' + hid,
          text: `직육면체의 겨냥도에서 <b>${hid ? '보이지 않는' : '보이는'} 모서리</b>는 어떻게 그리나요?`,
          explain: '보이는 모서리는 실선으로, 보이지 않는 모서리는 점선으로 그려요.' },
          [{ label: '실선', ok: !hid }, { label: '점선', ok: hid }, { label: '그리지 않아요', ok: false }, { label: '빨간색 선', ok: false }]);
      },
    },
    { // 바르게 그린 / 잘못 그린 겨냥도 고르기
      min: 1, w: 3,
      make() {
        const right = Math.random() < 0.5;
        const opts = [];
        if (right) { opts.push({ svg: Fig.box({ ...randBox(), unit: 24, maxW: 160 }), ok: true }); for (let i = 0; i < 3; i++) opts.push({ svg: wrongSketch(randBox()), ok: false }); }
        else { opts.push({ svg: wrongSketch(randBox()), ok: true }); for (let i = 0; i < 3; i++) opts.push({ svg: Fig.box({ ...randBox(), unit: 24, maxW: 160 }), ok: false }); }
        return mc({ kind: '바른 겨냥도 찾기', key: 'pickdraw' + R(0, 999),
          text: right ? '직육면체의 겨냥도를 <b>바르게 그린 것</b>을 고르세요.' : '직육면체의 겨냥도를 <b>잘못 그린 것</b>을 고르세요.',
          explain: '보이는 모서리 9개는 실선, 보이지 않는 모서리 3개는 점선이어야 하고 빠진 모서리가 없어야 해요.' }, opts);
      },
    },
    { // O/X
      min: 0, w: 2,
      make() {
        const bank = [
          ['겨냥도에서 보이지 않는 모서리는 점선으로 그려요.', true, '보이지 않는 모서리는 점선으로 그려요.'],
          ['겨냥도에서 보이는 모서리는 점선으로 그려요.', false, '보이는 모서리는 실선으로 그려요.'],
          ['직육면체의 겨냥도에서 보이지 않는 꼭짓점은 1개예요.', true, '보이지 않는 꼭짓점은 1개, 보이는 꼭짓점은 7개예요.'],
          ['직육면체의 겨냥도에서 보이는 면은 4개예요.', false, '보이는 면은 3개예요.'],
          ['겨냥도에서 평행한 모서리는 평행하게 그려요.', true, '실제로 평행한 모서리는 겨냥도에서도 평행하게 그려요.'],
          ['보이지 않는 모서리는 겨냥도에 그리지 않아요.', false, '보이지 않는 모서리도 점선으로 꼭 그려요.'],
        ];
        const [t, a, e] = pick(bank);
        return { kind: 'O/X 개념 확인', key: 'ox2' + t, type: 'ox', text: t, answer: a, explain: e };
      },
    },
    { // 길이의 합
      min: 2, w: 2,
      make() {
        const b = randBox(), hid = Math.random() < 0.5, ans = hid ? b.a + b.h + b.d : 3 * (b.a + b.h + b.d);
        return { kind: '모서리 길이의 합', key: 'vsum' + hid + JSON.stringify(b), type: 'num', unit: 'cm', answer: ans,
          text: `직육면체의 겨냥도에서 <b>${hid ? '보이지 않는' : '보이는'} 모서리 길이의 합</b>은 몇 cm인가요?`,
          figure: Fig.box({ ...b, unit: 26, labels: { a: b.a + 'cm', h: b.h + 'cm', d: b.d + 'cm' } }),
          explain: hid ? `보이지 않는 모서리는 길이가 다른 3개 → ${b.a} + ${b.h} + ${b.d} = ${ans}` : `보이는 모서리는 9개, 같은 길이가 3개씩 → (${b.a} + ${b.h} + ${b.d}) × 3 = ${ans}` };
      },
    },
  ];

  // ================= 3차시: 직육면체의 성질 =================
  const FACES6 = ['top', 'bottom', 'front', 'back', 'left', 'right'];
  const VISIBLE = ['front', 'top', 'right'];
  const adj = f => FACES6.filter(g => g !== f && g !== Fig.OPP[f]);
  const fn = f => Fig.faceName(f);
  const lbox = o => Fig.box({ ...randBox(), unit: 30, vlabels: true, ...o });
  const faceDims = (f, b) => (f === 'top' || f === 'bottom') ? [b.a, b.d] : (f === 'front' || f === 'back') ? [b.a, b.h] : [b.h, b.d];
  const L3 = [
    { // 평행한 면 고르기
      min: 0, w: 3,
      make(level) {
        const f = pick(FACES6);
        return mc({ kind: '평행한 면 찾기', key: 'par' + f,
          text: level === 0 ? `색칠한 면(<b>${fn(f)}</b>)과 <b>평행한 면</b>은 어느 것인가요?` : `<b>${fn(f)}</b>과 <b>평행한 면</b>은 어느 것인가요?`,
          figure: lbox(level === 0 ? { face: f } : {}),
          explain: `직육면체에서 마주 보는 두 면은 서로 평행해요. ${fn(f)}과 마주 보는 면은 ${fn(Fig.OPP[f])}이에요.` },
          [{ label: fn(Fig.OPP[f]), ok: true }, ...shuffle(adj(f)).slice(0, 3).map(g => ({ label: fn(g), ok: false }))]);
      },
    },
    { // 수직인 면 모두 고르기
      min: 1, w: 3,
      make() {
        const f = pick(FACES6);
        return mc({ kind: '수직인 면 찾기', key: 'perp' + f, multi: true,
          text: `<b>${fn(f)}</b>과 <b>수직인 면</b>을 모두 고르세요.`,
          figure: lbox({ face: f }),
          explain: `한 면과 수직인 면은 마주 보는 면을 뺀 나머지 4개예요. ${fn(Fig.OPP[f])}은 평행한 면이에요.` },
          [{ label: fn(Fig.OPP[f]), ok: false }, ...adj(f).map(g => ({ label: fn(g), ok: true }))]);
      },
    },
    { // 그림에서 평행한 면 누르기
      min: 0, w: 3,
      make(level) {
        const h = pick(FACES6.filter(f => !VISIBLE.includes(f)));
        return { kind: '평행한 면 찾기', key: 'tappar' + h, type: 'tap', answer: [Fig.OPP[h]],
          text: `<b>${fn(h)}</b>과 <b>평행한 면</b>을 그림에서 눌러 고르세요.`,
          figure: lbox({ tap: true, face: level === 0 ? h : null, unit: 36, maxW: 320 }),
          explain: `${fn(h)}과 마주 보는 ${fn(Fig.OPP[h])}이 평행한 면이에요.` };
      },
    },
    { // 그림에서 수직인 면 누르기
      min: 1, w: 2,
      make() {
        const f = pick(FACES6);
        return { kind: '수직인 면 찾기', key: 'tapperp' + f, type: 'tap', answer: adj(f).filter(g => VISIBLE.includes(g)),
          text: `<b>${fn(f)}</b>과 <b>수직인 면</b>을 그림에서 하나 눌러 고르세요.`,
          figure: lbox({ tap: true, face: f, unit: 36, maxW: 320 }),
          explain: `마주 보는 ${fn(Fig.OPP[f])}을 뺀 나머지 면은 모두 ${fn(f)}과 수직이에요.` };
      },
    },
    { // 밑면과 옆면
      min: 1, w: 2,
      make() {
        const f = pick(FACES6);
        return mc({ kind: '밑면과 옆면', key: 'side' + f,
          text: `<b>${fn(f)}</b>을 밑면이라고 할 때, <b>옆면이 아닌 것</b>은 어느 것인가요?`,
          figure: lbox({ face: f }),
          explain: `밑면과 만나는 4개의 면이 옆면이에요. ${fn(Fig.OPP[f])}은 또 다른 밑면이에요.` },
          [{ label: fn(Fig.OPP[f]), ok: true }, ...shuffle(adj(f)).slice(0, 3).map(g => ({ label: fn(g), ok: false }))]);
      },
    },
    { // 개수
      min: 0, w: 2,
      make() {
        const bank = [
          ['직육면체에서 <b>서로 평행한 면</b>은 모두 몇 쌍인가요?', 3, '쌍', '마주 보는 면끼리 평행하므로 3쌍이에요.'],
          ['직육면체에서 <b>한 면과 수직인 면</b>은 몇 개인가요?', 4, '개', '마주 보는 면을 뺀 4개의 면과 수직이에요.'],
          ['직육면체에서 <b>한 면과 평행한 면</b>은 몇 개인가요?', 1, '개', '마주 보는 면 1개와 평행해요.'],
          ['직육면체에서 <b>한 밑면에 대한 옆면</b>은 몇 개인가요?', 4, '개', '밑면과 만나는 면 4개가 옆면이에요.'],
          ['직육면체에서 <b>한 꼭짓점에서 만나는 면</b>은 몇 개인가요?', 3, '개', '한 꼭짓점에서 서로 수직인 면 3개가 만나요.'],
        ];
        const [t, a, u, e] = pick(bank);
        return { kind: '평행·수직인 면의 수', key: 'cnt3' + t, type: 'num', unit: u, answer: a, text: t, explain: e, figure: Fig.box({ ...randBox(), unit: 26 }) };
      },
    },
    { // 용어
      min: 0, w: 2,
      make() {
        if (Math.random() < 0.5) return mc({ kind: '평행·수직의 뜻', key: 'term3a',
          text: '직육면체에서 <b>계속 늘여도 만나지 않는 두 면</b>을 서로 어떻다고 하나요?',
          explain: '계속 늘여도 만나지 않는 두 면은 서로 평행해요.' },
          [{ label: '평행하다', ok: true }, { label: '수직이다', ok: false }, { label: '마주 만난다', ok: false }, { label: '겹친다', ok: false }]);
        return mc({ kind: '평행·수직의 뜻', key: 'term3b',
          text: '직육면체에서 <b>밑면과 만나는 면</b>을 무엇이라고 하나요?',
          explain: '밑면과 만나는 면을 옆면이라고 하고, 밑면과 옆면은 수직으로 만나요.' },
          [{ label: '옆면', ok: true }, { label: '밑면', ok: false }, { label: '윗면', ok: false }, { label: '겉면', ok: false }]);
      },
    },
    { // O/X
      min: 0, w: 2,
      make() {
        const bank = [
          ['직육면체에서 마주 보는 두 면은 서로 평행해요.', true, '마주 보는 면은 계속 늘여도 만나지 않아 평행해요.'],
          ['직육면체에서 서로 만나는 두 면은 평행해요.', false, '서로 만나는 두 면은 수직이에요.'],
          ['밑면과 옆면은 서로 수직으로 만나요.', true, '밑면과 옆면은 수직으로 만나요.'],
          ['직육면체의 밑면은 항상 아래에 있는 면 1개뿐이에요.', false, '서로 평행한 두 면이 밑면이고, 평행한 면은 각각 밑면이 될 수 있어요.'],
          ['직육면체에서 한 면과 수직인 면은 4개예요.', true, '마주 보는 면을 뺀 4개의 면과 수직이에요.'],
          ['직육면체에서 평행한 면은 모두 6쌍이에요.', false, '평행한 면은 3쌍이에요.'],
          ['정육면체에서도 마주 보는 면은 서로 평행해요.', true, '정육면체도 직육면체이므로 마주 보는 면이 평행해요.'],
        ];
        const [t, a, e] = pick(bank);
        return { kind: 'O/X 개념 확인', key: 'ox3' + t, type: 'ox', text: t, answer: a, explain: e };
      },
    },
    { // 넓이·둘레 (심화)
      min: 2, w: 2,
      make() {
        const b = randBox(), f = pick(FACES6), [p, q] = faceDims(f, b), area = Math.random() < 0.5;
        return { kind: '평행한 면의 넓이·둘레', key: 'ar' + area + f + JSON.stringify(b), type: 'num', unit: area ? 'cm²' : 'cm',
          answer: area ? p * q : 2 * (p + q),
          text: `색칠한 면과 <b>평행한 면</b>의 <b>${area ? '넓이' : '둘레'}</b>는 몇 ${area ? 'cm²' : 'cm'}인가요?`,
          figure: Fig.box({ ...b, unit: 28, face: f, labels: { a: b.a + 'cm', h: b.h + 'cm', d: b.d + 'cm' } }),
          explain: `평행한 면은 색칠한 면과 모양과 크기가 같아요. ${area ? `${p} × ${q} = ${p * q}` : `(${p} + ${q}) × 2 = ${2 * (p + q)}`}` };
      },
    },
  ];

  // ================= 4차시: 정육면체의 전개도 =================
  const NK = Nets.key;
  const hasBlock = cells => { const s = new Set(cells.map(c => NK(...c))); return cells.some(([x, y]) => s.has(NK(x + 1, y)) && s.has(NK(x, y + 1)) && s.has(NK(x + 1, y + 1))); };
  const nonNet = level => { for (;;) { const c = Nets.randomNonNet(); if (level === 0 || !hasBlock(c) || Math.random() < 0.25) return c; } };
  const FL = ['가', '나', '다', '라', '마', '바'];
  const labelNet = cells => { const L = {}; shuffle(cells).forEach((c, i) => L[NK(...c)] = FL[i]); return L; };
  const L4 = [
    { // 전개도가 될 수 있는 것 / 없는 것
      min: 0, w: 3,
      make(level) {
        const can = level === 0 || Math.random() < 0.5;
        const opt = (cells, ok) => ({ svg: Nets.svg(cells, { unit: 22, maxW: 150, maxH: 130 }), ok });
        const opts = can ? [opt(Nets.randomNet(), true), opt(nonNet(level), false), opt(nonNet(level), false), opt(nonNet(level), false)]
                         : [opt(nonNet(level), true), opt(Nets.randomNet(), false), opt(Nets.randomNet(), false), opt(Nets.randomNet(), false)];
        return mc({ kind: '전개도 찾기', key: 'netpick' + R(0, 9999),
          text: can ? '<b>정육면체의 전개도가 될 수 있는 것</b>을 고르세요.' : '<b>정육면체의 전개도가 될 수 없는 것</b>을 고르세요.',
          explain: '접었을 때 겹치는 면이 없고 6개의 면이 모두 맞닿아야 정육면체의 전개도예요. 네 면이 한 꼭짓점에 모이거나(2×2 모양) 같은 쪽으로 면이 겹치면 안 돼요.' }, opts);
      },
    },
    { // 전개도 완성하기 (빈칸 누르기)
      min: 0, w: 4,
      make() {
        for (;;) {
          const net = Nets.randomNet();
          const i = R(0, 5), five = net.filter((_, j) => j !== i);
          if (!Nets.connected(five)) continue;
          const have = new Set(five.map(c => NK(...c))), cand = new Set();
          for (const [x, y] of five) for (const [dx, dy] of Nets.DIRS) { const k = NK(x + dx, y + dy); if (!have.has(k)) cand.add(k); }
          const candArr = [...cand];
          const ok = candArr.filter(k => Nets.isNet([...five, k.split(',').map(Number)]));
          if (!ok.length || ok.length === candArr.length) continue;
          return { kind: '전개도 완성하기', key: 'netfill' + five.map(c => NK(...c)).sort().join(';'), type: 'tap', answer: ok,
            text: '면 1개를 더 붙여 <b>정육면체의 전개도</b>를 완성하려고 해요. 알맞은 자리를 눌러 고르세요.',
            figure: Nets.svg(five, { cand: candArr, unit: 40, maxW: 360, maxH: 280 }),
            explain: '머릿속으로 접어 보았을 때 6개의 면이 겹치지 않고 모두 덮여야 해요.' + (ok.length > 1 ? ` (알맞은 자리가 ${ok.length}곳 있어요.)` : '') };
        }
      },
    },
    { // 접었을 때 평행한 면
      min: 1, w: 3,
      make() {
        const net = Nets.randomNet(), F = Nets.fold(net).face, L = labelNet(net);
        const k0 = NK(...pick(net)), opp = Nets.opposite(F.get(k0));
        const oppK = [...F.keys()].find(k => F.get(k) === opp);
        const others = net.map(c => NK(...c)).filter(k => k !== k0 && k !== oppK);
        const perp = Math.random() < 0.4;
        return mc({ kind: '전개도에서 평행한 면', key: 'netopp' + perp + k0 + Object.values(L).join(''),
          text: perp ? `전개도를 접었을 때 면 <b>${L[k0]}</b>와 <b>수직인 면이 아닌 것</b>은 어느 것인가요?` : `전개도를 접었을 때 면 <b>${L[k0]}</b>와 <b>평행한 면</b>은 어느 것인가요?`,
          figure: Nets.svg(net, { labels: L, hl: [k0], unit: 40, maxW: 320 }),
          explain: `접으면 면 ${L[k0]}와 면 ${L[oppK]}가 서로 마주 보아 평행해요. 나머지 4개의 면은 면 ${L[k0]}와 수직이에요.` },
          [{ label: '면 ' + L[oppK], ok: true }, ...shuffle(others).slice(0, 3).map(k => ({ label: '면 ' + L[k], ok: false }))]);
      },
    },
    { // 접었을 때 겹치는 점
      min: 2, w: 2,
      make() {
        for (;;) {
          const net = Nets.randomNet(), C = Nets.fold(net).corner;
          const pts = [...C.keys()];
          const P = pick(pts), same = pts.filter(k => k !== P && C.get(k) === C.get(P));
          if (!same.length) continue;
          const diff = shuffle(pts.filter(k => C.get(k) !== C.get(P))).slice(0, 3);
          const Q = pick(same), letters = shuffle(['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ']);
          const pts5 = [P, Q, ...diff], lab = {}; pts5.forEach((k, i) => lab[k] = letters[i]);
          return mc({ kind: '전개도에서 겹치는 점', key: 'netpt' + P + net.map(c => NK(...c)).join(';'),
            text: `전개도를 접었을 때 <b>점 ${lab[P]}</b>과 만나는 점은 어느 것인가요?`,
            figure: Nets.svg(net, { points: lab, unit: 44, maxW: 340 }),
            explain: `점선을 따라 접어 보면 점 ${lab[P]}과 점 ${lab[Q]}이 한 꼭짓점에서 만나요.` },
            [Q, ...diff].map(k => ({ label: '점 ' + lab[k], ok: k === Q })));
        }
      },
    },
    { // O/X
      min: 0, w: 2,
      make() {
        const bank = [
          ['정육면체의 전개도에서 잘린 모서리는 실선으로 그려요.', true, '잘린 모서리는 실선, 잘리지 않은 모서리는 점선으로 그려요.'],
          ['정육면체의 전개도에서 잘리지 않은 모서리는 실선으로 그려요.', false, '잘리지 않은 모서리는 점선으로 그려요.'],
          ['정육면체의 전개도는 모양이 한 가지뿐이에요.', false, '정육면체의 전개도는 여러 가지 모양으로 그릴 수 있어요.'],
          ['정육면체의 전개도에서 모든 모서리의 길이는 같아요.', true, '정육면체는 모서리의 길이가 모두 같아요.'],
          ['전개도를 접었을 때 겹치는 면이 있으면 정육면체의 전개도가 아니에요.', true, '접었을 때 겹치는 면이 없어야 해요.'],
          ['정사각형 6개를 이어 붙이면 항상 정육면체의 전개도가 돼요.', false, '이어 붙인 모양에 따라 접었을 때 면이 겹칠 수 있어요.'],
        ];
        const [t, a, e] = pick(bank);
        return { kind: 'O/X 개념 확인', key: 'ox4' + t, type: 'ox', text: t, answer: a, explain: e };
      },
    },
    { // 수
      min: 0, w: 1,
      make(level) {
        if (level >= 2 && Math.random() < 0.6) {
          const n = R(2, 6), net = Nets.randomNet();
          return { kind: '전개도의 둘레', key: 'netper' + n, type: 'num', unit: 'cm', answer: 14 * n,
            text: `한 모서리의 길이가 <b>${n} cm</b>인 정육면체의 전개도예요. 전개도의 <b>둘레</b>는 몇 cm인가요?`,
            figure: Nets.svg(net, { unit: 30, maxW: 260 }),
            explain: `정육면체 전개도의 둘레에는 모서리 길이가 14개 있어요. ${n} × 14 = ${14 * n}` };
        }
        return { kind: '전개도의 면', key: 'netcnt', type: 'num', unit: '쌍', answer: 3,
          text: '정육면체의 전개도를 접었을 때 <b>서로 평행한 면</b>은 모두 몇 쌍인가요?',
          figure: Nets.svg(Nets.randomNet(), { unit: 30, maxW: 260 }), explain: '마주 보는 면끼리 평행하므로 3쌍이에요.' };
      },
    },
  ];

  // ================= 5차시: 직육면체의 전개도 =================
  const randDims = () => { const v = shuffle([1, 2, 3, 4, 5]).slice(0, 3).sort((a, b) => a - b); const s = shuffle(v); return { x: s[0] + 1, y: s[1] + 1, z: s[2] + 1 }; };
  function goodCuboid() {
    for (;;) { const L = Nets.cuboidLayout(Nets.randomNet(), randDims()); if (!L.overlap) return L; }
  }
  function badCuboid() {
    for (let t = 0; t < 200; t++) {
      if (Math.random() < 0.55) {   // 맞닿는 모서리 길이가 다른 전개도
        const net = Nets.randomNet(), d = randDims(), sw = NK(...pick(net));
        const L = Nets.cuboidLayout(net, d, sw);
        if (!L.overlap && !L.match) return L;
      } else {                       // 접으면 면이 겹치는 모양
        const L = Nets.cuboidLayout(nonNet(1), randDims());
        if (!L.overlap) return L;
      }
    }
    return Nets.cuboidLayout(nonNet(0), randDims());
  }
  const cuboidOpt = (L, ok) => ({ svg: Nets.cuboidSvg(L, { maxW: 150, maxH: 125 }).svg, ok });
  const L5 = [
    { // 전개도가 될 수 있는 것 / 없는 것
      min: 0, w: 3,
      make(level) {
        const can = level === 0 || Math.random() < 0.5;
        const opts = can ? [cuboidOpt(goodCuboid(), true), cuboidOpt(badCuboid(), false), cuboidOpt(badCuboid(), false), cuboidOpt(badCuboid(), false)]
                         : [cuboidOpt(badCuboid(), true), cuboidOpt(goodCuboid(), false), cuboidOpt(goodCuboid(), false), cuboidOpt(goodCuboid(), false)];
        return mc({ kind: '직육면체 전개도 찾기', key: 'cnet' + R(0, 9999),
          text: can ? '<b>직육면체의 전개도가 될 수 있는 것</b>을 고르세요.' : '<b>직육면체의 전개도가 될 수 없는 것</b>을 고르세요.',
          explain: '접었을 때 겹치는 면이 없어야 하고, 맞닿는 모서리의 길이가 같아야 해요. 마주 보는 면 3쌍은 모양과 크기가 같아요.' }, opts);
      },
    },
    { // 모르는 길이 구하기
      min: 0, w: 4,
      make(level) {
        const d = randDims(), L = (() => { for (;;) { const l = Nets.cuboidLayout(Nets.randomNet(), d); if (!l.overlap) return l; } })();
        const { edges } = Nets.cuboidSvg(L);
        const ask = pick(edges);
        const tags = [];
        const per = level === 0 ? 2 : 1;      // 기본 단계는 길이를 더 많이 알려 줌
        for (const ax of shuffle(['x', 'y', 'z'])) for (let n = 0; n < per; n++) {
          const pool = edges.filter(e => e !== ask && e.ax === ax && !tags.some(t => t.e === e));
          const cands = pool.filter(e => !tags.some(t => t.e.cell === e.cell));
          const e = pick(cands.length ? cands : pool);
          if (e) tags.push({ e, text: d[ax] + 'cm' });
        }
        tags.push({ e: ask, text: '□', color: '#e5484d' });
        return { kind: '전개도에서 길이 구하기', key: 'clen' + JSON.stringify(d) + ask.x1 + ask.y1, type: 'num', unit: 'cm', answer: d[ask.ax],
          text: '직육면체의 전개도예요. 빨간 칸 <b style="color:#e5484d">?</b>에 알맞은 길이는 몇 cm인가요?',
          figure: Nets.cuboidSvg(L, { edgeTags: tags, maxW: 380, maxH: 280 }).svg,
          explain: '전개도를 접었을 때 맞닿는 모서리는 길이가 같고, 직육면체에는 길이가 같은 모서리가 4개씩 있어요.' };
      },
    },
    { // 평행한 면
      min: 1, w: 3,
      make() {
        const L = goodCuboid(), F = L.fold.face, Lb = labelNet(L.cells);
        const k0 = NK(...pick(L.cells)), opp = Nets.opposite(F.get(k0));
        const oppK = [...F.keys()].find(k => F.get(k) === opp);
        const others = L.cells.map(c => NK(...c)).filter(k => k !== k0 && k !== oppK);
        return mc({ kind: '전개도에서 평행한 면', key: 'copp' + k0 + Object.values(Lb).join(''),
          text: `전개도를 접었을 때 면 <b>${Lb[k0]}</b>와 <b>평행한 면</b>은 어느 것인가요?`,
          figure: Nets.cuboidSvg(L, { labels: Lb, hl: [k0], maxW: 360 }).svg,
          explain: `면 ${Lb[k0]}와 마주 보는 면 ${Lb[oppK]}는 평행하고 모양과 크기도 같아요.` },
          [{ label: '면 ' + Lb[oppK], ok: true }, ...shuffle(others).slice(0, 3).map(k => ({ label: '면 ' + Lb[k], ok: false }))]);
      },
    },
    { // 겹치는 점
      min: 2, w: 2,
      make() {
        for (;;) {
          const L = goodCuboid(), C = L.fold.corner, pts = [...C.keys()];
          const P = pick(pts), same = pts.filter(k => k !== P && C.get(k) === C.get(P));
          if (!same.length) continue;
          const diff = shuffle(pts.filter(k => C.get(k) !== C.get(P))).slice(0, 3), Q = pick(same);
          const letters = shuffle(['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ']), lab = {};
          [P, Q, ...diff].forEach((k, i) => lab[k] = letters[i]);
          return mc({ kind: '전개도에서 겹치는 점', key: 'cpt' + P + L.cells.map(c => NK(...c)).join(';'),
            text: `전개도를 접었을 때 <b>점 ${lab[P]}</b>과 만나는 점은 어느 것인가요?`,
            figure: Nets.cuboidSvg(L, { points: lab, maxW: 360 }).svg,
            explain: `점선을 따라 접어 보면 점 ${lab[P]}과 점 ${lab[Q]}이 한 꼭짓점에서 만나요.` },
            [Q, ...diff].map(k => ({ label: '점 ' + lab[k], ok: k === Q })));
        }
      },
    },
    { // 둘레
      min: 2, w: 1,
      make() {
        const L = goodCuboid();
        const dims = {}; for (const r of L.rects.values()) { dims[r.wa] = r.w; dims[r.ha] = r.h; }
        const { edges } = Nets.cuboidSvg(L);
        const per = edges.reduce((s, e) => s + dims[e.ax], 0);
        const tags = ['x', 'y', 'z'].map(ax => ({ e: edges.find(e => e.ax === ax), text: dims[ax] + 'cm' })).filter(t => t.e);
        return { kind: '전개도의 둘레', key: 'cper' + per + JSON.stringify(dims), type: 'num', unit: 'cm', answer: per,
          text: '직육면체 전개도의 <b>둘레</b>는 몇 cm인가요?',
          figure: Nets.cuboidSvg(L, { edgeTags: tags, maxW: 380 }).svg,
          explain: `바깥쪽 선분의 길이를 모두 더해요. 모서리마다 길이를 찾아 더하면 ${per}cm예요.` };
      },
    },
    { // O/X
      min: 0, w: 2,
      make() {
        const bank = [
          ['직육면체의 전개도에서 마주 보는 면은 모양과 크기가 같아요.', true, '마주 보는 면 3쌍은 모양과 크기가 같아요.'],
          ['전개도를 접었을 때 맞닿는 모서리의 길이는 같아야 해요.', true, '맞닿는 모서리는 길이가 같아야 꼭 맞게 접혀요.'],
          ['직육면체의 전개도의 면은 모두 정사각형이에요.', false, '직육면체의 면은 직사각형이에요.'],
          ['직육면체의 전개도는 한 가지 모양으로만 그릴 수 있어요.', false, '자르는 모서리에 따라 여러 가지 모양으로 그릴 수 있어요.'],
          ['직육면체의 전개도에서 잘리지 않은 모서리는 점선으로 그려요.', true, '잘린 모서리는 실선, 잘리지 않은 모서리는 점선이에요.'],
          ['직육면체의 전개도에는 모양과 크기가 같은 면이 3쌍 있어요.', true, '마주 보는 면끼리 모양과 크기가 같아서 3쌍이에요.'],
        ];
        const [t, a, e] = pick(bank);
        return { kind: 'O/X 개념 확인', key: 'ox5' + t, type: 'ox', text: t, answer: a, explain: e };
      },
    },
  ];

  const BANK = { '1': L1, '2': L2, '3': L3, '4': L4, '5': L5 };

  // level: 0(기본) 1(적용) 2(심화). recent: 최근 문제 key 목록
  // 단원 평가('final'): pool(열린 차시 목록) 중에서 차시를 먼저 고르게 뽑고, 그 차시의 문제를 냄
  function next(lessonId, level, recent, pool) {
    let from = lessonId;
    if (lessonId === 'final') {
      const ids = (pool && pool.length ? pool : Object.keys(BANK)).filter(id => BANK[id]);
      const fresh = ids.filter(id => !recent.slice(-4).includes('L' + id));      // 방금 나온 차시는 잠깐 쉬게
      from = pick(fresh.length ? fresh : ids);
    }
    const gens = BANK[from] || L1;
    const avail = gens.filter(g => g.min <= level);
    for (let tries = 0; tries < 25; tries++) {
      // 높은 단계 문제를 조금 더 자주
      const weights = avail.map(g => g.w * (g.min === level && level > 0 ? 1.6 : 1));
      let r = Math.random() * weights.reduce((x, y) => x + y, 0), gi = 0;
      while (r > weights[gi]) { r -= weights[gi]; gi++; }
      const p = avail[gi].make(level);
      p.lesson = from;
      if (!recent.includes(p.key) || tries === 24) return p;
    }
  }

  return { next, hasLesson: id => id === 'final' || !!BANK[id] };
})();
