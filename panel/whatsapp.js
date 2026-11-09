/* Mensajes de WhatsApp con un toque.
   Un botón "WhatsApp" abre una ventana con mensajes ya redactados: se completan solos con los datos
   del cliente / trabajo / CV, se pueden editar y se abren en WhatsApp con el texto escrito.
   No envía nada solo: la persona revisa y toca enviar. Los mensajes se editan en Ajustes. */
"use strict";

var WA_DE_FABRICA = [
  { id: "cv_recibido", nombre: "CV recibido", donde: ["cv"],
    texto: "Hola {nombre}, soy {firma} de Punto Óptimo. Recibí tu CV (código {codigo}). Lo reviso y te escribo pronto con novedades." },
  { id: "cv_pago", nombre: "Coordinar el pago de la mejora", donde: ["cv"],
    texto: "Hola {nombre}, para empezar con la mejora de tu CV (código {codigo}) coordinamos el pago: {monto}. ¿Cómo preferís abonar? — {firma}, Punto Óptimo" },
  { id: "pedir_docs", nombre: "Pedir novedades o documentación", donde: ["trabajo", "cliente"],
    texto: "Hola {nombre}, para {servicio} de {periodo} necesito las novedades antes del {vence}. ¡Gracias! — {firma}, Punto Óptimo" },
  { id: "entrega", nombre: "Aviso de entrega", donde: ["trabajo", "cv"],
    texto: "Hola {nombre}, ya está listo: {servicio}. Te lo envío por acá. Cualquier duda, avisame. — {firma}, Punto Óptimo" },
  { id: "cobro", nombre: "Recordatorio de cobro", donde: ["trabajo", "cv"],
    texto: "Hola {nombre}, te recuerdo que está pendiente el pago de {servicio} ({monto}). Cuando lo hagas, avisame y te confirmo. ¡Gracias! — {firma}, Punto Óptimo" },
  { id: "bienvenida", nombre: "Bienvenida a cliente nuevo", donde: ["cliente"],
    texto: "Hola {nombre}, ¡bienvenido/a a Punto Óptimo! Soy {firma}. Cualquier consulta, escribime por este medio y te respondo en el día." }
];

var WA_VARIABLES = ["nombre", "servicio", "periodo", "vence", "monto", "codigo", "firma"];
var WA_DONDE = [["trabajo", "Trabajos"], ["cv", "CV"], ["cliente", "Clientes"]];

/* Número argentino -> formato de wa.me (549 + área + número). Devuelve "" si no se puede armar. */
function waNumero(texto) {
  var d = String(texto || "").replace(/\D/g, "").replace(/^00/, "");
  if (d.indexOf("54") === 0) d = d.slice(2);
  d = d.replace(/^0+/, "");
  if (d.charAt(0) === "9" && d.length === 11) d = d.slice(1);
  return d.length === 10 ? "549" + d : "";
}

/* Reemplaza {variables}; lo que falta queda entre [corchetes] para que se note y se complete a mano. */
function waRellenar(texto, vars) {
  return String(texto).replace(/\{(\w+)\}/g, function (m, k) {
    return vars[k] != null && vars[k] !== "" ? vars[k] : (WA_VARIABLES.indexOf(k) >= 0 ? "[" + k + "]" : m);
  });
}

function waFechaLarga(iso) {
  var p = String(iso || "").split("-"); if (p.length !== 3) return "";
  return parseInt(p[2], 10) + " de " + MESES[parseInt(p[1], 10) - 1];
}
function waPeriodo(per) {
  var p = String(per || "").split("-"); if (p.length !== 2) return "";
  return MESES[parseInt(p[1], 10) - 1] + " " + p[0];
}
function waFirma() { return (Sesion.usuario && Sesion.usuario.nombre ? Sesion.usuario.nombre : "").split(" ")[0]; }

/* Mensajes vigentes (los guardados en Ajustes o los de fábrica). */
var _waCache = null;
function waPlantillas() {
  if (_waCache) return Promise.resolve(_waCache);
  return api("/api/ajustes").then(function (a) {
    _waCache = a.plantillas_wa && a.plantillas_wa.length ? a.plantillas_wa : WA_DE_FABRICA;
    return _waCache;
  });
}

