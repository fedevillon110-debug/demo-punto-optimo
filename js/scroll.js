/* ==========================================================================
   SCROLL · Único listener de scroll compartido
   Responsabilidad única: escuchar el scroll una sola vez (passive: true) y
   avisar a los módulos suscriptores. La barra y la lupa no agregan listeners
   propios. El listener de resize queda fuera de este archivo porque no es
   scroll; los módulos que lo necesiten lo manejan por su cuenta.
   ========================================================================== */

(function (ns) {
  "use strict";

  const suscriptores = new Set();
  let iniciado = false;

  function avisar() {
    suscriptores.forEach(function (fn) {
      fn();
    });
  }

  function suscribir(fn) {
    if (typeof fn !== "function") return;
    suscriptores.add(fn);
    if (iniciado) fn();
  }

  function init() {
    if (iniciado) return;
    iniciado = true;
    window.addEventListener("scroll", avisar, { passive: true });
    avisar();
  }

  ns.scroll = {
    suscribir: suscribir,
    init: init,
  };
})(window.PuntoOptimo = window.PuntoOptimo || {});
