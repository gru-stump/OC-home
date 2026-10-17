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
