/* =========================================================
   gallery.js — 갤러리 페이지 (#gallery)
   ---------------------------------------------------------
   · 그림을 썸네일로 나열하고, AU 버튼으로 걸러 봐요.
   · 대표작(pin)은 맨 위에 크게, 가림(hide)은 흐리게 가려서 보여줘요.
   · 누르면 전체 이미지 + 제목 · 작가 · 날짜 · 캐릭터 · 코멘트가 나오는 상세 화면이 열려요.
     여러 장 묶음은 상세 화면에서 넘겨 봐요.
   · 내용은 data.js 의 [15] galleryPage / artworks (또는 편집기의 '갤러리' 탭)에서 고쳐요.
   ========================================================= */
window.OC_GALLERY = (function () {
  const attr = function (t) { return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"); };
  const num2 = function (n) { return String(n).padStart(2, "0"); };

  function mount(ctx) {
    const S = ctx.S || {};
    const P = S.galleryPage || {};
    const D = S.deco || {};
    const THEME = ctx.THEME || "#222222";
    const mix = ctx.mix;
    const ALL = P.allText || "ALL";
    const ratio = /^\d+(\.\d+)? \/ \d+(\.\d+)?$/.test(P.thumbRatio || "") ? P.thumbRatio : (P.thumbRatio === "auto" ? "auto" : "3 / 4");
    const protect = P.protect !== false;

    /* 묶음 : 대표 이미지 + 더 넣은 이미지 */
    const list = (S.artworks || []).filter(function (x) { return x && (x.image || x.title); }).map(function (x, i) {
      const imgs = [{ image: x.image || "", caption: "" }].concat((x.more || []).filter(function (m) { return m && m.image; }));
      return { x: x, i: i, imgs: imgs };
    });

    const set = function (k, v) { if (v) document.documentElement.style.setProperty(k, v); };
    set("--gl-viewer", P.viewerColor || (mix ? mix(THEME, "#060606", 0.88) : "#0c0c0c"));
    set("--gl-point", P.pointColor || (mix ? mix(THEME, "#ffffff", 0.38) : "#bbbbbb"));
    document.body.classList.remove("gl-viewing");

    document.getElementById("decoTopLeft").innerHTML =
      (D.badge ? '<span class="badge">' + D.badge + '</span>' : "") +
      '<span class="top-label">' + (P.label || "GALLERY") + '</span>' +
      '<span class="top-line"></span>';
    document.getElementById("glCount").textContent = list.length ? num2(list.length) + " WORKS" : "";

    const wrap = document.getElementById("glWrap");
    const page = document.querySelector(".gl-page");
    if (protect) page.classList.add("gl-protect");
    const head =
      '<header class="gl-head">' +
        '<h2>' + (P.heading || "GALLERY") + '</h2>' +
        (P.subText ? '<p>' + P.subText + '</p>' : "") +
      '</header>';
    if (!list.length) {
      wrap.innerHTML = head + '<p class="gl-empty">' + (P.emptyText || "아직 등록된 그림이 없어요.") + '</p>';
      return;
    }

    /* ----- AU 버튼 (그림에 적힌 AU 를 모아서 자동으로) ----- */
    const aus = [];
    list.forEach(function (o) { const a = (o.x.au || "").trim(); if (a && aus.indexOf(a) < 0) aus.push(a); });
    let au = "";

    /* 가림을 푼 그림 (이번 방문 동안 기억) */
    const shown = {};
    const veiled = function (o) { return !!o.x.hide && !shown[o.i]; };

    function thumb(o, big) {
      const x = o.x;
      const cut = ratio !== "auto" && window.OC_CROP ? OC_CROP.attrs(x) : "";
      const img = x.image
        ? '<img src="' + attr(x.image) + '" alt="" loading="lazy" draggable="false"' + cut + '>'
        : '<span class="gl-noimg">NO IMAGE</span>';
      return '<button class="gl-card' + (big ? " is-pick" : "") + (veiled(o) ? " is-veiled" : "") + '" type="button" data-i="' + o.i + '">' +
        '<span class="gl-thumb">' + img +
          (veiled(o) ? '<span class="gl-veil"><b>' + (x.hideText || P.hideText || "가려진 그림") + '</b><small>' + (P.revealText || "눌러서 보기") + '</small></span>' : "") +
          (o.imgs.length > 1 ? '<span class="gl-multi" title="여러 장">' + o.imgs.length + '</span>' : "") +
        '</span>' +
        '<span class="gl-meta">' +
          '<span class="gl-title">' + (x.title || "") + '</span>' +
          '<span class="gl-sub">' + [x.author, x.au].filter(Boolean).join(" · ") + '</span>' +
        '</span>' +
      '</button>';
    }

    function draw() {
      const vis = list.filter(function (o) { return !au || (o.x.au || "").trim() === au; });
      const picks = vis.filter(function (o) { return o.x.pin; });
      const rest = vis.filter(function (o) { return !o.x.pin; });
      wrap.innerHTML = head +
        (aus.length > 1
          ? '<nav class="gl-filter">' + [""].concat(aus).map(function (a) {
              return '<button type="button" class="' + (a === au ? "on" : "") + '" data-au="' + attr(a) + '">' + (a || ALL) + '</button>';
            }).join("") + '</nav>'
          : "") +
        (picks.length ? '<section class="gl-picks"><h3>' + (P.pickTitle || "PICK") + '</h3><div class="gl-pick-row n' + Math.min(picks.length, 3) + '">' + picks.map(function (o) { return thumb(o, true); }).join("") + '</div></section>' : "") +
        (rest.length ? '<div class="gl-grid' + (ratio === "auto" ? " is-auto" : "") + '" style="--gl-r:' + (ratio === "auto" ? "auto" : ratio) + '">' + rest.map(function (o) { return thumb(o); }).join("") + '</div>' : "") +
        (!vis.length ? '<p class="gl-empty">' + (P.emptyText || "아직 등록된 그림이 없어요.") + '</p>' : "");

      wrap.querySelectorAll(".gl-filter button").forEach(function (b) {
        b.addEventListener("click", function () { au = b.getAttribute("data-au"); draw(); });
      });
      order = picks.concat(rest);
      wrap.querySelectorAll(".gl-card").forEach(function (b) {
        b.addEventListener("click", function () { open(+b.getAttribute("data-i"), 0); });
      });
    }
    let order = [];
    draw();

    /* =====================================================
       상세 보기
       ===================================================== */
    const vw = document.getElementById("glView");
    let cur = null, k = 0;

    function info(x) {
      const rows = [
        [P.authorLabel || "작가", x.author],
        [P.dateLabel || "날짜", x.date],
        [P.charLabel || "캐릭터", x.chars]
      ].filter(function (r) { return r[1]; });
      const st = (x.story || "").trim();
      return '<aside class="gv-info">' +
        (x.au ? '<span class="gv-au">' + x.au + '</span>' : "") +
        '<h3>' + (x.title || "") + '</h3>' +
        (rows.length ? '<dl>' + rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join("") + '</dl>' : "") +
        (x.comment ? '<p class="gv-comment">' + String(x.comment).replace(/\n/g, "<br>") + '</p>' : "") +
        (st ? '<button class="gv-story" type="button">' + (P.storyButton || "이야기 보기") + '<b>' + st + '</b><i></i></button>' : "") +
      '</aside>';
    }

    function render() {
      const o = cur, x = o.x, im = o.imgs[k] || {};
      const hidden = veiled(o);
      const pos = order.indexOf(o);
      vw.innerHTML =
        '<div class="gv-bar">' +
          '<span class="gv-pos">' + num2(pos + 1) + ' / ' + num2(order.length) + '</span>' +
          '<button class="gv-close" type="button" aria-label="닫기">×</button>' +
        '</div>' +
        '<div class="gv-in">' +
          '<div class="gv-stage">' +
            '<button class="gv-arrow prev" type="button" aria-label="이전"><i></i></button>' +
            '<figure class="gv-fig' + (hidden ? " is-veiled" : "") + '">' +
              (im.image ? '<img class="gv-img" src="' + attr(im.image) + '" alt="" draggable="false">' : '<span class="gl-noimg">NO IMAGE</span>') +
              (hidden ? '<button class="gv-reveal" type="button"><b>' + (x.hideText || P.hideText || "가려진 그림") + '</b><small>' + (P.revealText || "눌러서 보기") + '</small></button>' : "") +
              (im.caption ? '<figcaption>' + im.caption + '</figcaption>' : "") +
            '</figure>' +
            '<button class="gv-arrow next" type="button" aria-label="다음"><i></i></button>' +
          '</div>' +
          (o.imgs.length > 1
            ? '<div class="gv-strip">' + o.imgs.map(function (m, n) {
                return '<button type="button" class="' + (n === k ? "on" : "") + '" data-k="' + n + '">' +
                  (m.image ? '<img src="' + attr(m.image) + '" alt="" draggable="false">' : "") + '</button>';
              }).join("") + '<span class="gv-sub">' + (k + 1) + ' / ' + o.imgs.length + '</span></div>'
            : "") +
          info(x) +
        '</div>';

      vw.classList.toggle("has-strip", o.imgs.length > 1);
      vw.querySelector(".gv-close").addEventListener("click", close);
      vw.querySelector(".gv-arrow.prev").addEventListener("click", function () { step(-1); });
      vw.querySelector(".gv-arrow.next").addEventListener("click", function () { step(1); });
      const rv = vw.querySelector(".gv-reveal");
      if (rv) rv.addEventListener("click", function () { shown[o.i] = true; render(); draw(); });
      const img = vw.querySelector(".gv-img");
      if (img && !hidden) img.addEventListener("click", function () { vw.classList.toggle("is-zoom"); });
      vw.querySelectorAll(".gv-strip button").forEach(function (b) {
        b.addEventListener("click", function () { k = +b.getAttribute("data-k"); vw.classList.remove("is-zoom"); render(); });
      });
      const sb = vw.querySelector(".gv-story");
      if (sb) sb.addEventListener("click", function () {
        window.OC_STORY_OPEN = (x.story || "").trim();   /* 스토리 페이지가 열리면 그 이야기를 바로 펼쳐요 (story.js) */
        location.hash = "#story";
      });
    }

    function open(i, start) {
      cur = list.filter(function (o) { return o.i === i; })[0];
      if (!cur) return;
      k = start === "last" ? cur.imgs.length - 1 : (start || 0);
      vw.classList.remove("is-zoom");
      render();
      vw.classList.remove("swap"); void vw.offsetWidth; vw.classList.add("swap");
      vw.classList.add("open");
      document.body.classList.add("gl-viewing");
    }
    /* 묶음 안에서 먼저 넘기고, 끝이면 다음(이전) 그림으로 */
    function step(d) {
      if (!cur) return;
      if (k + d >= 0 && k + d < cur.imgs.length) { k += d; vw.classList.remove("is-zoom"); render(); return; }
      const p = order.indexOf(cur);
      const nx = order[(p + d + order.length) % order.length];
      if (nx) open(nx.i, d < 0 ? "last" : 0);
    }
    function close() {
      vw.classList.remove("open", "is-zoom");
      document.body.classList.remove("gl-viewing");
      const card = wrap.querySelector('.gl-card[data-i="' + (cur && cur.i) + '"]');
      if (card) card.focus({ preventScroll: true });
    }
    vw.addEventListener("click", function (e) { if (e.target === vw || e.target.classList.contains("gv-in") || e.target.classList.contains("gv-stage")) close(); });

    /* 저장 방지 : 오른쪽 클릭 · 끌어서 저장 막기 (완벽하게 막을 수는 없어요) */
    if (protect) {
      [page, vw].forEach(function (el) {
        el.addEventListener("contextmenu", function (e) { if (e.target.tagName === "IMG") e.preventDefault(); });
        el.addEventListener("dragstart", function (e) { if (e.target.tagName === "IMG") e.preventDefault(); });
      });
      vw.classList.add("gl-protect");
    }

    ctx.addKey(function (e) {
      if (!vw.classList.contains("open")) return;
      if (e.key === "Escape") { if (vw.classList.contains("is-zoom")) vw.classList.remove("is-zoom"); else close(); }
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    });
  }

  return { mount: mount };
})();
