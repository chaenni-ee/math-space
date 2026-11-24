// ===== 문제 창 (게임이 멈춘 동안 표시) =====
const Quiz = (() => {
  const $ = sel => document.querySelector(sel);
  let p = null, sel = null, done = null, input = '', widget = null;

  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  function show(problem, reason, onDone) {
    p = problem; done = onDone; input = '';
    sel = p.type === 'mc' && p.multi ? new Set() : null;
    widget = null;
    const box = $('#quiz-card');
    box.innerHTML = '';
    box.classList.toggle('draw-card', p.type === 'draw');
    box.append(el('div', 'quiz-tag', (reason === 'gift' ? '🎁 선물상자 문제!' : '❄️ 눈보라 문제!') + (p.tag ? ' · 📚 ' + p.tag : '')));
    box.append(el('div', 'quiz-text', p.text + (p.multi ? ' <span class="multi">(정답 여러 개)</span>' : '')));
    const main = el('div', 'quiz-main' + (p.figure && p.type !== 'mc' && p.type !== 'tap' ? ' side' : ''));
    if (p.figure) main.append(el('div', 'quiz-fig', p.figure));
    box.append(main);

    const area = el('div', 'quiz-area');
    if (p.type === 'mc') {
      const grid = el('div', 'opts' + (p.options.some(o => o.svg) ? ' fig-opts' : ''));
      p.options.forEach((o, i) => {
        const b = el('button', 'opt', `<span class="opt-no">${'①②③④⑤'[i]}</span>` + (o.svg ? `<span class="opt-svg">${o.svg}</span>` : `<span>${o.label}</span>`));
        b.onclick = () => {
          Sound.click();
          if (p.multi) { sel.has(i) ? sel.delete(i) : sel.add(i); }
          else sel = i;
          grid.querySelectorAll('.opt').forEach((x, j) => x.classList.toggle('picked', p.multi ? sel.has(j) : sel === j));
          updateCheck();
        };
        grid.append(b);
      });
      area.append(grid);
    } else if (p.type === 'ox') {
      const grid = el('div', 'opts ox');
      [['O', true], ['X', false]].forEach(([t, v]) => {
        const b = el('button', 'opt ox-btn ' + (v ? 'o' : 'x'), t);
        b.onclick = () => { Sound.click(); sel = v; grid.querySelectorAll('.opt').forEach(x => x.classList.toggle('picked', x === b)); updateCheck(); };
        grid.append(b);
      });
      area.append(grid);
    } else if (p.type === 'tap') {
      area.append(el('div', 'tap-hint', '👆 그림에서 면을 눌러 골라요'));
      main.querySelectorAll('.face-hit').forEach(poly => {
        poly.addEventListener('click', () => {
          if ($('#quiz-check').dataset.locked) return;
          Sound.click(); sel = poly.dataset.face;
          main.querySelectorAll('.face-hit').forEach(x => x.classList.toggle('picked', x === poly));
          updateCheck();
        });
      });
    } else if (p.type === 'draw') {
      widget = Sketch.mount(area, p.puzzle, () => updateCheck());
    } else if (p.type === 'num') {
      const disp = el('div', 'num-disp', `<span id="num-val"></span><span class="unit">${p.unit || ''}</span>`);
      const pad = el('div', 'keypad');
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'C'].forEach(k => {
        const b = el('button', 'key' + (k === '⌫' || k === 'C' ? ' fn' : ''), k);
        b.onclick = () => press(k);
        pad.append(b);
      });
      area.append(disp, pad);
    }
    main.append(area);

    const fb = el('div', 'quiz-feedback'); fb.id = 'quiz-fb';
    box.append(fb);
    const btn = el('button', 'big-btn check-btn', '정답 확인 ✔'); btn.id = 'quiz-check'; btn.disabled = true;
    btn.onclick = check;
    box.append(btn);

    $('#quiz').classList.remove('hidden');
    renderNum();
  }

  function press(k) {
    if (!p || p.type !== 'num' || $('#quiz-check').dataset.locked) return;
    Sound.click();
    if (k === '⌫') input = input.slice(0, -1);
    else if (k === 'C') input = '';
    else if (input.length < 4) input = (input === '0' ? '' : input) + k;
    renderNum(); updateCheck();
  }
  function renderNum() { const v = document.getElementById('num-val'); if (v) v.textContent = input || ' '; }

  // 키보드로도 입력 가능
  addEventListener('keydown', e => {
    if (!p || $('#quiz').classList.contains('hidden')) return;
    if (p.type === 'num') {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      if (e.key === 'Backspace') press('⌫');
    }
    if (e.key === 'Enter') { const b = $('#quiz-check'); if (b && !b.disabled) b.click(); }
  });

  function hasAnswer() {
    if (p.type === 'num') return input.length > 0;
    if (p.type === 'draw') return widget && widget.hasAnswer();
    if (p.type === 'tap') return !!sel;
    if (p.multi) return sel.size > 0;
    return sel !== null && sel !== undefined;
  }
  function updateCheck() { const b = $('#quiz-check'); if (b && !b.dataset.locked) b.disabled = !hasAnswer(); }

  function answerText() {
    if (p.type === 'num') return p.answer + (p.unit || '');
    if (p.type === 'draw') return '그림의 초록색 선을 확인해요';
    if (p.type === 'tap') return '그림에 초록색으로 표시한 면';
    if (p.type === 'ox') return p.answer ? 'O' : 'X';
    const idx = p.multi ? p.answer : [p.answer];
    return idx.map(i => '①②③④⑤'[i] + (p.options[i].label ? ' ' + p.options[i].label : '')).join(', ');
  }

  function check() {
    const btn = $('#quiz-check');
    btn.dataset.locked = '1';
    let ok;
    if (p.type === 'draw') ok = widget.check();
    else if (p.type === 'tap') {
      ok = p.answer.includes(sel);
      document.querySelectorAll('#quiz-card .face-hit').forEach(x => {
        x.classList.add('locked');
        if (p.answer.includes(x.dataset.face) && (ok ? x.dataset.face === sel : true)) x.classList.add('right');
        else if (x.dataset.face === sel) x.classList.add('wrong');
      });
    }
    else if (p.type === 'num') ok = Number(input) === p.answer;
    else if (p.type === 'ox') ok = sel === p.answer;
    else if (p.multi) ok = sel.size === p.answer.length && p.answer.every(i => sel.has(i));
    else ok = sel === p.answer;

    // 보기에 정답/오답 표시
    document.querySelectorAll('#quiz-card .opt').forEach((b, i) => {
      b.disabled = true;
      let isAns;
      if (p.type === 'ox') isAns = (i === 0) === p.answer;
      else isAns = p.multi ? p.answer.includes(i) : p.answer === i;
      if (isAns) b.classList.add('right');
      else if (b.classList.contains('picked')) b.classList.add('wrong');
    });
    document.querySelectorAll('#quiz-card .key').forEach(b => b.disabled = true);
    const disp = document.querySelector('#quiz-card .num-disp');
    if (disp) disp.classList.add(ok ? 'right' : 'wrong');

    const fb = $('#quiz-fb');
    if (ok) {
      Sound.correct();
      fb.className = 'quiz-feedback good';
      fb.innerHTML = `<b>정답이에요! 🎉</b><div class="explain">${p.explain || ''}</div>`;
      btn.textContent = '보상 고르기 🎁';
    } else {
      Sound.wrong();
      fb.className = 'quiz-feedback bad';
      const head = p.type === 'draw' ? '아쉬워요! 빨간 선은 잘못 그린 선, 초록 선은 그려야 했던 선이에요.' : `아쉬워요! 정답은 ${answerText()}`;
      fb.innerHTML = `<b>${head}</b><div class="explain">${p.explain || ''}</div>`;
      btn.textContent = '계속하기 ▶';
    }
    btn.disabled = false;
    btn.onclick = () => { delete btn.dataset.locked; finish(ok); };
  }

  function finish(ok) {
    const cb = done; p = null;
    if (!ok) { $('#quiz').classList.add('hidden'); cb(false, null); return; }
    showRewards(Game.rewardChoices(), key => { $('#quiz').classList.add('hidden'); cb(true, key); });
  }

  function showRewards(list, onPick) {
    const box = $('#quiz-card');
    box.innerHTML = '';
    box.append(el('div', 'quiz-tag', '🎁 보상을 하나 고르세요'));
    const grid = el('div', 'rewards');
    list.forEach(r => {
      const b = el('button', 'reward', `<div class="r-icon">${r.icon}</div><div class="r-name">${r.name}</div><div class="r-desc">${r.desc}</div>`);
      b.onclick = () => { Sound.click(); onPick(r.key); };
      grid.append(b);
    });
    box.append(grid);
  }

  return { show };
})();
