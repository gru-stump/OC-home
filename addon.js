/* =========================================================
   addon.js — 원본 밀키트에 새로 더한 기능 (작은 도우미)
   ========================================================= */

/* ---------- 갤러리 이미지 자르기 ----------
   편집기에서 정한 값으로 썸네일만 정사각형으로 잘라 보여줘요. (크게 보기는 원본 전체)
   · pos  : 보이는 위치 "가로% 세로%"  (예: "50% 20%")
   · zoom : 확대 배율 1 ~ 5  (1이면 확대 없음)
   원본 이미지 파일은 그대로 두고, 화면에서만 잘라 보여줘요.
   ----------------------------------------- */
window.OC_CROP = (function () {
  var POS = /^\d{1,3}% \d{1,3}%$/;
  function pos(g) { return g && POS.test(g.pos || "") ? g.pos : ""; }
  function zoom(g) {
    var z = parseFloat(g && g.zoom);
    return isFinite(z) && z > 1 ? Math.min(5, z) : 1;
  }
  return {
    /* 편집기에서 한 번이라도 맞췄는지 */
    has: function (g) { return !!pos(g) || zoom(g) > 1; },
    /* <img> 에 붙일 class + style */
    attrs: function (g) {
      if (!this.has(g)) return "";
      return ' class="oc-crop" style="--p:' + (pos(g) || "50% 50%") + ';--z:' + zoom(g) + '"';
    },
    /* 크게 보기 : 자르기와 상관없이 항상 원본 전체 */
    big: function (g) {
      return '<img src="' + g.image + '" alt="">';
    }
  };
})();

/* ---------- 캐릭터 이미지 카드 : 앞면 이미지가 비었을 때 ----------
   종류가 '직접 만든 카드 · 캐릭터 이미지'인데 앞면 이미지 칸이 비어 있고
   '이미지' 칸에 그림이 있으면, 그 그림을 앞면으로 써요.
   (화면에서만 채워요. 저장된 내용은 바뀌지 않아요.)
   ----------------------------------------- */
window.OC_CARD = {
  fillFront: function (c) {
    if (c && c.type === "custom" && !c.customFront && c.image) c.customFront = c.image;
    return c;
  },
  /* 카드 크기 : 편집기의 '카드 크기 (%)' → 0.3 ~ 1  (비우면 100% = 화면이 허락하는 최대) */
  size: function (c) {
    var n = parseFloat(c && c.customSize);
    return isFinite(n) && n > 0 ? Math.max(30, Math.min(100, n)) / 100 : 1;
  }
};

/* ---------- SD 이미지 위치 · 크기 ----------
   · sdPos : 위치  rb 오른쪽 아래(기본) / lb 왼쪽 아래 / rt 오른쪽 위 / lt 왼쪽 위
   · sdX   : 가로 미세조정 (px, + 오른쪽 / − 왼쪽)
   · sdY   : 세로 미세조정 (px, + 아래 / − 위)
   캐릭터(또는 오너)에 적은 값 → 없으면 캐릭터 페이지 설정 값 → 없으면 기본
   ----------------------------------------- */
window.OC_SD = (function () {
  function pick(o, P, k) {
    var v = o && o[k];
    if (v === "" || v == null) v = P && P[k];
    return v;
  }
  function num(v) { v = parseFloat(v); return isFinite(v) ? Math.max(-400, Math.min(400, v)) : 0; }
  return {
    cls: function (o, P) {
      var p = pick(o, P, "sdPos");
      return /^(lb|rt|lt)$/.test(p || "") ? " sd-" + p : "";
    },
    vars: function (o, P) {
      var x = pick(o, P, "sdX"), y = pick(o, P, "sdY");
      return ";--sd-x:" + num(x) + "px;--sd-y:" + num(y) + "px";
    }
  };
})();

