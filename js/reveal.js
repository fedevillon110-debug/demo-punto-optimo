/* ==========================================================================
   REVEAL · Aparición de elementos al entrar en pantalla
   Responsabilidad única: asignar el escalón --i y sumar .esta-visible cuando
   el elemento entra en el viewport. Los efectos viven en animations.css.
   ========================================================================== */

(function (ns) {
  "use strict";

  function init() {
    const elementos = Array.from(document.querySelectorAll("[data-reveal]"));
    if (elementos.length === 0) return;

    const movimientoReducido = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    // Escalón por posición dentro del mismo grupo. Los valores explícitos de
    // data-reveal-delay mandan (por ejemplo, la entrada de la portada).
    const grupos = new Map();
    elementos.forEach(function (elemento) {
      if (elemento.hasAttribute("data-reveal-delay")) return;
      const padre = elemento.parentElement;
      if (!padre) return;
      const lista = grupos.get(padre) || [];
      lista.push(elemento);
      grupos.set(padre, lista);
    });

    grupos.forEach(function (lista) {
      lista.forEach(function (elemento, indice) {
        elemento.style.setProperty("--i", indice);
      });
    });

    elementos.forEach(function (elemento) {
      const retraso = elemento.getAttribute("data-reveal-delay");
      if (retraso !== null && retraso !== "") {
        elemento.style.setProperty("--i", retraso);
      }
    });

    function mostrarTodo() {
      elementos.forEach(function (elemento) {
        elemento.classList.add("esta-visible");
      });
    }

    if (movimientoReducido.matches || !("IntersectionObserver" in window)) {
      mostrarTodo();
      return;
    }

    const observador = new IntersectionObserver(
      function (entradas, obs) {
        entradas.forEach(function (entrada) {
          if (!entrada.isIntersecting) return;
          entrada.target.classList.add("esta-visible");
          obs.unobserve(entrada.target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" }
    );

    elementos.forEach(function (elemento) {
      observador.observe(elemento);
    });

    // Si la preferencia cambia con la página abierta, no dejamos nada oculto.
    function alCambiarPreferencia(evento) {
      if (!evento.matches) return;
      observador.disconnect();
      mostrarTodo();
    }

    if (typeof movimientoReducido.addEventListener === "function") {
      movimientoReducido.addEventListener("change", alCambiarPreferencia);
    } else {
      movimientoReducido.addListener(alCambiarPreferencia);
    }
  }

  ns.reveal = { init: init };
})(window.PuntoOptimo = window.PuntoOptimo || {});
