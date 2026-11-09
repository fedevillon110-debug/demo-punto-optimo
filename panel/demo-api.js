/* DEMO · Servidor simulado en el navegador.
   GitHub Pages no ejecuta PHP, así que en la demo este archivo hace de "servidor": intercepta las llamadas
   del panel (api.php?r=…) y del formulario de CV de la web (api/cv.php) y las responde con datos de ejemplo
   guardados SOLO en el navegador de quien la prueba (localStorage). No sale nada a internet.
   Usuario: admin · Contraseña: admin. Todos los nombres, teléfonos y mails de la demo son inventados. */
(function () {
  "use strict";
  var CLAVE_DB = "po-demo-db-v1", CLAVE_SESION = "po-demo-sesion";
  var ESTADOS_TRABAJO = ["pendiente", "en curso", "esperando cliente", "hecho"];
  var PRIORIDADES = ["baja", "normal", "alta"];
  var TIPOS_CLIENTE = ["comercio", "estudio contable", "empresa", "persona"];
  var ESTADOS_CV = ["nuevo", "revisado", "clasificado", "recomendado", "mejora en curso", "entregado", "archivado"];
  var MESES = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

  /* ---------- Utilidades ---------- */
  function ahora() { return Math.floor(Date.now() / 1000); }
  function pad(n) { return String(n).padStart(2, "0"); }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function hoy() { return iso(new Date()); }
  function enDias(n) { var d = new Date(); d.setDate(d.getDate() + n); return iso(d); }
  function norm(t) { return String(t == null ? "" : t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function copia(x) { return JSON.parse(JSON.stringify(x)); }
  function Err(msg, estado) { var e = new Error(msg); e.estado = estado || 400; return e; }
  function aleatorio(n) { var s = ""; while (s.length < n) s += Math.random().toString(36).slice(2); return s.slice(0, n); }
  function nombrePeriodo(p) { var m = /^(\d{4})-(\d{2})$/.exec(p || ""); return m ? MESES[+m[2]] + " " + m[1] : p; }

  /* ---------- Base de datos de ejemplo ---------- */
  function sembrar() {
    var t = ahora(), dia = 86400;
    var db = { seq: { clientes: 6, servicios: 8, contratos: 5, trabajos: 9, tareas: 6, lugares: 4, usuarios: 1 }, usuarios: [], clientes: [], servicios: [], contratos: [], trabajos: [], tareas: [], cvs: [], lugares: [], recomendaciones: [], ajustes: { plantillas_wa: null } };
    db.usuarios.push({ id: 1, usuario: "admin", nombre: "Admin Demo", rol: "admin", activo: 1, clave: "admin" });
    [["Liquidación de sueldos", "Sueldos", 1, "Recibos y liquidación mensual (convenio de comercio).", 18000], ["Legajos, altas y bajas", "Sueldos", 0, "Armado y actualización de legajos, altas y bajas.", 9000],
      ["Ausentismo y vacaciones", "Sueldos", 1, "Control de licencias, ausencias y vacaciones.", 6000], ["Conciliaciones bancarias", "Administración", 1, "Conciliación mensual de movimientos.", 15000],
      ["Asistencia administrativa por horas", "Administración", 0, "Tareas administrativas virtuales por hora.", 5000], ["Búsqueda de personal", "Selección", 0, "Perfil, publicación, filtro de CV y primeras entrevistas.", 60000],
      ["Mejora de CV", "Personas", 0, "Informe de mejoras y CV reescrito.", 12000], ["Orientación laboral", "Personas", 0, "Clasificación del CV y recomendación de dónde postularse.", 0]
    ].forEach(function (s, i) { db.servicios.push({ id: i + 1, nombre: s[0], categoria: s[1], precio_base: s[4], recurrente: s[2], activo: 1, descripcion: s[3] }); });
    [["Almacén El Sol", "comercio", "Lucía (encargada)", "3400 55-0101", "elsol@ejemplo.com", "Ciudad Ejemplo"], ["Ferretería La Esquina", "comercio", "Martín", "3400 55-0102", "laesquina@ejemplo.com", "Ciudad Ejemplo"],
      ["Estudio Contable Ríos", "estudio contable", "Dra. Ríos", "3400 55-0103", "estudio@ejemplo.com", "Ciudad Vecina"], ["Panadería Don Julián", "comercio", "Julián", "3400 55-0104", "", "Ciudad Ejemplo"],
      ["Clínica Vida Sana", "empresa", "Administración", "3400 55-0105", "rrhh@ejemplo.com", "Ciudad Vecina"]
    ].forEach(function (c, i) { db.clientes.push({ id: i + 1, nombre: c[0], tipo: c[1], contacto: c[2], whatsapp: c[3], email: c[4], ciudad: c[5], notas: i === 0 ? "Cierra liquidaciones el día 10. Prefiere recibir todo por WhatsApp." : "", activo: 1, creado: t - 60 * dia }); });
    db.clientes.push({ id: 6, nombre: "Camila Torres", tipo: "persona", contacto: "", whatsapp: "3400 55-0106", email: "", ciudad: "Ciudad Ejemplo", notas: "", activo: 1, creado: t - 3 * dia });
    [[1, 1, 48000, 10], [2, 1, 62000, 10], [3, 4, 30000, 15], [4, 1, 35000, 10], [5, 3, 22000, 12]].forEach(function (k, i) { db.contratos.push({ id: i + 1, cliente_id: k[0], servicio_id: k[1], monto: k[2], dia_venc: k[3], activo: 1 }); });
    var per = hoy().slice(0, 7);
    function trab(id, cli, srv, titulo, est, pri, vence, monto, pagado, notas, cv, comp) {
      db.trabajos.push({ id: id, cliente_id: cli, servicio_id: srv, titulo: titulo, estado: est, prioridad: pri, vence: vence, periodo: srv === 1 || srv === 4 ? per : "", monto: monto, pagado: pagado, notas: notas || "", cv_id: cv || "", creado: t - 10 * dia, completado: comp || 0 });
    }
    trab(1, 1, 1, "Liquidación de sueldos · " + nombrePeriodo(per), "en curso", "alta", enDias(-2), 48000, 0, "Faltan las horas extra de dos empleados.");
    trab(2, 2, 1, "Liquidación de sueldos · " + nombrePeriodo(per), "pendiente", "normal", enDias(0), 62000, 0);
    trab(3, 3, 4, "Conciliaciones bancarias · " + nombrePeriodo(per), "esperando cliente", "normal", enDias(3), 30000, 0, "Esperando los extractos de octubre.");
    trab(4, 1, 2, "Legajos, altas y bajas", "hecho", "normal", enDias(-6), 9000, 0, "", "", t - 5 * dia);
    trab(5, 4, 1, "Liquidación de sueldos · " + nombrePeriodo(per), "pendiente", "normal", enDias(6), 35000, 0);
    trab(6, 5, 3, "Ausentismo y vacaciones", "hecho", "normal", enDias(-12), 22000, 1, "", "", t - 9 * dia);
    trab(7, 2, 5, "Asistencia administrativa por horas", "pendiente", "baja", "", 20000, 0);
    trab(8, 4, 2, "Legajos, altas y bajas", "hecho", "normal", enDias(-20), 9000, 1, "", "", t - 18 * dia);
    [[1, "Pedir horas extra de los dos empleados", 0], [1, "Cargar novedades de la semana", 1], [1, "Revisar recibos antes de enviar", 0], [3, "Recibir extractos", 0], [3, "Conciliar movimientos", 0], [5, "Pedir altas y bajas del mes", 0]]
      .forEach(function (k, i) { db.tareas.push({ id: i + 1, trabajo_id: k[0], texto: k[1], hecha: k[2], orden: i }); });
    [["Supermercado Los Álamos", "Comercio", "ventas, caja, atención", "Ciudad Ejemplo", "rrhh@losalamos.example", "Siempre busca cajeros/as."], ["Estudio Contable Ríos", "Contabilidad", "administración, caja, contable", "Ciudad Vecina", "estudio@ejemplo.com", ""],
      ["Distribuidora Norte", "Logística", "administración, depósito, atención", "Ciudad Ejemplo", "personal@norte.example", ""], ["Clínica Vida Sana", "Salud", "administración, atención, recepción", "Ciudad Vecina", "rrhh@ejemplo.com", ""]]
      .forEach(function (l, i) { db.lugares.push({ id: i + 1, nombre: l[0], rubro: l[1], etiquetas: l[2], zona: l[3], contacto: l[4], notas: l[5] }); });
    function cv(i, nombre, contacto, zona, rubro, servicio, estado, dias, extra) {
      var id = aleatorio(16);
      db.cvs.push(Object.assign({ id: id, codigo: id.slice(0, 6).toUpperCase(), recibido: t - dias * dia, nombre: nombre, contacto: contacto, zona: zona, rubro: rubro, mensaje: "", servicio: servicio, extension: "pdf", estado: estado, etiquetas: "", notas: "", pago: servicio === "mejorar" ? "pendiente" : "", monto: "", informe: "", cv_mejorado: "" }, extra || {}));
      return id;
    }
    cv(1, "Valentina Suárez", "3400 55-0201", "Ciudad Ejemplo", "Ventas", "clasificar", "nuevo", 0, { mensaje: "Busco un trabajo de medio tiempo." });
    var idMejora = cv(2, "Joaquín Peralta", "joaquin.peralta@ejemplo.com", "Ciudad Vecina", "Administración", "mejorar", "mejora en curso", 2, { mensaje: "Quiero actualizar mi CV, hace años que no lo toco.", monto: "12000" });
    cv(3, "Camila Torres", "3400 55-0106", "Ciudad Ejemplo", "Atención al cliente", "clasificar", "nuevo", 3);
    cv(4, "Mariana Giménez", "mariana.g@ejemplo.com", "Ciudad Ejemplo", "Contable", "mejorar", "entregado", 15, { pago: "pagado", monto: "12000", etiquetas: "contable, administración, caja" });
    db.trabajos.push({ id: 9, cliente_id: 6, servicio_id: 8, titulo: "Orientación laboral · Camila Torres", estado: "pendiente", prioridad: "normal", vence: "", periodo: "", monto: 0, pagado: 0, notas: "", cv_id: db.cvs[2].id, creado: t - 3 * dia, completado: 0 });
    db.clientes.push({ id: 7, nombre: "Joaquín Peralta", tipo: "persona", contacto: "", whatsapp: "", email: "joaquin.peralta@ejemplo.com", ciudad: "Ciudad Vecina", notas: "", activo: 1, creado: t - 2 * dia });
    db.trabajos.push({ id: 10, cliente_id: 7, servicio_id: 7, titulo: "Mejora de CV · Joaquín Peralta", estado: "en curso", prioridad: "alta", vence: enDias(2), periodo: "", monto: 12000, pagado: 0, notas: "Quiero actualizar mi CV, hace años que no lo toco.", cv_id: idMejora, creado: t - 2 * dia, completado: 0 });
    db.seq.trabajos = 10; db.seq.tareas = 6; db.seq.clientes = 7;
    return db;
  }

  var db = null, enMemoria = null;
  function cargar() {
    if (db) return db;
    try { var g = localStorage.getItem(CLAVE_DB); if (g) db = JSON.parse(g); } catch (e) {}
    if (!db) { db = enMemoria || sembrar(); guardar(); }
    return db;
  }
  function guardar() { enMemoria = db; try { localStorage.setItem(CLAVE_DB, JSON.stringify(db)); } catch (e) {} }
  function siguiente(tabla) { db.seq[tabla] = (db.seq[tabla] || 0) + 1; return db.seq[tabla]; }
  function reiniciar() { try { localStorage.removeItem(CLAVE_DB); } catch (e) {} db = null; enMemoria = null; cargar(); }   /* la sesión se mantiene */
  window.PuntoOptimoDemo = { reiniciar: reiniciar };

  /* ---------- Sesión ---------- */
  function sesion() { try { return JSON.parse(sessionStorage.getItem(CLAVE_SESION) || "null"); } catch (e) { return null; } }
  function datosSesion(u) { return { usuario: u.usuario, nombre: u.nombre, rol: u.rol, csrf: "demo" }; }
  function exigir() { if (!sesion()) throw Err("Tenés que iniciar sesión.", 401); }

  /* ---------- Validación (igual que el servidor) ---------- */
  function limpiar(v, campos, parcial) {
    var out = {};
    Object.keys(campos).forEach(function (n) {
      var tipo = campos[n][0], req = campos[n][1], x = v[n];
      if (!(n in v)) { if (req && !parcial) throw Err("Falta completar: " + n.replace(/_/g, " ") + "."); return; }
      var et = n.charAt(0).toUpperCase() + n.slice(1).replace(/_/g, " ");
      if (tipo === "t") x = String(x == null ? "" : x).trim().slice(0, 2000);
      else if (tipo === "n") { var s = String(x == null ? "" : x).trim(); if (s === "") x = 0; else if (isNaN(+s) || Math.floor(+s) !== +s) throw Err(et + " tiene que ser un número entero."); else x = +s; }
      else if (tipo === "r") { var r = String(x == null ? "" : x).replace(",", ".").trim(); if (r === "") x = 0; else if (isNaN(+r)) throw Err(et + " tiene que ser un número."); else x = +r; if (x < 0) throw Err(et + " no puede ser negativo."); }
      else if (tipo === "b") x = [1, true, "1", "true", "on"].indexOf(x) >= 0 ? 1 : 0;
      else if (tipo === "f") { x = String(x || "").trim(); if (x !== "" && (!/^\d{4}-\d{2}-\d{2}$/.test(x) || isNaN(new Date(x)))) throw Err("La fecha no es válida."); }
      else if (tipo === "p") { x = String(x || "").trim(); if (x !== "" && !/^\d{4}-(0[1-9]|1[0-2])$/.test(x)) throw Err("El período no es válido."); }
      else if (Array.isArray(tipo) && tipo[0] === "e") { x = String(x == null ? "" : x).trim(); if (tipo[1].indexOf(x) < 0) throw Err("Valor no permitido en " + n.replace(/_/g, " ") + "."); }
      if (req && (x === "" || x == null)) throw Err("Falta completar: " + n.replace(/_/g, " ") + ".");
      out[n] = x;
    });
    return out;
  }
  var CAMPOS_CLIENTE = { nombre: ["t", true], tipo: [["e", TIPOS_CLIENTE], false], contacto: ["t", false], whatsapp: ["t", false], email: ["t", false], ciudad: ["t", false], notas: ["t", false], activo: ["b", false] };
  var CAMPOS_SERVICIO = { nombre: ["t", true], categoria: ["t", false], precio_base: ["r", false], recurrente: ["b", false], activo: ["b", false], descripcion: ["t", false] };
  var CAMPOS_CONTRATO = { cliente_id: ["n", true], servicio_id: ["n", true], monto: ["r", false], dia_venc: ["n", false], activo: ["b", false] };
  var CAMPOS_TRABAJO = { cliente_id: ["n", false], servicio_id: ["n", false], titulo: ["t", false], estado: [["e", ESTADOS_TRABAJO], false], prioridad: [["e", PRIORIDADES], false], vence: ["f", false], periodo: ["p", false], monto: ["r", false], pagado: ["b", false], notas: ["t", false] };
  var CAMPOS_TAREA = { trabajo_id: ["n", true], texto: ["t", true], hecha: ["b", false], orden: ["n", false] };
  var CAMPOS_CV = { estado: [["e", ESTADOS_CV], false], etiquetas: ["t", false], notas: ["t", false], pago: [["e", ["", "pendiente", "pagado"]], false], monto: ["t", false], rubro: ["t", false], zona: ["t", false] };
  var CAMPOS_LUGAR = { nombre: ["t", true], rubro: ["t", false], etiquetas: ["t", false], zona: ["t", false], contacto: ["t", false], notas: ["t", false] };

  function por(a, f) { return a.slice().sort(function (x, y) { var u = f(x), v = f(y); return u < v ? -1 : u > v ? 1 : 0; }); }
  function buscar(tabla, id) { return db[tabla].filter(function (x) { return String(x.id) === String(id); })[0]; }

  /* ---------- Trabajos ---------- */
  function trabajoVista(t) {
    var c = buscar("clientes", t.cliente_id), s = buscar("servicios", t.servicio_id), tareas = db.tareas.filter(function (k) { return k.trabajo_id === t.id; });
    return Object.assign({}, t, { cliente: c ? c.nombre : null, cliente_whatsapp: c ? c.whatsapp : null, servicio: s ? s.nombre : null, tareas_total: tareas.length, tareas_hechas: tareas.filter(function (k) { return k.hecha; }).length });
  }
  function listaTrabajos(filtro, orden) {
    var l = db.trabajos.filter(filtro || function () { return true; });
    l = orden ? por(l, orden) : l.sort(function (a, b) { return (a.vence === "") - (b.vence === "") || (a.vence < b.vence ? -1 : a.vence > b.vence ? 1 : 0) || a.id - b.id; });
    return l.map(trabajoVista);
  }
  function trabajoCompleto(id) {
    var t = buscar("trabajos", id); if (!t) throw Err("No existe ese trabajo.", 404);
    var r = trabajoVista(t); r.tareas = por(db.tareas.filter(function (k) { return k.trabajo_id === t.id; }), function (k) { return k.orden * 100000 + k.id; }); return copia(r);
  }
  function tituloAuto(d) { var s = d.servicio_id ? buscar("servicios", d.servicio_id) : null; return (s ? s.nombre : "Trabajo") + (d.periodo ? " · " + nombrePeriodo(d.periodo) : ""); }
  function reflejarEnCv(t) {
    if (!t.cv_id) return; var cv = buscar("cvs", t.cv_id); if (!cv) return;
    if (t.estado === "hecho" && cv.estado !== "archivado") cv.estado = "entregado";
    if (t.pagado && cv.pago !== "") cv.pago = "pagado";
  }

  /* ---------- CV ---------- */
  function cvDetalle(id) {
    var cv = buscar("cvs", id); if (!cv) throw Err("No existe ese CV.", 404);
    var r = copia(cv); r.informe = cv.informe ? JSON.parse(cv.informe) : null;
    r.recomendaciones = por(db.recomendaciones.filter(function (x) { return x.cv_id === id; }), function (x) { return -x.fecha; }).map(function (x) { var l = buscar("lugares", x.lugar_id) || {}; return { id: x.id, fecha: x.fecha, nota: x.nota, nombre: l.nombre, contacto: l.contacto }; });
    var t = db.trabajos.filter(function (x) { return x.cv_id === id; })[0]; r.trabajo_id = t ? t.id : null; return r;
  }
  function palabras() { var o = {}; Array.prototype.slice.call(arguments).forEach(function (t) { norm(t).split(/[^a-z0-9]+/).forEach(function (w) { if (w.length > 2) o[w] = true; }); }); return Object.keys(o); }
  function sugerencias(cv) {
    var mias = palabras(cv.etiquetas, cv.rubro), zona = norm(cv.zona).trim(), ya = db.recomendaciones.filter(function (r) { return r.cv_id === cv.id; }).map(function (r) { return r.lugar_id; }), out = [];
    db.lugares.forEach(function (l) {
      var otras = palabras(l.etiquetas, l.rubro), comunes = mias.filter(function (w) { return otras.indexOf(w) >= 0; }).sort();
      var puntos = comunes.length * 2 + (zona && zona === norm(l.zona).trim() ? 1 : 0);
      if (puntos) out.push(Object.assign({}, l, { puntos: puntos, coincide: comunes, ya_recomendado: ya.indexOf(l.id) >= 0 }));
    });
    return out.sort(function (a, b) { return b.puntos - a.puntos; });
  }
  function analisisSimulado(cv, modo) {
    var rubro = cv.rubro || "Administración", etq = (cv.etiquetas || rubro.toLowerCase() + ", atención, organización").split(/\s*,\s*/).filter(Boolean);
    var r = { resumen: "[Demo: resultado simulado, sin IA real] " + cv.nombre + " tiene un perfil orientado a " + rubro.toLowerCase() + ". En la versión real, este análisis lo genera un modelo de IA a partir del CV.",
      rubro: rubro, nivel: "junior", etiquetas: etq,
      recomendaciones: [{ lugar: "Comercios y pymes de la zona", razon: "Buscan perfiles de " + rubro.toLowerCase() + " con buena atención." }, { lugar: "Estudios contables", razon: "Suelen necesitar apoyo administrativo." }, { lugar: "Empresas medianas", razon: "Tienen búsquedas abiertas de forma regular." }] };
    if (modo === "mejorar") {
      r.puntaje = 62;
      r.problemas = [{ tema: "Falta un resumen profesional", detalle: "El CV empieza directo con la experiencia. Un resumen de 3 líneas ayuda a que lo lean completo.", gravedad: "alta" },
        { tema: "Experiencia sin logros", detalle: "Se listan tareas, pero no resultados concretos (números, plazos, mejoras).", gravedad: "media" },
        { tema: "Formato poco uniforme", detalle: "Las fechas y los títulos se escriben de maneras distintas.", gravedad: "baja" }];
      r.cv_mejorado = "# " + cv.nombre + "\n" + cv.zona + " · " + cv.contacto + "\n\n## Perfil\n- Perfil de " + rubro.toLowerCase() + " con ganas de crecer y buena comunicación.\n- [COMPLETAR: años de experiencia]\n\n## Experiencia\n- [COMPLETAR: puesto, empresa y fechas]\n- Resultado concreto logrado en el puesto\n\n## Formación\n- [COMPLETAR: estudios]\n\n## Herramientas\n- Paquete Office\n- Atención al cliente\n";
    }
    return r;
  }

  /* ---------- Archivos (se generan al vuelo, sin servidor) ---------- */
  var nombresBlob = {};
  function blobUrl(contenido, tipo, nombre) { var u = URL.createObjectURL(new Blob([contenido], { type: tipo })); if (nombre) nombresBlob[u] = nombre; return u; }
  function esc(x) { return String(x == null ? "" : x).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function crc32(b) { var c, t = crc32.t; if (!t) { t = crc32.t = []; for (var n = 0; n < 256; n++) { c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } } c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = t[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(archivos) {
    var enc = new TextEncoder(), partes = [], central = [], desp = 0;
    function u16(n) { return [n & 255, (n >> 8) & 255]; } function u32(n) { return [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255]; }
    Object.keys(archivos).forEach(function (nom) {
      var n = enc.encode(nom), d = enc.encode(archivos[nom]), c = crc32(d);
      var loc = [].concat(u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(c), u32(d.length), u32(d.length), u16(n.length), u16(0));
      partes.push(new Uint8Array(loc), n, d);
      central.push(new Uint8Array([].concat(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(c), u32(d.length), u32(d.length), u16(n.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(desp))), n);
      desp += loc.length + n.length + d.length;
    });
    var tam = 0; central.forEach(function (p) { tam += p.length; });
    return new Blob(partes.concat(central, [new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(Object.keys(archivos).length), u16(Object.keys(archivos).length), u32(tam), u32(desp), u16(0)))]), { type: "application/zip" });
  }
  function docxDe(texto) {
    function p(t, neg, tam) { return "<w:p><w:r>" + (neg || tam ? "<w:rPr>" + (neg ? "<w:b/>" : "") + (tam ? '<w:sz w:val="' + tam + '"/>' : "") + "</w:rPr>" : "") + '<w:t xml:space="preserve">' + esc(t) + "</w:t></w:r></w:p>"; }
    var partes = String(texto).split(/\r?\n/).map(function (l) { var s = l.trim(); return s === "" ? "<w:p/>" : s.indexOf("## ") === 0 ? p(s.slice(3), 1, 28) : s.indexOf("# ") === 0 ? p(s.slice(2), 1, 40) : s.indexOf("- ") === 0 ? p("• " + s.slice(2)) : p(s); });
    return zip({ "[Content_Types].xml": '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
      "_rels/.rels": '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
      "word/document.xml": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + partes.join("") + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>' });
  }
  function pdfDe(lineas) {   /* PDF mínimo de una página con texto */
    function t(s) { return String(s).replace(/[^\x20-\x7e]/g, function (c) { var m = { "á": "\xe1", "é": "\xe9", "í": "\xed", "ó": "\xf3", "ú": "\xfa", "ñ": "\xf1", "Á": "\xc1", "É": "\xc9", "Í": "\xcd", "Ó": "\xd3", "Ú": "\xda", "Ñ": "\xd1", "·": "-" }; return m[c] || "?"; }).replace(/([\\()])/g, "\\$1"); }
    var cont = "BT /F1 12 Tf 56 780 Td 18 TL\n" + lineas.map(function (l) { return "(" + t(l) + ") Tj T*"; }).join("\n") + "\nET";
    var objs = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
      "<< /Length " + cont.length + " >>\nstream\n" + cont + "\nendstream", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"];
    var s = "%PDF-1.4\n", off = []; objs.forEach(function (o, i) { off.push(s.length); s += (i + 1) + " 0 obj\n" + o + "\nendobj\n"; });
    var x = s.length; s += "xref\n0 " + (objs.length + 1) + "\n0000000000 65535 f \n" + off.map(function (o) { return String(o).padStart(10, "0") + " 00000 n \n"; }).join("") + "trailer\n<< /Size " + (objs.length + 1) + " /Root 1 0 R >>\nstartxref\n" + x + "\n%%EOF";
    return s;
  }
  function informeHtml(cv, inf) {
    var probs = (inf.problemas || []).map(function (p) { return "<li><b>" + esc(p.tema) + "</b> <i>(" + esc(p.gravedad) + ")</i><br>" + esc(p.detalle) + "</li>"; }).join("");
    var recs = (inf.recomendaciones || []).map(function (r) { return "<li>" + esc(typeof r === "string" ? r : (r.lugar || r.puesto || "") + ": " + (r.razon || "")) + "</li>"; }).join("");
    return '<!doctype html><meta charset="utf-8"><title>Informe de CV</title><style>body{font:16px/1.5 system-ui,sans-serif;max-width:46rem;margin:2rem auto;padding:0 1rem;color:#0e2433}h1{color:#166eb2}li{margin:.6rem 0}.p{font-size:2rem;color:#166eb2}</style><h1>Informe de tu CV</h1><p><b>' + esc(cv.nombre) + '</b> · Punto Óptimo (demo)</p><p class="p">' + esc(inf.puntaje != null ? inf.puntaje : "—") + "/100</p><p>" + esc(inf.resumen) + "</p><h2>Qué mejorar</h2><ul>" + probs + "</ul><h2>Dónde postularte</h2><ul>" + recs + "</ul>";
  }
  /* Los enlaces de descarga del panel (urlApi) se resuelven acá, sin servidor. */
  var urlApiOriginal = window.urlApi;
  window.urlApi = function (ruta) {
    var m = /^\/api\/cv\/([^/?]+)\/(archivo|exportar)(?:\?formato=(\w+))?/.exec(ruta);
    if (m) {
      cargar(); var cv = buscar("cvs", m[1]); if (!cv) return "#";
      if (m[2] === "archivo") return blobUrl(pdfDe(["CV de ejemplo (demo)", "", cv.nombre, cv.zona + " - " + cv.contacto, "", "Objetivo: " + (cv.rubro || "buscar oportunidades"), "", "Este archivo se genera en la demo.", "En la versión real acá se ve el PDF o Word que envió la persona."]), "application/pdf", "CV " + cv.nombre + ".pdf");
      if (m[3] === "informe" && cv.informe) return blobUrl(informeHtml(cv, JSON.parse(cv.informe)), "text/html;charset=utf-8");
      if (m[3] === "docx") return blobUrl(docxDe(cv.cv_mejorado || "# " + cv.nombre), "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "CV mejorado " + cv.nombre + ".docx");
      return "#";
    }
    if (/^\/api\/backup/.test(ruta)) { cargar(); return blobUrl(JSON.stringify(db, null, 1), "application/json", "copia-demo-" + hoy() + ".json"); }
    return urlApiOriginal(ruta);
  };
  var abrirOriginal = window.open;
  window.open = function (u) {
    if (typeof u === "string" && nombresBlob[u]) { var a = document.createElement("a"); a.href = u; a.download = nombresBlob[u]; document.body.appendChild(a); a.click(); a.remove(); return null; }
    return abrirOriginal.apply(window, arguments);
  };
  document.addEventListener("click", function (e) {   /* enlaces de descarga: ponerles nombre de archivo */
    var a = e.target.closest && e.target.closest("a[href^='blob:']"); if (a && nombresBlob[a.href] && !a.download) a.download = nombresBlob[a.href];
  }, true);

  /* ---------- Rutas ---------- */
  function rutas(metodo, r, d, q) {
    var m;
    if (r === "estado" && metodo === "GET") { var s = sesion(); return { instalado: true, sesion: s }; }
    if (r === "login" && metodo === "POST") {
      var us = String(d.usuario || "").trim().toLowerCase(), u = db.usuarios.filter(function (x) { return x.usuario === us && x.activo; })[0];
      if (!u || u.clave !== String(d.clave || "")) throw Err("Usuario o contraseña incorrectos. En la demo: admin / admin.", 401);
      var ses = datosSesion(u); sessionStorage.setItem(CLAVE_SESION, JSON.stringify(ses)); return ses;
    }
    if (r === "salir" && metodo === "POST") { sessionStorage.removeItem(CLAVE_SESION); return { ok: true }; }
    if (r === "instalar") throw Err("El panel de la demo ya está instalado.", 403);
    exigir();

    if (r === "cuenta/clave" && metodo === "POST") throw Err("En la demo la contraseña no se puede cambiar: es siempre admin.", 403);
    if (r === "usuarios" && metodo === "GET") return db.usuarios.map(function (u) { return { id: u.id, usuario: u.usuario, nombre: u.nombre, rol: u.rol, activo: u.activo }; });
    if (r === "usuarios" && metodo === "POST") {
      var nu = String(d.usuario || "").trim().toLowerCase();
      if (!/^[a-z0-9._-]{3,30}$/.test(nu)) throw Err("El usuario tiene que tener de 3 a 30 letras minúsculas, números, punto o guion.");
      if (db.usuarios.some(function (u) { return u.usuario === nu; })) throw Err("Ese usuario ya existe.");
      if (String(d.clave || "").length < 4) throw Err("En la demo alcanza con 4 caracteres.");
      db.usuarios.push({ id: siguiente("usuarios"), usuario: nu, nombre: String(d.nombre || "").slice(0, 60), rol: "admin", activo: 1, clave: String(d.clave) }); guardar();
      return rutas("GET", "usuarios");
    }
    if ((m = /^usuarios\/(\d+)\/activo$/.exec(r)) && metodo === "POST") {
      var yo = sesion(), uu = buscar("usuarios", m[1]); if (uu && uu.usuario === yo.usuario) throw Err("No podés desactivar tu propio usuario.");
      if (uu) uu.activo = d.activo ? 1 : 0; guardar(); return rutas("GET", "usuarios");
    }

    /* ajustes */
    if (r === "ajustes" && metodo === "GET") return { tiene_clave_ia: false, plantillas_wa: db.ajustes.plantillas_wa };
    if (r === "ajustes" && metodo === "POST") {
      if ("plantillas_wa" in d) {
        var v = d.plantillas_wa;
        if (v === null || (Array.isArray(v) && !v.length)) db.ajustes.plantillas_wa = null;
        else {
          if (!Array.isArray(v) || v.length > 20) throw Err("La lista de mensajes no es válida.");
          db.ajustes.plantillas_wa = v.map(function (p) {
            var nom = String(p.nombre || "").trim(), tex = String(p.texto || "").trim();
            if (!nom || !tex) throw Err("Cada mensaje necesita nombre y texto."); if (nom.length > 60) throw Err("El nombre de un mensaje es demasiado largo (máximo 60 letras)."); if (tex.length > 1000) throw Err("Un mensaje es demasiado largo (máximo 1000 letras).");
            var dn = ["trabajo", "cv", "cliente"].filter(function (x) { return (p.donde || []).indexOf(x) >= 0; });
            return { id: String(p.id || "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30) || "p" + aleatorio(6), nombre: nom, texto: tex, donde: dn.length ? dn : ["trabajo", "cv", "cliente"] };
          });
        }
      }
      guardar(); return { tiene_clave_ia: false, plantillas_wa: db.ajustes.plantillas_wa };
    }

    /* opciones e inicio */
    if (r === "opciones") return { estados: ESTADOS_TRABAJO, prioridades: PRIORIDADES, tipos_cliente: TIPOS_CLIENTE,
      servicios: por(db.servicios.filter(function (s) { return s.activo; }), function (s) { return s.categoria + "|" + s.nombre; }).map(function (s) { return { id: s.id, nombre: s.nombre, categoria: s.categoria, precio_base: s.precio_base, recurrente: s.recurrente }; }),
      clientes: por(db.clientes.filter(function (c) { return c.activo; }), function (c) { return norm(c.nombre); }).map(function (c) { return { id: c.id, nombre: c.nombre }; }) };
    if (r === "inicio") {
      var h = hoy(), en7 = enDias(7), abierto = function (t) { return t.estado !== "hecho"; }, res = { hoy: h, estados: {} };
      ESTADOS_TRABAJO.forEach(function (e) { res.estados[e] = db.trabajos.filter(function (t) { return t.estado === e; }).length; });
      res.atrasados = listaTrabajos(function (t) { return abierto(t) && t.vence && t.vence < h; });
      res.hoy_vencen = listaTrabajos(function (t) { return abierto(t) && t.vence === h; });
      res.semana = listaTrabajos(function (t) { return abierto(t) && t.vence > h && t.vence <= en7; });
      res.sin_fecha = listaTrabajos(function (t) { return abierto(t) && !t.vence; }).slice(0, 6);
      var pc = function (t) { return t.estado === "hecho" && !t.pagado && t.monto > 0; }, lpc = listaTrabajos(pc, function (t) { return -t.completado; });
      res.por_cobrar = { cantidad: lpc.length, total: lpc.reduce(function (a, t) { return a + t.monto; }, 0), lista: lpc.slice(0, 6) };
      var desde = Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000);
      res.cobrado_mes = db.trabajos.filter(function (t) { return t.pagado && t.completado >= desde; }).reduce(function (a, t) { return a + t.monto; }, 0);
      res.hechos_recientes = listaTrabajos(function (t) { return t.estado === "hecho"; }, function (t) { return -t.completado; }).slice(0, 5);
      res.clientes_activos = db.clientes.filter(function (c) { return c.activo; }).length;
      res.cv_nuevos = db.cvs.filter(function (c) { return c.estado === "nuevo"; }).length;
      return res;
    }

    /* clientes */
    if (r === "clientes" && metodo === "GET") {
      var qn = norm(q.q || "");
      return por(db.clientes.filter(function (c) { return norm(c.nombre + " " + c.ciudad + " " + c.contacto).indexOf(qn) >= 0; }), function (c) { return (c.activo ? "0" : "1") + norm(c.nombre); }).map(function (c) {
        return Object.assign({}, c, { abiertos: db.trabajos.filter(function (t) { return t.cliente_id === c.id && t.estado !== "hecho"; }).length, por_cobrar: db.trabajos.filter(function (t) { return t.cliente_id === c.id && t.estado === "hecho" && !t.pagado && t.monto > 0; }).length });
      });
    }
    if ((m = /^clientes\/(\d+)$/.exec(r)) && metodo === "GET") {
      var c = buscar("clientes", m[1]); if (!c) throw Err("No existe ese cliente.", 404);
      var cc = copia(c); cc.trabajos = listaTrabajos(function (t) { return t.cliente_id === c.id; });
      cc.contratos = por(db.contratos.filter(function (k) { return k.cliente_id === c.id; }), function (k) { return (buscar("servicios", k.servicio_id) || {}).nombre; }).map(function (k) { return Object.assign({}, k, { servicio: (buscar("servicios", k.servicio_id) || {}).nombre }); }); return cc;
    }
    if (r === "clientes" && metodo === "POST") { var dc = limpiar(d, CAMPOS_CLIENTE); dc.creado = ahora(); dc.id = siguiente("clientes"); db.clientes.push(Object.assign({ tipo: "comercio", contacto: "", whatsapp: "", email: "", ciudad: "", notas: "", activo: 1 }, dc)); guardar(); return copia(buscar("clientes", dc.id)); }
    if ((m = /^clientes\/(\d+)$/.exec(r)) && metodo === "POST") { var ce = buscar("clientes", m[1]); if (!ce) throw Err("No existe.", 404); Object.assign(ce, limpiar(d, CAMPOS_CLIENTE, true)); guardar(); return copia(ce); }
    if ((m = /^clientes\/(\d+)\/borrar$/.exec(r))) {
      var cb = buscar("clientes", m[1]); if (!cb) throw Err("No existe.", 404);
      if (db.trabajos.some(function (t) { return t.cliente_id === cb.id; })) throw Err("Este cliente tiene trabajos registrados. En vez de borrarlo, archivalo (desmarcá “activo”).");
      db.contratos = db.contratos.filter(function (k) { return k.cliente_id !== cb.id; }); db.clientes = db.clientes.filter(function (x) { return x !== cb; }); guardar(); return { ok: true };
    }

    /* servicios y contratos */
    if (r === "servicios" && metodo === "GET") return por(db.servicios, function (s) { return (s.activo ? "0" : "1") + s.categoria + "|" + s.nombre; });
    if (r === "servicios" && metodo === "POST") { var ds = limpiar(d, CAMPOS_SERVICIO); ds.id = siguiente("servicios"); db.servicios.push(Object.assign({ categoria: "", precio_base: 0, recurrente: 0, activo: 1, descripcion: "" }, ds)); guardar(); return copia(buscar("servicios", ds.id)); }
    if ((m = /^servicios\/(\d+)$/.exec(r)) && metodo === "POST") { var se = buscar("servicios", m[1]); if (!se) throw Err("No existe.", 404); Object.assign(se, limpiar(d, CAMPOS_SERVICIO, true)); guardar(); return copia(se); }
    if ((m = /^servicios\/(\d+)\/borrar$/.exec(r))) {
      var sb = buscar("servicios", m[1]); if (!sb) throw Err("No existe.", 404);
      if (db.trabajos.some(function (t) { return t.servicio_id === sb.id; }) || db.contratos.some(function (k) { return k.servicio_id === sb.id; })) throw Err("Este servicio ya se usó. En vez de borrarlo, desactivalo.");
      db.servicios = db.servicios.filter(function (x) { return x !== sb; }); guardar(); return { ok: true };
    }
    if (r === "contratos" && metodo === "GET") return db.contratos.filter(function (k) { return !q.cliente_id || String(k.cliente_id) === q.cliente_id; }).reverse();
    if (r === "contratos" && metodo === "POST") { var dk = limpiar(d, CAMPOS_CONTRATO); dk.id = siguiente("contratos"); db.contratos.push(Object.assign({ monto: 0, dia_venc: 10, activo: 1 }, dk)); guardar(); return copia(buscar("contratos", dk.id)); }
    if ((m = /^contratos\/(\d+)$/.exec(r)) && metodo === "POST") { var ke = buscar("contratos", m[1]); if (!ke) throw Err("No existe.", 404); Object.assign(ke, limpiar(d, CAMPOS_CONTRATO, true)); guardar(); return copia(ke); }
    if ((m = /^contratos\/(\d+)\/borrar$/.exec(r))) { db.contratos = db.contratos.filter(function (k) { return String(k.id) !== m[1]; }); guardar(); return { ok: true }; }

    /* trabajos y pasos */
    if (r === "trabajos" && metodo === "GET") {
      return listaTrabajos(function (t) {
        if (q.estado && t.estado !== q.estado) return false; if (q.cliente_id && String(t.cliente_id) !== q.cliente_id) return false; if (q.servicio_id && String(t.servicio_id) !== q.servicio_id) return false;
        if (q.por_cobrar !== undefined && q.por_cobrar !== "" && !(t.estado === "hecho" && !t.pagado && t.monto > 0)) return false;
        if (q.q && norm(t.titulo + " " + ((buscar("clientes", t.cliente_id) || {}).nombre || "")).indexOf(norm(q.q)) < 0) return false; return true;
      });
    }
    if ((m = /^trabajos\/(\d+)$/.exec(r)) && metodo === "GET") return trabajoCompleto(m[1]);
    if (r === "trabajos" && metodo === "POST") {
      var dt = limpiar(d, CAMPOS_TRABAJO); if (!dt.cliente_id) delete dt.cliente_id; else if (!buscar("clientes", dt.cliente_id)) throw Err("Ese cliente no existe."); if (!dt.servicio_id) delete dt.servicio_id;
      if (!dt.titulo) dt.titulo = tituloAuto(dt);
      var nt = Object.assign({ id: siguiente("trabajos"), cliente_id: null, servicio_id: null, estado: "pendiente", prioridad: "normal", vence: "", periodo: "", monto: 0, pagado: 0, notas: "", cv_id: "", creado: ahora(), completado: 0 }, dt);
      if (nt.estado === "hecho") nt.completado = ahora(); db.trabajos.push(nt); guardar(); return trabajoCompleto(nt.id);
    }
    if ((m = /^trabajos\/(\d+)$/.exec(r)) && metodo === "POST") {
      var te = buscar("trabajos", m[1]); if (!te) throw Err("No existe ese trabajo.", 404);
      var du = limpiar(d, CAMPOS_TRABAJO, true); if (du.estado && du.estado !== te.estado) du.completado = du.estado === "hecho" ? ahora() : 0;
      Object.assign(te, du); reflejarEnCv(te); guardar(); return trabajoCompleto(te.id);
    }
    if ((m = /^trabajos\/(\d+)\/borrar$/.exec(r))) { db.tareas = db.tareas.filter(function (k) { return String(k.trabajo_id) !== m[1]; }); db.trabajos = db.trabajos.filter(function (t) { return String(t.id) !== m[1]; }); guardar(); return { ok: true }; }
    if (r === "tareas" && metodo === "GET") return por(db.tareas.filter(function (k) { return !q.trabajo_id || String(k.trabajo_id) === q.trabajo_id; }), function (k) { return k.orden * 100000 + k.id; });
    if (r === "tareas" && metodo === "POST") { var dk2 = limpiar(d, CAMPOS_TAREA); dk2.id = siguiente("tareas"); db.tareas.push(Object.assign({ hecha: 0, orden: 0 }, dk2)); guardar(); return copia(buscar("tareas", dk2.id)); }
    if ((m = /^tareas\/(\d+)$/.exec(r)) && metodo === "POST") { var tk = buscar("tareas", m[1]); if (!tk) throw Err("No existe.", 404); Object.assign(tk, limpiar(d, CAMPOS_TAREA, true)); guardar(); return copia(tk); }
    if ((m = /^tareas\/(\d+)\/borrar$/.exec(r))) { db.tareas = db.tareas.filter(function (k) { return String(k.id) !== m[1]; }); guardar(); return { ok: true }; }
    if (r === "generar-mes" && metodo === "POST") {
      var per = limpiar(d, { periodo: ["p", true] }).periodo, creados = 0, ya = 0;
      db.contratos.filter(function (k) { var s = buscar("servicios", k.servicio_id), c2 = buscar("clientes", k.cliente_id); return k.activo && s && s.activo && c2 && c2.activo; }).forEach(function (k) {
        if (db.trabajos.some(function (t) { return t.cliente_id === k.cliente_id && t.servicio_id === k.servicio_id && t.periodo === per; })) { ya++; return; }
        var a = +per.slice(0, 4), mes = +per.slice(5), dd = Math.max(1, Math.min(k.dia_venc || 10, new Date(a, mes, 0).getDate()));
        db.trabajos.push({ id: siguiente("trabajos"), cliente_id: k.cliente_id, servicio_id: k.servicio_id, titulo: buscar("servicios", k.servicio_id).nombre + " · " + nombrePeriodo(per), estado: "pendiente", prioridad: "normal", vence: a + "-" + pad(mes) + "-" + pad(dd), periodo: per, monto: k.monto, pagado: 0, notas: "", cv_id: "", creado: ahora(), completado: 0 }); creados++;
      }); guardar(); return { creados: creados, ya_existian: ya };
    }

    /* CV y lugares */
    if (r === "cvs") return por(db.cvs, function (c) { return -c.recibido; }).map(function (c) { return { id: c.id, codigo: c.codigo, recibido: c.recibido, nombre: c.nombre, contacto: c.contacto, zona: c.zona, rubro: c.rubro, servicio: c.servicio, estado: c.estado, etiquetas: c.etiquetas, pago: c.pago, monto: c.monto }; });
    if ((m = /^cv\/([a-z0-9]+)$/.exec(r)) && metodo === "GET") return cvDetalle(m[1]);
    if ((m = /^cv\/([a-z0-9]+)$/.exec(r)) && metodo === "POST") {
      var cv = buscar("cvs", m[1]); if (!cv) throw Err("No existe ese CV.", 404);
      var dv = limpiar(d, CAMPOS_CV, true); if ("cv_mejorado" in d) dv.cv_mejorado = String(d.cv_mejorado); Object.assign(cv, dv);
      var tv = db.trabajos.filter(function (t) { return t.cv_id === cv.id; })[0];
      if (tv && dv.estado === "entregado" && tv.estado !== "hecho") { tv.estado = "hecho"; tv.completado = ahora(); }
      else if (tv && dv.estado === "mejora en curso" && tv.estado === "pendiente") tv.estado = "en curso";
      if (tv && dv.pago === "pagado") tv.pagado = 1; guardar(); return cvDetalle(cv.id);
    }
    if ((m = /^cv\/([a-z0-9]+)\/sugerencias$/.exec(r))) { var cs = buscar("cvs", m[1]); if (!cs) throw Err("No existe ese CV.", 404); return sugerencias(cs); }
    if ((m = /^cv\/([a-z0-9]+)\/recomendar$/.exec(r))) {
      var cr = buscar("cvs", m[1]); if (!cr) throw Err("No existe ese CV.", 404); if (!d.lugar_id || !buscar("lugares", d.lugar_id)) throw Err("Elegí un lugar.");
      db.recomendaciones.push({ id: db.recomendaciones.length + 1, cv_id: cr.id, lugar_id: +d.lugar_id, fecha: ahora(), nota: String(d.nota || "").slice(0, 500) });
      if (["nuevo", "revisado", "clasificado"].indexOf(cr.estado) >= 0) cr.estado = "recomendado"; guardar(); return { ok: true };
    }
    if ((m = /^cv\/([a-z0-9]+)\/analizar$/.exec(r))) {
      var ca = buscar("cvs", m[1]); if (!ca) throw Err("No existe ese CV.", 404); var modo = d.modo === "mejorar" ? "mejorar" : "clasificar", res2 = analisisSimulado(ca, modo);
      ca.informe = JSON.stringify(res2); if (!ca.etiquetas) ca.etiquetas = res2.etiquetas.join(", "); if (!ca.rubro) ca.rubro = res2.rubro; if (modo === "mejorar" && res2.cv_mejorado) ca.cv_mejorado = res2.cv_mejorado; guardar(); return res2;
    }
    if (r === "lugares" && metodo === "GET") return por(db.lugares, function (l) { return norm(l.nombre); });
    if (r === "lugares" && metodo === "POST") {
      var dl = limpiar(d, CAMPOS_LUGAR); if (d.id) Object.assign(buscar("lugares", d.id) || {}, dl); else db.lugares.push(Object.assign({ id: siguiente("lugares") }, dl)); guardar(); return rutas("GET", "lugares");
    }
    if ((m = /^lugares\/(\d+)\/borrar$/.exec(r))) { db.recomendaciones = db.recomendaciones.filter(function (x) { return String(x.lugar_id) !== m[1]; }); db.lugares = db.lugares.filter(function (l) { return String(l.id) !== m[1]; }); guardar(); return { ok: true }; }
    throw Err("Esta función no está disponible en la demo.", 404);
  }

  /* Formulario de CV de la web pública */
  function recibirCv(fd) {
    function c(k, max) { return String(fd.get(k) || "").trim().slice(0, max); }
    var nombre = c("nombre", 80), contacto = c("contacto", 120), servicio = fd.get("servicio") === "mejorar" ? "mejorar" : "clasificar";
    function falla(campo, msg) { var e = Err(msg, 422); e.campo = campo; throw e; }
    if (!nombre) falla("nombre", "Escribí tu nombre y apellido."); if (!contacto) falla("contacto", "Dejame un email o un WhatsApp para poder contestarte."); if (!fd.get("consentimiento")) falla("consentimiento", "Hace falta aceptar el uso de los datos.");
    var f = fd.get("cv"); if (!f || !f.size) falla("cv", "No llegó el archivo del CV."); if (f.size > 5 * 1048576) falla("cv", "El archivo pesa más de lo permitido.");
    if (!/\.(pdf|docx?)$/i.test(f.name)) falla("cv", "El CV tiene que ser PDF o Word.");
    cargar(); var id = aleatorio(16), codigo = id.slice(0, 6).toUpperCase();
    db.cvs.push({ id: id, codigo: codigo, recibido: ahora(), nombre: nombre, contacto: contacto, zona: c("zona", 80), rubro: c("rubro", 80), mensaje: c("mensaje", 600), servicio: servicio, extension: "pdf", estado: "nuevo", etiquetas: "", notas: "", pago: servicio === "mejorar" ? "pendiente" : "", monto: "", informe: "", cv_mejorado: "" });
    var cli = { id: siguiente("clientes"), nombre: nombre, tipo: "persona", contacto: "", whatsapp: contacto.indexOf("@") < 0 ? contacto : "", email: contacto.indexOf("@") >= 0 ? contacto : "", ciudad: c("zona", 80), notas: "", activo: 1, creado: ahora() };
    db.clientes.push(cli);
    var srv = db.servicios.filter(function (s) { return s.nombre === (servicio === "mejorar" ? "Mejora de CV" : "Orientación laboral"); })[0];
    db.trabajos.push({ id: siguiente("trabajos"), cliente_id: cli.id, servicio_id: srv ? srv.id : null, titulo: (servicio === "mejorar" ? "Mejora de CV" : "Orientación laboral") + " · " + nombre, estado: "pendiente", prioridad: servicio === "mejorar" ? "alta" : "normal", vence: "", periodo: "", monto: servicio === "mejorar" && srv ? srv.precio_base : 0, pagado: 0, notas: c("mensaje", 600), cv_id: id, creado: ahora(), completado: 0 });
    guardar(); return { ok: true, codigo: codigo };
  }

  /* ---------- Intercepta fetch ---------- */
  var fetchOriginal = window.fetch.bind(window);
  function responder(estado, cuerpo) { return new Response(JSON.stringify(cuerpo), { status: estado, headers: { "Content-Type": "application/json" } }); }
  window.fetch = function (entrada, opciones) {
    var u = typeof entrada === "string" ? entrada : (entrada && entrada.url) || "", o = opciones || {};
    try {
      var url = new URL(u, location.href), metodo = (o.method || "GET").toUpperCase();
      if (/\/api\/cv\.php$/.test(url.pathname)) {
        if (metodo !== "POST") return Promise.resolve(responder(405, { ok: false, error: "Método no permitido." }));
        cargar();
        try { return Promise.resolve(responder(200, recibirCv(o.body))); } catch (e) { return Promise.resolve(responder(e.estado || 400, { ok: false, campo: e.campo, error: e.message })); }
      }
      if (/\/api\.php$/.test(url.pathname) && url.searchParams.has("r")) {
        cargar();
        var q = {}; url.searchParams.forEach(function (v, k) { if (k !== "r") q[k] = v; });
        var d = {}; try { d = o.body ? JSON.parse(o.body) : {}; } catch (e) {}
        try { return Promise.resolve(responder(200, rutas(metodo, url.searchParams.get("r").replace(/^\/|\/$/g, ""), d, q))); }
        catch (e) { return Promise.resolve(responder(e.estado || 500, { error: e.message || "Algo salió mal." })); }
      }
    } catch (e) {}
    return fetchOriginal(entrada, opciones);
  };
})();
