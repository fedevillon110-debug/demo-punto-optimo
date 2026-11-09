/* ==========================================================================
   MAIN · Punto de entrada
   Aplica CONFIG al HTML, completa enlaces y metadatos, e inicia los módulos.
   ========================================================================== */

(function (ns) {
  "use strict";

  const CONFIG = ns.CONFIG;
  if (!CONFIG) return;

  const PATRON_PENDIENTE = /\[[^\]]+\]/;

  function esPendiente(valor) {
    return typeof valor === "string" && PATRON_PENDIENTE.test(valor);
  }

  function soloDigitos(valor) {
    return String(valor).replace(/\D/g, "");
  }

  function dominioLimpio() {
    return String(CONFIG.dominio || "")
      .replace(/^https?:\/\//i, "")
      .replace(/\/+$/, "");
  }

  // `mensaje` permite que un botón envíe un saludo propio (por ejemplo, según
  // el servicio); si falta, se usa CONFIG.mensajeWhatsapp.
  function urlWhatsApp(mensaje) {
    if (esPendiente(CONFIG.whatsapp)) return "";
    const numero = soloDigitos(CONFIG.whatsapp);
    if (!numero) return "";
    const texto = encodeURIComponent(mensaje || CONFIG.mensajeWhatsapp || "");
    return "https://wa.me/" + numero + (texto ? "?text=" + texto : "");
  }

  function urlEmail() {
    if (esPendiente(CONFIG.email)) return "";
    const correo = String(CONFIG.email).trim();
    return correo ? "mailto:" + correo : "";
  }

  function urlInstagram() {
    if (esPendiente(CONFIG.instagram)) return "";
    const usuario = String(CONFIG.instagram)
      .trim()
      .replace(/^@/, "")
      .replace(/\/+$/, "");
    if (!usuario) return "";
    return "https://www.instagram.com/" + encodeURIComponent(usuario) + "/";
  }

  function urlLinkedIn() {
    if (esPendiente(CONFIG.linkedin)) return "";
    const url = String(CONFIG.linkedin).trim();
    if (!url) return "";
    return /^https?:\/\//i.test(url) ? url : "https://" + url;
  }

  function urlPanel() {
    if (!CONFIG.panelHabilitado) return "";
    const url = String(CONFIG.urlPanel || "").trim();
    return /^(https?:\/\/|[\w.\/-]+$)/i.test(url) ? url : "";
  }

  // -----------------------------------------------------------------------
  // Textos
  // -----------------------------------------------------------------------
  const textos = {
    nombre: function () {
      return CONFIG.nombre;
    },
    bajada: function () {
      return CONFIG.bajada;
    },
    ubicacion: function () {
      return CONFIG.ubicacion;
    },
    nombreResponsable: function () {
      return CONFIG.nombreResponsable;
    },
    whatsapp: function () {
      return CONFIG.whatsapp;
    },
    whatsappVisible: function () {
      // Si no se define, mostramos el número tal como está configurado.
      return CONFIG.whatsappVisible || CONFIG.whatsapp;
    },
    email: function () {
      return CONFIG.email;
    },
    instagram: function () {
      return CONFIG.instagram;
    },
    linkedin: function () {
      // Si todavía no hay URL mostramos el placeholder; si ya está, un texto corto.
      return esPendiente(CONFIG.linkedin) ? CONFIG.linkedin : "LinkedIn";
    },
    anio: function () {
      return String(new Date().getFullYear());
    },
  };

  const pendientes = new Set();

  function aplicarTextos() {
    document.querySelectorAll("[data-config]").forEach(function (elemento) {
      const clave = elemento.dataset.config;
      const resolver = textos[clave];
      if (typeof resolver !== "function") return;

      const valor = resolver();
      elemento.textContent = valor;
      if (esPendiente(valor)) pendientes.add(clave);
    });
  }

  // -----------------------------------------------------------------------
  // Enlaces
  // -----------------------------------------------------------------------
  const enlaces = {
    whatsapp: urlWhatsApp,
    email: urlEmail,
    instagram: urlInstagram,
    linkedin: urlLinkedIn,
  };

  function aplicarEnlaces() {
    document
      .querySelectorAll("[data-config-href]")
      .forEach(function (elemento) {
        const clave = elemento.dataset.configHref;
        const resolver = enlaces[clave];
        if (typeof resolver !== "function") return;

        const url = resolver(elemento.dataset.mensaje);
        if (url) {
          elemento.setAttribute("href", url);
          delete elemento.dataset.pendiente;
          elemento.removeAttribute("title");
          return;
        }

        // Mientras el dato falte, el enlace lleva a Contacto en vez de romperse.
        elemento.setAttribute("href", "#contacto");
        elemento.dataset.pendiente = "true";
        elemento.setAttribute("title", "Dato pendiente de configuración");
        pendientes.add(clave);
      });
  }

  function aplicarPanel() {
    const enlacePanel = document.querySelector("[data-panel]");
    if (!enlacePanel) return;

    const url = urlPanel();
    if (url) {
      enlacePanel.setAttribute("href", url);
      enlacePanel.hidden = false;
      return;
    }

    enlacePanel.hidden = true;
    enlacePanel.removeAttribute("href");
  }

  // -----------------------------------------------------------------------
  // Metadatos que dependen del dominio
  // -----------------------------------------------------------------------
  function aplicarMetadatos() {
    document.title = CONFIG.nombre + " | Sueldos, administración y RRHH";

    const ogSitio = document.querySelector('meta[property="og:site_name"]');
    if (ogSitio) ogSitio.setAttribute("content", CONFIG.nombre);

    const canonical = document.querySelector("[data-canonical]");
    const ogUrl = document.querySelector('meta[property="og:url"]');
    const ogImagen = document.querySelector('meta[property="og:image"]');
    const dominio = dominioLimpio();
    const publicado =
      CONFIG.dominioPublicado === true && dominio && !esPendiente(dominio);

    if (!publicado) {
      // Sin dominio definitivo no publicamos URLs absolutas ni canónicas.
      if (canonical) canonical.remove();
      if (ogUrl) ogUrl.remove();
      if (ogImagen) ogImagen.remove();
      return;
    }

    const base = "https://" + dominio;
    if (canonical) canonical.setAttribute("href", base + "/");
    if (ogUrl) ogUrl.setAttribute("content", base + "/");
    if (ogImagen) {
      ogImagen.setAttribute("content", base + "/assets/img/og-punto-optimo.png");
    }

    agregarDatosEstructurados(base);
  }

  // Datos estructurados (schema.org) para buscadores. Salen de CONFIG para no
  // repetir datos en el HTML, y solo se agregan con el dominio ya publicado.
  function agregarDatosEstructurados(base) {
    const redes = [urlInstagram(), urlLinkedIn()].filter(Boolean);
    const partes = String(CONFIG.ubicacion || "").split(",");
    const datos = {
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      name: CONFIG.nombre,
      description: CONFIG.bajada,
      url: base + "/",
      image: base + "/assets/img/og-punto-optimo.png",
      areaServed: "AR",
      address: {
        "@type": "PostalAddress",
        addressLocality: (partes[0] || "").trim(),
        addressRegion: (partes[1] || "").trim(),
        addressCountry: "AR",
      },
    };
    if (!esPendiente(CONFIG.email)) datos.email = CONFIG.email;
    if (!esPendiente(CONFIG.whatsapp)) datos.telephone = "+" + soloDigitos(CONFIG.whatsapp);
    if (redes.length) datos.sameAs = redes;

    const etiqueta = document.createElement("script");
    etiqueta.type = "application/ld+json";
    etiqueta.textContent = JSON.stringify(datos);
    document.head.appendChild(etiqueta);
  }

  // -----------------------------------------------------------------------
  // Aviso de mantenimiento: solo aparece si queda algún placeholder.
  // -----------------------------------------------------------------------
  function aplicarAvisoPendientes() {
    const aviso = document.querySelector("[data-aviso-pendientes]");
    if (!aviso) return;

    if (pendientes.size === 0) {
      aviso.hidden = true;
      return;
    }

    const etiquetas = {
      whatsapp: "WhatsApp",
      whatsappVisible: "WhatsApp",
      email: "correo",
      instagram: "Instagram",
      linkedin: "LinkedIn",
      nombreResponsable: "nombre de la responsable",
    };

    const lista = Array.from(pendientes)
      .map(function (clave) {
        return etiquetas[clave] || clave;
      })
      .join(", ");

    aviso.hidden = false;
    aviso.textContent =
      "Datos pendientes: " + lista + ". Completalos en js/config.js.";
  }

  function init() {
    aplicarTextos();
    aplicarEnlaces();
    aplicarPanel();
    aplicarMetadatos();
    aplicarAvisoPendientes();

    if (ns.reveal) ns.reveal.init();
    if (ns.nav) ns.nav.init();
    if (ns.lupa) ns.lupa.init();
    if (ns.ruta) ns.ruta.init();
    if (ns.fondo) ns.fondo.init();

    // Se inicia al final: así la barra y la lupa ya están suscriptas y el
    // primer aviso del scroll compartido las deja en su estado correcto.
    if (ns.scroll) ns.scroll.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})(window.PuntoOptimo = window.PuntoOptimo || {});
