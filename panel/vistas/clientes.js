"use strict";
/* Clientes: lista con buscador, ficha, servicios mensuales (contratos) y sus trabajos. */
var _cli = { q: "", sel: null };

function ventanaCliente(c) {
  c = c || {};
  var o = Panel.opciones, f = {};
  function inp(n, et, tipo) { f[n] = h("input", { type: tipo || "text", value: c[n] || "" }); return campo(et, f[n]); }
  f.tipo = h("select"); o.tipos_cliente.forEach(function (t) { f.tipo.append(opcion(t, t.charAt(0).toUpperCase() + t.slice(1), c.tipo || "comercio")); });
  f.notas = h("textarea", { rows: 3, value: c.notas || "" });
  f.activo = h("input", { type: "checkbox", checked: c.activo === undefined ? true : !!c.activo });
  abrirVentana([h("h2", {}, c.id ? "Editar cliente" : "Nuevo cliente"),
    h("div", { class: "rejilla" }, inp("nombre", "Nombre o razón social"), campo("Tipo", f.tipo), inp("contacto", "Persona de contacto"),
      inp("whatsapp", "WhatsApp", "tel"), inp("email", "Email", "email"), inp("ciudad", "Ciudad")),
    campo("Notas", f.notas),
    c.id ? h("label", { style: "display:flex;gap:.5rem;align-items:center;margin-top:.6rem" }, f.activo, "Cliente activo (desmarcá para archivarlo)") : null,
    h("div", { class: "botones" }, h("button", { class: "btn", type: "button", on: { click: function () {
      var d = {}; for (var k in f) d[k] = f[k].type === "checkbox" ? f[k].checked : f[k].value;
      (c.id ? api("/api/clientes/" + c.id, d) : api("/api/clientes", d)).then(function (n) {
        cerrarVentana(); avisar("Guardado"); _cli.sel = n.id; cargarOpciones().then(Panel.mostrar);
      }).catch(falla);
    } } }, "Guardar"), h("button", { class: "btn sec", type: "button", on: { click: cerrarVentana } }, "Cancelar"),
      c.id ? h("button", { class: "btn peligro der", type: "button", on: { click: function () {
        if (confirmar("¿Borrar a " + c.nombre + "? Si tiene trabajos, no se va a poder: en ese caso archivalo.")) api("/api/clientes/" + c.id + "/borrar", {}).then(function () {
          cerrarVentana(); _cli.sel = null; avisar("Borrado"); cargarOpciones().then(Panel.mostrar); }).catch(falla); } } }, "Borrar") : null)]);
}

Panel.vistas.clientes = function (main) {
  var params = new URLSearchParams((location.hash.split("?")[1] || ""));
  if (params.get("id")) _cli.sel = Number(params.get("id"));
  return cargarOpciones().then(function () { return api("/api/clientes?q=" + encodeURIComponent(_cli.q)); }).then(function (lista) {
    var buscar = h("input", { type: "search", placeholder: "Buscar cliente", value: _cli.q });
    buscar.addEventListener("change", function () { _cli.q = buscar.value.trim(); Panel.mostrar(); });
    var indice = h("aside", { class: "indice vidrio" }, buscar, h("div", { style: "height:.6rem" }));
    lista.forEach(function (c) {
      indice.append(h("div", { class: "item" + (_cli.sel === c.id ? " on" : "") + (c.activo ? "" : " inactivo"), on: { click: function () { _cli.sel = c.id; Panel.mostrar(); } } },
        h("b", {}, c.nombre), h("span", { class: "chico suave" }, [c.tipo, c.ciudad].filter(Boolean).join(" · ")),
        h("span", {}, c.abiertos ? h("span", { class: "chip" }, c.abiertos + " abiertos") : null, c.por_cobrar ? h("span", { class: "chip ambar", style: "margin-left:.3rem" }, c.por_cobrar + " por cobrar") : null,
          c.activo ? null : h("span", { class: "chip" }, "Archivado"))));
    });
    if (!lista.length) indice.append(h("div", { class: "vacio chico" }, _cli.q ? "Nadie coincide con la búsqueda." : "Todavía no hay clientes."));

    main.append(h("div", { class: "cabecera" }, h("div", {}, h("h1", {}, "Clientes"), h("p", { class: "sub" }, lista.length + (lista.length === 1 ? " cliente" : " clientes"))),
      h("div", { class: "acc" }, h("button", { class: "btn", type: "button", on: { click: function () { ventanaCliente(); } } }, "+ Nuevo cliente"))));
    var der = h("div", {}, h("div", { class: "vacio vidrio tarjeta" }, "Elegí un cliente de la lista, o creá uno nuevo."));
    main.append(h("div", { class: "dos" }, indice, der));
    if (_cli.sel) return fichaCliente(der, _cli.sel);
  });
};

