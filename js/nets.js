// ===== 정육면체 전개도 엔진 =====
// 칸 6개짜리 모양을 무작위로 만들고, 실제로 접어 보아(굴리기) 정육면체가 되는지 판정합니다.
// 칸 좌표: [x, y]  (x 오른쪽, y 아래쪽)
const Nets = (() => {
  const key = (x, y) => x + ',' + y;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  // 칸들을 (0,0) 기준으로 옮기기
  function normalize(cells) {
    const mx = Math.min(...cells.map(c => c[0])), my = Math.min(...cells.map(c => c[1]));
    return cells.map(([x, y]) => [x - mx, y - my]);
  }

  // 무작위로 이어 붙인 칸 n개
  function randomShape(n) {
    const cells = [[0, 0]], set = new Set([key(0, 0)]);
    while (cells.length < n) {
      const [x, y] = cells[Math.floor(Math.random() * cells.length)];
      const [dx, dy] = DIRS[Math.floor(Math.random() * 4)];
      const k = key(x + dx, y + dy);
      if (!set.has(k)) { set.add(k); cells.push([x + dx, y + dy]); }
    }
    return normalize(cells);
  }

  // ---- 접기 (정육면체를 칸 위로 굴리기) ----
  // R: 정육면체 자신의 좌표 → 바닥 기준 좌표 (3×3 행렬). 바닥면은 z = -1 방향.
  const mul = (A, B) => A.map((row, i) => [0, 1, 2].map(j => row[0] * B[0][j] + row[1] * B[1][j] + row[2] * B[2][j]));
  const T = A => [0, 1, 2].map(i => [0, 1, 2].map(j => A[j][i]));
  const apply = (A, v) => A.map(row => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);
  const ROLL = {                               // 이웃 칸으로 한 번 굴릴 때의 회전
    '1,0': [[0, 0, 1], [0, 1, 0], [-1, 0, 0]],   // 동쪽
    '-1,0': [[0, 0, -1], [0, 1, 0], [1, 0, 0]],  // 서쪽
    '0,1': [[1, 0, 0], [0, 0, 1], [0, -1, 0]],   // 남쪽(아래)
    '0,-1': [[1, 0, 0], [0, 0, -1], [0, 1, 0]],  // 북쪽(위)
  };
  const vkey = v => v.join(',');

  // 결과: { ok, face: Map(칸키 → 면ID), corner: Map(점키 → 꼭짓점ID) }
  function fold(cells) {
    const set = new Map(cells.map(c => [key(...c), c]));
    const I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const rot = new Map([[key(...cells[0]), I]]);
    const q = [cells[0]];
    while (q.length) {
      const [x, y] = q.shift(), R = rot.get(key(x, y));
      for (const [dx, dy] of DIRS) {
        const k = key(x + dx, y + dy);
        if (!set.has(k) || rot.has(k)) continue;
        rot.set(k, mul(ROLL[dx + ',' + dy], R));
        q.push([x + dx, y + dy]);
      }
    }
    const face = new Map(), corner = new Map(), used = new Set();
    let ok = rot.size === cells.length;
    for (const [k, R] of rot) {
      const Rt = T(R);
      const f = vkey(apply(Rt, [0, 0, -1]));
      if (used.has(f)) ok = false;
      used.add(f); face.set(k, f);
      const [x, y] = k.split(',').map(Number);
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        const pk = key(x + (sx + 1) / 2, y + (sy + 1) / 2);
        const v = vkey(apply(Rt, [sx, sy, -1]));
        if (corner.has(pk) && corner.get(pk) !== v) ok = false;
        corner.set(pk, v);
      }
    }
    return { ok: ok && used.size === 6, face, corner, rot };
  }

  // ---- 직육면체 전개도 ----
  // 정육면체 전개도의 연결 모양을 그대로 쓰고, 면마다 실제 가로·세로 길이를 붙여 배치합니다.
  // dims: { x, y, z } (직육면체의 세 모서리 길이),  swap: 일부러 가로·세로를 바꿔 틀리게 만들 칸 키
  const AX = v => (v[0] ? 'x' : v[1] ? 'y' : 'z');
  function cuboidLayout(cells, dims, swap) {
    const F = fold(cells), set = new Set(cells.map(c => key(...c)));
    const size = k => {
      const Rt = T(F.rot.get(k));
      let wa = AX(apply(Rt, [1, 0, 0])), ha = AX(apply(Rt, [0, 1, 0]));
      if (k === swap) [wa, ha] = [ha, wa];
      return { wa, ha, w: dims[wa], h: dims[ha] };
    };
    const rects = new Map(), k0 = key(...cells[0]);
    rects.set(k0, { ...size(k0), x: 0, y: 0 });
    const q = [cells[0]];
    while (q.length) {
      const [cx, cy] = q.shift(), r = rects.get(key(cx, cy));
      for (const [dx, dy] of DIRS) {
        const k = key(cx + dx, cy + dy);
        if (!set.has(k) || rects.has(k)) continue;
        const s = size(k);
        const x = dx > 0 ? r.x + r.w : dx < 0 ? r.x - s.w : r.x;
        const y = dy > 0 ? r.y + r.h : dy < 0 ? r.y - s.h : r.y;
        rects.set(k, { ...s, x, y });
        q.push([cx + dx, cy + dy]);
      }
    }
    // 겹치는 면이 있으면 그릴 수 없는 배치
    const list = [...rects.values()];
    let overlap = false;
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (a.x < b.x + b.w - 1e-9 && b.x < a.x + a.w - 1e-9 && a.y < b.y + b.h - 1e-9 && b.y < a.y + a.h - 1e-9) overlap = true;
    }
    // 맞닿은 모서리 길이가 같은지
    let match = true;
    for (const [k, r] of rects) {
      const [cx, cy] = k.split(',').map(Number);
      const e = rects.get(key(cx + 1, cy)), s = rects.get(key(cx, cy + 1));
      if (e && e.h !== r.h) match = false;
      if (s && s.w !== r.w) match = false;
    }
    return { rects, overlap, match, fold: F, cells, set };
  }

  // 그림 그리기. o: { labels, hl:[칸키], dimLabels:true, ask:{seg,text}, points:{칸점키:글자}, maxW, maxH }
  function cuboidSvg(L, o = {}) {
    const list = [...L.rects.values()];
    const minX = Math.min(...list.map(r => r.x)), minY = Math.min(...list.map(r => r.y));
    const maxX = Math.max(...list.map(r => r.x + r.w)), maxY = Math.max(...list.map(r => r.y + r.h));
    const u = Math.min(34, 300 / (maxX - minX), 230 / (maxY - minY));
    const fs = Math.max(15, Math.max((maxX - minX) * u, (maxY - minY) * u) / 12);   // 그림이 작게 줄어도 읽히도록
    const pad = o.edgeTags || o.points ? fs * 2.4 : 6;
    const X = v => (v - minX) * u + pad, Y = v => (v - minY) * u + pad;
    const W = (maxX - minX) * u + pad * 2, H = (maxY - minY) * u + pad * 2;
    let out = '';
    for (const [k, r] of L.rects) {
      const hl = o.hl && o.hl.includes(k);
      out += `<rect x="${X(r.x)}" y="${Y(r.y)}" width="${r.w * u}" height="${r.h * u}" fill="${hl ? 'rgba(255,190,60,0.6)' : '#eef5ff'}"/>`;
      if (o.labels && o.labels[k]) out += `<text x="${X(r.x + r.w / 2)}" y="${Y(r.y + r.h / 2) + 8}" font-size="${Math.min(22, Math.min(r.w, r.h) * u * 0.55)}" text-anchor="middle" fill="#1d3557" font-family="HakgyoDung, sans-serif">${o.labels[k]}</text>`;
    }
    const edges = [];   // 바깥 모서리 (길이 표시용)
    for (const [k, r] of L.rects) {
      const [cx, cy] = k.split(',').map(Number);
      const sides = [
        [r.x, r.y, r.x + r.w, r.y, cx, cy - 1, r.wa, [0, -1]], [r.x, r.y + r.h, r.x + r.w, r.y + r.h, cx, cy + 1, r.wa, [0, 1]],
        [r.x, r.y, r.x, r.y + r.h, cx - 1, cy, r.ha, [-1, 0]], [r.x + r.w, r.y, r.x + r.w, r.y + r.h, cx + 1, cy, r.ha, [1, 0]],
      ];
      for (const [x1, y1, x2, y2, nx, ny, ax, n] of sides) {
        const inner = L.set.has(key(nx, ny));
        if (inner && (nx < cx || ny < cy)) continue;
        out += `<line x1="${X(x1)}" y1="${Y(y1)}" x2="${X(x2)}" y2="${Y(y2)}" stroke="#22304d" stroke-width="${inner ? 2 : 3}" ${inner ? 'stroke-dasharray="6 5"' : ''} stroke-linecap="round"/>`;
        if (!inner) edges.push({ x1, y1, x2, y2, ax, n, cell: k });
      }
    }
    const tag = (e, text, color) => {
      const mx = X((e.x1 + e.x2) / 2) + e.n[0] * fs * 1.2, my = Y((e.y1 + e.y2) / 2) + e.n[1] * fs * 0.95 + fs * 0.35;
      if (text === '□') {   // 모르는 길이: 빨간 네모 칸
        const b = fs * 1.25, cy = my - fs * 0.35;
        return `<rect x="${mx - b / 2}" y="${cy - b / 2}" width="${b}" height="${b}" rx="3" fill="#fff" stroke="${color}" stroke-width="3"/><text x="${mx}" y="${cy + fs * 0.35}" font-size="${fs}" text-anchor="middle" fill="${color}" font-family="HakgyoDung, sans-serif">?</text>`;
      }
      return `<text x="${mx}" y="${my}" font-size="${fs}" text-anchor="middle" fill="${color}" font-family="HakgyoSan, HakgyoDung, sans-serif" font-weight="bold">${text}</text>`;
    };
    if (o.edgeTags) {
      // 빨간 칸(모르는 길이)을 먼저 놓고, 다른 글자와 겹치는 길이 표시는 생략
      const placed = [];
      for (const t of [...o.edgeTags].sort((a, b) => (b.text === '□') - (a.text === '□'))) {
        const px = X((t.e.x1 + t.e.x2) / 2) + t.e.n[0] * fs * 1.2, py = Y((t.e.y1 + t.e.y2) / 2) + t.e.n[1] * fs * 0.95;
        if (placed.some(([qx, qy]) => Math.abs(qx - px) < fs * 2.6 && Math.abs(qy - py) < fs * 1.3)) continue;
        placed.push([px, py]);
        out += tag(t.e, t.text, t.color || '#1d3557');
      }
    }
    if (o.points) for (const [pk, t] of Object.entries(o.points)) {
      const [px, py] = pointPos(L, pk);
      out += `<circle cx="${X(px)}" cy="${Y(py)}" r="5" fill="#c2410c"/>`;
      const dx = X(px) - X((minX + maxX) / 2), dy = Y(py) - Y((minY + maxY) / 2), D = Math.hypot(dx, dy) || 1;
      out += `<text x="${X(px) + dx / D * fs}" y="${Y(py) + dy / D * fs + fs * 0.35}" font-size="${fs * 1.1}" font-weight="bold" text-anchor="middle" fill="#c2410c" font-family="HakgyoSan, HakgyoDung, sans-serif">${t}</text>`;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="width:${Math.min(o.maxW || 360, (o.maxH || 270) * W / H)}px;max-width:100%;height:auto">${out}</svg>`;
    return { svg, edges };
  }
  // 정육면체 전개도의 격자점(칸 모서리) → 직육면체 배치에서의 실제 위치
  function pointPos(L, pk) {
    const [gx, gy] = pk.split(',').map(Number);
    for (const [k, r] of L.rects) {
      const [cx, cy] = k.split(',').map(Number);
      if ((gx === cx || gx === cx + 1) && (gy === cy || gy === cy + 1)) return [gx === cx ? r.x : r.x + r.w, gy === cy ? r.y : r.y + r.h];
    }
    return [0, 0];
  }
  const isNet = cells => cells.length === 6 && fold(cells).ok;
  const opposite = f => f.split(',').map(n => -Number(n)).join(',');

  function randomNet() { for (;;) { const c = randomShape(6); if (isNet(c)) return c; } }
  function randomNonNet() { for (;;) { const c = randomShape(6); if (!isNet(c)) return c; } }

  // 칸 하나를 빼도 나머지가 이어져 있는지
  function connected(cells) {
    if (!cells.length) return true;
    const set = new Set(cells.map(c => key(...c))), seen = new Set([key(...cells[0])]), q = [cells[0]];
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of DIRS) { const k = key(x + dx, y + dy); if (set.has(k) && !seen.has(k)) { seen.add(k); q.push([x + dx, y + dy]); } }
    }
    return seen.size === cells.length;
  }

  // ---- 그림 (SVG) ----
  // o: { labels: {칸키: 글자}, hl: [칸키], cand: [칸키] (누를 수 있는 빈 칸), points: {점키: 글자}, unit }
  function svg(cells, o = {}) {
    const u = o.unit || 40, pad = 22;
    const set = new Set(cells.map(c => key(...c)));
    let all = cells.slice();
    if (o.cand) all = all.concat(o.cand.map(k => k.split(',').map(Number)));
    const xs = all.map(c => c[0]), ys = all.map(c => c[1]);
    const minX = Math.min(...xs), minY = Math.min(...ys), maxX = Math.max(...xs) + 1, maxY = Math.max(...ys) + 1;
    const X = x => (x - minX) * u + pad, Y = y => (y - minY) * u + pad;
    let out = '';
    for (const [x, y] of cells) {
      const k = key(x, y), hl = o.hl && o.hl.includes(k);
      out += `<rect x="${X(x)}" y="${Y(y)}" width="${u}" height="${u}" fill="${hl ? 'rgba(255,190,60,0.6)' : '#eef5ff'}"/>`;
      if (o.labels && o.labels[k]) out += `<text x="${X(x) + u / 2}" y="${Y(y) + u / 2 + 7}" font-size="${u * 0.45}" text-anchor="middle" fill="#1d3557" font-family="HakgyoDung, sans-serif">${o.labels[k]}</text>`;
    }
    // 모서리: 바깥(잘린 모서리)은 실선, 안쪽(접는 선)은 점선
    for (const [x, y] of cells) {
      const sides = [[x, y, x + 1, y, x, y - 1], [x, y + 1, x + 1, y + 1, x, y + 1], [x, y, x, y + 1, x - 1, y], [x + 1, y, x + 1, y + 1, x + 1, y]];
      for (const [x1, y1, x2, y2, nx, ny] of sides) {
        const inner = set.has(key(nx, ny));
        if (inner && (nx < x || ny < y)) continue;          // 안쪽 선은 한 번만
        out += `<line x1="${X(x1)}" y1="${Y(y1)}" x2="${X(x2)}" y2="${Y(y2)}" stroke="#22304d" stroke-width="${inner ? 2 : 3}" ${inner ? 'stroke-dasharray="6 5"' : ''} stroke-linecap="round"/>`;
      }
    }
    if (o.cand) for (const k of o.cand) {
      const [x, y] = k.split(',').map(Number);
      out += `<rect class="face-hit cand" data-face="${k}" x="${X(x) + 3}" y="${Y(y) + 3}" width="${u - 6}" height="${u - 6}" rx="4"/>`;
    }
    if (o.points) for (const [k, t] of Object.entries(o.points)) {
      const [x, y] = k.split(',').map(Number);
      out += `<circle cx="${X(x)}" cy="${Y(y)}" r="5" fill="#c2410c"/>`;
      const cx = X(x) - ((minX + maxX) / 2 - minX) * u - pad, cy = Y(y) - ((minY + maxY) / 2 - minY) * u - pad, L = Math.hypot(cx, cy) || 1;
      out += `<text x="${X(x) + cx / L * 15}" y="${Y(y) + cy / L * 15 + 7}" font-size="20" font-weight="bold" text-anchor="middle" fill="#c2410c" font-family="HakgyoSan, HakgyoDung, sans-serif">${t}</text>`;
    }
    const W = (maxX - minX) * u + pad * 2, H = (maxY - minY) * u + pad * 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="width:${Math.min(o.maxW || 340, (o.maxH || 260) * W / H)}px;max-width:100%;height:auto">${out}</svg>`;
  }

  return { key, randomShape, randomNet, randomNonNet, fold, isNet, opposite, connected, svg, DIRS, cuboidLayout, cuboidSvg };
})();
