"use strict";
/* Trabajos: tablero por estado (o lista), filtros, ventana de edición y generación del mes. */
var _tab = { modo: "tablero", cliente: "", servicio: "", q: "" };
try { _tab.modo = localStorage.getItem("po-modo") || "tablero"; } catch (e) {}

var ORDEN_ESTADOS = ["pendiente", "en curso", "esperando cliente", "hecho"];
var ROTULO = { "pendiente": "Pendiente", "en curso": "En curso", "esperando cliente": "Esperando cliente", "hecho": "Hecho" };

function cartaTrabajo(t) {
  var i = ORDEN_ESTADOS.indexOf(t.estado), mover = h("div", { class: "mover" });
  function ir(est, txt) {
    return h("button", { class: "btn sec chico", type: "button", title: "Pasar a " + ROTULO[est],
      on: { click: function (e) { e.stopPropagation(); api("/api/trabajos/" + t.id, { estado: est }).then(Panel.mostrar).catch(falla); } } }, txt);
  }
  if (i > 0) mover.append(ir(ORDEN_ESTADOS[i - 1], "←"));
  if (i < 3) mover.append(ir(ORDEN_ESTADOS[i + 1], i === 2 ? "Hecho ✓" : "→"));
  return h("div", { class: "carta", on: { click: function () { editarTrabajo(t.id); } } },
    h("div", { class: "t" }, t.titulo),
    t.cliente ? h("div", { class: "s suave chico" }, t.cliente) : null,
    t.tareas_total ? h("div", { class: "barra", title: t.tareas_hechas + " de " + t.tareas_total + " pasos" }, h("i", { style: "width:" + Math.round(100 * t.tareas_hechas / t.tareas_total) + "%" })) : null,
    h("div", { class: "pie" }, chipVence(t),
      t.prioridad === "alta" && t.estado !== "hecho" ? h("span", { class: "chip rojo" }, "Prioridad") : null,
      t.monto ? h("span", { class: "chip " + (t.pagado ? "verde" : "") }, plata(t.monto) + (t.pagado ? " · cobrado" : "")) : null),
    mover.children.length ? mover : null);
}

Panel.vistas.trabajos = function (main) {
  var params = new URLSearchParams((location.hash.split("?")[1] || ""));
  if (params.get("cliente")) _tab.cliente = params.get("cliente");
  return cargarOpciones().then(function (o) {
    var q = [];
    if (_tab.cliente) q.push("cliente_id=" + encodeURIComponent(_tab.cliente));
    if (_tab.servicio) q.push("servicio_id=" + encodeURIComponent(_tab.servicio));
    if (_tab.q) q.push("q=" + encodeURIComponent(_tab.q));
    return api("/api/trabajos" + (q.length ? "?" + q.join("&") : "")).then(function (lista) {
      var hechos = lista.filter(function (t) { return t.estado === "hecho"; });
      var modo = h("div", { class: "interruptor" },
        ["tablero", "lista"].map(function (m) {
          return h("button", { type: "button", class: _tab.modo === m ? "on" : "", on: { click: function () { _tab.modo = m; try { localStorage.setItem("po-modo", m); } catch (e) {} Panel.mostrar(); } } }, m === "tablero" ? "Tablero" : "Lista");
        }));
      main.append(h("div", { class: "cabecera" }, h("div", {}, h("h1", {}, "Trabajos"), h("p", { class: "sub" }, "Todo lo que hay para hacer, y lo que ya está hecho.")),
        h("div", { class: "acc" }, modo,
          h("button", { class: "btn sec", type: "button", on: { click: ventanaMes } }, "Generar trabajos del mes"),
          h("button", { class: "btn", type: "button", on: { click: function () { editarTrabajo(null, _tab.cliente ? { cliente_id: Number(_tab.cliente) } : null); } } }, "+ Nuevo trabajo"))));

      var buscar = h("input", { type: "search", placeholder: "Buscar trabajo o cliente", value: _tab.q });
      buscar.addEventListener("change", function () { _tab.q = buscar.value.trim(); Panel.mostrar(); });
      var sc = h("select", { on: { change: function () { _tab.cliente = sc.value; if (location.hash.indexOf("?") > 0) history.replaceState(null, "", "#/trabajos"); Panel.mostrar(); } } }, opcion("", "Todos los clientes", _tab.cliente));
      o.clientes.forEach(function (c) { sc.append(opcion(c.id, c.nombre, _tab.cliente)); });
      var ss = h("select", { on: { change: function () { _tab.servicio = ss.value; Panel.mostrar(); } } }, opcion("", "Todos los servicios", _tab.servicio));
      o.servicios.forEach(function (s) { ss.append(opcion(s.id, s.nombre, _tab.servicio)); });
      main.append(h("div", { class: "filtros" }, buscar, sc, ss));

      if (!lista.length) { main.append(h("div", { class: "vacio vidrio tarjeta" }, "No hay trabajos con estos filtros.")); return; }

      if (_tab.modo === "lista") {
        main.append(h("div", { class: "lista" }, lista.slice().sort(function (a, b) {
          return (ORDEN_ESTADOS.indexOf(a.estado) === 3) - (ORDEN_ESTADOS.indexOf(b.estado) === 3);
        }).map(function (t) { return filaTrabajo(t); })));
        return;
      }
      var tablero = h("div", { class: "tablero" });
      ORDEN_ESTADOS.forEach(function (est) {
        var items = lista.filter(function (t) { return t.estado === est; });
        if (est === "hecho") items = items.sort(function (a, b) { return b.completado - a.completado; }).slice(0, 15);
        tablero.append(h("section", { class: "col vidrio" }, h("h3", {}, ROTULO[est], h("span", { class: "chip" }, String(lista.filter(function (t) { return t.estado === est; }).length))),
          h("div", { class: "lista" }, items.length ? items.map(cartaTrabajo) : h("div", { class: "vacio chico" }, est === "hecho" ? "Todavía nada hecho" : "Sin trabajos"))));
      });
      main.append(tablero);
      if (hechos.length > 15) main.append(h("p", { class: "chico suave" }, "Se muestran los 15 hechos más recientes. Para ver todos, usá la vista Lista."));
    });
  });
};