function fichaCliente(der, id) {
  return api("/api/clientes/" + id).then(function (c) {
    der.textContent = "";
    var digitos = (c.whatsapp || "").replace(/\D/g, "");
    der.append(h("div", { class: "tarjeta vidrio" },
      h("div", { style: "display:flex;gap:.8rem;align-items:flex-start;flex-wrap:wrap" }, h("div", {}, h("h2", {}, c.nombre),
        h("p", { class: "suave chico" }, [c.tipo, c.ciudad, c.contacto].filter(Boolean).join(" · "))),
        h("div", { style: "margin-left:auto;display:flex;gap:.5rem;flex-wrap:wrap" },
          c.whatsapp ? waBoton("cliente", c) : null,
          c.email ? h("a", { class: "btn sec chico", href: "mailto:" + c.email }, "Email") : null,
          h("button", { class: "btn sec chico", type: "button", on: { click: function () { ventanaCliente(c); } } }, "Editar"))),
      c.notas ? h("p", { class: "chico", style: "white-space:pre-wrap" }, c.notas) : null,
      c.activo ? null : h("p", {}, h("span", { class: "chip" }, "Cliente archivado"))));

    // servicios mensuales
    var o = Panel.opciones, caja = h("div", { class: "tarjeta vidrio", style: "margin-top:1rem" });
    caja.append(h("h2", {}, "Servicios que se repiten"), h("p", { class: "chico suave" }, "Cargalos una vez y cada mes se generan solos los trabajos desde Trabajos → “Generar trabajos del mes”."));
    var tabla = h("table", {}, h("tr", {}, h("th", {}, "Servicio"), h("th", {}, "Monto"), h("th", {}, "Vence el día"), h("th", {}, "")));
    c.contratos.forEach(function (k) {
      tabla.append(h("tr", {}, h("td", {}, k.servicio, k.activo ? null : h("span", { class: "chip", style: "margin-left:.4rem" }, "Pausado")), h("td", {}, plata(k.monto) || "—"), h("td", {}, String(k.dia_venc)),
        h("td", { style: "text-align:right;white-space:nowrap" },
          h("button", { class: "btn sec chico", type: "button", on: { click: function () { api("/api/contratos/" + k.id, { activo: !k.activo }).then(function () { fichaCliente(der, id); }).catch(falla); } } }, k.activo ? "Pausar" : "Reanudar"), " ",
          h("button", { class: "btn peligro chico", type: "button", on: { click: function () { if (confirmar("¿Quitar este servicio mensual?")) api("/api/contratos/" + k.id + "/borrar", {}).then(function () { fichaCliente(der, id); }).catch(falla); } } }, "Quitar"))));
    });
    if (c.contratos.length) caja.append(tabla);
    var ss = h("select"); o.servicios.filter(function (s) { return s.recurrente; }).forEach(function (s) { ss.append(opcion(s.id, s.nombre, "")); });
    var monto = h("input", { type: "number", min: 0, step: "any", placeholder: "Monto mensual" }), dia = h("input", { type: "number", min: 1, max: 31, value: 10 });
    caja.append(h("div", { class: "rejilla", style: "margin-top:.8rem;align-items:end" }, campo("Servicio mensual", ss), campo("Monto", monto), campo("Vence el día", dia),
      h("button", { class: "btn chico", type: "button", on: { click: function () {
        api("/api/contratos", { cliente_id: id, servicio_id: ss.value, monto: monto.value, dia_venc: dia.value }).then(function () { avisar("Agregado"); fichaCliente(der, id); }).catch(falla);
      } } }, "Agregar")));
    der.append(caja);

    // trabajos
    var tr = h("div", { class: "tarjeta vidrio", style: "margin-top:1rem" }, h("div", { style: "display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin-bottom:.6rem" }, h("h2", {}, "Trabajos"),
      h("button", { class: "btn chico", style: "margin-left:auto", type: "button", on: { click: function () { editarTrabajo(null, { cliente_id: id }); } } }, "+ Nuevo trabajo")));
    var abiertos = c.trabajos.filter(function (t) { return t.estado !== "hecho"; }), hechos = c.trabajos.filter(function (t) { return t.estado === "hecho"; });
    if (!c.trabajos.length) tr.append(h("div", { class: "vacio chico" }, "Todavía no hay trabajos para este cliente."));
    tr.append(h("div", { class: "lista" }, abiertos.concat(hechos).map(function (t) { return filaTrabajo(t); })));
    der.append(tr);
  });
}
