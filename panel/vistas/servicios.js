"use strict";
/* Servicios: el catálogo de lo que ofrece Punto Óptimo. Sumar un servicio es agregar una fila. */
function ventanaServicio(s) {
  s = s || {};
  var f = {};
  f.nombre = h("input", { value: s.nombre || "" }); f.categoria = h("input", { value: s.categoria || "", list: "cats", placeholder: "Sueldos, Administración…" });
  f.precio_base = h("input", { type: "number", min: 0, step: "any", value: s.precio_base || "", placeholder: "$" });
  f.recurrente = h("input", { type: "checkbox", checked: !!s.recurrente });
  f.activo = h("input", { type: "checkbox", checked: s.activo === undefined ? true : !!s.activo });
  f.descripcion = h("textarea", { rows: 3, value: s.descripcion || "" });
  var cats = h("datalist", { id: "cats" }); Array.from(new Set(Panel.opciones.servicios.map(function (x) { return x.categoria; }))).forEach(function (c) { cats.append(h("option", { value: c })); });
  abrirVentana([h("h2", {}, s.id ? "Editar servicio" : "Nuevo servicio"), cats,
    h("div", { class: "rejilla" }, campo("Nombre", f.nombre), campo("Categoría", f.categoria), campo("Precio base (opcional)", f.precio_base)),
    h("label", { style: "display:flex;gap:.5rem;align-items:center;margin-top:.7rem" }, f.recurrente, "Se repite todos los meses (aparece al generar los trabajos del mes)"),
    s.id ? h("label", { style: "display:flex;gap:.5rem;align-items:center;margin-top:.4rem" }, f.activo, "Servicio activo") : null,
    h("div", { style: "margin-top:.7rem" }, campo("Descripción", f.descripcion)),
    h("div", { class: "botones" }, h("button", { class: "btn", type: "button", on: { click: function () {
      var d = {}; for (var k in f) d[k] = f[k].type === "checkbox" ? f[k].checked : f[k].value;
      (s.id ? api("/api/servicios/" + s.id, d) : api("/api/servicios", d)).then(function () { cerrarVentana(); avisar("Guardado"); cargarOpciones().then(Panel.mostrar); }).catch(falla);
    } } }, "Guardar"), h("button", { class: "btn sec", type: "button", on: { click: cerrarVentana } }, "Cancelar"),
      s.id ? h("button", { class: "btn peligro der", type: "button", on: { click: function () {
        if (confirmar("¿Borrar este servicio?")) api("/api/servicios/" + s.id + "/borrar", {}).then(function () { cerrarVentana(); avisar("Borrado"); cargarOpciones().then(Panel.mostrar); }).catch(falla); } } }, "Borrar") : null)]);
}

Panel.vistas.servicios = function (main) {
  return cargarOpciones().then(function () { return api("/api/servicios"); }).then(function (lista) {
    main.append(h("div", { class: "cabecera" }, h("div", {}, h("h1", {}, "Servicios"), h("p", { class: "sub" }, "Lo que ofrecés. Cada trabajo se asocia a uno de estos servicios.")),
      h("div", { class: "acc" }, h("button", { class: "btn", type: "button", on: { click: function () { ventanaServicio(); } } }, "+ Nuevo servicio"))));
    var tabla = h("table", {}, h("tr", {}, h("th", {}, "Servicio"), h("th", {}, "Categoría"), h("th", {}, "Precio base"), h("th", {}, "Frecuencia"), h("th", {}, "")));
    lista.forEach(function (s) {
      tabla.append(h("tr", { style: s.activo ? "" : "opacity:.5" },
        h("td", {}, h("b", {}, s.nombre), s.descripcion ? h("div", { class: "chico suave" }, s.descripcion) : null),
        h("td", {}, s.categoria), h("td", {}, plata(s.precio_base) || "A convenir"),
        h("td", {}, s.recurrente ? h("span", { class: "chip agua" }, "Mensual") : h("span", { class: "chip" }, "Puntual"), s.activo ? null : h("span", { class: "chip", style: "margin-left:.3rem" }, "Inactivo")),
        h("td", { style: "text-align:right" }, h("button", { class: "btn sec chico", type: "button", on: { click: function () { ventanaServicio(s); } } }, "Editar"))));
    });
    main.append(h("div", { class: "tarjeta vidrio" }, tabla));
  });
};
