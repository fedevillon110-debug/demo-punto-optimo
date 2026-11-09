/* ==========================================================================
   RUTA · Diagrama de flujo de "Cómo trabajamos"
   Responsabilidad única: dibujar la línea del diagrama con el scroll y
   encender cada paso cuando el trazo lo alcanza.
   Escribe --ruta-px (alto del trazo en píxeles) y las clases .esta-activo en
   cada .hito y en los extremos. No agrega listeners de scroll propios.
   ========================================================================== */

(function (ns) {
  "use strict";

  function init() {
    const ruta = document.querySelector("[data-ruta]");
    if (!ruta) return;

    const eje = ruta.querySelector(".ruta__eje");
    const hitos = Array.from(ruta.querySelectorAll(".hito"));
    const inicio = ruta.querySelector(".ruta__extremo--inicio");
    const fin = ruta.querySelector(".ruta__extremo--fin");
    if (!eje || hitos.length === 0) return;

    const movimientoReducido = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    let programado = false;

    function pintar() {
      programado = false;

      const ejeRect = eje.getBoundingClientRect();
      let px;

      if (movimientoReducido.matches) {
        px = ejeRect.height;
        ruta.classList.add("ruta--completa");
      } else {
        ruta.classList.remove("ruta--completa");
        // La "mirada" del trazo vive al 62% de la pantalla: el dibujo va un
        // poco por delante de lo que se está leyendo.
        const linea = window.innerHeight * 0.62;
        px = Math.min(ejeRect.height, Math.max(0, linea - ejeRect.top));
      }

      ruta.style.setProperty("--ruta-px", px.toFixed(1) + "px");

      if (inicio) inicio.classList.toggle("esta-activo", px > 0);

      hitos.forEach(function (hito) {
        const nodo = hito.querySelector(".hito__nodo") || hito;
        const r = nodo.getBoundingClientRect();
        const centro = r.top + r.height / 2 - ejeRect.top;
        hito.classList.toggle("esta-activo", px >= centro);
      });

      if (fin) fin.classList.toggle("esta-activo", px >= ejeRect.height - 2);
    }

    function alScrollear() {
      if (programado) return;
      programado = true;
      window.requestAnimationFrame(pintar);
    }

    if (ns.scroll) {
      ns.scroll.suscribir(alScrollear);
    } else {
      window.addEventListener("scroll", alScrollear, { passive: true });
    }

    window.addEventListener("resize", alScrollear, { passive: true });

    if (typeof movimientoReducido.addEventListener === "function") {
      movimientoReducido.addEventListener("change", alScrollear);
    } else {
      movimientoReducido.addListener(alScrollear);
    }

    pintar();
  }

  ns.ruta = { init: init };
})(window.PuntoOptimo = window.PuntoOptimo || {});
