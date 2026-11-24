/**
 * 눈뭉치 수학 대작전 - 기록 저장용 Apps Script
 * 구글 시트에서 [확장 프로그램] → [Apps Script]에 이 코드를 통째로 붙여 넣으세요.
 *
 * 1) 아래 ADMIN_PASSWORD를 원하는 비밀번호로 바꾸세요. (학생에게 보이지 않아요)
 * 2) 위쪽 함수 선택에서 setup 을 고르고 [실행] → 권한 허용  (시트 탭 3개가 만들어져요)
 * 3) [배포] → [새 배포] → 유형: 웹 앱
 *      - 실행 사용자: 나
 *      - 액세스 권한: 모든 사용자   ← 꼭 이것으로!
 * 4) 나온 웹 앱 주소(…/exec)를 게임의 js/config.js 의 API_URL 에 넣으세요.
 */
const ADMIN_PASSWORD = '여기에-비밀번호';

const LESSON_IDS = ['1', '2', '3', '4', '5', 'final'];
const LESSON_NAMES = ['직육면체와 정육면체', '직육면체의 겨냥도', '직육면체의 성질', '정육면체의 전개도', '직육면체의 전개도', '단원 평가'];
const SH_SET = '설정', SH_RANK = '랭킹', SH_LOG = '기록';

function setup() {
  const ss = SpreadsheetApp.getActive();
  let s = ss.getSheetByName(SH_SET) || ss.insertSheet(SH_SET);
  if (s.getLastRow() === 0) {
    s.appendRow(['차시ID', '차시 이름', '열림']);
    LESSON_IDS.forEach((id, i) => s.appendRow([id, LESSON_NAMES[i], id === '1']));
    s.getRange('A:A').setNumberFormat('@');
  }
  s = ss.getSheetByName(SH_RANK) || ss.insertSheet(SH_RANK);
  if (s.getLastRow() === 0) s.appendRow(['기록ID', '시간', '이름', '차시', '점수', '난이도', '맞힌 문제', '푼 문제', '버틴 시간(초)']);
  s = ss.getSheetByName(SH_LOG) || ss.insertSheet(SH_LOG);
  if (s.getLastRow() === 0) s.appendRow(['시간', '기록ID', '이름', '차시', '문제 유형', '정답 여부']);
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function sheet_(name) {
  const s = SpreadsheetApp.getActive().getSheetByName(name);
  if (!s) throw new Error('시트 탭 "' + name + '"이 없어요. setup 을 먼저 실행하세요.');
  return s;
}
function checkPw_(pw) {
  if (String(pw) !== ADMIN_PASSWORD) throw new Error('비밀번호가 달라요');
}

function getOpen_() {
  const rows = sheet_(SH_SET).getDataRange().getValues().slice(1);
  const open = {};
  rows.forEach(r => { open[String(r[0])] = r[2] === true || String(r[2]).toUpperCase() === 'TRUE'; });
  return open;
}

function getRanking_(lesson) {
  const rows = sheet_(SH_RANK).getDataRange().getValues().slice(1)
    .filter(r => String(r[3]) === String(lesson))
    .map(r => ({ id: String(r[0]), time: r[1] instanceof Date ? r[1].toISOString() : String(r[1]), name: String(r[2]), lesson: String(r[3]),
      score: Number(r[4]), wave: Number(r[5]), correct: Number(r[6]), total: Number(r[7]) }));
  rows.sort((a, b) => b.score - a.score || a.time.localeCompare(b.time));
  return rows.slice(0, 20);
}

function doGet(e) {
  try {
    const a = e.parameter.action;
    if (a === 'settings') return out_({ ok: true, open: getOpen_() });
    if (a === 'ranking') return out_({ ok: true, rows: getRanking_(e.parameter.lesson) });
    if (a === 'ping') return out_({ ok: true });
    return out_({ ok: false, error: '알 수 없는 요청' });
  } catch (err) {
    return out_({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const b = JSON.parse(e.postData.contents);
    lock.waitLock(15000);

    if (b.action === 'score') {
      const r = b.record || {};
      const name = String(r.name || '').slice(0, 14).trim();
      const score = Number(r.score);
      if (!name || LESSON_IDS.indexOf(String(r.lesson)) < 0 || !(score >= 0 && score <= 200000)) throw new Error('잘못된 기록');
      const rank = sheet_(SH_RANK);
      // 같은 기록이 두 번 들어오지 않게
      if (rank.getRange('A:A').createTextFinder(String(r.id)).matchEntireCell(true).findNext()) return out_({ ok: true, dup: true });
      const now = new Date();
      rank.appendRow([String(r.id), now, name, String(r.lesson), score, Number(r.wave) || 0, Number(r.correct) || 0, Number(r.total) || 0, Number(r.seconds) || 0]);
      const logs = (r.log || []).slice(0, 300).map(l => [now, String(r.id), name, String(r.lesson), String(l.type).slice(0, 40), l.ok ? 'O' : 'X']);
      if (logs.length) sheet_(SH_LOG).getRange(sheet_(SH_LOG).getLastRow() + 1, 1, logs.length, 6).setValues(logs);
      return out_({ ok: true });
    }

    checkPw_(b.password);
    if (b.action === 'login') return out_({ ok: true });

    if (b.action === 'setOpen') {
      const s = sheet_(SH_SET);
      const ids = s.getRange(2, 1, Math.max(1, s.getLastRow() - 1), 1).getValues().map(r => String(r[0]));
      const i = ids.indexOf(String(b.lesson));
      if (i < 0) s.appendRow([String(b.lesson), '', !!b.open]);
      else s.getRange(i + 2, 3).setValue(!!b.open);
      return out_({ ok: true });
    }

    if (b.action === 'deleteScore') {
      const s = sheet_(SH_RANK);
      const cell = s.getRange('A:A').createTextFinder(String(b.id)).matchEntireCell(true).findNext();
      if (cell) s.deleteRow(cell.getRow());
      return out_({ ok: true });
    }

    if (b.action === 'stats') {
      const rows = sheet_(SH_LOG).getDataRange().getValues().slice(1).filter(r => String(r[3]) === String(b.lesson));
      const agg = {};
      rows.forEach(r => {
        const t = String(r[4]);
        agg[t] = agg[t] || { type: t, total: 0, correct: 0 };
        agg[t].total++; if (r[5] === 'O') agg[t].correct++;
      });
      return out_({ ok: true, stats: Object.keys(agg).map(k => agg[k]) });
    }

    return out_({ ok: false, error: '알 수 없는 요청' });
  } catch (err) {
    return out_({ ok: false, error: String(err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (x) { }
  }
}
