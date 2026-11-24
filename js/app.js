// ===== 화면 흐름 =====
(() => {
  const $ = s => document.querySelector(s);
  const screens = ['#screen-title', '#screen-name', '#screen-lessons', '#screen-pause', '#quiz', '#screen-over', '#screen-rank'];
  function show(id) { screens.forEach(s => $(s).classList.toggle('hidden', s !== id)); }
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let name = Store.get('player_name', '');
  let lesson = null;            // 현재 차시
  let log = [];                 // 이번 판 문제 기록 [{type, ok}]
  let recent = [];              // 최근 문제 key (중복 방지)
  let openMap = {};

  if (Api.isMock()) $('#test-badge').classList.remove('hidden');

  // ---------- 게임 연결 ----------
  Game.init($('#game'), {
    onQuiz: reason => {
      const st = Game.getState();
      const fin = lesson.id === 'final';
      // 단원 평가는 '적용' 단계부터 시작
      const level = fin ? Math.min(2, 1 + Math.floor((st.wave - 1) / 3)) : Math.min(2, Math.floor((st.wave - 1) / 2));
      const pool = LESSONS.filter(L => L.id !== 'final' && L.ready && openMap[L.id]).map(L => L.id);
      const p = Problems.next(lesson.id, level, recent, pool);
      recent.push(p.key); if (fin) recent.push('L' + p.lesson);
      while (recent.length > 10) recent.shift();
      if (fin) p.tag = (LESSONS.find(L => L.id === p.lesson) || {}).no;
      Quiz.show(p, reason, (ok, reward) => {
        log.push({ type: (fin ? '[' + p.lesson + '차시] ' : '') + p.kind, ok, lesson: p.lesson });
        Game.onQuizResult(ok);
        if (reward) Game.applyReward(reward);
        Game.resume();
      });
    },
    onGameOver: res => setTimeout(() => gameOver(res), 700),
    onFrame: hud,
    onError: () => {
      const d = document.createElement('div'); d.className = 'err-box';
      d.innerHTML = '3D 그래픽을 불러오지 못했어요.<br>인터넷 연결을 확인하고 새로고침해 주세요.';
      document.body.append(d);
    },
  });

  // ---------- HUD ----------
  let hudCache = {};
  function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
  function setHtml(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).innerHTML = v; } }
  function hud(st, mode) {
    if (!st || mode === 'menu') return;
    setText('#hud-lives', '❤️'.repeat(Math.max(0, st.lives)) + '🤍'.repeat(Math.max(0, APP_CONFIG.MAX_LIVES - Math.max(0, st.lives))));
    setText('#hud-score', st.score.toLocaleString());
    setText('#hud-wave', st.wave);
    const pct = Math.max(0, Math.min(100, 100 - st.quizT / (st.quizInterval || APP_CONFIG.QUIZ_INTERVAL) * 100));
    $('#hud-quizbar').style.width = pct + '%';
    const pw = [];
    if (st.freeze > 0) pw.push('🧊 ' + Math.ceil(st.freeze));
    if (st.triple > 0) pw.push('🔱 ' + Math.ceil(st.triple));
    if (st.rapid > 0) pw.push('⚡ ' + Math.ceil(st.rapid));
    if (st.slow > 0) pw.push('🐢 ' + Math.ceil(st.slow));
    if (st.rage > 0) pw.push('🔥 분노 폭주 ×' + (st.anger * 1.5).toFixed(1) + ' · ' + Math.ceil(st.rage) + '초');
    else if (st.anger > 1.01) pw.push('😡 ×' + st.anger.toFixed(1));
    setHtml('#hud-powers', pw.map(x => `<span class="power">${x}</span>`).join(''));
  }

  // ---------- 시작 / 이름 ----------
  $('#btn-start').onclick = () => { Sound.unlock(); Sound.click(); name ? openLessons() : askName(); };
  function askName() { show('#screen-name'); $('#name-input').value = name; setTimeout(() => $('#name-input').focus(), 50); }
  $('#btn-name').onclick = () => {
    const v = $('#name-input').value.trim().slice(0, 14);
    if (!v) { $('#name-input').focus(); return; }
    name = v; Store.set('player_name', name); Sound.click(); openLessons();
  };
  $('#name-input').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btn-name').click(); });
  $('#btn-rename').onclick = askName;

  // ---------- 차시 선택 ----------
  async function openLessons() {
    show('#screen-lessons');
    $('#who-name').textContent = name;
    renderLessons(true);
    const r = await Api.getSettings();
    openMap = r.open || {};
    const msg = $('#conn-msg');
    if (r.stale) {
      msg.classList.remove('hidden');
      msg.textContent = r.noCache ? '⚠️ 기록 서버에 연결하지 못했어요. 잠시 뒤 새로고침을 눌러 주세요.' : '⚠️ 기록 서버 연결이 불안정해요. 마지막으로 받은 차시 정보를 보여 줄게요.';
    } else msg.classList.add('hidden');
    renderLessons(false);
    Api.flushQueue();
  }
  $('#btn-refresh').onclick = () => { Sound.click(); openLessons(); };

  function renderLessons(loading) {
    const grid = $('#lesson-grid');
    grid.innerHTML = '';
    const best = Store.get('best', {});
    LESSONS.forEach(L => {
      const isOpen = !!openMap[L.id];
      const card = document.createElement('div');
      card.className = 'lesson' + (isOpen && L.ready ? '' : ' locked');
      let acts;
      if (loading) acts = '<div class="lock-msg">불러오는 중…</div>';
      else if (!isOpen) acts = '<div class="lock-msg">🔒 아직 잠겨 있어요</div>';
      else if (!L.ready) acts = '<div class="lock-msg">🛠️ 준비 중이에요</div>';
      else acts = `<div class="acts"><button class="play">시작 ▶</button><button class="rank-btn">🏆</button></div>`;
      card.innerHTML = `<div class="icon">${L.icon}</div><div class="no">${L.no}</div><div class="ttl">${L.title}</div><div class="sub">${L.sub}</div>`
        + (best[L.id] ? `<div class="best">내 최고 ${best[L.id].toLocaleString()}점</div>` : '') + acts;
      const play = card.querySelector('.play');
      if (play) play.onclick = () => startLesson(L);
      const rb = card.querySelector('.rank-btn');
      if (rb) rb.onclick = () => showRankModal(L);
      grid.append(card);
    });
  }

  // ---------- 게임 시작 ----------
  function startLesson(L) {
    Sound.unlock(); Sound.click();
    lesson = L; log = []; recent = [];
    show(null);
    $('#hud').classList.remove('hidden');
    hudCache = {};
    countdown(() => Game.start({ boss: L.id === 'final' }));
  }
  function countdown(done) {
    const c = $('#countdown');
    c.classList.remove('hidden');
    let n = 3;
    const step = () => {
      if (n === 0) { c.textContent = '발사!'; Sound.wave(); setTimeout(() => { c.classList.add('hidden'); done(); }, 450); return; }
      c.textContent = n; Sound.click(); n--; setTimeout(step, 650);
    };
    step();
  }

  // ---------- 일시정지 / 소리 ----------
  $('#btn-pause').onclick = () => { if (Game.getMode() === 'play') { Game.pause(); show('#screen-pause'); } };
  $('#btn-resume').onclick = () => { show(null); Game.resume(); };
  $('#btn-quit').onclick = () => { Game.stop(); $('#hud').classList.add('hidden'); openLessons(); };
  addEventListener('keydown', e => {
    if (e.key === 'Escape' || e.key === 'p') {
      if (Game.getMode() === 'play') $('#btn-pause').click();
      else if (!$('#screen-pause').classList.contains('hidden')) $('#btn-resume').click();
    }
  });
  const soundIcon = () => { $('#btn-sound').textContent = Sound.isOn() ? '🔊' : '🔇'; };
  $('#btn-sound').onclick = () => { Sound.toggle(); soundIcon(); };
  soundIcon();
  // 다른 창으로 가면 자동 일시정지
  document.addEventListener('visibilitychange', () => { if (document.hidden && Game.getMode() === 'play') $('#btn-pause').click(); });

  // ---------- 게임 끝 ----------
  let lastRecId = null;
  async function gameOver(res) {
    $('#hud').classList.add('hidden');
    const correct = log.filter(l => l.ok).length;
    $('#res-score').textContent = res.score.toLocaleString();
    $('#res-wave').textContent = res.wave;
    $('#res-acc').textContent = `${correct}/${log.length}`;
    $('#res-kills').textContent = res.kills;
    const best = Store.get('best', {});
    const isBest = res.score > (best[lesson.id] || 0);
    if (isBest) { best[lesson.id] = res.score; Store.set('best', best); }
    $('.over-title').textContent = isBest && res.score > 0 ? '🎉 내 최고 기록이에요!' : '기지가 눈에 파묻혔어요! ☃️';
    $('#rank-title').textContent = `🏆 ${lesson.no} 랭킹`;
    // 단원 평가: 차시별 정답률
    const bd = $('#res-breakdown');
    if (lesson.id === 'final' && log.length) {
      const by = {};
      log.forEach(l => { by[l.lesson] = by[l.lesson] || { n: 0, ok: 0 }; by[l.lesson].n++; if (l.ok) by[l.lesson].ok++; });
      bd.innerHTML = '<div class="bd-title">📊 차시별 정답</div>' + LESSONS.filter(L => by[L.id]).map(L => {
        const b = by[L.id], pct = Math.round(b.ok / b.n * 100);
        return `<div class="bd-row"><span>${L.no} ${L.title}</span><div class="bd-bar"><div style="width:${pct}%"></div></div><span class="bd-num">${b.ok}/${b.n}</span></div>`;
      }).join('');
      bd.classList.remove('hidden');
    } else bd.classList.add('hidden');
    show('#screen-over');
    $('#save-msg').textContent = '☁️ 기록을 저장하는 중…';
    $('#rank-list').innerHTML = '<div class="rank-empty">불러오는 중…</div>';

    const rec = { name, lesson: lesson.id, score: res.score, wave: res.wave, correct, total: log.length, seconds: res.time, log };
    const r = await Api.submitScore(rec);
    lastRecId = rec.id;
    $('#save-msg').textContent = r.saved ? '✅ 랭킹에 기록했어요!' : '☁️ 지금은 저장하지 못했어요. 다음에 접속하면 자동으로 저장돼요.';
    const rk = await Api.getRanking(lesson.id);
    renderRank($('#rank-list'), rk.rows, rec.id);
  }
  function renderRank(box, rows, meId) {
    if (!rows.length) { box.innerHTML = '<div class="rank-empty">아직 기록이 없어요. 첫 번째 주인공이 되어 보세요!</div>'; return; }
    box.innerHTML = rows.map((r, i) => `<div class="rank-row${r.id === meId ? ' me' : ''}">
      <span class="pos">${['🥇', '🥈', '🥉'][i] || (i + 1)}</span><span>${esc(r.name)}</span>
      <span class="sc">${Number(r.score).toLocaleString()}점</span><span class="wv">난이도 ${r.wave}</span></div>`).join('');
  }
  $('#btn-again').onclick = () => startLesson(lesson);
  $('#btn-home').onclick = () => { Game.stop(); openLessons(); };

  async function showRankModal(L) {
    Sound.click();
    $('#rank2-title').textContent = `🏆 ${L.no} 랭킹`;
    $('#rank2-list').innerHTML = '<div class="rank-empty">불러오는 중…</div>';
    show('#screen-rank');
    const rk = await Api.getRanking(L.id);
    renderRank($('#rank2-list'), rk.rows, lastRecId);
  }
  $('#btn-rank-close').onclick = () => openLessons();

  show('#screen-title');
})();
