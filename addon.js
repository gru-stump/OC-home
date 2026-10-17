/* =========================================================
   addon.js — 원본 밀키트에 새로 더한 기능 (작은 도우미)
   ========================================================= */

/* ---------- 갤러리 이미지 자르기 ----------
   편집기에서 정한 값으로 이미지를 정사각형으로 잘라 보여줘요.
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
    /* 크게 보기 : 자른 영역만 보여주는 정사각형 */
    big: function (g) {
      if (!this.has(g)) return '<img src="' + g.image + '" alt="">';
      return '<div class="box-crop"><img src="' + g.image + '" alt=""' + this.attrs(g) + '></div>';
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