/* Datos que se usan para completar el mensaje, según desde dónde se abre. */
function waContexto(donde, o) {
  if (donde === "trabajo") {
    return { donde: donde, nombre: o.cliente || "", telefono: o.cliente_whatsapp || "",
      vars: { nombre: o.cliente || "", servicio: o.servicio || o.titulo || "", periodo: waPeriodo(o.periodo), vence: waFechaLarga(o.vence), monto: o.monto ? plata(o.monto) : "", codigo: "" } };
  }
  if (donde === "cv") {
    var esMail = String(o.contacto || "").indexOf("@") >= 0;
    return { donde: donde, nombre: o.nombre, telefono: esMail ? "" : o.contacto,
      vars: { nombre: String(o.nombre || "").split(/\s+/)[0], servicio: o.servicio === "mejorar" ? "la mejora de tu CV" : "la orientación sobre tu CV", periodo: "", vence: "", monto: o.monto ? plata(Number(o.monto)) : "", codigo: o.codigo || "" } };
  }
  return { donde: "cliente", nombre: o.nombre, telefono: o.whatsapp || "",
    vars: { nombre: o.nombre || "", servicio: "", periodo: "", vence: "", monto: "", codigo: "" } };
}

/* Ventana: elegir mensaje, revisarlo y abrirlo en WhatsApp. */
function waAbrir(ctx) {
  return waPlantillas().then(function (todas) {
    var vars = Object.assign({ firma: waFirma() }, ctx.vars);
    var num = waNumero(ctx.telefono);
    var lista = todas.filter(function (p) { return (p.donde || []).indexOf(ctx.donde) >= 0; });
    if (!lista.length) lista = todas;
    var texto = h("textarea", { rows: 7, maxLength: 1500 });
    var enlace = h("a", { class: "btn agua", target: "_blank", rel: "noopener" }, "Abrir en WhatsApp");
    var aviso = h("p", { class: "chico suave" });
    var chips = h("div", { class: "wa-plant" });
    function actualizar() {
      enlace.href = "https://wa.me/?text=" + encodeURIComponent(texto.value);
      var faltan = (texto.value.match(/\[(nombre|servicio|periodo|vence|monto|codigo|firma)\]/g) || []);
      aviso.textContent = faltan.length ? "Falta completar: " + faltan.join(" ") + ". Escribilo en el mensaje antes de enviar." : "Revisalo y, si todo está bien, tocá “Abrir en WhatsApp”: el mensaje no se envía hasta que lo mandes vos.";
    }
    function elegir(p, boton) {
      chips.querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b === boton); b.setAttribute("aria-pressed", String(b === boton)); });
      texto.value = waRellenar(p.texto, vars); actualizar();
    }
    lista.forEach(function (p) {
      var b = h("button", { class: "btn sec chico", type: "button", "aria-pressed": "false", on: { click: function () { elegir(p, b); } } }, p.nombre);
      chips.append(b);
    });
    texto.addEventListener("input", actualizar);
    abrirVentana([h("h2", {}, "WhatsApp a " + (ctx.nombre || "") ),
      num ? h("p", { class: "chico suave" }, "Demo: el número de este cliente es de ejemplo, así que WhatsApp te pedirá elegir un contacto (no se envía nada a nadie).") : h("p", { class: "chico", style: "color:var(--rojo,#b3261e)" }, "No hay un número de WhatsApp válido guardado. Podés abrir WhatsApp igual y elegir el contacto ahí."),
      h("p", { class: "etq-chicos" }, "Elegí un mensaje"), chips,
      campo("Mensaje (podés editarlo)", texto), aviso,
      h("div", { class: "botones" }, enlace,
        h("button", { class: "btn sec", type: "button", on: { click: function () {
          (navigator.clipboard ? navigator.clipboard.writeText(texto.value) : Promise.reject()).then(function () { avisar("Mensaje copiado"); }, function () { texto.select(); avisar("Seleccionalo y copialo con Ctrl+C", true); }); } } }, "Copiar texto"),
        h("button", { class: "btn sec", type: "button", on: { click: cerrarVentana } }, "Cerrar"))]);
    var primera = chips.querySelector("button"); if (primera) primera.click();
  }).catch(falla);
}

