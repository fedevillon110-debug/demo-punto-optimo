"use strict";
/* Instagram: el editor de publicaciones (instagram/) dentro del panel. */
window.addEventListener("message", function (e) {
  if (e.origin !== location.origin || !e.data || e.data.tipo !== "po-alto") return;
  var f = document.querySelector(".marco-ig"); if (f) f.style.height = Math.max(640, Number(e.data.alto) || 0) + "px";
});

Panel.vistas.instagram = function (main) {
  main.append(h("div", { class: "cabecera" }, h("div", {}, h("h1", {}, "Instagram"),
    h("p", { class: "sub" }, "Armá las imágenes de tus publicaciones: elegí una plantilla, completá los textos y descargalas."))));
  main.append(h("iframe", { class: "marco-ig", src: "instagram/index.html?embebido=1", title: "Editor de publicaciones de Instagram" }));
};
