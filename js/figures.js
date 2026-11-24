// ===== 문제 그림 (SVG) =====
const Fig = (() => {
  const INK = '#22304d', HL = '#ff4d6d', HL_FILL = 'rgba(255,190,60,0.55)';

  // 직육면체 겨냥도. a: 가로, h: 높이, d: 깊이 (단위 길이)
  // 꼭짓점 번호 i = x비트 + 2*y비트 + 4*z비트  (안 보이는 꼭짓점: 4번 = 왼쪽 아래 뒤)
  function boxPoints(a, h, d, u) {
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const x = (i & 1) ? a : 0, y = (i & 2) ? h : 0, z = (i & 4) ? d : 0;
      pts.push([(x + z * 0.5) * u, -(y + z * 0.4) * u]);
    }
    return pts;
  }
  const EDGES = [];
  for (let i = 0; i < 8; i++) for (const b of [1, 2, 4]) if (!(i & b)) EDGES.push([i, i | b]);
  const HIDDEN_V = 4;
  const FACES = {
    front: [0, 1, 3, 2], back: [4, 5, 7, 6], bottom: [0, 1, 5, 4],
    top: [2, 3, 7, 6], left: [0, 2, 6, 4], right: [1, 3, 7, 5],
  };

  // 꼭짓점 이름 (교과서 방식: 윗면 ㄱㄴㄷㄹ, 그 아래 ㅁㅂㅅㅇ)
  const VNAME = { 6: 'ㄱ', 2: 'ㄴ', 3: 'ㄷ', 7: 'ㄹ', 4: 'ㅁ', 0: 'ㅂ', 1: 'ㅅ', 5: 'ㅇ' };
  // 면 이름 (꼭짓점을 차례로 이은 순서)
  const FACE_V = { top: [6, 2, 3, 7], bottom: [4, 0, 1, 5], front: [2, 3, 1, 0], back: [6, 7, 5, 4], left: [6, 2, 0, 4], right: [3, 7, 5, 1] };
  const faceName = f => '면 ' + FACE_V[f].map(i => VNAME[i]).join('');
  const OPP = { top: 'bottom', bottom: 'top', front: 'back', back: 'front', left: 'right', right: 'left' };

  function wrap(inner, minX, minY, maxX, maxY, pad, maxW, maxH) {
    const w = maxX - minX + pad * 2, h = maxY - minY + pad * 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX - pad} ${minY - pad} ${w} ${h}" style="width:100%;max-width:${maxW || 260}px;max-height:${maxH || 200}px">${inner}</svg>`;
  }

  // o: {a,h,d,unit, face, edge:[i,j], vertex:i, labels:{a,h,d}(문자열), color}
  function box(o) {
    const u = o.unit || 30;
    const P = boxPoints(o.a, o.h, o.d, u);
    let out = '';
    if (o.color) for (const f of ['front', 'top', 'right']) out += `<polygon points="${FACES[f].map(i => P[i].join(',')).join(' ')}" fill="${o.color}" opacity="${f === 'front' ? 0.55 : f === 'top' ? 0.35 : 0.7}"/>`;
    if (o.face) out += `<polygon points="${FACES[o.face].map(i => P[i].join(',')).join(' ')}" fill="${HL_FILL}"/>`;
    EDGES.forEach(([i, j], n) => {
      const hidden = i === HIDDEN_V || j === HIDDEN_V;
      // o.style: 모서리 번호 → 'solid' | 'dash' | 'none'  (일부러 틀린 겨냥도 만들 때)
      const st = (o.style && o.style[n]) || (hidden ? 'dash' : 'solid');
      if (st === 'none') return;
      const isHl = o.edge && ((o.edge[0] === i && o.edge[1] === j) || (o.edge[0] === j && o.edge[1] === i));
      out += `<line x1="${P[i][0]}" y1="${P[i][1]}" x2="${P[j][0]}" y2="${P[j][1]}" stroke="${isHl ? HL : INK}" stroke-width="${isHl ? 6 : 2.5}" ${st === 'dash' ? 'stroke-dasharray="6 5"' : ''} stroke-linecap="round"/>`;
    });
    if (o.tap) for (const f of ['front', 'top', 'right']) out += `<polygon class="face-hit" data-face="${f}" points="${FACES[f].map(i => P[i].join(',')).join(' ')}"/>`;
    if (o.vlabels) {
      for (let i = 0; i < 8; i++) {
        const xb = i & 1, yb = i & 2, zb = i & 4;
        let dx = (xb ? 1 : -1) + (zb ? 0.6 : -0.6), dy = (yb ? -1 : 1) + (zb ? -0.5 : 0.5);
        if (i === 3) { dx = -0.8; dy = 0.9; }      // 앞면 오른쪽 위: 앞면 안쪽에
        if (i === 4) { dx = 0.8; dy = -0.7; }      // 보이지 않는 꼭짓점: 점선 사이에
        const L = Math.hypot(dx, dy) || 1;
        out += `<text x="${P[i][0] + dx / L * 17}" y="${P[i][1] + dy / L * 17 + 7}" font-size="21" font-weight="bold" fill="#c2410c" text-anchor="middle" font-family="HakgyoSan, HakgyoDung, sans-serif" pointer-events="none">${VNAME[i]}</text>`;
      }
    }
    if (o.vertex != null) out += `<circle cx="${P[o.vertex][0]}" cy="${P[o.vertex][1]}" r="7" fill="${HL}"/>`;
    if (o.labels) {
      const t = (x, y, s, anc) => `<text x="${x}" y="${y}" font-size="17" fill="#1d3557" text-anchor="${anc || 'middle'}" font-family="HakgyoDung, sans-serif">${s}</text>`;
      if (o.labels.a) out += t((P[0][0] + P[1][0]) / 2, P[0][1] + 20, o.labels.a);
      if (o.labels.h) out += t(P[0][0] - 8, (P[0][1] + P[2][1]) / 2 + 5, o.labels.h, 'end');
      if (o.labels.d) out += t((P[1][0] + P[5][0]) / 2 + 10, (P[1][1] + P[5][1]) / 2 + 16, o.labels.d, 'start');
    }
    const xs = P.map(p => p[0]), ys = P.map(p => p[1]);
    const lp = o.vlabels ? 18 : 0;
    return wrap(out, Math.min(...xs) - (o.labels ? 40 : 0) - lp, Math.min(...ys) - lp, Math.max(...xs) + (o.labels ? 40 : 0) + lp, Math.max(...ys) + (o.labels ? 22 : 0) + lp, 12, o.maxW, o.maxH || (o.vlabels ? 250 : 200));
  }

  // 직육면체가 아닌 입체도형
  function triPrism() {
    const u = 30, a = 3.2, h = 2.4, d = 2.6;
    const F = [[0, 0], [a * u, 0], [a * u / 2, -h * u]];
    const off = [d * 0.5 * u, -d * 0.4 * u];
    const B = F.map(p => [p[0] + off[0], p[1] + off[1]]);
    const L = (p, q, dash) => `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="${INK}" stroke-width="2.5" ${dash ? 'stroke-dasharray="6 5"' : ''}/>`;
    const inner = L(F[0], F[1]) + L(F[1], F[2]) + L(F[2], F[0]) + L(B[1], B[2]) + L(B[0], B[1], 1) + L(B[0], B[2], 1) + L(F[0], B[0], 1) + L(F[1], B[1]) + L(F[2], B[2]);
    const xs = [...F, ...B].map(p => p[0]), ys = [...F, ...B].map(p => p[1]);
    return wrap(inner, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), 12);
  }
  function cylinder() {
    const inner = `<ellipse cx="60" cy="20" rx="45" ry="14" fill="none" stroke="${INK}" stroke-width="2.5"/>
      <path d="M15 110 A45 14 0 0 0 105 110" fill="none" stroke="${INK}" stroke-width="2.5"/>
      <path d="M15 110 A45 14 0 0 1 105 110" fill="none" stroke="${INK}" stroke-width="2.5" stroke-dasharray="6 5"/>
      <line x1="15" y1="20" x2="15" y2="110" stroke="${INK}" stroke-width="2.5"/><line x1="105" y1="20" x2="105" y2="110" stroke="${INK}" stroke-width="2.5"/>`;
    return wrap(inner, 15, 6, 105, 124, 12);
  }
  function pyramid() {
    const u = 30, a = 3, d = 3;
    const b = [[0, 0], [a * u, 0], [a * u + d * 0.5 * u, -d * 0.4 * u], [d * 0.5 * u, -d * 0.4 * u]];
    const top = [(a * u + d * 0.5 * u) / 2, -110];
    const L = (p, q, dash) => `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="${INK}" stroke-width="2.5" ${dash ? 'stroke-dasharray="6 5"' : ''}/>`;
    const inner = L(b[0], b[1]) + L(b[1], b[2]) + L(b[2], b[3], 1) + L(b[3], b[0], 1) + L(b[0], top) + L(b[1], top) + L(b[2], top) + L(b[3], top, 1);
    return wrap(inner, 0, -110, b[2][0], 0, 12);
  }
  // 앞면이 사다리꼴인 기둥 (직육면체처럼 보이지만 아님)
  function trapPrism() {
    const u = 30, d = 2.4;
    const F = [[0, 0], [3.6 * u, 0], [2.8 * u, -2.2 * u], [0.8 * u, -2.2 * u]];
    const off = [d * 0.5 * u, -d * 0.4 * u];
    const B = F.map(p => [p[0] + off[0], p[1] + off[1]]);
    const L = (p, q, dash) => `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="${INK}" stroke-width="2.5" ${dash ? 'stroke-dasharray="6 5"' : ''}/>`;
    let inner = '';
    for (let i = 0; i < 4; i++) inner += L(F[i], F[(i + 1) % 4]);
    inner += L(B[1], B[2]) + L(B[2], B[3]) + L(B[0], B[1], 1) + L(B[3], B[0], 1);
    inner += L(F[0], B[0], 1) + L(F[1], B[1]) + L(F[2], B[2]) + L(F[3], B[3]);
    const xs = [...F, ...B].map(p => p[0]), ys = [...F, ...B].map(p => p[1]);
    return wrap(inner, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), 12);
  }

  return { box, triPrism, cylinder, pyramid, trapPrism, EDGES, FACES, faceName, OPP, VNAME };
})();
