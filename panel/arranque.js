/* Ingreso (instalación / login), navegación por # y arranque. */
"use strict";
(function () {
  var main = document.getElementById("vista"), app = document.getElementById("app"), entrada = document.getElementById("entrada");
  var navegando = false;

  function actual() { return (location.hash.replace(/^#\//, "") || "inicio").split("?")[0]; }

  function mostrar() {
    var v = actual(); if (!Panel.vistas[v]) v = "inicio";
    document.querySelectorAll("#menu a").forEach(function (a) { a.classList.toggle("on", a.dataset.v === v); });
    main.textContent = "";
    document.title = "Punto Óptimo · " + (v === "cv" ? "CV" : v.charAt(0).toUpperCase() + v.slice(1));
    Panel.refrescar = mostrar;
    Promise.resolve(Panel.vistas[v](main)).catch(falla);
    api("/api/inicio").then(function (i) {
      var n = document.getElementById("n-cv"); n.hidden = !i.cv_nuevos; n.textContent = i.cv_nuevos;
    }).catch(function () {});
  }
  Panel.mostrar = mostrar;

  /* ---- pantallas de ingreso ---- */
  function logo() { return h("picture", {}, h("source", { srcset: "logo-blanco.svg", media: "(prefers-color-scheme: dark)" }), h("img", { src: "logo-color.svg", alt: "Punto Óptimo" })); }

  function pantalla(titulo, texto, campos, boton, enviar) {
    app.hidden = true; entrada.hidden = false; entrada.textContent = "";
    var error = h("div", { class: "error", role: "alert" });
    var form = h("form", { class: "tarjeta vidrio", novalidate: true }, logo(), h("h1", {}, titulo), texto ? h("p", { class: "suave chico" }, texto) : null,
      campos.map(function (c) { return campo(c.etiqueta, c.el); }), error, h("button", { class: "btn", type: "submit" }, boton));
    form.addEventListener("submit", function (e) {
      e.preventDefault(); var b = form.querySelector("button"); b.disabled = true; error.textContent = "";
      Promise.resolve().then(enviar).catch(function (err) { error.textContent = err.message; }).finally(function () { b.disabled = false; });
    });
    entrada.append(form);
    var primero = form.querySelector("input"); if (primero) primero.focus();
  }

  function pantallaLogin() {
    var u = h("input", { autocomplete: "username", required: true, value: "admin" }), c = h("input", { type: "password", autocomplete: "current-password", required: true, value: "admin" });
    pantalla("Ingresar al panel", "Versión de demostración: el usuario y la contraseña son admin / admin (ya están cargados).", [{ etiqueta: "Usuario", el: u }, { etiqueta: "Contraseña", el: c }], "Ingresar", function () {
      return api("/api/login", { usuario: u.value, clave: c.value }).then(entrar);
    });
  }

  function pantallaInstalar() {
    var k = h("input", { type: "password", autocomplete: "off" }), u = h("input", { autocomplete: "username", placeholder: "usuario" }), n = h("input", { placeholder: "Nombre" });
    var c1 = h("input", { type: "password", autocomplete: "new-password" }), c2 = h("input", { type: "password", autocomplete: "new-password" });
    pantalla("Crear el primer usuario", "Se hace una sola vez. La clave de instalación está en el archivo panel/config.php del servidor.",
      [{ etiqueta: "Clave de instalación", el: k }, { etiqueta: "Usuario (minúsculas, sin espacios)", el: u }, { etiqueta: "Nombre", el: n },
       { etiqueta: "Contraseña (10 caracteres o más, con letras y números)", el: c1 }, { etiqueta: "Repetir contraseña", el: c2 }], "Crear usuario", function () {
        if (c1.value !== c2.value) throw new Error("Las contraseñas no coinciden.");
        return api("/api/instalar", { clave_instalacion: k.value, usuario: u.value, nombre: n.value, clave: c1.value }).then(entrar);
      });
  }

  function entrar(s) {
    Sesion.csrf = s.csrf; Sesion.usuario = s;
    entrada.hidden = true; entrada.textContent = ""; app.hidden = false;
    document.getElementById("usuario").textContent = s.nombre || s.usuario;
    if (!navegando) { window.addEventListener("hashchange", mostrar); navegando = true; }
    return cargarOpciones().then(mostrar);
  }

  Panel.sinSesion = function () { if (entrada.hidden) { Sesion.csrf = ""; cerrarVentana(); pantallaLogin(); avisar("Tu sesión terminó. Volvé a ingresar.", true); } };

  document.getElementById("salir").addEventListener("click", function () {
    api("/api/salir", {}).catch(function () {}).then(function () { Sesion.csrf = ""; location.hash = ""; pantallaLogin(); });
  });

  function sinServidor(archivo) {
    app.hidden = true; entrada.hidden = false; entrada.textContent = "";
    entrada.append(h("div", { class: "tarjeta vidrio" }, logo(), h("h1", {}, "No se pudo abrir el panel"),
      h("p", {}, archivo ? "Este archivo no funciona abierto con doble clic: el panel necesita el servidor de la web." : "No se pudo conectar con el servidor."),
      h("p", { class: "suave chico" }, archivo ? "Abrilo desde la dirección de la web (…/panel/)." : "Revisá tu conexión y recargá la página.")));
  }

  if (location.protocol === "file:") { sinServidor(true); return; }
  api("/api/estado").then(function (e) {
    if (!e.instalado) return pantallaInstalar();
    if (!e.sesion) return pantallaLogin();
    return entrar(e.sesion);
  }).catch(function () { sinServidor(false); });
})();
