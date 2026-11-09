"use strict";
/* CV: los que llegaron por la web, con análisis, recomendaciones y entrega. Más "Lugares" donde recomendar. */
var _cv = { sub: "cvs", sel: null, q: "", estado: "", servicio: "", estados: ["nuevo", "revisado", "clasificado", "recomendado", "mejora en curso", "entregado", "archivado"] };

Panel.vistas.cv = function (main) {
  var tabs = h("div", { class: "interruptor" }, [["cvs", "CV recibidos"], ["lugares", "Lugares"]].map(function (x) {
    return h("button", { type: "button", class: _cv.sub === x[0] ? "on" : "", on: { click: function () { _cv.sub = x[0]; Panel.mostrar(); } } }, x[1]);
  }));
  main.append(h("div", { class: "cabecera" }, h("div", {}, h("h1", {}, "CV"), h("p", { class: "sub" }, "La base de datos de CV que llegan por la web: cambiá el estado, analizalos, recomendalos o mejoralos.")), h("div", { class: "acc" }, tabs)));
  return _cv.sub === "lugares" ? vistaLugares(main) : vistaCvs(main);
};

function vistaCvs(main) {
  return api("/api/cvs").then(function (todos) {
    var q = normalizarTexto(_cv.q);
    var lista = todos.filter(function (c) {
      return (!_cv.estado || c.estado === _cv.estado) && (!_cv.servicio || c.servicio === _cv.servicio) &&
        (!q || normalizarTexto(c.nombre + " " + c.rubro + " " + c.zona + " " + c.etiquetas + " " + c.codigo + " " + c.contacto).indexOf(q) >= 0);
    });
    var buscar = h("input", { type: "search", placeholder: "Buscar por nombre, rubro, zona, etiqueta o contacto", value: _cv.q });
    buscar.addEventListener("change", function () { _cv.q = buscar.value.trim(); Panel.mostrar(); });
    var se = h("select", { on: { change: function () { _cv.estado = se.value; Panel.mostrar(); } } }, opcion("", "Todos los estados", _cv.estado));
    _cv.estados.forEach(function (e) { se.append(opcion(e, e, _cv.estado)); });
    var ss = h("select", { on: { change: function () { _cv.servicio = ss.value; Panel.mostrar(); } } }, opcion("", "Todos los servicios", _cv.servicio), opcion("clasificar", "Orientación", _cv.servicio), opcion("mejorar", "Mejora de CV", _cv.servicio));
    main.append(h("div", { class: "filtros" }, buscar, se, ss, h("span", { class: "chico suave", style: "align-self:center" }, lista.length + " de " + todos.length + " CV")));

    if (!lista.length) { main.append(h("div", { class: "vacio vidrio tarjeta" }, todos.length ? "Nada coincide con el filtro." : "Todavía no llegó ningún CV. Cuando alguien lo envíe desde la web, aparece acá.")); return; }

    var tabla = h("table", {}, h("tr", {}, ["Recibido", "Nombre", "Contacto", "Rubro / zona", "Servicio", "Estado", "Pago"].map(function (t) { return h("th", {}, t); })));
    lista.forEach(function (c) {
      var est = h("select", { "aria-label": "Estado de " + c.nombre, on: { click: function (e) { e.stopPropagation(); }, change: function () {
        api("/api/cv/" + c.id, { estado: est.value }).then(function () { avisar("Estado actualizado"); c.estado = est.value; }).catch(function (e) { falla(e); est.value = c.estado; });
      } } });
      _cv.estados.forEach(function (e) { est.append(opcion(e, e, c.estado)); });
      tabla.append(h("tr", { class: "fila-cv", on: { click: function () { abrirCv(c.id); } } },
        h("td", {}, fechaLarga(c.recibido)), h("td", {}, h("span", { class: "nom" }, c.nombre), c.estado === "nuevo" ? h("span", { class: "chip agua", style: "margin-left:.4rem" }, "Nuevo") : null),
        h("td", {}, c.contacto), h("td", {}, [c.rubro, c.zona].filter(Boolean).join(" · ")),
        h("td", {}, c.servicio === "mejorar" ? h("span", { class: "chip agua" }, "Mejora de CV") : h("span", { class: "chip" }, "Orientación")),
        h("td", {}, est),
        h("td", {}, c.pago === "pendiente" ? h("span", { class: "chip ambar" }, "Pendiente") : c.pago === "pagado" ? h("span", { class: "chip verde" }, "Pagado") : "")));
    });
    main.append(h("div", { class: "tarjeta vidrio tabla-cv" }, tabla), h("p", { class: "chico suave" }, "Tocá una fila para ver el CV, analizarlo, recomendarlo o entregarlo."));
    if (_cv.sel) { var id = _cv.sel; _cv.sel = null; abrirCv(id); }
  });
}