function ventanaMes() {
  var d = new Date(), mes = h("input", { type: "month", value: d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") });
  abrirVentana([h("h2", {}, "Generar trabajos del mes"),
    h("p", { class: "suave" }, "Crea un trabajo por cada servicio mensual cargado en los clientes (liquidación de sueldos, conciliaciones…). Si ya existe, no lo repite."),
    campo("Mes", mes),
    h("div", { class: "botones" }, h("button", { class: "btn", type: "button", on: { click: function () {
      api("/api/generar-mes", { periodo: mes.value }).then(function (r) {
        cerrarVentana(); avisar(r.creados ? "Se crearon " + r.creados + " trabajos" + (r.ya_existian ? " (" + r.ya_existian + " ya existían)" : "") : "No había nada nuevo para crear"); Panel.mostrar();
      }).catch(falla);
    } } }, "Generar"), h("button", { class: "btn sec", type: "button", on: { click: cerrarVentana } }, "Cancelar"))]);
}

/* ----- ventana de un trabajo ----- */
function editarTrabajo(id, pre) {
  var carga = id ? api("/api/trabajos/" + id) : Promise.resolve(Object.assign({ estado: "pendiente", prioridad: "normal", tareas: [] }, pre || {}));
  return Promise.all([carga, cargarOpciones()]).then(function (r) {
    var t = r[0], o = r[1], campos = {};
    function sel(nombre, etiqueta, opciones, actual) {
      var s = h("select"); opciones.forEach(function (x) { s.append(opcion(x[0], x[1], actual)); }); campos[nombre] = s; return campo(etiqueta, s);
    }
    function inp(nombre, etiqueta, tipo, valor, extra) {
      var i = h("input", Object.assign({ type: tipo, value: valor == null ? "" : valor }, extra || {})); campos[nombre] = i; return campo(etiqueta, i);
    }
    var servicios = [["", "— Elegí —"]].concat(o.servicios.map(function (s) { return [s.id, s.nombre]; }));
    var clientes = [["", "— Sin cliente —"]].concat(o.clientes.map(function (c) { return [c.id, c.nombre]; }));
    var fServ = sel("servicio_id", "Servicio", servicios, t.servicio_id || "");
    campos.servicio_id.addEventListener("change", function () {  // sugiere el precio del servicio si el monto está vacío
      var s = o.servicios.filter(function (x) { return String(x.id) === campos.servicio_id.value; })[0];
      if (s && s.precio_base && !Number(campos.monto.value)) campos.monto.value = s.precio_base;
    });
    var pagado = h("input", { type: "checkbox", checked: !!t.pagado }); campos.pagado = pagado;
    var notas = h("textarea", { rows: 3, value: t.notas || "" }); campos.notas = notas;

    var cont = [h("h2", {}, id ? "Trabajo" : "Nuevo trabajo"),
      h("div", { class: "rejilla" },
        sel("cliente_id", "Cliente", clientes, t.cliente_id || ""), fServ,
        inp("titulo", "Título (opcional)", "text", t.titulo, { placeholder: "Se arma solo si lo dejás vacío" }),
        sel("estado", "Estado", o.estados.map(function (e) { return [e, ROTULO[e]]; }), t.estado),
        sel("prioridad", "Prioridad", o.prioridades.map(function (p) { return [p, p.charAt(0).toUpperCase() + p.slice(1)]; }), t.prioridad),
        inp("vence", "Vence", "date", t.vence), inp("periodo", "Período (si es mensual)", "month", t.periodo),
        inp("monto", "Monto", "number", t.monto || "", { min: 0, step: "any", placeholder: "$" }),
        campo("Cobrado", h("label", { style: "display:flex;gap:.5rem;align-items:center;padding:.4rem 0;font-weight:500" }, pagado, "Ya se cobró"))),
      campo("Notas", notas)];

    if (id) {  // los pasos del trabajo
      var caja = h("div"), nueva = h("input", { placeholder: "Agregar un paso y tocar Enter" });
      var pintar = function (tareas) {
        caja.textContent = "";
        tareas.forEach(function (k) {
          var c = h("input", { type: "checkbox", checked: !!k.hecha });
          c.addEventListener("change", function () { api("/api/tareas/" + k.id, { hecha: c.checked }).then(function () { k.hecha = c.checked ? 1 : 0; pintar(tareas); }).catch(falla); });
          caja.append(h("div", { class: "tarea" + (k.hecha ? " hecha" : "") }, c, h("span", {}, k.texto),
            h("button", { class: "x", type: "button", title: "Quitar paso", "aria-label": "Quitar paso", on: { click: function () {
              api("/api/tareas/" + k.id + "/borrar", {}).then(function () { tareas.splice(tareas.indexOf(k), 1); pintar(tareas); }).catch(falla); } } }, "×")));
        });
      };
      pintar(t.tareas);
      nueva.addEventListener("keydown", function (e) {
        if (e.key !== "Enter" || !nueva.value.trim()) return;
        e.preventDefault();
        api("/api/tareas", { trabajo_id: id, texto: nueva.value.trim(), orden: t.tareas.length }).then(function (k) { t.tareas.push(k); nueva.value = ""; pintar(t.tareas); }).catch(falla);
      });
      cont.push(h("h3", { style: "margin-top:1.1rem" }, "Pasos"), caja, nueva);
    }

    function guardar(extra) {
      var d = {};
      for (var k in campos) d[k] = campos[k].type === "checkbox" ? campos[k].checked : campos[k].value;
      Object.assign(d, extra || {});
      var llamada = id ? api("/api/trabajos/" + id, d) : api("/api/trabajos", d);
      return llamada.then(function (nuevo) {
        avisar("Guardado"); if (!id && !extra) { return editarTrabajo(nuevo.id); } cerrarVentana(); Panel.mostrar();
      }).catch(falla);
    }
    var botones = h("div", { class: "botones" }, h("button", { class: "btn", type: "button", on: { click: function () { guardar(); } } }, id ? "Guardar" : "Crear y agregar pasos"));
    if (id && t.estado !== "hecho") botones.append(h("button", { class: "btn agua", type: "button", on: { click: function () { guardar({ estado: "hecho" }); } } }, "Marcar hecho ✓"));
    if (id && t.cliente) botones.append(waBoton("trabajo", t, "btn agua"));
    botones.append(h("button", { class: "btn sec", type: "button", on: { click: cerrarVentana } }, "Cerrar"));
    if (id) botones.append(h("button", { class: "btn peligro der", type: "button", on: { click: function () {
      if (confirmar("¿Borrar este trabajo? No se puede deshacer.")) api("/api/trabajos/" + id + "/borrar", {}).then(function () { cerrarVentana(); avisar("Borrado"); Panel.mostrar(); }).catch(falla); } } }, "Borrar"));
    cont.push(botones);
    abrirVentana(cont);
  }).catch(falla);
}
