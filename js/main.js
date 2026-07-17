/* =========================================================
   온도 ONDO — main.js
   - 고정 스테이지 시네마 (스크롤 진행도 p → 씬 5개 배분, opacity+transform)
   - 단일 rAF, IO로 헤더 테마 전환 / 온도계 채움
   - reduced-motion: 시네마 해체(정적 세로 섹션)
   ========================================================= */
(function () {
  "use strict";
  var RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 유틸 ---------- */
  function clamp01(v){ return v < 0 ? 0 : v > 1 ? 1 : v; }
  function lerp(a,b,t){ return a + (b-a)*t; }
  function seg(p,a,b){ return clamp01((p-a)/(b-a)); }   // [a,b] 구간 0~1
  // 인/아웃 페이드
  function fade(p, inA, inB, outA, outB){ return seg(p,inA,inB) * (1 - seg(p,outA,outB)); }

  /* ---------- 모바일 메뉴 (풀스크린 오버레이) ---------- */
  var hamb = document.querySelector(".hamb");
  var overlay = document.getElementById("nav-overlay");
  if (hamb && overlay) {
    var closeBtn = overlay.querySelector(".close");
    function openMenu(){ overlay.classList.add("open"); hamb.setAttribute("aria-expanded","true"); document.body.style.overflow="hidden"; }
    function closeMenu(){ overlay.classList.remove("open"); hamb.setAttribute("aria-expanded","false"); document.body.style.overflow=""; }
    hamb.addEventListener("click", openMenu);
    if (closeBtn) closeBtn.addEventListener("click", closeMenu);
    overlay.addEventListener("click", function(e){ if (e.target.tagName==="A" || e.target===overlay) closeMenu(); });
    document.addEventListener("keydown", function(e){ if (e.key==="Escape") closeMenu(); });
  }

  /* ---------- 헤더 테마 전환 (밝은 섹션 위에서 잉크색) ---------- */
  var header = document.querySelector(".site-header");
  var themed = document.querySelectorAll("[data-theme]");
  if (header && themed.length) {
    var themeIO = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting){
          header.classList.toggle("on-light", e.target.getAttribute("data-theme")==="light");
        }
      });
    }, { rootMargin: "-8% 0px -92% 0px", threshold: 0 });
    themed.forEach(function(s){ themeIO.observe(s); });
  }

  /* ---------- 온도계 채움 (진입 시 1회) ---------- */
  var thermoFill = document.querySelector(".thermo__fill");
  if (thermoFill){
    if (RM) { thermoFill.style.width = thermoFill.getAttribute("data-to") + "%"; }
    else {
      var tIO = new IntersectionObserver(function(entries, obs){
        entries.forEach(function(e){ if (e.isIntersecting){ thermoFill.style.width = thermoFill.getAttribute("data-to")+"%"; obs.disconnect(); } });
      }, { threshold: 0.5 });
      tIO.observe(thermoFill);
    }
  }

  /* =========================================================
     시네마 플래그십
     ========================================================= */
  var cinema = document.querySelector(".cinema");

  function applyCinema(p){
    var vh = window.innerHeight;

    // 씬0 워드마크 (Cormorant, 자간 조여듦)
    var wm = document.querySelector(".wordmark");
    if (wm){
      var wmO = fade(p, 0, 0.04, 0.20, 0.28);
      wm.style.opacity = wmO;
      var ls = lerp(0.6, 0.15, seg(p,0,0.15));
      wm.style.letterSpacing = ls.toFixed(3) + "em";
      wm.parentNode.style.transform = "translate(-50%,-50%)";
    }

    // 병 정면 (씬0 등장 → 씬2 흐림 → 씬3 디졸브아웃 → 씬4 복귀)
    var front = document.querySelector(".ly-bottle-front");
    if (front){
      var fO;
      if (p < 0.5) fO = lerp(0, 1, seg(p,0.03,0.15)) * (p>0.32 ? lerp(1,0.22,seg(p,0.32,0.5)) : 1);
      else if (p < 0.64) fO = lerp(0.22, 0, seg(p,0.5,0.64));
      else if (p < 0.82) fO = 0;
      else fO = lerp(0, 1, seg(p,0.82,0.9));
      var fS = p < 0.15 ? lerp(1.15,1,seg(p,0,0.15)) : (p>0.82 ? lerp(1.03,1,seg(p,0.82,0.92)) : 1);
      var fY = lerp(0, 3, seg(p,0.15,0.32)) * 0.01 * vh; // 미세 하강
      front.style.opacity = fO;
      front.style.transform = "translate(-50%,-50%) translateY("+fY.toFixed(1)+"px) scale("+fS.toFixed(3)+")";
    }

    // 병 측면 (씬3)
    var side = document.querySelector(".ly-bottle-side");
    if (side){
      var sO = fade(p, 0.55, 0.68, 0.82, 0.92);
      var sS = lerp(1.06, 1, seg(p,0.55,0.68));
      side.style.opacity = sO;
      side.style.transform = "translate(-50%,-50%) scale("+sS.toFixed(3)+")";
    }

    // 원료 3레이어 (씬2 0.35~0.62), 계수 0.6/1.0/1.4
    var ings = document.querySelectorAll(".ly-ing");
    var coeff = [0.6, 1.0, 1.4];
    var baseX = [-26, 3, 26];   // vw
    var baseY = [-4, 8, -2];    // vh
    var dir   = [1, 1, -1];     // 방향
    ings.forEach(function(ing, i){
      var t = seg(p, 0.35, 0.62);
      var y = (lerp(80, -60, t)) * coeff[i] * dir[i];       // px
      var ox = baseX[i]/100*window.innerWidth;
      var oy = baseY[i]/100*vh;
      var o = fade(p, 0.35, 0.43, 0.55, 0.62);
      ing.style.opacity = o;
      ing.style.transform = "translate(-50%,-50%) translate("+ox.toFixed(0)+"px,"+(oy+y).toFixed(0)+"px)";
      var cap = ing.querySelector(".ing-cap");
      if (cap) cap.style.opacity = o;
    });

    // 씬1 카피
    var c1 = document.querySelector(".scene-copy-1");
    if (c1){
      var c1o = fade(p, 0.15, 0.22, 0.33, 0.40);
      c1.style.opacity = c1o;
      c1.parentNode.style.transform = "translate(-50%,-50%) translateY("+lerp(18,-18,seg(p,0.15,0.40)).toFixed(1)+"px)";
    }
    // 씬3 카피
    var c3 = document.querySelector(".scene-copy-3");
    if (c3){
      var c3o = fade(p, 0.60, 0.68, 0.79, 0.85);
      c3.style.opacity = c3o;
      c3.parentNode.style.transform = "translate(-50%,-50%) translateY("+lerp(18,-18,seg(p,0.60,0.85)).toFixed(1)+"px)";
    }
    // 씬4 블록 + 엠버 라인
    var s4 = document.querySelector(".scene4");
    if (s4){
      var s4o = seg(p, 0.85, 0.93);
      s4.style.opacity = s4o;
      s4.style.transform = "translate(-50%,-50%) translateY("+lerp(20,0,seg(p,0.85,0.95)).toFixed(1)+"px)";
    }
    document.querySelectorAll(".ember-line").forEach(function(el){
      var w = seg(p, 0.88, 1.0);
      var dirn = el.classList.contains("left") ? -1 : 1;
      var offset = 34 * dirn; // vw 방향 오프셋(가는 라인이 병 아래 좌우)
      el.style.width = (w * 16) + "vw";
      el.style.transform = "translate(calc(-50% + "+offset+"vw), calc(-50% + 22vh)) scaleX(1)";
    });

    // 스크롤 힌트 (초반만)
    var hint = document.querySelector(".scroll-hint");
    if (hint) hint.style.opacity = (1 - seg(p, 0.02, 0.12)).toFixed(2);
  }

  /* ---------- 정적(해체) 모드 ---------- */
  function staticCinema(){
    if (!cinema) return;
    cinema.classList.add("is-static");
    // 모든 레이어·텍스트를 최종/정적으로 (이전 상태와 무관하게 전부 노출)
    document.querySelectorAll(".ly, .wordmark, .scene-copy, .scene4, .ing-cap")
      .forEach(function(l){ l.style.opacity=1; l.style.transform="none"; });
    var wm = document.querySelector(".wordmark"); if (wm) wm.style.letterSpacing=".15em";
    document.querySelectorAll(".ember-line").forEach(function(e){ e.style.width="140px"; });
    var hint=document.querySelector(".scroll-hint"); if (hint) hint.style.display="none";
  }

  /* ---------- 단일 rAF (on-demand) ---------- */
  var ticking = false;
  function requestTick(){ if (!ticking){ ticking=true; requestAnimationFrame(frame); } }
  function frame(){
    ticking = false;
    if (cinema && !cinema.classList.contains("is-static")){
      var rect = cinema.getBoundingClientRect();
      var total = cinema.offsetHeight - window.innerHeight;
      var p = total > 0 ? clamp01(-rect.top / total) : 0;
      applyCinema(p);
    }
  }

  if (cinema){
    if (RM){ staticCinema(); }
    else {
      // 폴백: sticky 미지원 시에도 정적
      var supportsSticky = CSS && CSS.supports && (CSS.supports("position","sticky") || CSS.supports("position","-webkit-sticky"));
      if (!supportsSticky){ staticCinema(); }
      else {
        window.addEventListener("scroll", requestTick, { passive:true });
        window.addEventListener("resize", requestTick);
        applyCinema(0);
        requestTick();
      }
    }
  }

})();