function normalizarTexto(t) { return String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

function abrirCv(id) {
  return api("/api/cv/" + id).then(function (c) {
    var cont = h("div"); detalleCv(cont, c); abrirVentana(cont, true);
  }).catch(falla);
}

function detalleCv(der, c) {
  var digitos = String(c.contacto || "").replace(/\D/g, ""), esMail = c.contacto.indexOf("@") >= 0, f = {};
  var caja = h("div", { class: "tarjeta vidrio" });
  f.estado = h("select"); _cv.estados.forEach(function (e) { f.estado.append(opcion(e, e, c.estado)); });
  f.pago = h("select", {}, ["", "pendiente", "pagado"].map(function (p) { return opcion(p, p || "No aplica", c.pago); }));
  f.rubro = h("input", { value: c.rubro }); f.zona = h("input", { value: c.zona }); f.etiquetas = h("input", { value: c.etiquetas, placeholder: "ventas, caja, atención" });
  f.monto = h("input", { value: c.monto, placeholder: "$" }); f.notas = h("textarea", { rows: 3, value: c.notas });

  agregar(caja, h("div", { style: "display:flex;gap:.8rem;flex-wrap:wrap;align-items:flex-start" }, h("div", {}, h("h2", {}, c.nombre),
    h("p", { class: "chico suave" }, "Código " + c.codigo + " · recibido el " + fechaLarga(c.recibido) + " · " + (c.servicio === "mejorar" ? "Pidió mejora de CV" : "Pidió orientación")),
    h("p", {}, c.contacto)),
    h("div", { style: "margin-left:auto;display:flex;gap:.5rem;flex-wrap:wrap" },
      !esMail && digitos.length >= 8 ? waBoton("cv", c) : null,
      esMail ? h("a", { class: "btn sec chico", href: "mailto:" + c.contacto }, "Email") : null,
      h("a", { class: "btn chico", href: urlApi("/api/cv/" + c.id + "/archivo"), target: "_blank" }, "Ver CV original"),
      c.trabajo_id ? h("button", { class: "btn sec chico", type: "button", on: { click: function () { cerrarVentana(); editarTrabajo(c.trabajo_id); } } }, "Ver trabajo") : null)),
    c.mensaje ? h("p", { class: "chico suave" }, "Mensaje: " + c.mensaje) : null,
    h("div", { class: "rejilla", style: "margin-top:.8rem" }, campo("Estado", f.estado), campo("Rubro", f.rubro), campo("Zona", f.zona), campo("Etiquetas (coma)", f.etiquetas), campo("Pago", f.pago), campo("Monto cobrado", f.monto)),
    h("div", { style: "margin-top:.7rem" }, campo("Notas privadas", f.notas)),
    h("div", { style: "margin-top:.8rem" }, h("button", { class: "btn", type: "button", on: { click: function () {
      var d = {}; for (var k in f) d[k] = f[k].value;
      api("/api/cv/" + c.id, d).then(function () { avisar("Guardado"); Panel.mostrar(); abrirCv(c.id); }).catch(falla); } } }, "Guardar cambios")));
  der.append(caja);

  // IA
  var ia = h("div", { class: "tarjeta vidrio", style: "margin-top:1rem" }, h("h2", {}, "Análisis con IA"),
    h("p", { class: "chico suave" }, "El CV se envía al servicio de IA solo cuando tocás un botón. Revisá siempre el resultado antes de entregarlo."));
  function correr(modo, btn) {
    var t = btn.textContent; btn.disabled = true; btn.textContent = "Analizando… puede tardar un minuto";
    api("/api/cv/" + c.id + "/analizar", { modo: modo }).then(function () { avisar("Listo"); Panel.mostrar(); abrirCv(c.id); }).catch(function (e) { falla(e); btn.disabled = false; btn.textContent = t; });
  }
  var b1 = h("button", { class: "btn sec", type: "button" }, "Clasificar y recomendar"), b2 = h("button", { class: "btn", type: "button" }, "Analizar y mejorar CV");
  b1.addEventListener("click", function () { correr("clasificar", b1); }); b2.addEventListener("click", function () { correr("mejorar", b2); });
  ia.append(h("div", { style: "display:flex;gap:.6rem;flex-wrap:wrap" }, b1, b2));
  var inf = c.informe;
  if (inf) {
    ia.append(h("div", { style: "margin-top:.9rem" }, inf.puntaje != null ? h("div", {}, h("span", { class: "puntaje" }, inf.puntaje + "/100"), " calidad actual del CV") : null,
      h("p", {}, inf.resumen || ""), h("p", {}, inf.nivel ? h("span", { class: "chip" }, inf.nivel) : null, " ", inf.rubro ? h("span", { class: "chip agua" }, inf.rubro) : null)));
    (inf.problemas || []).forEach(function (p) { ia.append(h("div", { class: "prob " + (p.gravedad || "") }, h("b", {}, p.tema || ""), h("br"), p.detalle || "")); });
    if ((inf.recomendaciones || []).length) {
      ia.append(h("h3", { style: "margin-top:.9rem" }, "Dónde conviene postularse"));
      inf.recomendaciones.forEach(function (r) { ia.append(h("p", { class: "chico" }, "• " + (typeof r === "string" ? r : (r.lugar || r.puesto || "") + (r.razon ? ": " + r.razon : "")))); });
    }
    if (inf.problemas) ia.append(h("div", { style: "margin-top:.6rem" }, h("a", { class: "btn sec chico", href: urlApi("/api/cv/" + c.id + "/exportar?formato=informe"), target: "_blank" }, "Abrir informe (para imprimir o guardar en PDF)")));
  }
  der.append(ia);

  if (c.servicio === "mejorar" || c.cv_mejorado) {
    var ta = h("textarea", { rows: 16, value: c.cv_mejorado, placeholder: "Acá aparece el CV mejorado. Podés editarlo antes de entregarlo." });
    der.append(h("div", { class: "tarjeta vidrio", style: "margin-top:1rem" }, h("h2", {}, "CV mejorado"), campo("Texto (# Nombre, ## Sección, - viñeta)", ta),
      h("div", { style: "display:flex;gap:.6rem;margin-top:.7rem;flex-wrap:wrap" },
        h("button", { class: "btn sec", type: "button", on: { click: function () { api("/api/cv/" + c.id, { cv_mejorado: ta.value }).then(function () { avisar("Guardado"); }).catch(falla); } } }, "Guardar texto"),
        h("button", { class: "btn", type: "button", on: { click: function () { api("/api/cv/" + c.id, { cv_mejorado: ta.value }).then(function () { window.open(urlApi("/api/cv/" + c.id + "/exportar?formato=docx")); }).catch(falla); } } }, "Descargar en Word"))));
  }

  // recomendar
  var rec = h("div", { class: "tarjeta vidrio", style: "margin-top:1rem" }, h("h2", {}, "Recomendar a un lugar"));
  var cont = h("div", {}, h("p", { class: "chico suave" }, "Buscando coincidencias…")); rec.append(cont); der.append(rec);
  api("/api/cv/" + c.id + "/sugerencias").then(function (s) {
    cont.textContent = "";
    if (!s.length) cont.append(h("p", { class: "chico suave" }, "Sin coincidencias. Cargá lugares en la pestaña “Lugares” y poné etiquetas al CV para que aparezcan sugerencias."));
    s.forEach(function (l) {
      cont.append(h("div", { class: "sug" }, h("span", {}, h("b", {}, l.nombre), " ", h("span", { class: "chico suave" }, [l.rubro, l.zona].filter(Boolean).join(" · ")),
        l.coincide.length ? h("div", { class: "chico suave" }, "Coincide: " + l.coincide.join(", ")) : null),
        h("button", { class: "btn chico " + (l.ya_recomendado ? "sec" : ""), type: "button", on: { click: function () {
          api("/api/cv/" + c.id + "/recomendar", { lugar_id: l.id }).then(function () { avisar("Recomendación registrada"); Panel.mostrar(); abrirCv(c.id); }).catch(falla); } } }, l.ya_recomendado ? "Recomendar de nuevo" : "Marcar como recomendado")));
    });
  }).catch(falla);
  if (c.recomendaciones.length) { rec.append(h("h3", { style: "margin-top:.9rem" }, "Historial")); c.recomendaciones.forEach(function (r) { rec.append(h("p", { class: "chico suave" }, fechaLarga(r.fecha) + " · " + r.nombre)); }); }
}

function vistaLugares(main) {
  return api("/api/lugares").then(function (ls) {
    var f = {};
    function cp(k, et, ph) { f[k] = h("input", { placeholder: ph || "" }); return campo(et, f[k]); }
    f.notas = h("textarea", { rows: 3 });
    var alta = h("div", { class: "tarjeta vidrio" }, h("h2", {}, "Nuevo lugar"), h("p", { class: "chico suave" }, "Empresas, comercios o estudios donde recomendar candidatos. Las etiquetas hacen que el panel sugiera los CV que encajan."),
      h("div", { class: "rejilla", style: "margin-top:.6rem" }, cp("nombre", "Nombre"), cp("rubro", "Rubro", "Comercio, estudio contable…"), cp("etiquetas", "Etiquetas (coma)", "ventas, caja, atención"), cp("zona", "Zona"), cp("contacto", "Contacto")),
      h("div", { style: "margin-top:.6rem" }, campo("Notas", f.notas)),
      h("div", { style: "margin-top:.8rem" }, h("button", { class: "btn", type: "button", on: { click: function () {
        var d = {}; for (var k in f) d[k] = f[k].value;
        api("/api/lugares", d).then(function () { avisar("Guardado"); Panel.mostrar(); }).catch(falla); } } }, "Agregar lugar")));
    var tabla = h("table", {}, h("tr", {}, h("th", {}, "Lugar"), h("th", {}, "Rubro"), h("th", {}, "Etiquetas"), h("th", {}, "Zona"), h("th", {}, "")));
    ls.forEach(function (l) {
      tabla.append(h("tr", {}, h("td", {}, h("b", {}, l.nombre), h("div", { class: "chico suave" }, l.contacto)), h("td", {}, l.rubro), h("td", {}, l.etiquetas), h("td", {}, l.zona),
        h("td", {}, h("button", { class: "btn peligro chico", type: "button", on: { click: function () {
          if (confirmar("¿Borrar “" + l.nombre + "”? También se borran sus recomendaciones.")) api("/api/lugares/" + l.id + "/borrar", {}).then(Panel.mostrar).catch(falla); } } }, "Borrar"))));
    });
    main.append(h("div", { class: "dos", style: "grid-template-columns:minmax(18rem,26rem) 1fr" }, alta,
      h("div", { class: "tarjeta vidrio" }, h("h2", {}, "Lugares (" + ls.length + ")"), ls.length ? tabla : h("div", { class: "vacio" }, "Todavía no cargaste lugares."))));
  });
}
