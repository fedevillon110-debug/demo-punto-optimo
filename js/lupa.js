/* ==========================================================================
   LUPA · Péndulo de la lente al hacer scroll
   Responsabilidad única: calcular el ángulo objetivo y acercarse a él con
   inercia mediante requestAnimationFrame. El resultado se escribe en
   --lupa-angulo; el CSS aplica el rotate y el eje en el extremo del mango.
   Los números ajustables viven en CONFIG.animaciones.lupa.
   ========================================================================== */

(function (ns) {
  "use strict";

  /* Una vuelta completa de la onda. */
  const VUELTA_COMPLETA = Math.PI * 2;

  /* Diferencia mínima para dar por terminado el movimiento (grados). */
  const TOLERANCIA = 0.005;

  function init() {
    const lente = document.querySelector(".lupa__lente");
    const config =
      ns.CONFIG && ns.CONFIG.animaciones && ns.CONFIG.animaciones.lupa;

    if (!lente || !config) return;

    const movimientoReducido = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    let anguloActual = 0;
    let anguloObjetivo = 0;
    let cuadro = 0;

    function amplitud() {
      return window.innerWidth < config.anchoCelular
        ? config.amplitudGradosCelular
        : config.amplitudGrados;
    }

    function calcularObjetivo() {
      const recorrido = window.scrollY || window.pageYOffset || 0;
      const fase = (recorrido / config.pixelesPorCiclo) * VUELTA_COMPLETA;
      return amplitud() * Math.sin(fase);
    }

    function aplicar() {
      lente.style.setProperty("--lupa-angulo", anguloActual.toFixed(3) + "deg");
    }

    /* Interpolación: cada cuadro se acerca una parte del camino que falta. */
    function animar() {
      cuadro = 0;
      const diferencia = anguloObjetivo - anguloActual;

      if (Math.abs(diferencia) < TOLERANCIA) {
        anguloActual = anguloObjetivo;
        aplicar();
        return;
      }

      anguloActual += diferencia * config.suavizado;
      aplicar();
      cuadro = window.requestAnimationFrame(animar);
    }

    function iniciar() {
      if (cuadro) return;
      cuadro = window.requestAnimationFrame(animar);
    }

    function detener() {
      if (!cuadro) return;
      window.cancelAnimationFrame(cuadro);
      cuadro = 0;
    }

    function alScrollear() {
      if (movimientoReducido.matches) return;
      anguloObjetivo = calcularObjetivo();
      iniciar();
    }

    /* Con movimiento reducido no se toca nada: la lupa queda derecha. */
    function alCambiarMovimiento(evento) {
      if (evento.matches) {
        detener();
        anguloActual = 0;
        anguloObjetivo = 0;
        lente.style.removeProperty("--lupa-angulo");
        return;
      }
      alScrollear();
    }

    if (typeof movimientoReducido.addEventListener === "function") {
      movimientoReducido.addEventListener("change", alCambiarMovimiento);
    } else {
      movimientoReducido.addListener(alCambiarMovimiento);
    }

    // Un solo listener de scroll para toda la página (js/scroll.js).
    if (ns.scroll) {
      ns.scroll.suscribir(alScrollear);
    } else {
      window.addEventListener("scroll", alScrollear, { passive: true });
      alScrollear();
    }
  }

  ns.lupa = { init: init };
})(window.PuntoOptimo = window.PuntoOptimo || {});
