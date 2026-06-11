# GeoStop — PoC de validación por geolocalización

Portal de demostración que bloquea el acceso al sitio principal hasta confirmar que el usuario está dentro de un radio de **300 metros** alrededor de un punto definido.

## Cómo funciona

1. El usuario entra en la **landing** (`/`).
2. Pulsa **Verificar ubicación** y el navegador solicita permiso de geolocalización.
3. Se calcula la distancia con la fórmula de **Haversine**.
4. Si la distancia es ≤ 300 m, se guarda una sesión en `sessionStorage` y se habilita el acceso a `/app/`.
5. Si no, se muestra la distancia actual y el acceso queda denegado.

## Requisitos

- Navegador moderno con API de Geolocation.
- **HTTPS o localhost** (los navegadores exigen contexto seguro para geolocalización).
- Permiso de ubicación concedido.

## Arranque rápido

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Configuración

Desde la **landing** puedes definir el punto de validación en el formulario:

- Nombre del punto
- Latitud y longitud
- Radio en metros

Los valores se guardan en `localStorage` del navegador para la próxima visita.

También puedes cambiar los valores por defecto en `js/config.js` (se usan la primera vez, antes de guardar coordenadas personalizadas).

## Estructura

```
geoStop/
├── index.html          # Landing de validación
├── app/index.html      # Sitio principal protegido
├── css/styles.css
├── js/
│   ├── config.js       # Punto y radio
│   ├── geo.js          # Haversine + geolocalización
│   ├── session.js      # Token de acceso en sesión
│   ├── gate.js         # Lógica de la landing
│   └── guard.js        # Protección del sitio principal
└── package.json
```

## Limitaciones de esta PoC

- La validación es **solo en cliente**: un usuario técnico puede saltarse la comprobación.
- No hay backend ni tokens firmados.
- La precisión depende del GPS/Wi‑Fi del dispositivo.
- Para producción, conviene:
  - Validar en servidor con coordenadas enviadas y rate limiting.
  - Usar tokens firmados (JWT) con expiración corta.
  - Combinar con otras señales (IP, QR, etc.) según el caso de uso.

## Pruebas sin estar en el punto

Para desarrollo puedes:

1. Cambiar temporalmente las coordenadas en `config.js` a tu ubicación actual.
2. Usar las herramientas de geolocalización simulada del navegador (DevTools → Sensors → Location).

## Licencia

PoC de demostración — uso libre.
