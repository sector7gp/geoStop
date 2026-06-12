import crypto from "crypto";
import { getAccessPostFields } from "./post-fields.js";

const TOKEN_TTL_MS = 60 * 1000;
const tokens = new Map();

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function createAccessToken(zoneId) {
  const token = crypto.randomBytes(24).toString("hex");
  tokens.set(token, {
    zoneId,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });
  return token;
}

export function consumeAccessToken(token) {
  const entry = tokens.get(token);

  if (!entry) {
    return null;
  }

  tokens.delete(token);

  if (Date.now() > entry.expiresAt) {
    return null;
  }

  return entry.zoneId;
}

export function renderAccessRedirectPage(zone) {
  const postFields = getAccessPostFields();
  const inputs = Object.entries(postFields)
    .map(
      ([name, value]) =>
        `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`
    )
    .join("\n    ");

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Redirigiendo…</title>
  </head>
  <body>
    <p>Acceso autorizado. Redirigiendo…</p>
    <form id="geostop-redirect" action="${escapeHtml(zone.url)}" method="POST">
    ${inputs}
    </form>
    <script>
      document.getElementById("geostop-redirect").submit();
    </script>
  </body>
</html>`;
}
