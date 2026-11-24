// ===== 기록 저장 (Apps Script 연결 / 테스트 모드) =====
// 연결이 실패해도 게임은 계속됩니다.
//  - 차시 열림 상태: 마지막으로 받아 온 값을 기기에 보관해 사용
//  - 점수: 기기에 임시 저장 → 다음에 자동으로 다시 보냄
const Store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 불가 환경 */ } },
};

const Api = (() => {
  const MOCK_PW = 'snow1234';
  const url = () => (window.APP_CONFIG.API_URL || '').trim();
  const isMock = () => !url();

  async function request(method, params, body) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    try {
      let res;
      if (method === 'GET') {
        const q = new URLSearchParams({ ...params, _: Date.now() }).toString();
        res = await fetch(url() + '?' + q, { signal: ctrl.signal });
      } else {
        // text/plain 으로 보내야 브라우저 사전 요청(CORS preflight)이 생기지 않습니다.
        res = await fetch(url(), {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(body),
          signal: ctrl.signal,
        });
      }
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || '서버 오류');
      return j;
    } finally {
      clearTimeout(timer);
    }
  }

  // ---------- 테스트 모드(기기 안 저장) ----------
  const mock = {
    settings() { return Store.get('mock_open', { '1': true }); },
    setOpen(lesson, open) { const s = mock.settings(); s[lesson] = open; Store.set('mock_open', s); },
    rows() { return Store.get('mock_rank', []); },
    addRow(r) { const rows = mock.rows(); if (!rows.some(x => x.id === r.id)) rows.push(r); Store.set('mock_rank', rows); },
    del(id) { Store.set('mock_rank', mock.rows().filter(r => r.id !== id)); },
  };

  function sortTop(rows, lesson, n) {
    return rows.filter(r => String(r.lesson) === String(lesson))
      .sort((a, b) => b.score - a.score || a.time.localeCompare(b.time))
      .slice(0, n);
  }

  // ---------- 공개 함수 ----------
  async function getSettings() {
    if (isMock()) return { open: mock.settings(), stale: false };
    try {
      const j = await request('GET', { action: 'settings' });
      Store.set('settings_cache', j.open);
      return { open: j.open, stale: false };
    } catch (e) {
      const cached = Store.get('settings_cache', null);
      return { open: cached || {}, stale: true, noCache: !cached };
    }
  }

  async function flushQueue() {
    const q = Store.get('score_queue', []);
    if (!q.length) return 0;
    const left = [];
    for (const rec of q) {
      try {
        if (isMock()) mock.addRow(rec);
        else await request('POST', null, { action: 'score', record: rec });
      } catch (e) { left.push(rec); }
    }
    Store.set('score_queue', left);
    return left.length;
  }

  async function submitScore(rec) {
    rec.id = rec.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
    rec.time = rec.time || new Date().toISOString();
    const q = Store.get('score_queue', []);
    q.push(rec);
    Store.set('score_queue', q);
    const left = await flushQueue();
    return { saved: left === 0, pending: left };
  }

  async function getRanking(lesson) {
    if (isMock()) return { rows: sortTop(mock.rows(), lesson, 20), stale: false };
    try {
      const j = await request('GET', { action: 'ranking', lesson });
      Store.set('rank_cache_' + lesson, j.rows);
      return { rows: j.rows, stale: false };
    } catch (e) {
      return { rows: Store.get('rank_cache_' + lesson, []), stale: true };
    }
  }

  // ---------- 교사용 ----------
  async function adminLogin(pw) {
    if (isMock()) { if (pw !== MOCK_PW) throw new Error('비밀번호가 달라요'); return true; }
    await request('POST', null, { action: 'login', password: pw });
    return true;
  }
  async function adminSetOpen(pw, lesson, open) {
    if (isMock()) { mock.setOpen(lesson, open); return; }
    await request('POST', null, { action: 'setOpen', password: pw, lesson, open });
  }
  async function adminDeleteScore(pw, id) {
    if (isMock()) { mock.del(id); return; }
    await request('POST', null, { action: 'deleteScore', password: pw, id });
  }
  async function adminStats(pw, lesson) {
    if (isMock()) {
      const rows = mock.rows().filter(r => String(r.lesson) === String(lesson));
      const agg = {};
      rows.forEach(r => (r.log || []).forEach(l => {
        agg[l.type] = agg[l.type] || { type: l.type, total: 0, correct: 0 };
        agg[l.type].total++; if (l.ok) agg[l.type].correct++;
      }));
      return { stats: Object.values(agg) };
    }
    return request('POST', null, { action: 'stats', password: pw, lesson });
  }

  return { isMock, getSettings, submitScore, flushQueue, getRanking, adminLogin, adminSetOpen, adminDeleteScore, adminStats, MOCK_PW };
})();
