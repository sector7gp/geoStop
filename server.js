import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import {
  findMatchingZone,
  loadZonesFromEnv,
  zonesForClient,
} from "./server/zones.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, ".env") });

function resolvePort() {
  const raw = process.env.PORT;

  if (raw == null || String(raw).trim() === "") {
    return 3000;
  }

  const port = Number(raw);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT inválido en .env (usa un entero entre 1 y 65535)");
  }

  return port;
}

const app = express();
const port = resolvePort();

let zones;

try {
  zones = loadZonesFromEnv();
} catch (error) {
  console.error(`[GeoStop] Error al cargar configuración: ${error.message}`);
  process.exit(1);
}

app.use(express.json());
app.use(express.static(__dirname));

app.get("/api/zones", (_req, res) => {
  res.json({ zones: zonesForClient(zones) });
});

app.post("/api/validate", (req, res) => {
  const lat = Number(req.body?.lat);
  const lng = Number(req.body?.lng);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return res.status(400).json({ error: "Latitud inválida" });
  }

  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return res.status(400).json({ error: "Longitud inválida" });
  }

  const match = findMatchingZone(lat, lng, zones);

  if (!match) {
    return res.json({
      allowed: false,
      message: "No estás dentro de ninguna zona autorizada.",
    });
  }

  return res.json({
    allowed: true,
    zone: {
      id: match.zone.id,
      name: match.zone.name,
    },
    redirectUrl: match.zone.url,
    distance: match.distance,
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`[GeoStop] Puerto ${port} (desde .env)`);
  console.log(`[GeoStop] http://localhost:${port}`);
  console.log(`[GeoStop] ${zones.length} zona(s) cargada(s) desde .env`);
});
