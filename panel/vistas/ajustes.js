"use strict";
Panel.vistas.ajustes = function (main) {
  return Promise.all([api("/api/ajustes"), api("/api/usuarios")]).then(function (r) {
    var a = r[0], usuarios = r[1];
    main.append(h("div", { class: "cabecera" }, h("div", {}, h("h1", {}, "Ajustes"), h("p", { class: "sub" }, "Cuenta, equipo y conexión con la IA."))));

    // contraseña
    var act = h("input", { type: "password", autocomplete: "current-password" }), nue = h("input", { type: "password", autocomplete: "new-password" });
    main.append(h("div", { class: "tarjeta vidrio", style: "max-width:38rem;margin-bottom:1rem" }, h("h2", { style: "margin-bottom:.8rem" }, "Mi contraseña"),
      h("div", { class: "rejilla" }, campo("Contraseña actual", act), campo("Contraseña nueva (10 o más, letras y números)", nue)),
      h("div", { style: "margin-top:.9rem" }, h("button", { class: "btn", type: "button", on: { click: function () {
        api("/api/cuenta/clave", { actual: act.value, nueva: nue.value }).then(function () { act.value = nue.value = ""; avisar("Contraseña cambiada"); }).catch(falla); } } }, "Cambiar contraseña"))));

    main.append(waEditor());

    // IA (en la demo no hay conexión con ningún servicio externo)
    main.append(h("div", { class: "tarjeta vidrio", style: "max-width:38rem;margin-bottom:1rem" }, h("h2", { style: "margin-bottom:.4rem" }, "Análisis de CV con IA"),
      h("p", { class: "chico suave" }, "En la versión real, acá se carga la clave de la API de IA. En esta demo el botón “Analizar” de un CV devuelve un resultado de ejemplo, sin enviar nada a internet.")));

    // equipo
    var u = h("input", { autocomplete: "off", placeholder: "usuario" }), n = h("input", { placeholder: "Nombre" }), c = h("input", { type: "password", autocomplete: "new-password" });
    var tabla = h("table", {}, h("tr", {}, h("th", {}, "Usuario"), h("th", {}, "Nombre"), h("th", {}, "Estado"), h("th", {}, "")));
    usuarios.forEach(function (x) {
      var yo = Sesion.usuario && x.usuario === Sesion.usuario.usuario;
      tabla.append(h("tr", {}, h("td", {}, x.usuario, yo ? h("span", { class: "chip", style: "margin-left:.4rem" }, "Vos") : null), h("td", {}, x.nombre),
        h("td", {}, x.activo ? h("span", { class: "chip verde" }, "Activo") : h("span", { class: "chip" }, "Desactivado")),
        h("td", { style: "text-align:right" }, yo ? null : h("button", { class: "btn sec chico", type: "button", on: { click: function () {
          api("/api/usuarios/" + x.id + "/activo", { activo: !x.activo }).then(function () { Panel.mostrar(); }).catch(falla); } } }, x.activo ? "Desactivar" : "Reactivar"))));
    });
    main.append(h("div", { class: "tarjeta vidrio", style: "max-width:38rem;margin-bottom:1rem" }, h("h2", { style: "margin-bottom:.6rem" }, "Equipo"), tabla,
      h("h3", { style: "margin:1rem 0 .5rem" }, "Agregar un usuario"),
      h("div", { class: "rejilla" }, campo("Usuario", u), campo("Nombre", n), campo("Contraseña", c)),
      h("div", { style: "margin-top:.9rem" }, h("button", { class: "btn", type: "button", on: { click: function () {
        api("/api/usuarios", { usuario: u.value, nombre: n.value, clave: c.value }).then(function () { avisar("Usuario creado"); Panel.mostrar(); }).catch(falla); } } }, "Crear usuario"))));

    main.append(h("div", { class: "tarjeta vidrio", style: "max-width:38rem" }, h("h2", { style: "margin-bottom:.4rem" }, "Copia de seguridad"),
      h("p", { class: "chico suave" }, "Un .zip con la base de datos y todos los CV. Conviene descargarla seguido y guardarla en un lugar seguro."),
      h("a", { class: "btn sec", href: urlApi("/api/backup") }, "Descargar copia de seguridad")));
  });
};
