// ===== 픽셀 우주 슈팅 게임 엔진 (Canvas 2D) =====
// 로켓은 마우스(컴퓨터)·손가락(태블릿)을 따라 움직이며 자동으로 레이저를 쏩니다.
// 🪨 운석은 부서지지 않으니 피하고, 👾 외계인은 쏴서 물리쳐요. ⭐ 별은 먹으면 점수!
// 화면은 작은 해상도로 그린 뒤 크게 늘려서 '도트(픽셀) 그림' 느낌을 냅니다.
const Game = (() => {
  // ---------- 색 ----------
  const COL = {
    k: '#1b1030', w: '#eeeef6', g: '#b4b3c6', d: '#6e6c86', b: '#3f8cff', c: '#aee8ff', B: '#2456c8',
    o: '#ff8a1e', r: '#d2501a', R: '#9b2c12', y: '#ffd23a', Y: '#ff9f0a', h: '#fff6b8',
    G: '#8cf27a', a: '#3ccf5a', A: '#1e8a3c', p: '#b06bff', P: '#7a3ad6', q: '#4b1f99',
    m: '#ff5fb0', M: '#c22a7a', e: '#ffffff', x: '#ff3b4f', t: '#3fe0d0', T: '#159c9c',
  };

  // ---------- 도트 그림 ----------
  const MAPS = {
    ship: [
      '......k......',
      '.....kck.....',
      '....kcwgk....',
      '....kwwgk....',
      '...kwwwggk...',
      '...kwkbkgk...',
      '...kkbcbkk...',
      '...kwkbkgk...',
      '...kwwwggk...',
      '...kwwwggk...',
      '..kowwwggok..',
      '.korwwwggrok.',
      'korrwwwggrrok',
      'korrkwdgkrrok',
      'kok.kdddk.kok',
      'kk...kdk...kk',
      '.....kkk.....',
    ],
    // 초록 외계인 (한 눈)
    grunt: [
      '....kkkkk....',
      '..kkGGGaakk..',
      '.kGGaaaaaaak.',
      '.kGakkkkkaak.',
      'kGakeeeeekaak',
      'kaakeekkeaaAk',
      'kaakeekkekaAk',
      '.kaakkkkkaAk.',
      '.kaaaAAAaaAk.',
      '..kAkAkAkAk..',
      '..k.k.k.k.k..',
    ],
    // 보라 집게 외계인 (총을 쏴요)
    crab: [
      'kk.........kk',
      'kpk.......kpk',
      'kpPk.kkk.kPpk',
      '.kPkkpppkkPk.',
      '..kppppppppk.',
      '.kppekpppekpk',
      '.kppkkpppkkpk',
      '.kpppppppppPk',
      '..kpPkkkPpPk.',
      '.kPk.kqk.kPk.',
      '.kk...k...kk.',
    ],
    // 분홍 돌진 외계인
    diver: [
      '.k.......k.',
      'kmk.....kmk',
      'kmMk.k.kMmk',
      '.kmmkmkmmk.',
      '.kmmmmmmmk.',
      'kmmekmekmmk',
      'kmmkkmkkmMk',
      '.kmmmmmmMk.',
      '..kmmxmMk..',
      '...kmmMk...',
      '....kMk....',
      '.....k.....',
    ],
    // 별
    star: [
      '.....k.....',
      '....kyk....',
      '....khk....',
      '...kyhyk...',
      'kkkkyhyykkk',
      'kyhhyyyyyYk',
      '.kyyyyyyYk.',
      '..kyyyyYk..',
      '..kyyYyYk..',
      '.kyYk.kYYk.',
      '.kYk...kYk.',
      '.kk.....kk.',
    ],
    // 미스터리 캡슐 (맞히면 문제)
    capsule: [
      '...kkkkkkk...',
      '..kttttttTk..',
      '.kthkkkkktTk.',
      'kttkyyyyykTTk',
      'ktkyykkkyykTk',
      'ktkkkk.kyykTk',
      'ktttk..kyykTk',
      'ktttk.kyykTTk',
      'kttttkyykTTTk',
      'kttttkyykTTTk',
      'ktttttkkTTTTk',
      'kttttkyykTTTk',
      '.ktttkyykTTk.',
      '..kTTTkkTTk..',
      '...kkkkkkk...',
    ],
    // 대왕 외계인
    boss: [
      '.........k.....k.....k.........',
      '........kyk...kyk...kyk........',
      '........kyykkkyyykkkyyk........',
      '........kyyyyyyhyyyyyyk........',
      '.......kkkkkkkkkkkkkkkkk.......',
      '.....kkpppppppppppppppppkk.....',
      '....kpppppppppppppppppppppk....',
      '...kppPPppppppppppppppPPpppk...',
      '..kpppkkkkppppkkkppppkkkkpppk..',
      '..kppkeeeekppkeeekppkeeeekppk..',
      '.kpppkeekkkppkekekppkkkeekpppk.',
      '.kpppkeekkkppkekekppkkkeekpppk.',
      '.kPppkkkkkpppkkkkkpppkkkkkppPk.',
      '.kPPpppppppppppppppppppppppPPk.',
      'kPPppppkkkkkkkkkkkkkkkkpppppPPk',
      'kPPpppkxxxxxxxxxxxxxxxxkppppPPk',
      'kPPpppkxekxekxekxekxekxkppppPPk',
      '.kPPpppkkkkkkkkkkkkkkkkppppPPk.',
      '..kPPpppppppppppppppppppppPPk..',
      '...kkPPPPkPPPkPPPkPPPkPPPPkk...',
      '....kqqk.kqqk.kqk.kqqk.kqqk....',
      '....kqk..kqk..kqk..kqk..kqk....',
      '.....k....k....k....k....k.....',
    ],
  };
  const SPR = {};
  function makeSprite(rows, scale, tint) {
    scale = scale || 1;
    const w = Math.max(...rows.map(r => r.length)), h = rows.length;
    const c = document.createElement('canvas'); c.width = w * scale; c.height = h * scale;
    const g = c.getContext('2d');
    rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) {
      const ch = row[x]; if (ch === '.') continue;
      g.fillStyle = tint && ch !== 'k' && ch !== 'e' ? tint : COL[ch]; g.fillRect(x * scale, y * scale, scale, scale);
    } });
    return c;
  }
  // 하얗게 번쩍이는(맞았을 때) 그림
  function flashSprite(src) {
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const g = c.getContext('2d'); g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-in'; g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
    return c;
  }
  function freezeSprite(src) {
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const g = c.getContext('2d'); g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(120,210,255,0.55)'; g.fillRect(0, 0, c.width, c.height);
    return c;
  }

  // 운석: 울퉁불퉁한 돌을 무작위로 만들어요 (위·왼쪽은 밝게, 아래·오른쪽은 어둡게, 파란 테두리 빛)
  function makeRock(r, seed) {
    let sd = seed * 9301 + 49297;
    const rnd = () => { sd = (sd * 9301 + 49297) % 233280; return sd / 233280; };
    const S = r * 2 + 4, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'), cx = S / 2, cy = S / 2;
    const bumps = Array.from({ length: 9 }, () => 0.78 + rnd() * 0.3);
    const radAt = a => { const t = (a / (Math.PI * 2) + 1) % 1 * 9, i = Math.floor(t), f = t - i; return r * (bumps[i % 9] * (1 - f) + bumps[(i + 1) % 9] * f); };
    const craters = Array.from({ length: Math.max(1, Math.round(r / 3.5)) }, () => {
      const a = rnd() * 6.28, d = rnd() * r * 0.5; return { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, r: 1 + rnd() * r * 0.28 };
    });
    const inside = (x, y) => Math.hypot(x - cx, y - cy) <= radAt(Math.atan2(y - cy, x - cx));
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const px = x + 0.5, py = y + 0.5;
      if (!inside(px, py)) continue;
      const edge = !inside(px - 1, py) || !inside(px + 1, py) || !inside(px, py - 1) || !inside(px, py + 1);
      let col;
      if (edge) col = (px - cx) + (py - cy) > r * 0.3 ? '#5fb7ff' : '#1c1430';
      else {
        const l = -((px - cx) + (py - cy)) / (r * 2) + (rnd() - 0.5) * 0.25;
        col = l > 0.18 ? '#b3afc2' : l > -0.12 ? '#8a869c' : l > -0.35 ? '#646177' : '#47445a';
        for (const k of craters) {
          const dd = Math.hypot(px - k.x, py - k.y);
          if (dd < k.r) col = (px - k.x) + (py - k.y) > 0 ? '#9b97ad' : '#3a3850';
        }
      }
      g.fillStyle = col; g.fillRect(x, y, 1, 1);
    }
    return c;
  }

  // ---------- 배경 (보라 성운 + 별) ----------
  let nebula = null;
  function makeNebula(W, H) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#12082e'); bg.addColorStop(0.5, '#1d0b45'); bg.addColorStop(1, '#12082e');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const cols = ['rgba(150,60,230,', 'rgba(110,40,200,', 'rgba(200,70,220,', 'rgba(60,70,220,'];
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * W, y = Math.random() * H, r = (0.12 + Math.random() * 0.3) * Math.max(W, H), col = cols[i % cols.length];
      for (const oy of [-H, 0, H]) {          // 위아래가 이어지도록
        const gr = g.createRadialGradient(x, y + oy, 0, x, y + oy, r);
        gr.addColorStop(0, col + (0.12 + Math.random() * 0.1) + ')'); gr.addColorStop(1, col + '0)');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
      }
    }
    // 색 단계를 줄여 도트 느낌으로
    const img = g.getImageData(0, 0, W, H), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = ((i / 4) % W + Math.floor(i / 4 / W)) % 2 ? 4 : -4;   // 체크무늬 디더
      for (let k = 0; k < 3; k++) d[i + k] = Math.max(0, Math.min(255, Math.round((d[i + k] + n) / 12) * 12));
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  let stars = [];
  function makeStars() {
    stars = [];
    const n = Math.round(VW * VH / 260);
    for (let i = 0; i < n; i++) {
      const layer = Math.random() < 0.6 ? 0 : Math.random() < 0.75 ? 1 : 2;
      stars.push({ x: Math.random() * VW, y: Math.random() * VH, l: layer, ph: Math.random() * 6, big: layer === 2 && Math.random() < 0.5 });
    }
  }

  // ---------- 상태 ----------
  let canvas, ctx, fx, fxc, hooks = {};
  let mode = 'menu', s = null, last = 0, clock = 0, scrollY = 0;
  let VW = 320, VH = 240, PXX = 3, PXY = 3, U = 2.4;   // U = 화면 높이의 1%
  const ship = { x: 160, y: 200, tx: 160, ty: 200, tilt: 0 };
  let keys = {}, drag = null, usingMouse = false;
  let deco = [];

  // ---------- 준비 ----------
  function init(cv, h) {
    hooks = h || {};
    canvas = cv;
    ctx = canvas.getContext('2d');
    fx = document.getElementById('fx'); fxc = fx.getContext('2d');
    SPR.ship = makeSprite(MAPS.ship);
    for (const k of ['grunt', 'crab', 'diver', 'star', 'capsule', 'boss']) { SPR[k] = makeSprite(MAPS[k]); SPR[k + 'F'] = flashSprite(SPR[k]); SPR[k + 'I'] = freezeSprite(SPR[k]); }
    SPR.rocks = [];
    for (let i = 0; i < 12; i++) SPR.rocks.push(makeRock([5, 6, 8, 10, 12, 15][i % 6], i + 1));
    const t = document.getElementById('title-ship');
    if (t) t.src = makeSprite(MAPS.ship, 8).toDataURL();
    resize();
    addEventListener('resize', resize);

    // 조작: 컴퓨터는 마우스 위치를 그대로 따라가고,
    //       태블릿은 손가락을 끈 만큼 로켓이 움직여요(손가락이 로켓을 가리지 않게).
    const toV = e => ({ x: e.clientX / innerWidth * VW, y: e.clientY / innerHeight * VH });
    canvas.addEventListener('pointerdown', e => {
      Sound.unlock();
      if (mode !== 'play') return;
      const p = toV(e);
      if (e.pointerType === 'mouse') { usingMouse = true; setTarget(p.x, p.y); }
      else { usingMouse = false; drag = { id: e.pointerId, sx: p.x, sy: p.y, ox: ship.tx, oy: ship.ty }; }
    });
    addEventListener('pointermove', e => {
      if (mode !== 'play') return;
      const p = toV(e);
      if (e.pointerType === 'mouse') { usingMouse = true; setTarget(p.x, p.y); }
      else if (drag && drag.id === e.pointerId) setTarget(drag.ox + (p.x - drag.sx) * 1.25, drag.oy + (p.y - drag.sy) * 1.25);
    });
    const endDrag = e => { if (drag && drag.id === e.pointerId) drag = null; };
    addEventListener('pointerup', endDrag);
    addEventListener('pointercancel', endDrag);
    addEventListener('keydown', e => { keys[e.code] = true; });
    addEventListener('keyup', e => { keys[e.code] = false; });
    requestAnimationFrame(loop);
  }

  function resize() {
    const w = innerWidth, h = innerHeight;
    const px = Math.max(2, Math.round(Math.min(w, h) / 190));
    VW = Math.ceil(w / px); VH = Math.ceil(h / px);
    PXX = w / VW; PXY = h / VH; U = VH / 100;
    canvas.width = VW; canvas.height = VH;
    ctx.imageSmoothingEnabled = false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    fx.width = Math.round(w * dpr); fx.height = Math.round(h * dpr);
    fxc.setTransform(dpr, 0, 0, dpr, 0, 0);
    nebula = makeNebula(VW, VH);
    makeStars();
    if (mode === 'menu' || !s) { ship.x = ship.tx = VW / 2; ship.y = ship.ty = VH * 0.8; }
    clampTarget();
  }
  const minY = () => VH * 0.3;
  function setTarget(x, y) { ship.tx = x; ship.ty = y; clampTarget(); }
  function clampTarget() {
    ship.tx = Math.max(7, Math.min(VW - 7, ship.tx));
    ship.ty = Math.max(minY(), Math.min(VH - 12, ship.ty));
  }

  // ---------- 판 시작/정지 ----------
  function start(opts) {
    opts = opts || {};
    s = {
      t: 0, score: 0, lives: APP_CONFIG.START_LIVES, anger: 1, wave: 1,
      aliens: [], rocks: [], shots: [], ebullets: [], stars: [], parts: [], texts: [],
      rockT: 2.5, alienT: 1.0, formT: 14, giftT: 9 + Math.random() * 4, starT: 4,
      quizT: opts.boss ? 20 : APP_CONFIG.QUIZ_INTERVAL, quizInterval: opts.boss ? 20 : APP_CONFIG.QUIZ_INTERVAL,
      bossEvery: opts.boss ? 2 : 4, bossMode: !!opts.boss, bossWave: 0,
      fireCd: 0, freeze: 0, triple: 0, rapid: 0, shield: 0, shake: 0, flash: 0, hurt: 0, inv: 0,
      kills: 0, combo: 0, quizStreak: 0, banner: null, rage: 0, comboPop: 0, comboText: '', starsGot: 0,
    };
    ship.x = ship.tx = VW / 2; ship.y = ship.ty = VH * 0.8; ship.tilt = 0; drag = null;
    mode = 'play';
    showBanner(opts.boss ? '👑 단원 평가 시작!' : '난이도 1', opts.boss ? '#ffe066' : '#ffffff');
    if (opts.boss) s.bossT = 18;
  }
  function pause() { if (mode === 'play') { mode = 'pause'; drag = null; } }
  function resume() { if (mode === 'pause') { mode = 'play'; last = performance.now(); } }
  function stop() { mode = 'menu'; s = null; ship.x = ship.tx = VW / 2; ship.y = ship.ty = VH * 0.8; }
  const getState = () => s, getMode = () => mode;

  // ---------- 문제 결과 · 보상 ----------
  function onQuizResult(correct) {
    s.quizT = s.quizInterval;
    if (correct) {
      s.quizStreak++;
      const pts = 100 + Math.min(s.quizStreak - 1, 6) * 50;
      s.score += pts;
      addText(ship.x, ship.y - 18, `정답 +${pts}`, '#ffe066', 34);
    } else {
      s.quizStreak = 0;
      s.anger = Math.min(3, s.anger + 0.3);
      s.rage = 8;
      s.alienT = Math.min(s.alienT, 0.3);
      showBanner('🚨 비상 경보! 외계인이 몰려와요', '#ff8a8a');
      Sound.rage();
    }
  }
  const REWARDS = {
    heal:   { icon: '❤️', name: '생명 +1', desc: '하트를 하나 더 받아요' },
    freeze: { icon: '⏸️', name: '시간 정지', desc: '외계인과 운석을 7초 동안 멈춰요' },
    triple: { icon: '🔱', name: '세 갈래 레이저', desc: '15초 동안 레이저 3줄 발사' },
    rapid:  { icon: '⚡', name: '연사 레이저', desc: '15초 동안 두 배 빠르게 발사' },
    shield: { icon: '🛡️', name: '방어막', desc: '10초 동안 부딪혀도 안전! 경보도 가라앉혀요' },
    bomb:   { icon: '💥', name: '메가 폭탄', desc: '화면의 외계인과 운석을 한 번에 날려요' },
  };
  function rewardChoices() {
    let keys = Object.keys(REWARDS);
    if (s.lives >= APP_CONFIG.MAX_LIVES) keys = keys.filter(k => k !== 'heal');
    keys.sort(() => Math.random() - 0.5);
    if (s.anger >= 1.6 && !keys.slice(0, 3).includes('shield')) { keys = keys.filter(k => k !== 'shield'); keys.splice(1, 0, 'shield'); }
    if (s.lives === 1 && !keys.slice(0, 3).includes('heal')) { keys = keys.filter(k => k !== 'heal'); keys.unshift('heal'); }
    return keys.slice(0, 3).map(k => ({ key: k, ...REWARDS[k] }));
  }
  function applyReward(k) {
    if (k === 'heal') s.lives = Math.min(APP_CONFIG.MAX_LIVES, s.lives + 1);
    if (k === 'freeze') s.freeze = 7;
    if (k === 'triple') s.triple = 15;
    if (k === 'rapid') s.rapid = 15;
    if (k === 'shield') { s.shield = 10; s.anger = Math.max(1, s.anger - 0.6); s.rage = 0; }
    if (k === 'bomb') {
      s.combo = 0; s.flash = 0.4; s.shake = 0.4;
      for (const a of s.aliens) {
        if (a.gift || a.dead) continue;
        if (a.boss) { a.hp -= Math.ceil(a.maxHp * 0.3); a.hit = 0.2; if (a.hp <= 0) killAlien(a, true); }
        else killAlien(a, true);
      }
      for (const r of s.rocks) { smashRock(r); }
      s.ebullets = [];
      Sound.boom();
    }
    showBanner(REWARDS[k].icon + ' ' + REWARDS[k].name + '!', '#bfe9ff');
  }

  // ---------- 효과 ----------
  function showBanner(text, color) { if (s) s.banner = { text, color, t: 2.2 }; }
  function addText(x, y, text, color, size) { s.texts.push({ x, y, text, color, size: size || 24, t: 1 }); }
  const PCOL = { rock: ['#b3afc2', '#8a869c', '#5fb7ff', '#47445a'], grunt: ['#8cf27a', '#3ccf5a', '#ffffff'], crab: ['#b06bff', '#7a3ad6', '#ffffff'],
    diver: ['#ff5fb0', '#c22a7a', '#ffffff'], boss: ['#b06bff', '#ffd23a', '#ff3b4f', '#ffffff'], capsule: ['#3fe0d0', '#ffd23a', '#ffffff'],
    star: ['#ffd23a', '#fff6b8'], hit: ['#ffffff', '#aee8ff'], ship: ['#ff8a1e', '#ffd23a', '#ffffff'] };
  function burst(x, y, kind, n, power) {
    const cols = PCOL[kind] || PCOL.hit;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (8 + Math.random() * 40) * U * 0.1 * (power || 1) * 10;
      s.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.3 + Math.random() * 0.5, c: cols[(Math.random() * cols.length) | 0], sz: Math.random() < 0.3 ? 2 : 1 });
    }
    if (s.parts.length > 700) s.parts.splice(0, s.parts.length - 700);
  }

  // ---------- 생성 ----------
  function spawnRock() {
    const i = (Math.random() * SPR.rocks.length) | 0, sp = SPR.rocks[i];
    const r = sp.width / 2 - 2;
    const big = r > 11;
    const x = r + Math.random() * (VW - r * 2);
    const speed = (big ? 11 : 15 + Math.random() * 8) * U * (1 + Math.min(s.t, 240) * 0.002);
    const ang = (Math.random() - 0.5) * 0.5;
    s.rocks.push({ x, y: -r - 2, r, sp, vx: Math.sin(ang) * speed, vy: Math.cos(ang) * speed, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 2 });
  }
  function alienSize(type) { const sp = SPR[type]; return { w: sp.width, h: sp.height }; }
  function makeAlien(type, x, y, extra) {
    const sz = alienSize(type);
    const base = { grunt: { hp: 1, pts: 10, vy: 13 }, crab: { hp: 3, pts: 25, vy: 9 }, diver: { hp: 2, pts: 20, vy: 12 }, capsule: { hp: 3, pts: 0, vy: 9 }, boss: { hp: 40, pts: 300, vy: 8 } }[type];
    const a = { type, x, y, w: sz.w, h: sz.h, hp: base.hp, maxHp: base.hp, pts: base.pts, vy: base.vy * U * (0.9 + Math.random() * 0.2), vx: 0,
      ph: Math.random() * 6, sway: (4 + Math.random() * 8) * U, fireT: 1.5 + Math.random() * 2, hit: 0, state: 0, stT: 0, gift: type === 'capsule', boss: type === 'boss', ...(extra || {}) };
    s.aliens.push(a);
    return a;
  }
  function spawnAlien() {
    const w = s.wave, r = Math.random();
    let type = 'grunt';
    if (w >= 2 && r < 0.35) type = 'crab';
    if (w >= 3 && r > 0.75) type = 'diver';
    const x = 10 + Math.random() * (VW - 20);
    const a = makeAlien(type, x, -10);
    if (w >= 4 && type === 'grunt' && Math.random() < 0.3) { a.hp = a.maxHp = 2; }
  }
  // V자 편대 등장
  function spawnFormation() {
    const n = 5, cx = VW * (0.25 + Math.random() * 0.5), gap = 17;
    for (let i = 0; i < n; i++) {
      const off = i - (n - 1) / 2;
      makeAlien('grunt', cx + off * gap, -10 - Math.abs(off) * 12, { sway: 6 * U, ph: 0, formation: true });
    }
    showBanner('👾 외계인 편대 출현!', '#b6ff9e');
  }
  function spawnBoss() {
    const a = makeAlien('boss', VW / 2, -20);
    a.hp = a.maxHp = 34 + s.wave * 5;
    a.pts = 300 + s.wave * 20;
    a.fireT = 2.5; a.summonT = 6;
  }

  function fire() {
    const spread = s.triple > 0 ? [-0.22, 0, 0.22] : [0];
    const sp = 170 * U;
    for (const a of spread) s.shots.push({ x: ship.x + Math.sin(a) * 2, y: ship.y - 9, vx: Math.sin(a) * sp, vy: -Math.cos(a) * sp });
    s.fireCd = s.rapid > 0 ? 0.1 : 0.2;
    s.muzzle = 0.06;
    Sound.shoot();
  }
  function enemyShoot(a, angle, speed) {
    const sp = (speed || 42) * U * (s.rage > 0 ? 1.25 : 1);
    s.ebullets.push({ x: a.x, y: a.y + a.h / 2 - 2, vx: Math.sin(angle) * sp, vy: Math.cos(angle) * sp });
  }
  const aimAt = a => Math.atan2(ship.x - a.x, ship.y - a.y);

  function killAlien(a, bomb) {
    burst(a.x, a.y, a.type, a.boss ? 90 : a.gift ? 30 : 22, a.boss ? 1.6 : 1);
    a.dead = true;
    if (a.gift) return;
    s.kills++; if (!bomb) s.combo++;
    let pts = a.pts + (bomb ? 0 : Math.min(s.combo, 20));
    if (!bomb && s.combo > 0 && s.combo % 5 === 0) {
      const bonus = s.combo * 5; pts += bonus;
      s.comboPop = 1.2; s.comboText = '🔥 ' + s.combo + ' 콤보! +' + bonus;
      Sound.combo();
    }
    s.score += pts;
    addText(a.x, a.y - a.h / 2, '+' + pts, a.boss ? '#ffe066' : '#ffffff', a.boss ? 40 : 22);
    // 가끔 별을 떨어뜨려요
    if (a.boss) for (let i = 0; i < 6; i++) dropStar(a.x + (Math.random() - 0.5) * 30, a.y + (Math.random() - 0.5) * 16);
    else if (Math.random() < 0.18) dropStar(a.x, a.y);
    if (a.boss) { s.flash = 0.3; s.shake = 0.5; showBanner('👑 대왕 외계인을 물리쳤다!', '#ffe066'); Sound.boom(); }
    else Sound.pop();
  }
  function smashRock(r) { r.dead = true; burst(r.x, r.y, 'rock', Math.round(r.r * 2.2), 0.8); }
  function dropStar(x, y) { s.stars.push({ x, y, vy: 10 * U, ph: Math.random() * 6 }); }

  function hurtPlayer(by) {
    if (s.inv > 0 || s.shield > 0) return false;
    s.lives--; s.hurt = 0.6; s.shake = 0.45; s.combo = 0; s.inv = 1.6;
    burst(ship.x, ship.y, 'ship', 26, 1);
    Sound.hurt();
    if (by) addText(ship.x, ship.y - 16, by, '#ff9b9b', 26);
    if (s.lives <= 0) { burst(ship.x, ship.y, 'ship', 60, 1.5); gameOver(); return true; }
    return false;
  }

  // ---------- 업데이트 ----------
  function update(dt) {
    s.t += dt;
    for (const k of ['freeze', 'triple', 'rapid', 'shield', 'shake', 'flash', 'hurt', 'inv', 'comboPop', 'rage', 'muzzle']) s[k] = Math.max(0, (s[k] || 0) - dt);
    if (s.banner) { s.banner.t -= dt; if (s.banner.t <= 0) s.banner = null; }
    const wave = 1 + Math.floor(s.t / 30);
    if (wave !== s.wave) {
      s.wave = wave; Sound.wave();
      if (wave % s.bossEvery === 0 && s.bossWave !== wave) { s.bossWave = wave; spawnBoss(); showBanner('⚠ 대왕 외계인 등장!', '#ffb3c1'); }
      else showBanner('난이도 ' + wave + '! ⬆', '#ffffff');
    }
    if (s.bossT != null) { s.bossT -= dt; if (s.bossT <= 0) { s.bossT = null; spawnBoss(); showBanner('⚠ 대왕 외계인 등장!', '#ffb3c1'); } }

    s.quizT -= dt;
    if (s.quizT <= 0) { triggerQuiz('timer'); return; }

    // 로켓 이동
    const kx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
    const ky = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0);
    if (kx || ky) { ship.tx += kx * 90 * U * dt; ship.ty += ky * 90 * U * dt; clampTarget(); }
    const maxStep = 160 * U * dt;
    const dx = ship.tx - ship.x, dy = ship.ty - ship.y, dist = Math.hypot(dx, dy);
    const k = dist > maxStep ? maxStep / dist : Math.min(1, dt * 22);
    ship.x += dx * k; ship.y += dy * k;
    const vx = dt > 0 ? dx * k / dt : 0;
    ship.tilt += (Math.max(-1, Math.min(1, vx / (60 * U))) - ship.tilt) * Math.min(1, dt * 12);

    const frozen = s.freeze > 0;
    const angerF = s.anger * (s.rage > 0 ? 1.4 : 1);
    const bossAlive = s.aliens.some(a => a.boss && !a.dead);

    // 생성
    if (!frozen) {
      s.rockT -= dt;
      if (s.rockT <= 0) { spawnRock(); s.rockT = Math.max(0.6, 2.4 - s.t * 0.009) * (0.6 + Math.random() * 0.8); }
      s.alienT -= dt;
      if (s.alienT <= 0) { spawnAlien(); s.alienT = Math.max(0.45, 1.7 - s.t * 0.007) * (0.7 + Math.random() * 0.6) * (s.rage > 0 ? 0.5 : 1) * (bossAlive ? 2.5 : 1); }
      s.formT -= dt;
      if (s.formT <= 0) { if (!bossAlive) spawnFormation(); s.formT = 22 + Math.random() * 10; }
      s.giftT -= dt;
      if (s.giftT <= 0) { makeAlien('capsule', 16 + Math.random() * (VW - 32), -12); s.giftT = 15 + Math.random() * 8; }
      s.starT -= dt;
      if (s.starT <= 0) { dropStar(8 + Math.random() * (VW - 16), -8); s.starT = 3 + Math.random() * 4; }
    }

    // 발사 (자동)
    s.fireCd -= dt;
    if (s.fireCd <= 0) fire();
    for (const b of s.shots) { b.x += b.vx * dt; b.y += b.vy * dt; if (b.y < -10 || b.x < -10 || b.x > VW + 10) b.dead = true; }

    // 운석
    for (const r of s.rocks) {
      if (!frozen) { r.x += r.vx * dt; r.y += r.vy * dt; r.rot += r.vr * dt; }
      if (r.y - r.r > VH + 4 || r.x < -r.r - 10 || r.x > VW + r.r + 10) r.dead = true;
    }

    // 외계인
    for (const a of s.aliens) {
      if (a.dead) continue;
      a.hit = Math.max(0, a.hit - dt);
      if (frozen) continue;
      a.ph += dt;
      if (a.boss) {
        const targetY = VH * 0.2;
        if (a.y < targetY) a.y += a.vy * dt * 1.5;
        a.x = VW / 2 + Math.sin(a.ph * 0.7) * (VW / 2 - a.w / 2 - 6);
        a.fireT -= dt * (s.rage > 0 ? 1.4 : 1);
        if (a.fireT <= 0 && a.y >= targetY - 1) {
          const n = 5 + Math.min(4, Math.floor(s.wave / 3)), base = aimAt(a);
          for (let i = 0; i < n; i++) enemyShoot(a, base + (i - (n - 1) / 2) * 0.22, 36);
          a.fireT = Math.max(1.2, 2.4 - s.wave * 0.06);
          Sound.zap();
        }
        a.summonT -= dt;
        if (a.summonT <= 0) { makeAlien('grunt', a.x - 20, a.y + 8); makeAlien('grunt', a.x + 20, a.y + 8); a.summonT = 7; }
        continue;
      }
      if (a.type === 'diver') {
        // 내려오다가 잠깐 멈춘 뒤 로켓 쪽으로 돌진
        if (a.state === 0) { a.y += a.vy * angerF * dt; a.x += Math.cos(a.ph * 2) * a.sway * dt; if (a.y > VH * (0.18 + (a.ph % 1) * 0.15)) { a.state = 1; a.stT = 0.6; } }
        else if (a.state === 1) { a.stT -= dt; a.x += (Math.random() - 0.5) * 30 * dt; if (a.stT <= 0) { const ang = aimAt(a), sp = 55 * U * angerF; a.vx = Math.sin(ang) * sp; a.vy2 = Math.cos(ang) * sp; a.state = 2; Sound.zap(); } }
        else { a.x += a.vx * dt; a.y += a.vy2 * dt; }
      } else {
        a.y += a.vy * angerF * dt * (a.gift ? 0.8 : 1);
        a.x += Math.cos(a.ph * (a.formation ? 1.6 : 1.3)) * a.sway * dt;
        a.x = Math.max(a.w / 2, Math.min(VW - a.w / 2, a.x));
      }
      if (a.type === 'crab') {
        a.fireT -= dt * (s.rage > 0 ? 1.5 : 1);
        if (a.fireT <= 0 && a.y > 0 && a.y < VH * 0.7) { enemyShoot(a, aimAt(a)); a.fireT = Math.max(1.4, 3.2 - s.wave * 0.12) * (0.8 + Math.random() * 0.4); Sound.zap(); }
      }
      if (a.y - a.h / 2 > VH + 4 || a.x < -30 || a.x > VW + 30) {
        a.dead = true;
        if (!a.gift && s.combo > 0) { s.combo = 0; addText(a.x, VH - 14, '놓쳤다!', '#c9b8ff', 20); }
      }
    }

    // 적 총알
    for (const b of s.ebullets) { if (!frozen) { b.x += b.vx * dt; b.y += b.vy * dt; } if (b.y > VH + 6 || b.y < -10 || b.x < -6 || b.x > VW + 6) b.dead = true; }

    // 별
    for (const st of s.stars) {
      st.ph += dt * 5;
      const ddx = ship.x - st.x, ddy = ship.y - st.y, d = Math.hypot(ddx, ddy);
      if (d < 24) { st.x += ddx / d * 90 * U * dt * 0.5; st.y += ddy / d * 90 * U * dt * 0.5; }   // 가까우면 끌려와요
      else if (!frozen) st.y += st.vy * dt;
      if (d < 9) { st.dead = true; s.starsGot++; s.score += 25; addText(st.x, st.y - 6, '⭐+25', '#ffe066', 20); burst(st.x, st.y, 'star', 10, 0.6); Sound.star(); }
      if (st.y > VH + 10) st.dead = true;
    }

    // 충돌: 레이저 ↔ 운석(막힘) / 외계인
    for (const b of s.shots) {
      if (b.dead) continue;
      for (const r of s.rocks) {
        if (r.dead) continue;
        if (Math.hypot(b.x - r.x, b.y - r.y) < r.r) { b.dead = true; burst(b.x, b.y + 2, 'hit', 3, 0.4); Sound.clink(); break; }
      }
      if (b.dead) continue;
      for (const a of s.aliens) {
        if (a.dead) continue;
        if (Math.abs(b.x - a.x) < a.w / 2 + 1 && Math.abs(b.y - a.y) < a.h / 2 + 2) {
          b.dead = true; a.hp--; a.hit = 0.08;
          if (!a.boss && !frozen) a.y -= 1.5;
          burst(b.x, b.y, 'hit', 3, 0.5);
          if (a.hp <= 0) {
            killAlien(a);
            if (a.gift) { Sound.gift(); cleanup(); triggerQuiz('gift'); return; }
          } else Sound.tick();
          break;
        }
      }
    }

    // 충돌: 로켓 ↔ 운석·외계인·적 총알 (로켓 판정은 실제 그림보다 조금 작게)
    const sr = 4.5;
    for (const r of s.rocks) {
      if (r.dead) continue;
      if (Math.hypot(ship.x - r.x, ship.y - r.y) < r.r * 0.85 + sr) {
        if (s.shield > 0) { smashRock(r); Sound.clink(); continue; }
        if (s.inv > 0) continue;
        smashRock(r);
        if (hurtPlayer('운석 충돌!')) return;
      }
    }
    for (const a of s.aliens) {
      if (a.dead || a.gift) continue;
      if (Math.abs(ship.x - a.x) < a.w / 2 * 0.8 + sr && Math.abs(ship.y - a.y) < a.h / 2 * 0.8 + sr) {
        if (s.shield > 0) { if (!a.boss) killAlien(a); continue; }
        if (s.inv > 0) continue;
        if (!a.boss) { a.hp = 0; killAlien(a, true); }
        if (hurtPlayer('쾅!')) return;
      }
    }
    for (const b of s.ebullets) {
      if (b.dead) continue;
      if (Math.hypot(ship.x - b.x, ship.y - b.y) < sr + 1.5) {
        b.dead = true;
        if (s.shield > 0 || s.inv > 0) continue;
        if (hurtPlayer('으악!')) return;
      }
    }

    cleanup();
    for (const t of s.texts) { t.y -= 14 * U * dt * 0.5; t.t -= dt; }
    s.texts = s.texts.filter(t => t.t > 0);
  }

  function cleanup() {
    s.shots = s.shots.filter(b => !b.dead);
    s.rocks = s.rocks.filter(r => !r.dead);
    s.aliens = s.aliens.filter(a => !a.dead);
    s.ebullets = s.ebullets.filter(b => !b.dead);
    s.stars = s.stars.filter(st => !st.dead);
  }

  function updateParts(dt) {
    if (!s) return;
    for (const p of s.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - dt * 2.5; p.vy *= 1 - dt * 2.5; }
    s.parts = s.parts.filter(p => p.life > 0);
  }

  function triggerQuiz(reason) {
    mode = 'pause'; drag = null;
    if (hooks.onQuiz) hooks.onQuiz(reason);
  }
  function gameOver() {
    mode = 'over';
    if (hooks.onGameOver) hooks.onGameOver({ score: s.score, wave: s.wave, time: Math.round(s.t), kills: s.kills });
  }

  // ---------- 메뉴 화면 장식 ----------
  function updateMenu(dt) {
    ship.x = VW / 2 + Math.sin(clock * 0.6) * VW * 0.12;
    ship.y = VH * 0.78 + Math.sin(clock * 1.3) * 4;
    ship.tilt = Math.cos(clock * 0.6) * 0.5;
    if (deco.length < 5 && Math.random() < dt * 0.8) {
      const sp = SPR.rocks[(Math.random() * SPR.rocks.length) | 0];
      deco.push({ x: Math.random() * VW, y: -20, sp, r: sp.width / 2, vy: (6 + Math.random() * 8) * U, rot: 0, vr: (Math.random() - 0.5) * 1.5 });
    }
    for (const r of deco) { r.y += r.vy * dt; r.rot += r.vr * dt; }
    deco = deco.filter(r => r.y < VH + 30);
  }

  // ---------- 그리기 ----------
  function loop(now) {
    const raw = (now - last) / 1000 || 0;
    const dt = Math.min(0.05, raw);
    last = now;
    if (mode === 'play') update(dt);
    if (mode === 'menu') updateMenu(dt);
    if (mode !== 'pause' && mode !== 'over') {
      clock += dt;
      const speedUp = mode === 'play' && s && s.freeze <= 0 ? 1 + Math.min(1, s.t / 200) : mode === 'menu' ? 1 : 0.2;
      scrollY = (scrollY + dt * 6 * U * speedUp) % VH;
      updateParts(dt);
    } else if (mode === 'over') updateParts(dt);
    render();
    if (hooks.onFrame) hooks.onFrame(s, mode);
    requestAnimationFrame(loop);
  }

  function drawSpr(sp, x, y, rot) {
    const ix = Math.round(x), iy = Math.round(y);
    if (rot) {
      ctx.save(); ctx.translate(ix, iy); ctx.rotate(Math.round(rot / (Math.PI / 8)) * (Math.PI / 8));
      ctx.drawImage(sp, -Math.floor(sp.width / 2), -Math.floor(sp.height / 2)); ctx.restore();
    } else ctx.drawImage(sp, ix - Math.floor(sp.width / 2), iy - Math.floor(sp.height / 2));
  }

  function render() {
    const g = ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    let ox = 0, oy = 0;
    if (s && s.shake > 0) { ox = Math.round((Math.random() - 0.5) * s.shake * 10); oy = Math.round((Math.random() - 0.5) * s.shake * 10); }
    // 배경
    const sy = Math.floor(scrollY);
    g.drawImage(nebula, 0, sy - VH); g.drawImage(nebula, 0, sy);
    for (const st of stars) {
      const sp = [0.25, 0.6, 1][st.l];
      const y = Math.floor((st.y + scrollY * sp * 3) % VH);
      const tw = Math.sin(clock * 3 + st.ph) > 0.6;
      g.fillStyle = st.l === 0 ? '#7f74b8' : st.l === 1 ? '#c9c2ff' : '#ffffff';
      g.fillRect(Math.floor(st.x), y, 1, 1);
      if (st.big || (st.l === 2 && tw)) { g.fillStyle = 'rgba(190,220,255,0.7)'; g.fillRect(Math.floor(st.x) - 1, y, 3, 1); g.fillRect(Math.floor(st.x), y - 1, 1, 3); }
    }
    g.translate(ox, oy);

    if (mode === 'menu' || !s) {
      for (const r of deco) drawSpr(r.sp, r.x, r.y, r.rot);
      drawShip(false);
      drawFx();
      return;
    }
    const frozen = s.freeze > 0;
    // 별
    for (const st of s.stars) {
      const sc = Math.abs(Math.cos(st.ph * 0.5));
      const sp = SPR.star, w = Math.max(1, Math.round(sp.width * sc));
      g.drawImage(sp, Math.round(st.x - w / 2), Math.round(st.y - sp.height / 2), w, sp.height);
    }
    // 운석
    for (const r of s.rocks) drawSpr(r.sp, r.x, r.y, r.rot);
    // 외계인
    for (const a of s.aliens) {
      const key = a.type + (a.hit > 0 ? 'F' : frozen ? 'I' : '');
      let y = a.y;
      if (!frozen && !a.boss) y += Math.round(Math.sin(a.ph * 6) * 0.8);
      if (a.gift) {
        g.globalAlpha = 0.25 + 0.2 * Math.sin(clock * 6);
        g.fillStyle = '#fff2a0'; g.beginPath(); g.arc(Math.round(a.x), Math.round(y), 12 + Math.sin(clock * 6), 0, 7); g.fill();
        g.globalAlpha = 1;
      }
      if (a.type === 'diver' && a.state === 1 && Math.floor(clock * 20) % 2) { drawSpr(SPR.diverF, a.x, y); continue; }
      drawSpr(SPR[key], a.x, y);
      if (s.rage > 0 && !a.gift && !frozen) { g.fillStyle = 'rgba(255,40,60,0.35)'; g.fillRect(Math.round(a.x - a.w / 2), Math.round(y - a.h / 2), a.w, a.h); }
      if (a.maxHp > 1 && !a.gift) {
        const bw = a.boss ? a.w : a.w - 2, bx = Math.round(a.x - bw / 2), by = Math.round(y - a.h / 2 - (a.boss ? 6 : 4));
        g.fillStyle = '#1b1030'; g.fillRect(bx - 1, by - 1, bw + 2, a.boss ? 4 : 3);
        g.fillStyle = a.boss ? '#ff3b4f' : '#ff7fb4'; g.fillRect(bx, by, Math.max(0, Math.round(bw * a.hp / a.maxHp)), a.boss ? 2 : 1);
      }
    }
    // 레이저
    for (const b of s.shots) {
      g.fillStyle = '#aee8ff'; g.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 3, 2, 6);
      g.fillStyle = '#ffffff'; g.fillRect(Math.round(b.x), Math.round(b.y) - 3, 1, 4);
    }
    // 적 총알 (분홍 구슬)
    for (const b of s.ebullets) {
      const x = Math.round(b.x), y = Math.round(b.y), f = Math.floor(clock * 12) % 2;
      g.fillStyle = f ? '#ff3b4f' : '#ff5fb0'; g.fillRect(x - 2, y - 1, 4, 2); g.fillRect(x - 1, y - 2, 2, 4);
      g.fillStyle = '#ffffff'; g.fillRect(x, y - 1, 1, 1);
    }
    // 로켓
    const blink = s.inv > 0 && Math.floor(s.inv * 12) % 2 === 0;
    if (mode !== 'over' && !blink) drawShip(true);
    // 파티클
    for (const p of s.parts) { g.globalAlpha = Math.min(1, p.life * 3); g.fillStyle = p.c; g.fillRect(Math.round(p.x), Math.round(p.y), p.sz, p.sz); }
    g.globalAlpha = 1;
    // 시간 정지 효과
    if (frozen) { g.fillStyle = 'rgba(120,200,255,0.12)'; g.fillRect(-10, -10, VW + 20, VH + 20); }
    drawFx();
  }

  function drawShip(playing) {
    const g = ctx, x = Math.round(ship.x), y = Math.round(ship.y);
    // 불꽃 (깜박깜박)
    const len = 4 + ((clock * 30) | 0) % 3 + (playing && ship.ty < ship.y - 2 ? 3 : 0);
    const fy = y + 8;
    for (const [fx2, fl] of [[-5, 0.6], [0, 1], [5, 0.6]]) {
      const L = Math.round(len * fl);
      g.fillStyle = '#d2501a'; g.fillRect(x + fx2 - 1, fy, 3, L + 1);
      g.fillStyle = '#ff8a1e'; g.fillRect(x + fx2 - 1, fy, 3, L);
      g.fillStyle = '#ffd23a'; g.fillRect(x + fx2, fy, 1, Math.max(1, L - 2));
    }
    // 기울기: 좌우로 움직이면 몸이 살짝 찌그러져 보여요
    const sp = SPR.ship, sq = Math.round(Math.abs(ship.tilt) * 2);
    g.drawImage(sp, x - Math.floor(sp.width / 2) + (ship.tilt > 0 ? sq : 0), y - Math.floor(sp.height / 2), sp.width - sq, sp.height);
    if (s && s.muzzle > 0 && playing) { g.fillStyle = '#ffffff'; g.fillRect(x - 1, y - 11, 3, 2); }
    if (s && s.shield > 0 && playing) {
      const on = s.shield > 2 || Math.floor(clock * 10) % 2;
      if (on) { g.strokeStyle = 'rgba(120,230,255,0.85)'; g.lineWidth = 1; g.beginPath(); g.arc(x + 0.5, y + 1.5, 14 + Math.sin(clock * 8), 0, 7); g.stroke();
        g.fillStyle = 'rgba(120,230,255,0.12)'; g.fill(); }
    }
  }

  // 글자·화면 효과는 큰 해상도 캔버스에
  function drawFx() {
    const g = fxc, W = innerWidth, H = innerHeight;
    g.clearRect(0, 0, W, H);
    if (!s || mode === 'menu') return;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const t of s.texts) {
      const x = t.x * PXX, y = t.y * PXY;
      g.globalAlpha = Math.min(1, t.t * 1.5);
      g.font = `${t.size}px HakgyoDung, sans-serif`;
      g.lineWidth = 5; g.strokeStyle = 'rgba(20,8,50,0.85)'; g.strokeText(t.text, x, y);
      g.fillStyle = t.color; g.fillText(t.text, x, y);
    }
    g.globalAlpha = 1;
    if (s.banner) {
      g.globalAlpha = Math.min(1, s.banner.t * 2);
      const fs = Math.min(60, W * 0.07);
      g.font = `${fs}px HakgyoDung, sans-serif`;
      g.lineWidth = 9; g.strokeStyle = 'rgba(20,8,50,0.85)'; g.strokeText(s.banner.text, W / 2, H * 0.3);
      g.fillStyle = s.banner.color; g.fillText(s.banner.text, W / 2, H * 0.3);
      g.globalAlpha = 1;
    }
    if (s.hurt > 0) {
      const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
      gr.addColorStop(0, 'rgba(255,40,60,0)'); gr.addColorStop(1, `rgba(255,40,60,${s.hurt * 0.8})`);
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }
    if (s.rage > 0 && mode === 'play') {
      const a = Math.min(1, s.rage / 2) * (0.18 + 0.1 * Math.sin(clock * 12));
      const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.8);
      gr.addColorStop(0, 'rgba(255,30,50,0)'); gr.addColorStop(1, 'rgba(255,30,50,' + a + ')');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }
    if (s.combo >= 3) {
      const fs = Math.min(34, W * 0.045);
      g.font = fs + 'px HakgyoDung, sans-serif'; g.textAlign = 'right';
      g.lineWidth = 6; g.strokeStyle = 'rgba(20,8,50,0.8)';
      const txt = '콤보 ×' + s.combo;
      g.strokeText(txt, W - 18, H * 0.42); g.fillStyle = s.combo >= 10 ? '#ffb347' : '#ffffff'; g.fillText(txt, W - 18, H * 0.42);
      g.textAlign = 'center';
    }
    if (s.comboPop > 0) {
      const k = s.comboPop / 1.2, fs = Math.min(48, W * 0.06) * (1 + (k > 0.85 ? (k - 0.85) * 2 : 0));
      g.globalAlpha = Math.min(1, s.comboPop * 2);
      g.font = fs + 'px HakgyoDung, sans-serif';
      g.lineWidth = 8; g.strokeStyle = 'rgba(120,30,0,0.75)'; g.strokeText(s.comboText, W / 2, H * 0.5);
      g.fillStyle = '#ffd25a'; g.fillText(s.comboText, W / 2, H * 0.5);
      g.globalAlpha = 1;
    }
    if (s.flash > 0) { g.fillStyle = `rgba(255,255,255,${s.flash * 1.8})`; g.fillRect(0, 0, W, H); }
  }

  // 점검용
  function _step(sec) { for (let i = 0; i < sec * 30 && mode === 'play'; i++) { update(1 / 30); clock += 1 / 30; updateParts(1 / 30); } render(); }
  function _move(x, y) { setTarget(x * VW, (y == null ? 0.8 : y) * VH); }

  return { init, start, pause, resume, stop, getState, getMode, onQuizResult, rewardChoices, applyReward, _step, _move, _spawnBoss: () => spawnBoss() };
})();

