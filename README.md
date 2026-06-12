# GeoStop — PoC de validación por geolocalización

Portal que valida la ubicación del usuario contra **zonas definidas en `.env`** y redirige al sitio correspondiente si está dentro del radio permitido.

## Cómo funciona

1. El usuario entra en la landing y pulsa **Verificar ubicación**.
2. El navegador obtiene su posición GPS.
3. El servidor comprueba si está dentro de alguna zona (`ZONE_N_*` en `.env`).
4. Si coincide, redirige a la URL configurada para esa zona (p. ej. `site1.com`, `site2.com`).

## Configuración (`.env`)

Copiá el ejemplo y editá las zonas:

```bash
cp .env.example .env
```

Formato en `.env`:

```env
PORT=3000

ZONE_1_NAME=Buenos Aires
ZONE_1_LAT=-34.6037
ZONE_1_LNG=-58.3816
ZONE_1_RADIUS=300
ZONE_1_URL=https://site1.com

ZONE_2_NAME=Madrid
ZONE_2_LAT=40.4155
ZONE_2_LNG=-3.7074
ZONE_2_RADIUS=300
ZONE_2_URL=https://site2.com
```

Podés agregar más zonas con `ZONE_3_*`, `ZONE_4_*`, etc.

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto del servidor (default: 3000) |
| `GEOSTOP_POST_PARAM` | Nombre del campo POST al redirigir (default: `geostop`) |
| `GEOSTOP_POST_VALUE` | Valor del campo POST al redirigir (default: `true`) |
| `ZONE_N_NAME` | Nombre visible en el mapa (opcional) |
| `ZONE_N_LAT` | Latitud del punto |
| `ZONE_N_LNG` | Longitud del punto |
| `ZONE_N_RADIUS` | Radio en metros (default: 300) |
| `ZONE_N_URL` | URL de redirección si la validación es exitosa |

## Arranque

```bash
npm install
npm run dev
```

Abre `http://localhost:PORT` (según el valor de `PORT` en tu `.env`).

## API

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/zones` | Lista zonas (sin URLs de destino) |
| `POST` | `/api/validate` | Body: `{ "lat": number, "lng": number }` → `{ allowed, redirectUrl?, postFields?, zone? }` |

Si `allowed` es `true`, el navegador va a `/access/:token` y el servidor devuelve un **formulario HTML POST** idéntico al de prueba manual, con `geostop=true` hacia la URL de la zona.

## Estructura

```
geoStop/
├── .env                 # Configuración local (no se sube a git)
├── .env.example         # Plantilla de zonas
├── server.js            # Servidor Express
├── server/zones.js      # Carga y validación de zonas
├── index.html           # Landing
├── js/
│   ├── gate.js          # UI + geolocalización + redirección
│   └── geo.js           # Haversine
└── css/styles.css
```

## Requisitos

- Node.js 18+
- Navegador con API de Geolocation
- **HTTPS o localhost** para geolocalización en producción

## Seguridad

El servidor **no expone** el directorio del proyecto completo. Solo sirve:

- `/` → `index.html`
- `/css/*` → estilos
- `/js/*` → scripts del front

Rutas bloqueadas (404): `.git`, `.env`, `server/`, `node_modules/`, `package.json`, etc.

## Limitaciones (PoC)

- Las coordenadas las envía el cliente; un usuario técnico podría falsificarlas.
- Para producción conviene combinar con otras señales y rate limiting.

## Pruebas sin estar en el punto

1. Cambiá temporalmente las coordenadas en `.env` a tu ubicación actual.
2. O usá la simulación de ubicación del navegador (DevTools → Sensors).
