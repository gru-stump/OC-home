/* =========================================================
   bgm.js — 캐릭터 배경음악 (유튜브 플레이리스트 / 영상)
   ---------------------------------------------------------
   · 캐릭터 목록의 '배경음악' 칸에 유튜브 주소를 넣으면,
     캐릭터 소개(#character)에서 그 캐릭터를 볼 때 자동으로 반복 재생돼요.
       플레이리스트 주소 : https://www.youtube.com/playlist?list=PL…
       영상 주소         : https://www.youtube.com/watch?v=…  /  https://youtu.be/…
   · 다른 캐릭터로 넘기면 그 캐릭터 음악으로 바뀌고, 캐릭터 소개를 나가면 멈춰요.
   · 왼쪽 아래 작은 플레이어에서 재생/멈춤 · 다음 곡 · 음소거 · 소리 크기를 바꿀 수 있어요.
   · 브라우저 규칙상, 사이트에 처음 들어오자마자는 소리가 막힐 수 있어요.
     그럴 땐 '눌러서 음악 재생' 표시가 뜨고, 한 번 누르면 이어서 재생돼요.
   ========================================================= */
window.OC_BGM = (function () {
  var MUTE_KEY = "oc-bgm-muted", VOL_KEY = "oc-bgm-vol";
  var player = null, apiReady = false, apiLoading = false, pending = null;
  var current = "", ui = null, wanted = false, volume = 40;

  /* ----- 주소 → { list, video } ----- */
  function parse(src) {
    src = String(src || "").trim();
    if (!src) return null;
    var list = (src.match(/[?&]list=([\w-]+)/) || [])[1] || "";
    var video = (src.match(/[?&]v=([\w-]{11})/) || src.match(/youtu\.be\/([\w-]{11})/) || src.match(/\/(?:embed|shorts|live)\/([\w-]{11})/) || [])[1] || "";
    if (!list && !video) {                       /* 주소 대신 ID만 넣은 경우 */
      if (/^(PL|OL|UU|LL|RD|FL)[\w-]{10,}$/.test(src)) list = src;
      else if (/^[\w-]{11}$/.test(src)) video = src;
    }
    return (list || video) ? { list: list, video: video } : null;
  }
  function keyOf(p) { return p ? p.list + "|" + p.video : ""; }
  function muted() { try { return localStorage.getItem(MUTE_KEY) === "1"; } catch (e) { return false; } }
  function setMuted(v) { try { localStorage.setItem(MUTE_KEY, v ? "1" : "0"); } catch (e) {} }
  /* 방문자가 플레이어에서 직접 맞춘 소리 크기 (이 기기에만 기억) */
  function myVol() { try { var v = localStorage.getItem(VOL_KEY); return v == null ? null : Number(v); } catch (e) { return null; } }
  function setMyVol(v) { try { if (v == null) localStorage.removeItem(VOL_KEY); else localStorage.setItem(VOL_KEY, String(v)); } catch (e) {} }
  function clamp(v) { v = parseFloat(v); return isFinite(v) ? Math.max(0, Math.min(100, v)) : null; }

  /* ----- 유튜브 플레이어 준비 ----- */
  function loadApi() {
    if (apiReady || apiLoading) return;
    apiLoading = true;
    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      apiReady = true;
      if (typeof prev === "function") prev();
      if (pending) { var p = pending; pending = null; start(p); }
    };
    var s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    document.head.appendChild(s);
  }

  /* ----- 왼쪽 아래 작은 플레이어 ----- */
  var IC = {
    play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z" fill="currentColor"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M6 5.5v13l8.5-6.5zM15.5 5.5H18v13h-2.5z" fill="currentColor"/></svg>',
    sound: '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    mute: '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };
  function makeUi() {
    if (ui) return ui;
    ui = document.createElement("div");
    ui.className = "oc-bgm";
    ui.innerHTML =
      '<div class="oc-bgm-art"><div id="ocBgmPlayer"></div></div>' +
      '<button type="button" class="oc-bgm-tap">♪ 눌러서 음악 재생</button>' +
      '<div class="oc-bgm-info"><small>NOW PLAYING</small><b class="oc-bgm-title">…</b></div>' +
      '<button type="button" class="oc-bgm-btn oc-bgm-toggle" aria-label="재생 / 멈춤">' + IC.pause + '</button>' +
      '<button type="button" class="oc-bgm-btn oc-bgm-next" aria-label="다음 곡">' + IC.next + '</button>' +
      '<button type="button" class="oc-bgm-btn oc-bgm-mute" aria-label="소리 켜기 / 끄기">' + IC.sound + '</button>' +
      '<input type="range" class="oc-bgm-vol" min="0" max="100" step="5" aria-label="소리 크기">';
    document.body.appendChild(ui);
    ui.querySelector(".oc-bgm-toggle").addEventListener("click", function () {
      if (!player || !player.getPlayerState) return;
      if (player.getPlayerState() === 1) player.pauseVideo(); else player.playVideo();
    });
    ui.querySelector(".oc-bgm-next").addEventListener("click", function () { if (player && player.nextVideo) player.nextVideo(); });
    ui.querySelector(".oc-bgm-mute").addEventListener("click", function () {
      var m = !muted(); setMuted(m);
      if (player) { if (m) player.mute(); else { player.unMute(); player.setVolume(volume); } }
      paint();
    });
    var vr = ui.querySelector(".oc-bgm-vol");
    vr.addEventListener("input", function () {
      volume = Number(vr.value); setMyVol(volume);
      if (player && player.setVolume) {
        player.setVolume(volume);
        if (volume > 0 && muted()) { setMuted(false); player.unMute(); }
      }
      paintVol(); paint();
    });
    ui.querySelector(".oc-bgm-tap").addEventListener("click", function () {
      if (player && player.playVideo) { if (!muted()) player.unMute(); player.playVideo(); }
    });
    paintVol();
    return ui;
  }
  function paintVol() {
    if (!ui) return;
    var vr = ui.querySelector(".oc-bgm-vol");
    vr.value = volume;
    vr.style.setProperty("--v", volume + "%");
  }
  function paint(state) {
    if (!ui) return;
    if (state === undefined && player && player.getPlayerState) state = player.getPlayerState();
    var playing = state === 1;
    ui.classList.toggle("is-playing", playing);
    ui.classList.toggle("is-blocked", wanted && (state === -1 || state === 5));
    ui.querySelector(".oc-bgm-toggle").innerHTML = playing ? IC.pause : IC.play;
    ui.querySelector(".oc-bgm-mute").innerHTML = muted() ? IC.mute : IC.sound;
    ui.querySelector(".oc-bgm-mute").classList.toggle("is-off", muted());
    var d = player && player.getVideoData ? player.getVideoData() : null;
    if (d && d.title) ui.querySelector(".oc-bgm-title").textContent = d.title;
    var pl = player && player.getPlaylist ? player.getPlaylist() : null;
    ui.querySelector(".oc-bgm-next").hidden = !(pl && pl.length > 1);
  }

  function start(p) {
    if (!apiReady) { pending = p; loadApi(); return; }
    makeUi();
    ui.classList.add("is-on");
    var vars = { autoplay: 1, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, playsinline: 1, rel: 0, loop: 1 };
    if (p.list) { vars.listType = "playlist"; vars.list = p.list; }
    else vars.playlist = p.video;                 /* 영상 하나도 반복되게 */
    if (player && player.loadPlaylist) {
      if (p.list) player.loadPlaylist({ list: p.list, listType: "playlist", index: 0 });
      else player.loadVideoById(p.video);
      return;
    }
    player = new YT.Player("ocBgmPlayer", {
      width: 64, height: 36,
      videoId: p.video || undefined,
      playerVars: vars,
      events: {
        onReady: function (e) {
          e.target.setVolume(volume);
          if (muted()) e.target.mute();
          if (p.list && e.target.setLoop) e.target.setLoop(true);
          if (wanted) e.target.playVideo();
          setTimeout(paint, 600);
        },
        onStateChange: function (e) {
          if (e.data === 0) {                       /* 끝나면 처음부터 (영상 하나일 때) */
            var pl = e.target.getPlaylist && e.target.getPlaylist();
            if (!pl || pl.length < 2) { e.target.seekTo(0); e.target.playVideo(); }
          }
          if (!wanted && e.data === 1) e.target.pauseVideo();
          paint(e.data);
        },
        onError: function () { paint(); }
      }
    });
  }

  /* 첫 클릭 · 키 입력 때 막혀 있던 재생을 다시 시도 */
  function retry() {
    if (wanted && player && player.getPlayerState && player.getPlayerState() !== 1) {
      if (!muted()) player.unMute();
      player.playVideo();
    }
  }
  document.addEventListener("pointerdown", retry, true);
  document.addEventListener("keydown", retry, true);

  /* 캐릭터 소개를 나가면 멈춤 */
  window.addEventListener("hashchange", function () {
    if (!/^#\/?character/.test(location.hash)) stop();
  });

  function stop() {
    wanted = false; current = "";
    if (player && player.pauseVideo) player.pauseVideo();
    if (ui) ui.classList.remove("is-on");
  }

  return {
    parse: parse,
    /* 캐릭터 화면에서 호출 : set(캐릭터의 bgm 값, 캐릭터 페이지 설정) */
    /* set(캐릭터의 bgm 값, 캐릭터 페이지 설정, 캐릭터별 소리 크기)
       소리 크기 순서 : 방문자가 직접 맞춘 값 → 캐릭터별 값 → 캐릭터 페이지 기본값 → 40 */
    set: function (src, P, charVol) {
      P = P || {};
      if (P.bgm === false) return stop();
      var mine = clamp(myVol()), cv = clamp(charVol === "" ? null : charVol), pv = clamp(P.bgmVolume);
      volume = mine != null ? mine : (cv != null ? cv : (pv != null ? pv : 40));
      paintVol();
      var p = parse(src);
      if (!p) return stop();
      wanted = true;
      var k = keyOf(p);
      if (k === current) { if (player && player.setVolume) player.setVolume(volume); retry(); return; }   /* 같은 음악이면 그대로 */
      current = k;
      start(p);
      paintVol();
      if (player && player.setVolume) player.setVolume(volume);
    },
    stop: stop,
    /* 내가 플레이어에서 맞춘 소리 크기 지우고 편집기 기본값으로 */
    resetMyVolume: function () { setMyVol(null); }
  };
})();
