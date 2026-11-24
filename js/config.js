// ===== 설정 =====
// API_URL: Apps Script 웹 앱 주소(…/exec). 비워 두면 "테스트 모드"로 동작합니다.
//          (테스트 모드에서는 이 기기 안에만 기록되고, 교사 비밀번호는 snow1234)
window.APP_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbyU36gQuwbWy4b8EJD0z0577j6PP6BPTsy_zc0QiD1q4bcnHFEzt5eHYmQShr-NYlCMiA/exec',
  QUIZ_INTERVAL: 25,   // 몇 초마다 문제가 나올지
  START_LIVES: 3,
  MAX_LIVES: 5,
};

// 차시 목록 (id는 구글 시트 [설정] 탭의 차시ID와 같아야 합니다)
window.LESSONS = [
  { id: '1', no: '1차시', title: '직육면체와 정육면체', sub: '면 · 모서리 · 꼭짓점', icon: '🧊', ready: true },
  { id: '2', no: '2차시', title: '직육면체의 겨냥도', sub: '보이는 선 · 보이지 않는 선', icon: '✏️', ready: true },
  { id: '3', no: '3차시', title: '직육면체의 성질', sub: '평행한 면 · 수직인 면', icon: '📐', ready: true },
  { id: '4', no: '4차시', title: '정육면체의 전개도', sub: '펼치고 접기', icon: '🎁', ready: true },
  { id: '5', no: '5차시', title: '직육면체의 전개도', sub: '맞닿는 모서리', icon: '📦', ready: true },
  { id: 'final', no: '단원 평가', title: '외계인 대장전', sub: '열린 차시 문제 모두 · 대왕 외계인 자주 등장', icon: '👑', ready: true },
];