// ===== 효과음 (파일 없이 코드로 만든 소리) =====
const Sound = (() => {
  let ac = null, on = Store.get('sound_on', true);
  function unlock() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } if (ac && ac.state === 'suspended') ac.resume(); }
  function tone(freq, dur, type, vol, slide) {
    if (!on || !ac) return;
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(vol || 0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur);
  }
  return {
    unlock,
    isOn: () => on,
    toggle() { on = !on; Store.set('sound_on', on); unlock(); return on; },
    shoot() { tone(1400, 0.05, 'square', 0.015, 700); },
    tick() { tone(300, 0.05, 'square', 0.04); },
    clink() { tone(1800, 0.03, 'triangle', 0.02, 1200); },
    zap() { tone(500, 0.12, 'sawtooth', 0.025, 200); },
    star() { tone(1320, 0.08, 'square', 0.04, 1760); },
    pop() { tone(220, 0.15, 'square', 0.06, 60); },
    hurt() { tone(180, 0.3, 'sawtooth', 0.1, 80); },
    thud() { tone(90, 0.25, 'sine', 0.18, 45); },
    gift() { [660, 880, 1100].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'triangle', 0.1), i * 70)); },
    wave() { tone(440, 0.15, 'triangle', 0.08, 660); },
    boom() { tone(120, 0.5, 'sawtooth', 0.15, 40); },
    correct() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'triangle', 0.12), i * 90)); },
    wrong() { tone(300, 0.2, 'square', 0.08, 200); setTimeout(() => tone(200, 0.3, 'square', 0.08, 120), 180); },
    click() { tone(800, 0.04, 'sine', 0.06); },
    rage() { tone(110, 0.5, 'sawtooth', 0.12, 70); setTimeout(() => tone(95, 0.4, 'sawtooth', 0.1, 60), 220); },
    combo() { [784, 988, 1318].forEach((f, i) => setTimeout(() => tone(f, 0.1, 'square', 0.06), i * 60)); },
  };
})();
