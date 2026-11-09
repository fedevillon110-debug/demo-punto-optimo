/* ==========================================================================
   NAV · Barra flotante, menú móvil accesible y sección activa
   Responsabilidad única: manejar el estado de la barra (fondo al scrollear),
   abrir y cerrar el menú de celular y marcar el link de la sección visible.
   El scroll se comparte con js/scroll.js; el suavizado lo resuelve CSS.
   ========================================================================== */

(function (ns) {
  "use strict";

  function init() {
    const nav = document.querySelector("[data-nav]");
    const boton = document.querySelector("[data-nav-boton]");
    const lista = document.querySelector("[data-nav-lista]");
    if (!nav || !boton || !lista) return;

    const vistaEscritorio = window.matchMedia("(min-width: 901px)");
    const configBarra =
      ns.CONFIG && ns.CONFIG.animaciones && ns.CONFIG.animaciones.barra;
    const umbralScroll = configBarra ? configBarra.umbralScroll : 24;

    // ---------------------------------------------------------------------
    // Barra: fondo más oscuro y sombra después del umbral.
    // ---------------------------------------------------------------------
    function actualizarBarra() {
      const recorrido = window.scrollY || window.pageYOffset || 0;
      nav.classList.toggle("nav--scrolled", recorrido > umbralScroll);
    }

    // ---------------------------------------------------------------------
    // Menú móvil.
    // ---------------------------------------------------------------------
    function estaAbierto() {
      return nav.classList.contains("nav--abierto");
    }

    function abrirMenu() {
      nav.classList.add("nav--abierto");
      boton.setAttribute("aria-expanded", "true");
      boton.setAttribute("aria-label", "Cerrar menú");
    }

    function cerrarMenu(devolverFoco) {
      if (!estaAbierto()) return;
      nav.classList.remove("nav--abierto");
      boton.setAttribute("aria-expanded", "false");
      boton.setAttribute("aria-label", "Abrir menú");
      if (devolverFoco) boton.focus();
    }

    boton.addEventListener("click", function () {
      if (estaAbierto()) {
        cerrarMenu(false);
      } else {
        abrirMenu();
      }
    });

    document.addEventListener("keydown", function (evento) {
      if (evento.key !== "Escape" || !estaAbierto()) return;
      cerrarMenu(true);
    });

    // Un clic fuera de la píldora cierra el panel.
    document.addEventListener("click", function (evento) {
      if (!estaAbierto() || nav.contains(evento.target)) return;
      cerrarMenu(false);
    });

    // Al elegir cualquier enlace del panel, el menú se cierra.
    lista.querySelectorAll("a").forEach(function (enlace) {
      enlace.addEventListener("click", function () {
        cerrarMenu(false);
      });
    });

    // Si la ventana pasa a escritorio, el panel deja de tener sentido.
    function alCambiarVista(evento) {
      if (evento.matches) cerrarMenu(false);
    }

    if (typeof vistaEscritorio.addEventListener === "function") {
      vistaEscritorio.addEventListener("change", alCambiarVista);
    } else {
      vistaEscritorio.addListener(alCambiarVista);
    }

    // ---------------------------------------------------------------------
    // Link activo: la sección que cae en la banda central de la pantalla.
    // En la portada no queda ningún link marcado.
    // ---------------------------------------------------------------------
    const enlaces = Array.from(document.querySelectorAll(".nav__enlace"));
    const secciones = enlaces
      .map(function (enlace) {
        const id = (enlace.getAttribute("href") || "").replace("#", "");
        return id ? document.getElementById(id) : null;
      })
      .filter(Boolean);

    const portada = document.getElementById("inicio");
    if (portada && secciones.indexOf(portada) === -1) secciones.push(portada);

    function marcarSeccion(id) {
      const activo =
        id === "inicio"
          ? null
          : enlaces.find(function (enlace) {
              return enlace.getAttribute("href") === "#" + id;
            });

      enlaces.forEach(function (enlace) {
        if (enlace === activo) {
          enlace.setAttribute("aria-current", "true");
        } else {
          enlace.removeAttribute("aria-current");
        }
      });
    }

    if ("IntersectionObserver" in window) {
      const observador = new IntersectionObserver(
        function (entradas) {
          entradas.forEach(function (entrada) {
            if (entrada.isIntersecting) marcarSeccion(entrada.target.id);
          });
        },
        { rootMargin: "-45% 0px -50% 0px" }
      );

      secciones.forEach(function (seccion) {
        observador.observe(seccion);
      });
    }

    // ---------------------------------------------------------------------
    // Scroll compartido: un solo listener pasivo para barra y lupa.
    // ---------------------------------------------------------------------
    if (ns.scroll) {
      ns.scroll.suscribir(actualizarBarra);
    } else {
      window.addEventListener("scroll", actualizarBarra, { passive: true });
      actualizarBarra();
    }
  }

  ns.nav = { init: init };
})(window.PuntoOptimo = window.PuntoOptimo || {});
