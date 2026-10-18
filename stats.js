/* =========================================================
   stats.js — 방문 통계 (숫자만 세요)
   ---------------------------------------------------------
   · 누가 왔는지(이름·IP 등)는 저장하지 않고, "몇 번"인지 숫자만 +1 해요.
   · 같은 기기에서 같은 날 같은 것을 여러 번 봐도 1번으로 세요.
     (새로고침을 반복해도 숫자가 부풀지 않게)
   · 저장 위치 : Firestore  stats / d2026-10-18  (하루에 문서 1개)
       v        방문자 (하루 1번)
       n        처음 온 사람 (이 기기에서 처음 들어온 날 1번)
       p_메뉴    메뉴 페이지 열람  (p_story, p_gallery …)
       s_코드    스토리 열람        sr_코드  스토리 끝까지 읽음
       g_코드    갤러리 그림 크게 보기
     코드 = 제목(또는 이미지 주소)으로 만든 짧은 글자. 편집기가 같은 방법으로 제목을 찾아요.
   · 편집기(#admin)에 로그인한 기기, 편집기 미리보기, 내 컴퓨터(localhost)는 세지 않아요.
   ========================================================= */
window.OC_STATS = (function () {
  var ROUTES = ["home", "character", "pair", "owner", "guest", "story", "gallery"];
  var KEY = "oc-stats-v1", ME = "oc-stats-me";

  /* 제목 → 짧은 코드 (편집기에서도 같은 함수로 계산해요) */
  function code(t) {
    t = String(t == null ? "" : t).trim();
    var h = 5381;
    for (var i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }
  /* 한국 시간 기준 날짜 2026-10-18 */
  function today() {
    var d = new Date(Date.now() + 9 * 3600e3);
    return d.toISOString().slice(0, 10);
  }

  function store(k, v) {
    try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; }
  }
  function off() {
    if (window.OC_STATS_DEBUG) return false;                 /* 테스트용 */
    if (/[?&]preview=1/.test(location.search)) return true;  /* 편집기 미리보기 */
    if (/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname) || location.protocol === "file:") return true;
    if (store(ME)) return true;                               /* 관리자 기기 */
    if (!window.SITE_FB || !window.SITE_FB.apiKey) return true;
    if (window.SITE && SITE.stats === false) return true;     /* data.js 에서 stats: false 면 끄기 */
    return false;
  }

  /* ---------- 오늘 이미 센 것 기억 (이 기기에만) ---------- */
  var day = today();
  var seen = store(KEY);
  if (!seen || seen.d !== day) seen = { d: day, k: {}, first: seen ? seen.first || seen.d : "" };

  /* ---------- Firestore 로 보내기 (한 번에 한 칸씩 +1) ---------- */
  var conn = null, queue = [];
  function db() {
    if (conn) return conn;
    var BASE = "https://www.gstatic.com/firebasejs/" + ((window.SITE && SITE.firebaseSdk) || "13.0.0") + "/";
    conn = Promise.all([import(BASE + "firebase-app.js"), import(BASE + "firebase-firestore.js")]).then(function (m) {
      var app = m[0].getApps().length ? m[0].getApps()[0] : m[0].initializeApp(window.SITE_FB);
      return { fs: m[1], db: m[1].getFirestore(app) };
    });
    return conn;
  }
  function send(k) {
    if (window.OC_STATS_DEBUG) { (window.OC_STATS_LOG = window.OC_STATS_LOG || []).push(k); return; }
    db().then(function (c) {
      var o = {}; o[k] = c.fs.increment(1);
      return c.fs.setDoc(c.fs.doc(c.db, "stats", "d" + day), o, { merge: true });
    }).catch(function () { /* 실패해도 사이트는 그대로 */ delete seen.k[k]; store(KEY, seen); });
  }
  var ready = false;
  function hit(k) {
    if (off() || seen.k[k]) return;
    seen.k[k] = 1; store(KEY, seen);
    if (ready) send(k); else queue.push(k);
  }

  /* ---------- 방문 · 메뉴 ---------- */
  function page() {
    if (/^#\/?(admin|setup)/.test(location.hash)) return;
    var r = location.hash.replace(/^#\/?/, "").split(/[/?&]/)[0];
    if (ROUTES.indexOf(r) < 0) r = "home";
    hit("p_" + r);
  }
  function start() {
    if (off()) return;
    if (!seen.first) { seen.first = day; hit("n"); }
    hit("v");
    page();
    /* 첫 화면이 다 뜬 뒤에 보내요 (사이트 속도에 영향 없게) */
    setTimeout(function () { ready = true; queue.splice(0).forEach(send); }, 1500);
  }
  window.addEventListener("hashchange", page);
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start);

  return {
    code: code,
    today: today,
    /* 스토리 열람 */
    story: function (title) { if (title) hit("s_" + code(title)); },
    /* 스토리 끝까지 읽음 */
    read: function (title) { if (title) hit("sr_" + code(title)); },
    /* 갤러리 그림 크게 보기 */
    art: function (x) { var t = x && (x.title || x.image); if (t) hit("g_" + code(t)); },
    /* 편집기 : 이 기기는 세지 않기 / 다시 세기 */
    me: function (v) {
      if (v === undefined) return !!store(ME);
      try { localStorage.setItem(ME, v ? "1" : "0"); } catch (e) {}
    },
    /* 편집기에 처음 로그인했을 때 : 따로 정한 적이 없으면 이 기기는 세지 않기로 */
    meDefault: function () { try { if (localStorage.getItem(ME) == null) localStorage.setItem(ME, "1"); } catch (e) {} }
  };
})();
