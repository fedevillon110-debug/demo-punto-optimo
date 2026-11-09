/* ==========================================================================
   CONFIGURACIÓN · Punto Óptimo
   Único archivo que hay que editar para cambiar los datos de contacto.
   Los valores entre corchetes son placeholders visibles en la web.
   ========================================================================== */

(function (ns) {
  "use strict";

  ns.CONFIG = Object.freeze({
    /* Dominio definitivo. Se usa para la URL canónica y Open Graph cuando
       dominioPublicado sea true. No hace falta escribir el dominio en el HTML. */
    dominio: "puntooptimo.com.ar",
    dominioPublicado: false,

    /* Panel privado de gestión (Etapa 2). El enlace del pie queda oculto
       mientras panelHabilitado sea false. */
    urlPanel: "panel/",
    panelHabilitado: true,

    /* Identidad */
    nombre: "Punto Óptimo",
    bajada: "Soluciones en RRHH y administración",
    ubicacion: "Argentina",

    /* WhatsApp: número completo con código de país, sin "+", sin espacios
       ni guiones. Ejemplo: 5493454123456. El texto se envía prellenado. */
    whatsapp: "5490000000000",
    /* Cómo se ve el número en la sección Contacto (solo presentación). */
    whatsappVisible: "+54 9 0000 00-0000",
    mensajeWhatsapp:
      "Hola, te escribo desde la web de Punto Óptimo. Quiero hacerte una consulta.",

    email: "contacto@ejemplo.com",
    /* PROVISORIOS: ni el Instagram ni el LinkedIn están creados todavía.
       Se cargan así para ver el diseño final; reemplazar al abrir las cuentas. */
    instagram: "@ejemplo",
    linkedin: "https://www.linkedin.com/company/ejemplo",

    nombreResponsable: "Responsable de Punto Óptimo",

    /* Sección "Tu CV": envío de CV y servicio de mejora.
       apiUrl: donde está api/cv.php (relativa al sitio).
       precioMejora: texto que se muestra (ej. "$15.000"); mientras diga
         "[PRECIO]" se muestra "Consultar precio".
       linkPago: link de pago (ej. Mercado Pago "Link de pago"). Si está
         vacío, el cobro se coordina por WhatsApp. Ver docs/opciones-de-cobro.md. */
    cv: Object.freeze({
      apiUrl: "api/cv.php",
      precioMejora: "[PRECIO]",
      linkPago: "",
      maxMB: 5,
    }),

    /* Parámetros de animación del sitio. Cada bloque trae su propio detalle. */
    animaciones: Object.freeze({
      /* Barra flotante: píxeles de scroll a partir de los cuales se oscurece
         y gana sombra (ver nav.js y components.css). */
      barra: Object.freeze({
        umbralScroll: 24,
      }),

      /* Lupa de la portada: péndulo con inercia.
         amplitudGrados / amplitudGradosCelular: inclinación máxima a cada lado.
         pixelesPorCiclo: píxeles de scroll para un vaivén completo (centro, un
         lado, el otro lado y vuelta al centro).
         suavizado: 0 a 1; cuánto se acerca por cuadro al ángulo objetivo.
         anchoCelular: por debajo de este ancho se usa la amplitud de celular. */
      lupa: Object.freeze({
        amplitudGrados: 4,
        amplitudGradosCelular: 3,
        pixelesPorCiclo: 500,
        suavizado: 0.12,
        anchoCelular: 640,
      }),
    }),
  });
})(window.PuntoOptimo = window.PuntoOptimo || {});
