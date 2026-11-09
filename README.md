# Punto Óptimo · Demo

Demostración del sitio web y del panel de gestión de **Punto Óptimo** (servicios de RRHH y administración).

> Todos los datos son **de ejemplo e inventados**. No hay servidor ni base de datos: el panel funciona con un
> servidor simulado dentro del navegador y guarda los cambios **solo en tu navegador** (se pueden borrar con
> el botón *Restablecer*).

## Cómo probarla

- **Sitio público:** la página de inicio.
- **Panel de gestión:** `panel/` → usuario `admin`, contraseña `admin` (ya vienen cargados; es solo para probar).
- Probá enviar un CV desde el formulario de la web (cualquier PDF o Word de prueba) y mirá cómo aparece en
  el panel, en *CV*, *Clientes* y *Trabajos*.

## Qué incluye el panel

Inicio con lo urgente del día · tablero de trabajos · clientes y servicios mensuales · base de CV con
clasificación, recomendaciones y descarga del CV mejorado en Word · mensajes de WhatsApp con un toque ·
editor de publicaciones de Instagram (plantillas y descarga en PNG) · ajustes.

## Limitaciones de la demo

- El análisis con IA devuelve un resultado de ejemplo (no usa ninguna IA real).
- La contraseña no se puede cambiar y el "servidor" no existe: es solo para mostrar la interfaz.
- La versión real usa PHP + SQLite y no está incluida acá.

## Probar en tu computadora

```bash
python3 -m http.server 8000
```

Abrir <http://localhost:8000>.
