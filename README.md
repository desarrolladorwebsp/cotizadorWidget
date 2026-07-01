# Cotizador Widget

Script embebible para incrustar el **Cotizador Virtual** en cualquier sitio web con un único `<script>` y un `<div>` contenedor.

## Arquitectura

```
Sitio del cliente                Widget (este repo)              Cotizador Virtual
─────────────────               ──────────────────              ─────────────────
<div data-cotizador-widget>  →  cotizador-widget.js (~3 KB)  →  /embed/{partner}
<script src="...">                 crea iframe + auto-resize         UI + lógica completa
```

**Actualización centralizada:** el iframe apunta siempre al cotizador desplegado en producción. Cuando despliegas cambios en `cotizadorVirtual`, todos los sitios embebidos los reciben automáticamente sin que el cliente actualice nada.

El loader (`cotizador-widget.js`) solo monta el iframe y ajusta la altura; casi nunca necesita cambios.

## Integración rápida

Pega esto en cualquier página HTML:

```html
<div
  id="mi-cotizador"
  data-cotizador-widget
  data-partner="cotizaloantes"
  data-auto-search="true"
></div>

<script
  src="https://TU-DOMINIO-WIDGET/cotizador-widget.js"
  async
></script>
```

### Atributos soportados (`data-*`)

| Atributo | Descripción | Default |
|----------|-------------|---------|
| `data-cotizador-widget` | Marca el contenedor (obligatorio) | — |
| `data-partner` | Slug de entidad aliada | `cotizaloantes` |
| `data-base-url` | URL del cotizador virtual | `https://cotizador.cotizaloantes.cl` |
| `data-min-height` | Altura mínima en px | `720` |
| `data-title` | Título accesible del iframe | `Cotizador de planes de salud` |
| `data-auto-search` | `true` / `1` → agrega `auto=1` | — |
| `data-region`, `data-edad`, `data-ingreso`, … | Deep-link params | — |

Los mismos atributos pueden ir en el `<script>` como fallback global.

### API JavaScript (opcional)

```html
<script src=".../cotizador-widget.js" async></script>
<script>
  window.addEventListener("DOMContentLoaded", () => {
    CotizadorWidget.mount(document.getElementById("mi-cotizador"), {
      partner: "cotizaloantes",
      query: { region: "rm", edad: "35", auto: "1" },
    });
  });
</script>
```

## Desarrollo local

### 1. Cotizador Virtual (puerto 3001)

```bash
cd ../cotizadorVirtual/cotizador-virtual
npm install
npm run dev
```

Verifica: http://localhost:3001/embed/cotizaloantes

### 2. Widget (puerto 3002)

```bash
cd ../cotizadorWidget
npm install
npm run dev
```

Abre: http://localhost:3002/demo.html

### 3. Build de producción

```bash
npm run build
# Genera dist/cotizador-widget.js
npm run preview
```

## Despliegue recomendado

| Proyecto | Hosting | URL ejemplo |
|----------|---------|-------------|
| `cotizador-virtual` | Vercel (existente) | `https://cotizador.cotizaloantes.cl` |
| `cotizadorWidget` | Vercel / CDN estático | `https://widget.cotizaloantes.cl/cotizador-widget.js` |

En Vercel para el widget:
- **Root Directory:** `cotizadorWidget`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

## Seguridad (CSP)

Las rutas `/embed/*` del cotizador envían `Content-Security-Policy: frame-ancestors *` por defecto.

Para restringir dominios en producción, define en `cotizador-virtual`:

```env
EMBED_FRAME_ANCESTORS=https://cotizaloantes.cl https://www.cotizaloantes.cl https://*.tudominio.cl
```

## Rutas embed en cotizador-virtual

| Ruta | Uso |
|------|-----|
| `/embed` | Entidad por defecto (cookie / env) |
| `/embed/cotizaloantes` | Entidad aliada con branding |
| `/?embed=1` | Modo embed en la vista pública estándar |

El modo embed oculta el hero, el botón «Volver» y el FAB de WhatsApp, y notifica la altura al padre vía `postMessage`.
