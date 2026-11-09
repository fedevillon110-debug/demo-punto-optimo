/* Editor de publicaciones · Punto Óptimo (v1)
   Dibuja cada lámina en un <canvas> de 1080 × 1350 y la exporta como PNG.
   Sin dependencias ni servidor: se abre con doble clic o con `python3 -m http.server`. */
(function () {
  "use strict";
  var W = 1080, H = 1350, M = 84;
  var COLOR = { tinta: "#04345c", azul: "#166eb2", agua: "#59d1c5", blanco: "#ffffff" };
  var FT = '"Outfit", system-ui, sans-serif', FX = '"Poppins", system-ui, sans-serif', FM = 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';

  /* ---------- Plantillas: campos + cómo se convierten en láminas ---------- */
  var PLANTILLAS = {
    tip: {
      nombre: "Tip en pasos", desc: "Portada, un paso por lámina y cierre.",
      campos: [
        { id: "kicker", t: "Etiqueta", v: "TIP PARA COMERCIOS" },
        { id: "titulo", t: "Título", v: "3 cosas que no pueden faltar en el legajo de cada empleado" },
        { id: "bajada", t: "Bajada", v: "Guardalo y revisalo hoy." },
        { id: "pasos", t: "Pasos (uno por línea)", area: true, v: "Datos personales y CUIL al día\nAlta y documentación laboral completa\nRecibos firmados y novedades registradas", ayuda: "Cada línea es una lámina." },
        { id: "cierre", t: "Cierre", v: "¿Querés que me ocupe yo?" }
      ],
      laminas: function (d) {
        var l = [{ tipo: "portada", kicker: d.kicker, titulo: d.titulo, bajada: d.bajada }];
        lineas(d.pasos).forEach(function (p, i) { l.push({ tipo: "paso", n: i + 1, texto: p }); });
        l.push({ tipo: "cierre", titulo: d.cierre });
        return l;
      }
    },
    dato: {
      nombre: "Dato del mes", desc: "Una sola lámina con el dato bien grande.",
      campos: [
        { id: "kicker", t: "Etiqueta", v: "DATO DEL MES" },
        { id: "dato", t: "Dato destacado", v: "Aguinaldo", ayuda: "Una o dos palabras, se muestra enorme." },
        { id: "titulo", t: "Título", v: "Dejá lista la liquidación con tiempo" },
        { id: "bajada", t: "Bajada", v: "Revisá novedades, licencias y horas extras antes del cierre." }
      ],
      laminas: function (d) { return [{ tipo: "dato", kicker: d.kicker, dato: d.dato, titulo: d.titulo, bajada: d.bajada }]; }
    },
    pregunta: {
      nombre: "Pregunta frecuente", desc: "Pregunta, respuesta y cierre.",
      campos: [
        { id: "pregunta", t: "Pregunta", v: "¿Con cuánta anticipación tengo que enviar las novedades?" },
        { id: "respuesta", t: "Respuesta", area: true, v: "Lo ideal es pasarlas a mitad de mes, así la liquidación sale sin apuros ni errores." },
        { id: "cierre", t: "Cierre", v: "¿Tenés otra duda? Escribime." }
      ],
      laminas: function (d) {
        return [{ tipo: "portada", kicker: "PREGUNTA FRECUENTE", titulo: d.pregunta, bajada: "" },
                { tipo: "respuesta", kicker: "LA RESPUESTA", texto: d.respuesta },
                { tipo: "cierre", titulo: d.cierre }];
      }
    },
    portada: {
      nombre: "Portada simple", desc: "Título y bajada para anuncios.",
      campos: [
        { id: "kicker", t: "Etiqueta", v: "PUNTO ÓPTIMO" },
        { id: "titulo", t: "Título", v: "Liquidación de sueldos para comercios" },
        { id: "bajada", t: "Bajada", v: "Soluciones en RRHH y administración, 100% online." }
      ],
      laminas: function (d) { return [{ tipo: "portada", kicker: d.kicker, titulo: d.titulo, bajada: d.bajada }]; }
    }
  };
  /* El teléfono de la lámina de cierre sale de la configuración de la web (js/config.js). */
  function telefonoContacto() { var c = window.PuntoOptimo && window.PuntoOptimo.CONFIG; return (c && c.whatsappVisible) || ""; }
  function lineas(s) { return String(s || "").split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean); }

  /* ---------- Estado (se recuerda en este navegador) ---------- */
  function pieInicial() { var c = (window.PuntoOptimo && window.PuntoOptimo.CONFIG) || {}; return [c.nombre || "Punto Óptimo", c.ubicacion].filter(Boolean).join(" · "); }
  var estado = { plantilla: "tip", tema: "oscuro", fondo: "aurora", pie: pieInicial(), datos: {}, i: 0 };
  var CLAVE = "po-editor-v1";
  try { var g = JSON.parse(localStorage.getItem(CLAVE) || "null"); if (g && PLANTILLAS[g.plantilla]) { estado.plantilla = g.plantilla; estado.tema = g.tema === "claro" ? "claro" : "oscuro"; estado.fondoGuardado = g.fondo; estado.pie = g.pie || estado.pie; estado.datos = g.datos || {}; } } catch (e) {}
  function aplicarFondoGuardado() { if (FONDOS[estado.fondoGuardado]) estado.fondo = estado.fondoGuardado; }
  function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify({ plantilla: estado.plantilla, tema: estado.tema, fondo: estado.fondo, pie: estado.pie, datos: estado.datos })); } catch (e) {} }
  function datos() {
    var p = PLANTILLAS[estado.plantilla], base = estado.datos[estado.plantilla] || {}, d = {};
    p.campos.forEach(function (c) { d[c.id] = base[c.id] != null ? base[c.id] : c.v; });
    return d;
  }

  /* ---------- Dibujo ---------- */
  var imgs = {};
  ["blanco", "color"].forEach(function (k) { var im = new Image(); im.onload = pedir; im.src = (window.LOGOS || {})[k] || ""; imgs[k] = im; });

  function tintas(tema) {
    return tema === "claro"
      ? { fondo: "#f3f8fb", texto: "#04345c", suave: "#4d6a80", acento: "#0b8f84", linea: "rgba(4,52,92,.18)", logo: "color" }
      : { fondo: COLOR.tinta, texto: "#ffffff", suave: "rgba(255,255,255,.74)", acento: COLOR.agua, linea: "rgba(255,255,255,.22)", logo: "blanco" };
  }
  function envolver(ctx, texto, max) {
    var pal = String(texto).split(/\s+/), out = [], act = "";
    pal.forEach(function (p) { var t = act ? act + " " + p : p; if (ctx.measureText(t).width <= max || !act) act = t; else { out.push(act); act = p; } });
    if (act) out.push(act); return out;
  }
  /* Achica la letra hasta que el texto entre en `maxLin` líneas. */
  function ajustar(ctx, texto, peso, fam, tam, min, max, maxLin) {
    var s = tam, l;
    for (; s >= min; s -= 4) { ctx.font = peso + " " + s + "px " + fam; l = envolver(ctx, texto, max); if (l.length <= maxLin && l.every(function (x) { return ctx.measureText(x).width <= max; })) break; }
    if (s < min) { s = min; ctx.font = peso + " " + s + "px " + fam; l = envolver(ctx, texto, max); }
    return { s: s, lineas: l || [] };
  }
  function bloque(ctx, texto, x, y, peso, fam, tam, min, maxLin, color, inter) {
    var a = ajustar(ctx, texto, peso, fam, tam, min, W - 2 * M, maxLin), lh = Math.round(a.s * (inter || 1.12));
    ctx.font = peso + " " + a.s + "px " + fam; ctx.fillStyle = color; ctx.textBaseline = "alphabetic";
    a.lineas.forEach(function (ln, i) { ctx.fillText(ln, x, y + a.s + i * lh); });
    return a.lineas.length * lh;
  }
  function etiqueta(ctx, t, x, y, color) {
    if (!t) return 0;
    ctx.font = "500 30px " + FM; ctx.fillStyle = color; ctx.textBaseline = "alphabetic";
    if ("letterSpacing" in ctx) ctx.letterSpacing = "6px";
    ctx.fillText(String(t).toUpperCase(), x, y + 30);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    return 30;
  }


  /* ---------- Diseños de fondo (todos con la paleta y los motivos de la web) ---------- */
  function rg(ctx, x, y, r, c0, c1) { var g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c0); g.addColorStop(1, c1); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  function tono(oscuro, a) { return oscuro ? "rgba(255,255,255," + a + ")" : "rgba(4,52,92," + a + ")"; }
  function acento(oscuro, a) { return oscuro ? "rgba(89,209,197," + a + ")" : "rgba(22,110,178," + a + ")"; }
  var FONDOS = {
    aurora: { nombre: "Aurora", dibujar: function (c, o) {
      rg(c, W * .9, H * .12, 760, o ? "rgba(22,110,178,.55)" : "rgba(22,110,178,.16)", "rgba(22,110,178,0)");
      rg(c, W * .05, H * .98, 640, o ? "rgba(89,209,197,.22)" : "rgba(89,209,197,.26)", "rgba(89,209,197,0)");
    } },
    mira: { nombre: "Mira", dibujar: function (c, o) {   /* círculos concéntricos, como la mira de "Por qué Punto Óptimo" */
      rg(c, W * .85, H * .2, 700, o ? "rgba(22,110,178,.45)" : "rgba(22,110,178,.12)", "rgba(22,110,178,0)");
      c.lineWidth = 3;
      for (var r = 150, k = 0; r < 1500; r += 130, k++) { c.strokeStyle = k === 2 ? acento(o, o ? .45 : .5) : tono(o, o ? .12 : .1); c.beginPath(); c.arc(W * .85, H * .2, r, 0, 6.2832); c.stroke(); }
      c.fillStyle = acento(o, o ? .9 : .9); c.beginPath(); c.arc(W * .85, H * .2, 11, 0, 6.2832); c.fill();
    } },
    cuadricula: { nombre: "Cuadrícula", dibujar: function (c, o) {   /* hoja de cálculo / liquidación */
      c.lineWidth = 2; c.strokeStyle = tono(o, o ? .07 : .07);
      for (var x = 0; x <= W; x += 60) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
      for (var y = 0; y <= H; y += 60) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
      rg(c, W * .1, H * .95, 700, o ? "rgba(4,52,92,0)" : "rgba(243,248,251,0)", o ? "rgba(4,52,92,0)" : "rgba(243,248,251,0)");
      c.fillStyle = acento(o, o ? .22 : .16); c.fillRect(W - 60 * 5, 60 * 3, 60 * 4, 60 * 3);   /* una "celda" resaltada */
      c.strokeStyle = acento(o, .9); c.lineWidth = 4; c.strokeRect(W - 60 * 5, 60 * 3, 60 * 4, 60 * 3);
    } },
    diagonal: { nombre: "Diagonal", dibujar: function (c, o) {   /* franja de color en diagonal */
      var g = c.createLinearGradient(W, 0, W * .3, H * .55);
      g.addColorStop(0, o ? "rgba(22,110,178,.85)" : "rgba(22,110,178,.9)"); g.addColorStop(1, o ? "rgba(89,209,197,.55)" : "rgba(89,209,197,.85)");
      c.fillStyle = g; c.beginPath(); c.moveTo(W * .42, 0); c.lineTo(W, 0); c.lineTo(W, H * .36); c.closePath(); c.fill();
      c.fillStyle = tono(o, o ? .06 : .05); c.beginPath(); c.moveTo(0, H); c.lineTo(0, H * .66); c.lineTo(W * .55, H); c.closePath(); c.fill();
    } },
    lupa: { nombre: "Lupa", dibujar: function (c, o) {   /* la lupa de la portada, gigante y tenue */
      rg(c, W * .75, H * .25, 800, o ? "rgba(22,110,178,.4)" : "rgba(22,110,178,.1)", "rgba(22,110,178,0)");
      c.lineCap = "round"; c.strokeStyle = acento(o, o ? .28 : .3); c.lineWidth = 46;
      c.beginPath(); c.arc(W * .72, H * .25, 300, 0, 6.2832); c.stroke();
      c.lineWidth = 70; c.beginPath(); c.moveTo(W * .72 + 212, H * .25 + 212); c.lineTo(W * .72 + 430, H * .25 + 430); c.stroke();
      c.lineWidth = 3; c.strokeStyle = tono(o, o ? .14 : .12); c.beginPath(); c.arc(W * .72, H * .25, 250, 0, 6.2832); c.stroke();
    } }
  };
  function fondo(ctx, T) {
    ctx.fillStyle = T.fondo; ctx.fillRect(0, 0, W, H);
    ctx.save(); (FONDOS[estado.fondo] || FONDOS.aurora).dibujar(ctx, estado.tema === "oscuro"); ctx.restore();
  }

  function dibujar(ctx, lam, n, total) {
    var T = tintas(estado.tema);
    ctx.clearRect(0, 0, W, H);
    fondo(ctx, T);
    var lg = imgs[T.logo];
    if (lg && lg.complete && lg.naturalWidth) ctx.drawImage(lg, M - 8, 64, 96 * (1765 / 780), 96);

    var y = 250;
    if (lam.tipo === "portada") {
      y += etiqueta(ctx, lam.kicker, M, y, T.acento) + 46;
      var hT = bloque(ctx, lam.titulo, M, y, 800, FT, 108, 56, 6, T.texto, 1.06);
      if (lam.bajada) bloque(ctx, lam.bajada, M, y + hT + 40, 400, FX, 42, 30, 4, T.suave, 1.35);
    } else if (lam.tipo === "paso") {
      ctx.font = "800 340px " + FT; ctx.fillStyle = T.acento; ctx.globalAlpha = 0.9; ctx.textBaseline = "alphabetic";
      ctx.fillText(("0" + lam.n).slice(-2), M - 10, 600); ctx.globalAlpha = 1;
      bloque(ctx, lam.texto, M, 680, 700, FT, 80, 48, 6, T.texto, 1.12);
    } else if (lam.tipo === "dato") {
      y += etiqueta(ctx, lam.kicker, M, y, T.acento) + 40;
      var hD = bloque(ctx, lam.dato, M, y, 800, FT, 220, 90, 2, T.acento, 1.0);
      var hT2 = bloque(ctx, lam.titulo, M, y + hD + 50, 700, FT, 70, 44, 4, T.texto, 1.1);
      if (lam.bajada) bloque(ctx, lam.bajada, M, y + hD + hT2 + 80, 400, FX, 40, 28, 5, T.suave, 1.35);
    } else if (lam.tipo === "respuesta") {
      y += etiqueta(ctx, lam.kicker, M, y, T.acento) + 50;
      bloque(ctx, lam.texto, M, y, 500, FX, 62, 36, 10, T.texto, 1.3);
    } else if (lam.tipo === "cierre") {
      y += etiqueta(ctx, "Hablemos", M, y, T.acento) + 50;
      var hC = bloque(ctx, lam.titulo, M, y, 800, FT, 100, 56, 4, T.texto, 1.06);
      var py = y + hC + 70, tx = "Escribime por WhatsApp";
      ctx.font = "600 38px " + FX; var pw = ctx.measureText(tx).width + 90;
      ctx.fillStyle = T.acento; redondo(ctx, M, py, pw, 96, 48); ctx.fill();
      ctx.fillStyle = estado.tema === "oscuro" ? COLOR.tinta : "#ffffff"; ctx.textBaseline = "middle"; ctx.fillText(tx, M + 45, py + 50);
      ctx.textBaseline = "alphabetic"; ctx.fillStyle = T.suave; ctx.font = "400 38px " + FX; ctx.fillText(telefonoContacto(), M, py + 96 + 64);
    }
    /* Pie */
    ctx.strokeStyle = T.linea; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(M, H - 150); ctx.lineTo(W - M, H - 150); ctx.stroke();
    ctx.font = "500 32px " + FM; ctx.fillStyle = T.acento; ctx.textBaseline = "alphabetic";
    ctx.fillText(estado.pie, M, H - 84);
    if (total > 1) { var c = ("0" + n).slice(-2) + " / " + ("0" + total).slice(-2); ctx.textAlign = "right"; ctx.fillText(c, W - M, H - 84); ctx.textAlign = "left"; }
  }
  function redondo(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  /* ---------- Interfaz ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var lienzo = $("lienzo"), ctx = lienzo.getContext("2d"), minis = $("minis"), fuera = document.createElement("canvas");
  fuera.width = W; fuera.height = H;
  var laminas = [], espera = 0;

  function pedir() { cancelAnimationFrame(espera); espera = requestAnimationFrame(pintar); }
  function pintar() {
    laminas = PLANTILLAS[estado.plantilla].laminas(datos());
    if (estado.i >= laminas.length) estado.i = laminas.length - 1;
    if (estado.i < 0) estado.i = 0;
    dibujar(ctx, laminas[estado.i], estado.i + 1, laminas.length);
    $("contador").textContent = (estado.i + 1) + " / " + laminas.length;
    $("bajar-todas").hidden = laminas.length < 2;
    /* Miniaturas */
    minis.textContent = "";
    var fctx = fuera.getContext("2d");
    laminas.forEach(function (l, k) {
      dibujar(fctx, l, k + 1, laminas.length);
      var b = document.createElement("button"), c = document.createElement("canvas");
      c.width = 128; c.height = 160; c.getContext("2d").drawImage(fuera, 0, 0, 128, 160);
      b.type = "button"; b.setAttribute("aria-label", "Lámina " + (k + 1)); if (k === estado.i) b.setAttribute("aria-current", "true");
      b.appendChild(c); b.addEventListener("click", function () { estado.i = k; pedir(); }); minis.appendChild(b);
    });
  }

  function armarPlantillas() {
    var box = $("plantillas"); box.textContent = "";
    Object.keys(PLANTILLAS).forEach(function (k) {
      var p = PLANTILLAS[k], b = document.createElement("button");
      b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(k === estado.plantilla));
      b.innerHTML = "<b></b><small></small>"; b.firstChild.textContent = p.nombre; b.lastChild.textContent = p.desc;
      b.addEventListener("click", function () { estado.plantilla = k; estado.i = 0; guardar(); armarPlantillas(); armarCampos(); pedir(); });
      box.appendChild(b);
    });
  }
  function armarCampos() {
    var box = $("campos"), p = PLANTILLAS[estado.plantilla], d = datos(); box.textContent = "";
    p.campos.forEach(function (c) {
      var l = document.createElement("label"), e = document.createElement(c.area ? "textarea" : "input");
      l.append(document.createTextNode(c.t)); e.value = d[c.id]; e.id = "c-" + c.id; if (!c.area) e.maxLength = 140; else e.maxLength = 600;
      e.addEventListener("input", function () { (estado.datos[estado.plantilla] = estado.datos[estado.plantilla] || {})[c.id] = e.value; guardar(); pedir(); });
      l.appendChild(e);
      if (c.ayuda) { var s = document.createElement("small"); s.textContent = c.ayuda; l.appendChild(s); }
      box.appendChild(l);
    });
  }
  $("pie").value = estado.pie;
  $("pie").addEventListener("input", function () { estado.pie = this.value; guardar(); pedir(); });
  function armarFondos() {
    var box = $("fondos"); box.textContent = "";
    Object.keys(FONDOS).forEach(function (k) {
      var b = document.createElement("button"), c = document.createElement("canvas"), n = document.createElement("span");
      b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(k === estado.fondo));
      c.width = 108; c.height = 135; n.textContent = FONDOS[k].nombre;
      var prev = document.createElement("canvas"); prev.width = W; prev.height = H;
      var pc = prev.getContext("2d"), T = tintas(estado.tema), o = estado.fondo; estado.fondo = k; fondo(pc, T); estado.fondo = o;
      c.getContext("2d").drawImage(prev, 0, 0, 108, 135);
      b.append(c, n); b.addEventListener("click", function () { estado.fondo = k; guardar(); armarFondos(); pedir(); });
      box.appendChild(b);
    });
  }
  function marcarTema() { document.querySelectorAll("#tema button").forEach(function (b) { b.setAttribute("aria-checked", String(b.dataset.v === estado.tema)); }); }
  document.querySelectorAll("#tema button").forEach(function (b) { b.addEventListener("click", function () { estado.tema = b.dataset.v; marcarTema(); armarFondos(); guardar(); pedir(); }); });
  $("ant").addEventListener("click", function () { estado.i--; pedir(); });
  $("sig").addEventListener("click", function () { estado.i++; pedir(); });
  document.addEventListener("keydown", function (e) {
    if (/INPUT|TEXTAREA/.test((e.target || {}).tagName || "")) return;
    if (e.key === "ArrowLeft") { estado.i--; pedir(); } else if (e.key === "ArrowRight") { estado.i++; pedir(); }
  });
  $("btn-ejemplo").addEventListener("click", function () { estado.datos[estado.plantilla] = {}; estado.i = 0; guardar(); armarCampos(); pedir(); });

  /* ---------- Exportar ---------- */
  function nombreArchivo(k) { return "punto-optimo-" + estado.plantilla + "-" + ("0" + (k + 1)).slice(-2) + ".png"; }
  function descargar(k) {
    return new Promise(function (ok) {
      var c = document.createElement("canvas"); c.width = W; c.height = H;
      dibujar(c.getContext("2d"), laminas[k], k + 1, laminas.length);
      c.toBlob(function (blob) {
        var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nombreArchivo(k);
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); ok();
      }, "image/png");
    });
  }
  $("bajar-una").addEventListener("click", function () { descargar(estado.i); });
  $("bajar-todas").addEventListener("click", function () {
    var k = 0; (function sig() { if (k < laminas.length) descargar(k++).then(function () { setTimeout(sig, 350); }); })();
  });

  /* ---------- Arranque: esperar las tipografías para que la exportación salga con la marca ---------- */
  aplicarFondoGuardado(); armarPlantillas(); armarCampos(); marcarTema(); armarFondos(); pintar();
  if (document.fonts && document.fonts.load) {
    Promise.all(['800 40px "Outfit"', '600 40px "Outfit"', '400 40px "Poppins"', '600 40px "Poppins"'].map(function (f) { return document.fonts.load(f); }))
      .then(pedir, pedir);
    document.fonts.ready.then(pedir);
  }

  /* Dentro del panel, avisa su alto para que la página no tenga doble barra de desplazamiento. */
  if (window.parent !== window && window.ResizeObserver) {
    var avisarAlto = function () { try { window.parent.postMessage({ tipo: "po-alto", alto: document.documentElement.scrollHeight }, location.origin); } catch (e) {} };
    new ResizeObserver(avisarAlto).observe(document.body); avisarAlto();
  }
})();
