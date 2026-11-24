// ===== 겨냥도 완성하기 (등각 점종이에 선 이어 그리기) =====
// 점 좌표: (c, r)  — 화면 X = c·cos30·S, Y = r·S/2,  c+r 은 짝수
// 직육면체 꼭짓점 (x,y,z) → c = c0 + x − y,  r = r0 + x + y − 2z
// 보는 방향: 위·앞쪽에서 봄 → (0,0,0) 꼭짓점이 보이지 않는 꼭짓점
const Sketch = (() => {
  const C = 10, R = 14;               // 점종이 크기
  const S = 44, PAD = 18, K = Math.cos(Math.PI / 6);
  const NS = 'http://www.w3.org/2000/svg';
  const DIRS = [[0, 2], [0, -2], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const R_ = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  const px = (c, r) => [PAD + c * K * S, PAD + r * S / 2];
  const inBoard = (c, r) => c >= 0 && c <= C && r >= 0 && r <= R && (c + r) % 2 === 0;
  const ukey = (a, b) => { const p = a[0] + ',' + a[1], q = b[0] + ',' + b[1]; return p < q ? p + '|' + q : q + '|' + p; };

  // 선 하나를 한 칸짜리 조각들로 나누기
  function units(a, b) {
    const dc = b[0] - a[0], dr = b[1] - a[1];
    const k = dc === 0 ? Math.abs(dr) / 2 : Math.abs(dc);
    const out = [];
    if (!k) return out;
    const sc = dc / k, sr = dr / k;
    for (let i = 0; i < k; i++) out.push(ukey([a[0] + sc * i, a[1] + sr * i], [a[0] + sc * (i + 1), a[1] + sr * (i + 1)]));
    return out;
  }

  // 직육면체 모서리 12개 (점 좌표 + 점선 여부)
  function boxEdges(c0, r0, A, B, H) {
    const V = (x, y, z) => [c0 + x - y, r0 + x + y - 2 * z];
    const e = [];
    for (const y of [0, B]) for (const z of [0, H]) e.push({ a: V(0, y, z), b: V(A, y, z), dash: y === 0 && z === 0 });
    for (const x of [0, A]) for (const z of [0, H]) e.push({ a: V(x, 0, z), b: V(x, B, z), dash: x === 0 && z === 0 });
    for (const x of [0, A]) for (const y of [0, B]) e.push({ a: V(x, y, 0), b: V(x, y, H), dash: x === 0 && y === 0 });
    return e;
  }
  function fits(c0, r0, A, B, H) { return c0 - B >= 0 && c0 + A <= C && r0 - 2 * H >= 0 && r0 + A + B <= R && (c0 + r0) % 2 === 0; }
  function unitMap(edges) { const m = new Map(); edges.forEach(e => units(e.a, e.b).forEach(u => m.set(u, e.dash))); return m; }

  // 주어진 선을 모두 포함하는 직육면체가 몇 개인지 (2개 이상이면 답이 여러 개)
  function countCandidates(givenMap, limit) {
    let n = 0;
    for (let A = 1; A <= 6; A++) for (let B = 1; B <= 6; B++) for (let H = 1; H <= 5; H++)
      for (let c0 = 0; c0 <= C; c0++) for (let r0 = 0; r0 <= R; r0++) {
        if (!fits(c0, r0, A, B, H)) continue;
        const m = unitMap(boxEdges(c0, r0, A, B, H));
        let ok = true;
        for (const [k, d] of givenMap) if (m.get(k) !== d) { ok = false; break; }
        if (ok && ++n >= limit) return n;
      }
    return n;
  }

  // 문제 만들기 (level 0: 주어진 선 많음 → 2: 적음)
  function makePuzzle(level) {
    for (let t = 0; t < 200; t++) {
      const A = R_(1, 4), B = R_(1, 4), H = R_(1, 4);
      const spots = [];
      for (let c0 = 0; c0 <= C; c0++) for (let r0 = 0; r0 <= R; r0++) if (fits(c0, r0, A, B, H)) spots.push([c0, r0]);
      if (!spots.length) continue;
      const [c0, r0] = spots[Math.floor(Math.random() * spots.length)];
      const edges = boxEdges(c0, r0, A, B, H);
      const n = level === 0 ? R_(4, 5) : level === 1 ? R_(3, 4) : R_(2, 3);
      const idx = edges.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, n);
      const given = idx.map(i => edges[i]);
      if (level > 0 && !given.some(e => e.dash) && Math.random() < 0.6) continue;
      if (countCandidates(unitMap(given), 2) !== 1) continue;
      return { id: [c0, r0, A, B, H, idx.sort().join('.')].join('-'), c0, r0, A, B, H, edges, given };
    }
    // 아주 드물게 실패하면 선을 넉넉히 줌
    const edges = boxEdges(4, 8, 3, 2, 2);
    return { id: 'fallback', c0: 4, r0: 8, A: 3, B: 2, H: 2, edges, given: edges.slice(0, 6) };
  }

  // ---------- 화면 ----------
  function svgEl(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.append(e); return e; }

  function mount(container, pz, onChange) {
    let tool = 'solid';                 // solid | dash | erase
    let strokes = [];                   // {a, b, dash}
    const history = [];
    let start = null, dragging = false, locked = false;
    const givenKeys = new Set(); pz.given.forEach(e => units(e.a, e.b).forEach(u => givenKeys.add(u)));

    const wrap = document.createElement('div'); wrap.className = 'sketch';
    const tools = document.createElement('div'); tools.className = 'sk-tools';
    const mk = (id, html, title) => { const b = document.createElement('button'); b.className = 'sk-tool'; b.dataset.t = id; b.innerHTML = html; b.title = title; tools.append(b); return b; };
    const bSolid = mk('solid', '<svg viewBox="0 0 40 12"><line x1="2" y1="6" x2="38" y2="6" stroke="currentColor" stroke-width="4"/></svg>실선', '실선 펜');
    const bDash = mk('dash', '<svg viewBox="0 0 40 12"><line x1="2" y1="6" x2="38" y2="6" stroke="currentColor" stroke-width="4" stroke-dasharray="6 5"/></svg>점선', '점선 펜');
    const bErase = mk('erase', '🧽<br>지우개', '지우개: 지울 선을 눌러요');
    const bUndo = mk('undo', '↶<br>되돌리기', '되돌리기');
    const bClear = mk('clear', '🗑<br>모두 지우기', '내가 그린 선 모두 지우기');

    const W = PAD * 2 + C * K * S, H = PAD * 2 + R * S / 2;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'sk-board' });
    const gGrid = svgEl('g', {}, svg), gGiven = svgEl('g', {}, svg), gMine = svgEl('g', {}, svg), gReveal = svgEl('g', {}, svg), gDots = svgEl('g', {}, svg);
    const preview = svgEl('line', { stroke: '#3a86ff', 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0.5, visibility: 'hidden' }, svg);
    const startDot = svgEl('circle', { r: 8, fill: 'none', stroke: '#ff922b', 'stroke-width': 3, visibility: 'hidden' }, svg);

    // 배경 격자
    for (let c = 0; c <= C; c++) for (let r = 0; r <= R; r++) {
      if (!inBoard(c, r)) continue;
      for (const [dc, dr] of [[0, 2], [1, 1], [1, -1]]) {
        if (!inBoard(c + dc, r + dr)) continue;
        const [x1, y1] = px(c, r), [x2, y2] = px(c + dc, r + dr);
        svgEl('line', { x1, y1, x2, y2, stroke: '#d5e0ee', 'stroke-width': 1 }, gGrid);
      }
      const [x, y] = px(c, r);
      svgEl('circle', { cx: x, cy: y, r: 2.6, fill: '#9fb3cc' }, gDots);
    }
    const line = (g, a, b, o) => { const [x1, y1] = px(...a), [x2, y2] = px(...b); return svgEl('line', { x1, y1, x2, y2, stroke: o.color, 'stroke-width': o.w || 4, 'stroke-linecap': 'round', ...(o.dash ? { 'stroke-dasharray': '7 7', 'stroke-linecap': 'butt' } : {}), ...(o.op ? { opacity: o.op } : {}) }, g); };
    pz.given.forEach(e => line(gGiven, e.a, e.b, { color: '#1b2440', dash: e.dash, w: 4.5 }));

    function render() {
      gMine.innerHTML = '';
      strokes.forEach(s => line(gMine, s.a, s.b, { color: '#2f74e8', dash: s.dash }));
      startDot.setAttribute('visibility', start && !dragging ? 'visible' : 'hidden');
      if (start) { const [x, y] = px(...start); startDot.setAttribute('cx', x); startDot.setAttribute('cy', y); }
      [bSolid, bDash, bErase].forEach(b => b.classList.toggle('on', b.dataset.t === tool));
      bUndo.disabled = !history.length; bClear.disabled = !strokes.length;
      if (onChange) onChange(strokes.length > 0);
    }
    function save() { history.push(strokes.slice()); if (history.length > 50) history.shift(); }

    bSolid.onclick = () => { tool = 'solid'; Sound.click(); render(); };
    bDash.onclick = () => { tool = 'dash'; Sound.click(); render(); };
    bErase.onclick = () => { tool = 'erase'; start = null; Sound.click(); render(); };
    bUndo.onclick = () => { if (history.length) { strokes = history.pop(); start = null; Sound.click(); render(); } };
    bClear.onclick = () => { if (strokes.length) { save(); strokes = []; start = null; Sound.click(); render(); } };

    function toLocal(e) {
      const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
      const q = p.matrixTransform(svg.getScreenCTM().inverse());
      return [q.x, q.y];
    }
    function nearestDot([x, y], maxD) {
      let best = null, bd = maxD * maxD;
      const c = Math.round((x - PAD) / (K * S)), r0 = Math.round((y - PAD) / (S / 2));
      for (let dc = -1; dc <= 1; dc++) for (let dr = -2; dr <= 2; dr++) {
        const cc = c + dc, rr = r0 + dr; if (!inBoard(cc, rr)) continue;
        const [qx, qy] = px(cc, rr), d = (qx - x) ** 2 + (qy - y) ** 2;
        if (d < bd) { bd = d; best = [cc, rr]; }
      }
      return best;
    }
    // 시작점에서 격자 방향으로만 끝점 맞추기
    function snapEnd(a, [x, y]) {
      const [ax, ay] = px(...a);
      let best = null, bd = Infinity;
      for (const [dc, dr] of DIRS) {
        const vx = dc * K * S, vy = dr * S / 2;
        let k = Math.round(((x - ax) * vx + (y - ay) * vy) / (S * S));
        while (k > 0 && !inBoard(a[0] + dc * k, a[1] + dr * k)) k--;
        if (k <= 0) continue;
        const ex = ax + vx * k, ey = ay + vy * k, d = (ex - x) ** 2 + (ey - y) ** 2;
        if (d < bd) { bd = d; best = [a[0] + dc * k, a[1] + dr * k]; }
      }
      return best;
    }
    function distSeg([x, y], s) {
      const [x1, y1] = px(...s.a), [x2, y2] = px(...s.b);
      const dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
      return Math.hypot(x - x1 - t * dx, y - y1 - t * dy);
    }
    function addStroke(a, b) {
      if (!b || (a[0] === b[0] && a[1] === b[1])) return;
      save(); strokes.push({ a, b, dash: tool === 'dash' }); Sound.click();
    }

    svg.addEventListener('pointerdown', e => {
      if (locked) return;
      e.preventDefault();
      const p = toLocal(e);
      if (tool === 'erase') {
        let bi = -1, bd = S * 0.3;
        strokes.forEach((s, i) => { const d = distSeg(p, s); if (d <= bd) { bd = d; bi = i; } });
        if (bi >= 0) { save(); strokes.splice(bi, 1); Sound.click(); render(); }
        return;
      }
      const d = nearestDot(p, S * 0.45);
      if (!d) { start = null; render(); return; }
      if (start && !(start[0] === d[0] && start[1] === d[1])) {
        // 점 두 개를 차례로 눌러서 긋기
        const end = snapEnd(start, px(...d));
        if (end && end[0] === d[0] && end[1] === d[1]) { addStroke(start, end); start = null; render(); return; }
        // 격자 방향이 아니면 새 시작점으로
      }
      start = d; dragging = true;
      svg.setPointerCapture(e.pointerId);
      render();
    });
    svg.addEventListener('pointermove', e => {
      if (!dragging || !start) return;
      const end = snapEnd(start, toLocal(e));
      if (!end) { preview.setAttribute('visibility', 'hidden'); return; }
      const [x1, y1] = px(...start), [x2, y2] = px(...end);
      Object.entries({ x1, y1, x2, y2 }).forEach(([k, v]) => preview.setAttribute(k, v));
      preview.setAttribute('stroke-dasharray', tool === 'dash' ? '7 7' : '');
      preview.setAttribute('visibility', 'visible');
    });
    const up = e => {
      if (!dragging) return;
      dragging = false; preview.setAttribute('visibility', 'hidden');
      const p = toLocal(e), d = nearestDot(p, S * 0.45);
      if (d && !(d[0] === start[0] && d[1] === start[1])) { addStroke(start, snapEnd(start, p)); start = null; }
      // 같은 점에서 손을 떼면 → 시작점으로 남겨 두고 다음 점을 누르면 이어짐
      render();
    };
    svg.addEventListener('pointerup', up);
    svg.addEventListener('pointercancel', () => { dragging = false; preview.setAttribute('visibility', 'hidden'); render(); });

    const legend = document.createElement('div'); legend.className = 'sk-legend';
    legend.innerHTML = '<span><i class="lg given"></i>처음 주어진 선</span><span><i class="lg mine"></i>내가 그린 선</span><span class="tip">점에서 점으로 끌거나, 점 두 개를 차례로 눌러요</span>';

    wrap.append(svg, tools);
    container.append(wrap, legend);
    render();

    function studentMap() {
      const m = new Map();
      strokes.forEach(s => units(s.a, s.b).forEach(u => { if (!givenKeys.has(u)) m.set(u, s.dash); }));
      return m;
    }
    function check() {
      locked = true; start = null; render();
      tools.querySelectorAll('button').forEach(b => b.disabled = true);
      const want = unitMap(pz.edges), mine = studentMap();
      givenKeys.forEach(k => want.delete(k));
      let ok = want.size === mine.size;
      const wrong = [], missing = [];
      for (const [k, d] of mine) if (want.get(k) !== d) { ok = false; wrong.push(k); }
      for (const [k, d] of want) if (mine.get(k) !== d) { ok = false; missing.push([k, d]); }
      // 결과 표시: 틀린 선 빨강, 빠진 선 초록(흐리게)
      const parse = k => k.split('|').map(s => s.split(',').map(Number));
      missing.forEach(([k, d]) => { const [a, b] = parse(k); line(gReveal, a, b, { color: '#2bb673', dash: d, w: 6, op: 0.8 }); });
      wrong.forEach(k => { const [a, b] = parse(k); line(gReveal, a, b, { color: '#ef476f', w: 6, op: 0.85, dash: mine.get(k) }); });
      if (!ok) legend.innerHTML = '<span><i class="lg bad"></i>잘못 그린 선</span><span><i class="lg need"></i>그려야 했던 선</span>';
      return ok;
    }
    return { check, hasAnswer: () => strokes.length > 0 };
  }

  return { makePuzzle, mount, countCandidates, unitMap, boxEdges };
})();
