"use strict";
/* Inicio: qué hay que hacer hoy, qué está atrasado y qué falta cobrar. */
function filaTrabajo(t, opts) {
  opts = opts || {};
  var hecho = t.estado === "hecho";
  var ok = h("button", { class: "visto", type: "button", title: hecho ? "Reabrir" : "Marcar como hecho", "aria-label": hecho ? "Reabrir" : "Marcar como hecho",
    on: { click: function (e) {
      e.stopPropagation();
      api("/api/trabajos/" + t.id, { estado: hecho ? "pendiente" : "hecho" }).then(function () {
        avisar(hecho ? "Reabierto" : "¡Hecho!"); Panel.mostrar();
      }).catch(falla);
    } } }, ICONO_OK());
  return h("div", { class: "fila vidrio" + (hecho ? " hecho-fila" : ""), on: { click: function () { editarTrabajo(t.id); } } },
    ok,
    h("div", {}, h("div", { class: "t" }, t.titulo),
      h("div", { class: "s" }, [t.cliente || "Sin cliente", t.tareas_total ? " · " + t.tareas_hechas + "/" + t.tareas_total + " pasos" : ""].join(""))),
    h("div", { style: "display:flex;gap:.4rem;align-items:center;flex-wrap:wrap;justify-content:flex-end" },
      t.prioridad === "alta" && !hecho ? h("span", { class: "chip rojo" }, "Prioridad") : null,
      t.estado === "esperando cliente" ? h("span", { class: "chip ambar" }, "Esperando cliente") : null,
      opts.cobro ? h("span", { class: "chip verde" }, plata(t.monto)) : chipVence(t)));
}

Panel.vistas.inicio = function (main) {
  return api("/api/inicio").then(function (i) {
    var hora = new Date().getHours(), saludo = hora < 6 ? "Buenas noches" : hora < 13 ? "Buenos días" : hora < 20 ? "Buenas tardes" : "Buenas noches";
    var f = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
    var abiertos = i.estados["pendiente"] + i.estados["en curso"] + i.estados["esperando cliente"];

    main.append(h("div", { class: "cabecera" }, h("div", {}, h("h1", {}, saludo + (Sesion.usuario && Sesion.usuario.nombre ? ", " + Sesion.usuario.nombre.split(" ")[0] : "")), h("p", { class: "sub" }, f.charAt(0).toUpperCase() + f.slice(1))),
      h("div", { class: "acc" },
        h("button", { class: "btn", type: "button", on: { click: function () { editarTrabajo(null); } } }, "+ Nuevo trabajo"),
        h("a", { class: "btn sec", href: "#/clientes" }, "Clientes"))));

    if (i.cv_nuevos) main.append(h("div", { class: "aviso-cv vidrio" }, h("span", {}, "📄"),
      h("div", {}, h("b", {}, i.cv_nuevos + (i.cv_nuevos === 1 ? " CV nuevo" : " CV nuevos")), h("div", { class: "chico suave" }, "Esperando que los revises.")),
      h("a", { class: "btn agua chico", style: "margin-left:auto", href: "#/cv" }, "Ver CV")));

    main.append(h("div", { class: "resumen" },
      h("a", { class: "dato vidrio" + (i.atrasados.length ? " alerta" : ""), href: "#/trabajos" }, h("b", {}, String(i.atrasados.length)), h("span", {}, "Atrasados")),
      h("a", { class: "dato vidrio", href: "#/trabajos" }, h("b", {}, String(i.estados["en curso"])), h("span", {}, "En curso")),
      h("a", { class: "dato vidrio", href: "#/trabajos" }, h("b", {}, String(i.estados["esperando cliente"])), h("span", {}, "Esperando al cliente")),
      h("a", { class: "dato vidrio", href: "#/trabajos" }, h("b", {}, String(abiertos)), h("span", {}, "Pendientes en total")),
      h("div", { class: "dato vidrio" }, h("b", {}, plata(i.por_cobrar.total) || "$ 0"), h("span", {}, "Por cobrar (" + i.por_cobrar.cantidad + ")")),
      h("div", { class: "dato vidrio" }, h("b", {}, plata(i.cobrado_mes) || "$ 0"), h("span", {}, "Cobrado este mes"))));

    function bloque(titulo, lista, chip, opts) {
      if (!lista.length) return;
      main.append(h("section", { class: "bloque" }, h("h2", {}, titulo, h("span", { class: "chip " + (chip || "") }, String(lista.length))),
        h("div", { class: "lista" }, lista.map(function (t) { return filaTrabajo(t, opts); }))));
    }
    bloque("Atrasados", i.atrasados, "rojo");
    bloque("Para hoy", i.hoy_vencen, "ambar");
    bloque("Esta semana", i.semana);
    bloque("Sin fecha", i.sin_fecha);
    bloque("Por cobrar", i.por_cobrar.lista, "verde", { cobro: true });

    if (!abiertos && !i.por_cobrar.cantidad) main.append(h("div", { class: "vacio vidrio tarjeta" }, h("h2", {}, "Todo al día 🎉"),
      h("p", {}, "No hay trabajos pendientes. Cuando haya algo nuevo, agregalo con “+ Nuevo trabajo”."),
      h("p", { class: "chico" }, "Tip: en Clientes podés dejar los servicios mensuales cargados y generar los trabajos del mes con un clic.")));

    if (i.hechos_recientes.length) main.append(h("section", { class: "bloque" }, h("h2", {}, "Hecho recientemente"),
      h("div", { class: "lista" }, i.hechos_recientes.map(function (t) { return filaTrabajo(t); }))));
  });
};
