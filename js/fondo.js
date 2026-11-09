/* ==========================================================================
   FONDO · Manchas vivas detrás de la página
   Responsabilidad única: mover el fondo con el scroll (paralaje lento) y con
   el puntero (inclinación suave). Solo escribe variables CSS en <html>:
   --fondo-scroll (0 a 1) y --fondo-x / --fondo-y (-1 a 1).
   La deriva continua de las manchas es CSS puro (organico.css).
   ========================================================================== */

(function (ns) {
  "use strict";

  function init() {
    const raiz = document.documentElement;
    const movimientoReducido = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    if (movimientoReducido.matches) return;

    let objetivoX = 0;
    let objetivoY = 0;
    let actualX = 0;
    let actualY = 0;
    let animando = false;

    function actualizarScroll() {
      const total = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight
      );
      raiz.style.setProperty(
        "--fondo-scroll",
        Math.min(1, Math.max(0, window.scrollY / total)).toFixed(4)
      );
    }

    function paso() {
      // Acercamiento suave hacia el objetivo para que nada salte.
      actualX += (objetivoX - actualX) * 0.06;
      actualY += (objetivoY - actualY) * 0.06;
      raiz.style.setProperty("--fondo-x", actualX.toFixed(4));
      raiz.style.setProperty("--fondo-y", actualY.toFixed(4));

      if (
        Math.abs(objetivoX - actualX) > 0.001 ||
        Math.abs(objetivoY - actualY) > 0.001
      ) {
        window.requestAnimationFrame(paso);
      } else {
        animando = false;
      }
    }

    function alMoverPuntero(evento) {
      objetivoX = (evento.clientX / window.innerWidth) * 2 - 1;
      objetivoY = (evento.clientY / window.innerHeight) * 2 - 1;
      if (!animando) {
        animando = true;
        window.requestAnimationFrame(paso);
      }
    }

    if (ns.scroll) {
      ns.scroll.suscribir(actualizarScroll);
    } else {
      window.addEventListener("scroll", actualizarScroll, { passive: true });
    }
    window.addEventListener("resize", actualizarScroll, { passive: true });
    window.addEventListener("pointermove", alMoverPuntero, { passive: true });
    actualizarScroll();
  }

  ns.fondo = { init: init };
})(window.PuntoOptimo = window.PuntoOptimo || {});
