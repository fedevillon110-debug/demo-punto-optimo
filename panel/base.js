/* Utilidades compartidas. Todo el texto que viene de los datos entra con textContent
   (nunca innerHTML), así un nombre o mensaje raro no puede romper ni inyectar nada. */
"use strict";
var Panel = { vistas: {}, opciones: null };

function h(tag, attrs) {
  var e = document.createElement(tag); attrs = attrs || {};
  for (var k in attrs) {
    var v = attrs[k];
    if (k === "on") { for (var ev in v) e.addEventListener(ev, v[k === "on" ? ev : k]); }
    else if (k === "class") e.className = v;
    else if (k === "dataset") { for (var d in v) e.dataset[d] = v[d]; }
    else if (k in e && k !== "list" && k !== "style") e[k] = v;
    else e.setAttribute(k, v);
  }
  for (var i = 2; i < arguments.length; i++) {
    var c = arguments[i];
    if (c == null || c === false) continue;
    if (Array.isArray(c)) c.forEach(function (x) { if (x != null && x !== false) e.append(x.nodeType ? x : document.createTextNode(x)); });
    else e.append(c.nodeType ? c : document.createTextNode(c));
  }
  return e;
}

/* append que ignora null/false (el append nativo los escribiría como texto "null") */
function agregar(el) {
  for (var i = 1; i < arguments.length; i++) { var c = arguments[i]; if (c != null && c !== false) el.append(c); }
  return el;
}

var Sesion = { csrf: "", usuario: null };

/* "/api/cv/1/archivo?formato=x"  ->  "api.php?r=cv/1/archivo&formato=x" */
function urlApi(ruta) {
  var m = ruta.replace(/^\/api\//, ""), i = m.indexOf("?");
  return "api.php?r=" + (i < 0 ? m : m.slice(0, i) + "&" + m.slice(i + 1));
}

function api(ruta, datos) {
  var o = { credentials: "same-origin", headers: { "X-Requested-With": "po", "Content-Type": "application/json", "X-CSRF-Token": Sesion.csrf } };
  if (datos !== undefined) { o.method = "POST"; o.body = JSON.stringify(datos); }
  return fetch(urlApi(ruta), o).then(function (r) {
    return r.json().catch(function () { throw new Error("El servidor no respondió como se esperaba."); }).then(function (j) {
      if (r.status === 401 && ruta !== "/api/login" && Panel.sinSesion) Panel.sinSesion();
      if (!r.ok) throw new Error(j.error || "Algo salió mal.");
      return j;
    });
  });
}

var _tAviso;
function avisar(msg, error) {
  var a = document.getElementById("aviso"); a.textContent = msg; a.className = "v" + (error ? " e" : "");
  clearTimeout(_tAviso); _tAviso = setTimeout(function () { a.className = ""; }, error ? 6000 : 2800);
}
function falla(e) { avisar(e.message || "Algo salió mal.", true); }

var peso = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
function plata(n) { return n ? peso.format(n) : ""; }

var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
function hoyISO() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function fechaCorta(iso) {
  if (!iso) return "";
  var p = iso.split("-"); if (p.length !== 3) return iso;
  return parseInt(p[2], 10) + " " + MESES[parseInt(p[1], 10) - 1].slice(0, 3);
}
function fechaLarga(ts) { return ts ? new Date(ts * 1000).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" }) : ""; }
function diasHasta(iso) { return Math.round((new Date(iso + "T00:00:00") - new Date(hoyISO() + "T00:00:00")) / 86400000); }
function chipVence(t) {
  if (!t.vence) return null;
  if (t.estado === "hecho") return h("span", { class: "chip" }, "Hecho");
  var d = diasHasta(t.vence);
  if (d < 0) return h("span", { class: "chip rojo" }, "Venció " + fechaCorta(t.vence));
  if (d === 0) return h("span", { class: "chip ambar" }, "Vence hoy");
  if (d === 1) return h("span", { class: "chip ambar" }, "Vence mañana");
  return h("span", { class: "chip" }, "Vence " + fechaCorta(t.vence));
}

function opcion(valor, texto, actual) { return h("option", { value: valor, selected: String(valor) === String(actual) }, texto); }

function campo(etiqueta, el) { return h("label", { class: "campo" }, etiqueta, el); }

function cargarOpciones() {
  return api("/api/opciones").then(function (o) { Panel.opciones = o; return o; });
}

/* ventana de edición */
function abrirVentana(contenido, ancha) {
  var d = document.getElementById("ventana"); d.textContent = ""; d.className = ancha ? "ancha" : "";
  d.append(h("div", { class: "ventana vidrio" }, contenido));
  if (!d.open) d.showModal();
  return d;
}
function cerrarVentana() { var d = document.getElementById("ventana"); if (d.open) d.close(); }
document.addEventListener("click", function (e) { var d = document.getElementById("ventana"); if (e.target === d) cerrarVentana(); });

function confirmar(msg) { return window.confirm(msg); }

var ICONO_OK = function () {
  var s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("viewBox", "0 0 24 24");
  var p = document.createElementNS("http://www.w3.org/2000/svg", "path"); p.setAttribute("d", "M5 12.5l4.5 4.5L19 7.5"); s.append(p); return s;
};
