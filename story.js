/* =========================================================
   story.js — 스토리 페이지 (#story)
   ---------------------------------------------------------
   · 사건 카드가 시간선을 따라 나열되고,
     카드를 누르면 그 사건의 글(소설 · 짧은 글)과 이미지를 읽는 화면이 열려요.
   · 내용은 data.js 의 [14] storyPage / stories (또는 편집기의 '스토리' 탭)에서 고쳐요.
   · 원본 밀키트 파일과 분리해 두었어요. index.html 의 PAGES.story 가 여기를 불러요.
   ========================================================= */
window.OC_STORY = (function () {

  /* ----- 본문 글 → 문단 -----
     · 줄마다 한 문단이 돼요. (빈 줄은 무시)
     · 한 줄에 ― / — / --- / *** / * 만 있으면 장면 전환 표시가 돼요.
     · <br>, <b> 같은 글자 꾸밈은 그대로 쓸 수 있어요. */
  const BREAK = /^\s*(―+|—+|-{3,}|\*{1,3}|·{3})\s*$/;
  function paragraphs(text) {
    const lines = String(text || "").replace(/\r/g, "").split("\n");
    let out = "";
    lines.forEach(function (l) {
      if (!l.trim()) return;
      if (BREAK.test(l)) { out += '<p class="sr-break" aria-hidden="true"><i></i><i></i><i></i></p>'; return; }
      out += "<p>" + l.trim() + "</p>";
    });
    return out;
  }
  const attr = function (t) { return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"); };
  const num2 = function (n) { return String(n).padStart(2, "0"); };
  /* 썸네일 자르기 (편집기 '보이는 영역') : addon.js 의 OC_CROP 를 같이 써요 */
  const crop = function (x) { return window.OC_CROP ? OC_CROP.attrs(x) : ""; };

  function mount(ctx) {
    const S = ctx.S || {};
    const P = S.storyPage || {};
    const list = (S.stories || []).filter(function (x) { return x && (x.title || x.summary || x.image || x.body); });
    const D = S.deco || {};
    const THEME = ctx.THEME || "#222222";
    const mix = ctx.mix;

    /* ----- 색 : 비워두면 대표 색에서 자동으로 ----- */
    document.body.classList.remove("st-reading");
    const set = function (k, v) { if (v) document.documentElement.style.setProperty(k, v); };
    set("--st-card", P.cardColor || (mix ? mix(THEME, "#0a0a0a", 0.7) : "#161616"));
    set("--st-reader", P.readerColor || (mix ? mix(THEME, "#070707", 0.86) : "#0e0e0e"));
    set("--st-point", P.pointColor || (mix ? mix(THEME, "#ffffff", 0.38) : "#bbbbbb"));
    set("--st-line", P.lineColor || "var(--deco)");
    set("--st-hover", P.hoverColor || (mix ? mix(THEME, "#ffffff", 0.16) : "#888888"));
    const op = parseFloat(P.cardOpacity);
    set("--st-alpha", (isFinite(op) ? Math.max(30, Math.min(100, op)) : 85) + "%");

    /* ----- 왼쪽 위 꾸밈 + 번호 ----- */
    document.getElementById("decoTopLeft").innerHTML =
      (D.badge ? '<span class="badge">' + D.badge + '</span>' : "") +
      '<span class="top-label">' + (P.label || "STORY") + '</span>' +
      '<span class="top-line"></span>';
    document.getElementById("stCount").textContent = list.length ? num2(list.length) + " RECORDS" : "";

    /* =====================================================
       목록 : 시간선 + 카드
       ===================================================== */
    const wrap = document.getElementById("stWrap");
    const head =
      '<header class="st-head">' +
        '<h2>' + (P.heading || "TIMELINE") + '</h2>' +
        (P.subText ? '<p>' + P.subText + '</p>' : "") +
      '</header>';

    if (!list.length) {
      wrap.innerHTML = head + '<p class="st-empty">' + (P.emptyText || "아직 등록된 이야기가 없어요.") + '</p>';
      return;
    }

    wrap.innerHTML = head +
      '<ol class="st-line">' + list.map(function (x, n) {
        return '<li class="st-item ' + (n % 2 ? "is-right" : "is-left") + '" style="--n:' + n + '">' +
          '<i class="st-dot" aria-hidden="true"></i>' +
          '<button class="st-card' + (x.image ? "" : " no-img") + '" type="button" data-n="' + n + '">' +
            (x.image ? '<span class="st-img"><img src="' + attr(x.image) + '" alt="" loading="lazy"' + crop(x) + '></span>' : "") +
            '<span class="st-body">' +
              (x.date ? '<span class="st-date">' + x.date + '</span>' : "") +
              '<span class="st-title">' + (x.title || "") + '</span>' +
              (x.summary ? '<span class="st-sum">' + x.summary + '</span>' : "") +
              '<span class="st-more">' + (P.readMore || "READ") + '<i></i></span>' +
            '</span>' +
          '</button>' +
        '</li>';
      }).join("") + '</ol>';

    const items = wrap.querySelectorAll(".st-item");

    /* 엇갈리게 놓기 (PC) : 다음 카드를 앞 카드 높이의 절반쯤 끌어올려요.
       같은 쪽 카드끼리는 절대 겹치지 않게, 카드 높이에 맞춰 매번 다시 계산해요. */
    const GAP = 36;
    const wide = window.matchMedia("(min-width: 769px)");
    function stagger() {
      const cards = wrap.querySelectorAll(".st-card");
      items.forEach(function (el, i) {
        if (!wide.matches || i === 0) { el.style.marginTop = ""; return; }
        const a = cards[i - 1].offsetHeight, b = cards[i].offsetHeight;
        el.style.marginTop = Math.round(GAP / 2 - Math.min(a, b) / 2) + "px";
      });
    }
    let tStag = 0;
    const restagger = function () { clearTimeout(tStag); tStag = setTimeout(stagger, 60); };
    stagger();
    wrap.querySelectorAll(".st-img img").forEach(function (im) { if (!im.complete) im.addEventListener("load", restagger); });
    if (window.OC_STORY && OC_STORY._resize) window.removeEventListener("resize", OC_STORY._resize);   /* 페이지를 다시 열어도 하나만 */
    window.addEventListener("resize", restagger);
    if (window.OC_STORY) OC_STORY._resize = restagger;
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(restagger);

    /* 스크롤하면 카드가 하나씩 떠올라요 */
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
      }, { threshold: 0.15 });
      items.forEach(function (el) { io.observe(el); });
    } else items.forEach(function (el) { el.classList.add("in"); });

    wrap.querySelectorAll(".st-card").forEach(function (b) {
      b.addEventListener("click", function () { open(+b.getAttribute("data-n")); });
    });
    /* 다른 페이지(갤러리)에서 '이야기 보기'로 넘어왔으면 그 이야기를 바로 펼쳐요 */
    if (window.OC_STORY_OPEN) {
      const want = String(window.OC_STORY_OPEN).trim();
      window.OC_STORY_OPEN = "";
      const at = list.findIndex(function (x) { return String(x.title || "").trim() === want; });
      if (at > -1) setTimeout(function () { open(at); }, 50);
    }

    /* =====================================================
       읽기 화면
       ===================================================== */
    const rd = document.getElementById("stRead");
    let cur = -1;

    function navBtn(i, dir) {
      const x = list[i];
      if (!x) return '<span class="sr-nav-btn off"></span>';
      return '<button class="sr-nav-btn ' + dir + '" type="button" data-n="' + i + '">' +
        '<small>' + (dir === "prev" ? (P.prevText || "PREV") : (P.nextText || "NEXT")) + '</small>' +
        '<b>' + (x.title || "") + '</b>' +
        (x.date ? '<em>' + x.date + '</em>' : "") +
      '</button>';
    }

    function render() {
      const x = list[cur];
      const g = (x.gallery || []).filter(function (y) { return y && y.image; });
      rd.innerHTML =
        '<div class="sr-bar">' +
          '<span class="sr-pos">' + num2(cur + 1) + ' / ' + num2(list.length) + '</span>' +
          '<button class="sr-close" type="button" aria-label="닫기">×</button>' +
        '</div>' +
        '<article class="sr-in">' +
          (x.image ? '<figure class="sr-hero"><img src="' + attr(x.image) + '" alt=""></figure>' : "") +
          '<header class="sr-head' + (x.image ? "" : " no-img") + '">' +
            (x.date ? '<span class="st-date">' + x.date + '</span>' : "") +
            '<h3>' + (x.title || "") + '</h3>' +
            (x.summary ? '<p class="sr-sum">' + x.summary + '</p>' : "") +
            (x.pov ? '<p class="sr-pov">' + x.pov + '</p>' : "") +
          '</header>' +
          (x.body
            ? '<div class="sr-text">' + paragraphs(x.body) + '</div>'
            : '<p class="sr-blank">' + (P.bodyEmpty || "아직 쓰이지 않은 이야기예요.") + '</p>') +
          (g.length
            ? '<section class="sr-gallery">' +
                '<h4>' + (P.galleryTitle || "GALLERY") + '</h4>' +
                '<div class="sr-shots">' + g.map(function (y, k) {
                  return '<button class="sr-shot" type="button" data-k="' + k + '">' +
                    '<img src="' + attr(y.image) + '" alt="" loading="lazy"' + crop(y) + '>' +
                    (y.caption ? '<em>' + y.caption + '</em>' : "") +
                  '</button>';
                }).join("") + '</div>' +
              '</section>'
            : "") +
          '<nav class="sr-nav">' + navBtn(cur - 1, "prev") + navBtn(cur + 1, "next") + '</nav>' +
        '</article>';

      rd.querySelector(".sr-close").addEventListener("click", close);
      rd.querySelectorAll(".sr-nav-btn[data-n]").forEach(function (b) {
        b.addEventListener("click", function () { open(+b.getAttribute("data-n")); });
      });
      rd.querySelectorAll(".sr-shot").forEach(function (b) {
        b.addEventListener("click", function () { openBox(g, +b.getAttribute("data-k")); });
      });
      rd.scrollTop = 0;
    }

    function open(i) {
      if (!list[i]) return;
      cur = i;
      render();
      rd.classList.remove("swap"); void rd.offsetWidth; rd.classList.add("swap");
      rd.classList.add("open");
      document.body.classList.add("st-reading");
    }
    function close() {
      rd.classList.remove("open");
      document.body.classList.remove("st-reading");
      const card = wrap.querySelector('.st-card[data-n="' + cur + '"]');
      if (card) card.focus({ preventScroll: true });
    }

    /* ----- 이미지 크게 보기 ----- */
    const box = document.getElementById("stBox");
    let boxList = [], boxN = 0;
    function showBox() {
      const y = boxList[boxN] || {};
      box.querySelector(".box-img").innerHTML = y.image ? '<img src="' + attr(y.image) + '" alt="">' : "";
      box.querySelector(".box-cap").innerHTML = (y.caption || "") + '<small>' + num2(boxN + 1) + ' / ' + num2(boxList.length) + '</small>';
      box.classList.toggle("single", boxList.length < 2);
    }
    function openBox(arr, n) { boxList = arr; boxN = n; showBox(); box.classList.add("open"); }
    function closeBox() { box.classList.remove("open"); }
    function moveBox(d) { boxN = (boxN + d + boxList.length) % boxList.length; showBox(); }
    box.addEventListener("click", function (e) { if (e.target === box || e.target.classList.contains("box-close")) closeBox(); });
    box.querySelector(".box-prev").addEventListener("click", function () { moveBox(-1); });
    box.querySelector(".box-next").addEventListener("click", function () { moveBox(1); });

    ctx.addKey(function (e) {
      if (box.classList.contains("open")) {
        if (e.key === "Escape") closeBox();
        if (e.key === "ArrowLeft") moveBox(-1);
        if (e.key === "ArrowRight") moveBox(1);
        return;
      }
      if (!rd.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft" && list[cur - 1]) open(cur - 1);
      if (e.key === "ArrowRight" && list[cur + 1]) open(cur + 1);
    });
  }

  return { mount: mount, paragraphs: paragraphs };
})();
