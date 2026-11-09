/* Tu CV: valida y envía el formulario a api/cv.php. Si el servidor no responde,
   ofrece el camino por WhatsApp para que nadie se quede sin poder mandar su CV. */
(function (ns) {
  "use strict";
  var C = ns.CONFIG, cfg = (C && C.cv) || {};
  var form = document.getElementById("cv-form");
  if (!form) return;
  var listo = document.getElementById("cv-listo");
  var estado = form.querySelector(".cv-estado");
  var maxMB = cfg.maxMB || 5;
  var precio = cfg.precioMejora && !/^\[/.test(cfg.precioMejora) ? cfg.precioMejora : "";
  var pe = form.querySelector("[data-cv-precio]");
  if (pe) pe.textContent = precio ? "Valor: " + precio : "Consultar precio";
  var mb = form.querySelector("[data-cv-mb]"); if (mb) mb.textContent = maxMB;

  function wa(texto) {
    var n = String((C && C.whatsapp) || "").replace(/\D/g, "");
    return n ? "https://wa.me/" + n + "?text=" + encodeURIComponent(texto) : "#contacto";
  }

  /* ---------- Validación de datos: mismas reglas que api/_comun.php ---------- */
  var DESCARTABLES = ["mailinator.com","yopmail.com","guerrillamail.com","tempmail.com","10minutemail.com","trashmail.com","sharklasers.com","getnada.com","dispostable.com","maildrop.cc"];
  var REGLAS = {
    nombre: function (v) {
      if (!v) return "Escribí tu nombre y apellido.";
      if (!/^[\p{L}][\p{L}\s'.\-]{1,78}$/u.test(v)) return "Escribí tu nombre y apellido, solo con letras.";
      var ps = v.split(/\s+/);
      if (ps.length < 2) return "Escribí tu nombre y apellido.";
      for (var i = 0; i < ps.length; i++) if ((ps[i].match(/\p{L}/gu) || []).length < 2) return "Cada parte del nombre necesita al menos 2 letras.";
      if (/(.)\1{3,}/u.test(v) || !/[aeiouáéíóúüy]/i.test(v)) return "Ese nombre no parece real. Revisalo, por favor.";
      return "";
    },
    contacto: function (v) {
      if (!v) return "Dejame un email o un WhatsApp para poder contestarte.";
      if (v.indexOf("@") >= 0) {
        if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v)) return "El email no es válido.";
        if (DESCARTABLES.indexOf(v.split("@").pop().toLowerCase()) >= 0) return "Usá un email personal, no uno temporal.";
        if (/^(.)\1+@/i.test(v)) return "Ese email no parece real.";
        return "";
      }
      if (!/^[\d\s+()\-.]+$/.test(v)) return "Poné un email o un WhatsApp válido (solo números).";
      var d = v.replace(/\D/g, "");
      if (d.indexOf("00") === 0) d = d.slice(2);
      if (d.indexOf("54") === 0 && d.length > 10) d = d.slice(2);
      if (d.charAt(0) === "9" && d.length > 10) d = d.slice(1);
      d = d.replace(/^0+/, "");
      if (d.length < 10 || d.length > 12) return "El WhatsApp tiene que incluir el código de área (ej. 3400 55-1234).";
      if (/^(\d)\1+$/.test(d) || "01234567890123456789".indexOf(d) >= 0) return "Ese número no parece real.";
      return "";
    },
    corto: function (v) {
      if (!v) return "";
      if (v.length < 2 || !/^[\p{L}\p{N}][\p{L}\p{N}\s,.\-\/&()]{1,78}$/u.test(v) || /(.)\1{3,}/u.test(v)) return "Revisá este dato: no parece válido.";
      return "";
    },
    mensaje: function (v) {
      return /(https?:\/\/|www\.|\.com\b|\.ar\b)/i.test(v) ? "Por seguridad, el mensaje no puede tener links." : "";
    }
  };
  var POR_CAMPO = { nombre: "nombre", contacto: "contacto", zona: "corto", rubro: "corto", mensaje: "mensaje" };

  function marcar(nombre, msg) {
    var el = form.elements[nombre], caja = el.parentNode, e = caja.querySelector(".cv-err");
    if (msg) {
      if (!e) { e = document.createElement("small"); e.className = "cv-err"; e.id = "err-" + nombre; caja.appendChild(e); }
      e.textContent = msg; el.setAttribute("aria-invalid", "true"); el.setAttribute("aria-describedby", e.id);
    } else {
      if (e) e.remove(); el.removeAttribute("aria-invalid"); el.removeAttribute("aria-describedby");
    }
    return msg;
  }
  function revisar(nombre) { return marcar(nombre, REGLAS[POR_CAMPO[nombre]](form.elements[nombre].value.trim())); }
  Object.keys(POR_CAMPO).forEach(function (n) {
    form.elements[n].addEventListener("blur", function () { revisar(n); });
    form.elements[n].addEventListener("input", function () { if (form.elements[n].hasAttribute("aria-invalid")) revisar(n); });
  });

  var enviar = form.querySelector("button[type=submit]");

  /* Archivo elegido: nombre y peso visibles, y se puede soltar un archivo encima. */
  var zona = form.querySelector(".cv-archivo"), inputCv = form.elements.cv, nombreCv = form.querySelector("[data-cv-nombre]");
  function tam(b) { return b >= 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB"; }
  function mostrarArchivo() {
    var a = inputCv.files[0];
    zona.classList.toggle("tiene", !!a);
    nombreCv.textContent = a ? a.name + " · " + tam(a.size) : "Tocá para elegir o soltá tu archivo acá";
  }
  inputCv.addEventListener("change", mostrarArchivo);
  ["dragenter", "dragover"].forEach(function (ev) { zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.add("arrastra"); }); });
  ["dragleave", "drop"].forEach(function (ev) { zona.addEventListener(ev, function () { zona.classList.remove("arrastra"); }); });
  zona.addEventListener("drop", function (e) {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files.length) { inputCv.files = e.dataTransfer.files; mostrarArchivo(); }
  });

  function error(m) { estado.textContent = m; estado.className = "cv-estado error"; }
  function info(m) { estado.textContent = m; estado.className = "cv-estado"; }
  function boton(texto, href, clase) {
    var a = document.createElement("a");
    a.className = "cta " + (clase || "azul"); a.textContent = texto; a.href = href;
    a.target = "_blank"; a.rel = "noopener"; return a;
  }

  function exito(datos, servicio, nombre) {
    form.hidden = true; listo.hidden = false;
    listo.setAttribute("tabindex", "-1"); listo.scrollIntoView({ behavior: "smooth", block: "center" }); listo.focus({ preventScroll: true });
    listo.querySelector("#cv-codigo").textContent = datos.codigo;
    var txt = listo.querySelector(".cv-listo-txt"), acc = listo.querySelector(".cv-listo-acc");
    acc.textContent = "";
    if (servicio === "mejorar") {
      txt.textContent = "Para empezar con la mejora de tu CV, se coordina el pago" +
        (precio ? " (" + precio + ")" : "") + ". Después te devuelvo el informe y tu CV mejorado.";
      if (cfg.linkPago) acc.appendChild(boton("Pagar ahora", cfg.linkPago));
      acc.appendChild(boton("Coordinar por WhatsApp", wa("Hola, soy " + nombre + ". Te mandé mi CV para mejorarlo (código " + datos.codigo + "). ¿Cómo hago el pago?"), cfg.linkPago ? "sec" : "azul"));
    } else {
      txt.textContent = "Lo voy a revisar y, si hay una oportunidad que encaje, te escribo.";
      acc.appendChild(boton("Escribime por WhatsApp", wa("Hola, soy " + nombre + ". Te envié mi CV desde la web (código " + datos.codigo + ").")));
    }
    var otro = document.createElement("button");
    otro.type = "button"; otro.className = "cta sec"; otro.textContent = "Enviar otro CV";
    otro.addEventListener("click", function () {
      form.reset(); mostrarArchivo(); estado.textContent = ""; listo.hidden = true; form.hidden = false; form.elements.nombre.focus();
    });
    acc.appendChild(otro);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = form.elements, archivo = f.cv.files[0];
    var primero = null;
    Object.keys(POR_CAMPO).forEach(function (n) { if (revisar(n) && !primero) primero = f[n]; });
    if (primero) { primero.focus(); return error("Revisá los datos marcados antes de enviar."); }
    if (!archivo) return error("Elegí el archivo de tu CV.");
    if (!/\.(pdf|docx?)$/i.test(archivo.name)) return error("El CV tiene que ser PDF o Word.");
    if (archivo.size < 1024) return error("El archivo está vacío o dañado. Probá con otro.");
    if (archivo.size > maxMB * 1048576) return error("El archivo pesa más de " + maxMB + " MB.");
    if (!f.consentimiento.checked) return error("Necesito que aceptes el uso de tus datos para poder recibir el CV.");

    var servicio = form.querySelector("[name=servicio]:checked").value, nombre = f.nombre.value.trim();
    form.setAttribute("aria-busy", "true"); info("Enviando tu CV, un momento…");
    enviar.disabled = true; enviar.textContent = "Enviando…";
    fetch(cfg.apiUrl || "api/cv.php", { method: "POST", body: new FormData(form) })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (x) {
        if (!x.ok || !x.d.ok) {
          var er = new Error((x.d && x.d.error) || "No se pudo enviar.");
          er.campo = x.d && x.d.campo; er.delServidor = true; throw er;
        }
        exito(x.d, servicio, nombre);
      })
      .catch(function (err) {
        if (err.campo && form.elements[err.campo]) { marcar(err.campo, err.message); form.elements[err.campo].focus(); return error("Revisá los datos marcados antes de enviar."); }
        var sinServidor = !err.delServidor && (err instanceof TypeError || err instanceof SyntaxError);
        error(sinServidor ? "No pude enviar el archivo desde acá. Mandámelo por WhatsApp y lo recibo igual." : err.message);
        if (sinServidor && !estado.nextElementSibling.dataset.wa) {
          var a = boton("Enviar por WhatsApp", wa("Hola, quiero enviarte mi CV" + (servicio === "mejorar" ? " para mejorarlo." : ".")), "sec");
          a.dataset.wa = "1"; estado.insertAdjacentElement("afterend", a);
        }
      })
      .finally(function () { form.removeAttribute("aria-busy"); enviar.disabled = false; enviar.textContent = "Enviar mi CV"; });
  });
})(window.PuntoOptimo = window.PuntoOptimo || {});