/* ---------- 카드 뒤집기 안내 (디자인 말풍선) ----------
   브라우저 기본 말풍선(title) 대신, 사이트 디자인에 맞춘 안내를 보여줘요.
   · 마우스 : 카드 위에 올리면 커서를 부드럽게 따라다니는 알약 모양 안내
   · 휴대폰 : 카드 아래 작은 'TAP TO FLIP' 표시 (한 번 뒤집으면 사라짐)
   · 글자 : 캐릭터 페이지 설정의 flipText / flipBackText / flipTapText (비우면 기본)
   ----------------------------------------- */
window.OC_FLIPTIP = (function () {
  var tip = null, label = null, raf = 0, on = false;
  var x = 0, y = 0, tx = 0, ty = 0, texts = {};
  var ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.7M20 4v4.7h-4.7M20 12a8 8 0 0 1-13.7 5.6L4 15.3M4 20v-4.7h4.7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function make() {
    if (tip) return;
    tip = document.createElement("div");
    tip.className = "oc-fliptip";
    tip.setAttribute("aria-hidden", "true");
    tip.innerHTML = '<i class="oc-fliptip-ic">' + ICON + '</i><b></b>';
    label = tip.querySelector("b");
    document.body.appendChild(tip);
  }
  function text() {
    return document.body.classList.contains("is-flipped")
      ? (texts.back || "FLIP BACK") : (texts.front || "CLICK TO FLIP");
  }
  function loop() {
    /* 커서보다 살짝 늦게, 부드럽게 따라오기 */
    x += (tx - x) * 0.28; y += (ty - y) * 0.28;
    tip.style.translate = Math.round(x) + "px " + Math.round(y) + "px";
    if (on && (Math.abs(tx - x) > .4 || Math.abs(ty - y) > .4)) raf = requestAnimationFrame(loop);
    else raf = 0;
  }
  function aim(e) {
    var w = tip.offsetWidth || 150, h = tip.offsetHeight || 34;
    tx = Math.min(e.clientX + 18, window.innerWidth - w - 8);
    ty = Math.min(e.clientY + 22, window.innerHeight - h - 8);
    if (!raf) raf = requestAnimationFrame(loop);
  }
  function show(e) {
    if (e.pointerType && e.pointerType !== "mouse") return;
    label.textContent = text();
    if (!on) { aim(e); x = tx; y = ty; tip.style.translate = Math.round(x) + "px " + Math.round(y) + "px"; }
    on = true; tip.classList.add("is-on");
  }
  function hide() { on = false; if (tip) tip.classList.remove("is-on"); }

  return {
    attach: function (el, P) {
      if (!el) return;
      P = P || {};
      texts = { front: P.flipText, back: P.flipBackText, tap: P.flipTapText };
      el.removeAttribute("title");
      var touch = window.matchMedia && matchMedia("(hover: none)").matches;
      if (touch) {
        /* 휴대폰 : 카드 아래 작은 표시 */
        var cd = el.closest(".cd");
        if (cd && !cd.querySelector(".oc-taptip")) {
          var t = document.createElement("span");
          t.className = "oc-taptip";
          t.innerHTML = '<i class="oc-fliptip-ic">' + ICON + '</i>' + (texts.tap || "TAP TO FLIP");
          cd.appendChild(t);
          el.addEventListener("click", function () { t.classList.add("is-gone"); });
        }
        return;
      }
      make(); hide();
      el.addEventListener("pointerenter", show);
      el.addEventListener("pointermove", function (e) {
        if (e.pointerType && e.pointerType !== "mouse") return;
        /* 링크 칩 위에서는 숨겨요 (링크로 동작) */
        if (e.target.closest && e.target.closest("a")) { hide(); return; }
        if (!on) show(e);
        aim(e);
      });
      el.addEventListener("pointerleave", hide);
      el.addEventListener("click", function () {
        /* 뒤집은 뒤 글자 바꾸기 + 살짝 튀는 효과 */
        setTimeout(function () {
          if (!label) return;
          label.textContent = text();
          tip.classList.remove("is-pop"); void tip.offsetWidth; tip.classList.add("is-pop");
        }, 0);
      });
      window.addEventListener("hashchange", hide, { once: true });
    }
  };
})();
