(function(){
  "use strict";
  var root=document.documentElement;
  var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $=function(s,r){return (r||document).querySelector(s)}, $$=function(s,r){return Array.from((r||document).querySelectorAll(s))};

  /* ---------- "Más detalles": se abre y se cierra con un clic, sin hover ---------- */
  $$(".mas-btn").forEach(function(btn){
    var card=btn.closest(".caso");
    btn.addEventListener("click",function(){
      var on=!card.classList.contains("abierto");
      card.classList.toggle("abierto",on); btn.setAttribute("aria-expanded",on);
      btn.firstChild.textContent=on?"Ocultar detalles":"Más detalles";
    });
  });

  /* ---------- Entrada suave al aparecer ---------- */
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("ve");io.unobserve(e.target)}})},{threshold:.15,rootMargin:"0px 0px -6% 0px"});
  $$(".rv").forEach(function(el){io.observe(el)});

  /* ---------- Diagrama: avanza con el scroll, mientras se lee ---------- */
  var flujo=$("#flujo"), pasos=$$(".paso"), hecho=0;
  function flujoScroll(){
    var r=flujo.getBoundingClientRect(), vh=innerHeight, p;
    if(reduce){p=1}
    else if(matchMedia("(max-width:900px)").matches){ /* vertical: la línea sigue la lectura */
      p=(vh*.72-r.top)/Math.max(1,r.height);
    }else{ /* horizontal: se completa cuando el bloque llega a mitad de pantalla */
      p=(vh*.9-r.top)/(vh*.36);
    }
    p=Math.min(1,Math.max(0,p)); if(p>hecho) hecho=p; /* solo avanza */
    flujo.style.setProperty("--prog",hecho.toFixed(3));
    pasos.forEach(function(el,i){ if(hecho>=(i===0?.02:i/(pasos.length-1)-.001)) el.classList.add("ve") });
  }
  addEventListener("scroll",flujoScroll,{passive:true}); addEventListener("resize",flujoScroll); flujoScroll();

  /* ---------- Fondo: paralaje con scroll y puntero (suavizado) ---------- */
  var tx=0,ty=0,cx=0,cy=0,raf=0;
  function paso(){cx+=(tx-cx)*.06;cy+=(ty-cy)*.06;root.style.setProperty("--mx",cx.toFixed(3));root.style.setProperty("--my",cy.toFixed(3));raf=(Math.abs(tx-cx)>.001||Math.abs(ty-cy)>.001)?requestAnimationFrame(paso):0}
  if(!reduce) addEventListener("pointermove",function(e){tx=e.clientX/innerWidth*2-1;ty=e.clientY/innerHeight*2-1;if(!raf)raf=requestAnimationFrame(paso)},{passive:true});

  var barra=$("#barra"), links=$$("#menu a"), secs=links.map(function(a){return $(a.getAttribute("href"))});
  function alScroll(){
    var max=Math.max(1,root.scrollHeight-innerHeight), p=Math.min(1,Math.max(0,scrollY/max));
    root.style.setProperty("--sc",p.toFixed(4)); $("#progreso").style.setProperty("--p",p.toFixed(4));
    barra.classList.toggle("scroll",scrollY>24);
    var mid=scrollY+innerHeight*.4, cur=-1; secs.forEach(function(s,i){if(s.offsetTop<=mid)cur=i});
    links.forEach(function(a,i){a.classList.toggle("on",i===cur)});
  }
  addEventListener("scroll",alScroll,{passive:true}); addEventListener("resize",alScroll); alScroll();
})();