/* Botón "WhatsApp" para poner en trabajos, CV y clientes. */
function waBoton(donde, objeto, clase) {
  return h("button", { class: clase || "btn agua chico", type: "button", on: { click: function () { waAbrir(waContexto(donde, objeto)); } } }, "WhatsApp");
}

/* ----- Editor de mensajes (pantalla de Ajustes) ----- */
function waEditor() {
  var caja = h("div", { class: "tarjeta vidrio", style: "max-width:38rem;margin-bottom:1rem" });
  function pintar(lista) {
    caja.textContent = "";
    var filas = lista.map(function (p) {
      var nombre = h("input", { value: p.nombre, maxLength: 60, "aria-label": "Nombre del mensaje" });
      var texto = h("textarea", { rows: 3, maxLength: 1000, "aria-label": "Texto del mensaje" }); texto.value = p.texto;
      var marcas = WA_DONDE.map(function (d) {
        var c = h("input", { type: "checkbox", checked: (p.donde || []).indexOf(d[0]) >= 0 });
        return { v: d[0], c: c, el: h("label", { class: "chico", style: "display:inline-flex;gap:.3rem;align-items:center;margin-right:.8rem" }, c, d[1]) };
      });
      var fila = h("div", { class: "wa-fila" }, campo("Nombre", nombre), campo("Texto", texto),
        h("div", { class: "chico suave", style: "margin-top:.3rem" }, "Aparece en: ", marcas.map(function (m) { return m.el; })),
        h("button", { class: "btn peligro chico", type: "button", style: "margin-top:.5rem", on: { click: function () {
          if (!confirmar("¿Quitar este mensaje?")) return;
          var l = leer(); l.splice(filas.indexOf(fila), 1); pintar(l); } } }, "Quitar"));
      fila.__leer = function () { return { id: p.id, nombre: nombre.value.trim(), texto: texto.value.trim(), donde: marcas.filter(function (m) { return m.c.checked; }).map(function (m) { return m.v; }) }; };
      return fila;
    });
    function leer() { return filas.map(function (f) { return f.__leer(); }); }
    caja.append(h("h2", { style: "margin-bottom:.4rem" }, "Mensajes de WhatsApp"),
      h("p", { class: "chico suave" }, "Son los mensajes que aparecen al tocar el botón WhatsApp. Se completan solos con estos datos: ",
        WA_VARIABLES.map(function (v) { return h("code", { style: "margin-right:.4rem" }, "{" + v + "}"); }), ". Si falta alguno, queda entre [corchetes] para completarlo a mano."),
      h("div", {}, filas),
      h("div", { style: "margin-top:.9rem;display:flex;gap:.6rem;flex-wrap:wrap" },
        h("button", { class: "btn sec", type: "button", on: { click: function () {
          var l = leer(); if (l.length >= 20) return avisar("Máximo 20 mensajes.", true);
          l.push({ id: "", nombre: "Mensaje nuevo", texto: "Hola {nombre}, ", donde: ["trabajo", "cv", "cliente"] }); pintar(l); } } }, "+ Agregar mensaje"),
        h("button", { class: "btn", type: "button", on: { click: function () {
          api("/api/ajustes", { plantillas_wa: leer() }).then(function (a) { _waCache = null; avisar("Mensajes guardados"); pintar(a.plantillas_wa || WA_DE_FABRICA); }).catch(falla); } } }, "Guardar mensajes"),
        h("button", { class: "btn sec", type: "button", on: { click: function () {
          if (confirmar("¿Volver a los mensajes originales? Se pierden los cambios.")) api("/api/ajustes", { plantillas_wa: null }).then(function () { _waCache = null; avisar("Mensajes originales restaurados"); pintar(WA_DE_FABRICA); }).catch(falla); } } }, "Volver a los originales")));
  }
  waPlantillas().then(pintar);
  return caja;
}
