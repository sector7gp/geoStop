import { isWithinRadius } from "../js/geo.js";

export function loadZonesFromEnv(env = process.env) {
  const zones = [];

  for (let i = 1; i <= 99; i += 1) {
    const prefix = `ZONE_${i}_`;
    const lat = env[`${prefix}LAT`];
    const lng = env[`${prefix}LNG`];
    const url = env[`${prefix}URL`];

    if (!lat && !lng && !url) {
      if (zones.length > 0) break;
      continue;
    }

    if (!lat || !lng || !url) {
      throw new Error(
        `Zona ${i} incompleta: define ZONE_${i}_LAT, ZONE_${i}_LNG y ZONE_${i}_URL`
      );
    }

    const parsedLat = Number(lat);
    const parsedLng = Number(lng);
    const parsedRadius = Number(env[`${prefix}RADIUS`] || 300);

    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
      throw new Error(`Zona ${i}: latitud o longitud inválida`);
    }

    if (!Number.isFinite(parsedRadius) || parsedRadius <= 0) {
      throw new Error(`Zona ${i}: radio inválido`);
    }

    zones.push({
      id: i,
      name: env[`${prefix}NAME`] || `Zona ${i}`,
      lat: parsedLat,
      lng: parsedLng,
      radius: parsedRadius,
      url,
    });
  }

  if (zones.length === 0) {
    throw new Error(
      "No hay zonas configuradas. Define al menos ZONE_1_LAT, ZONE_1_LNG y ZONE_1_URL en .env"
    );
  }

  return zones;
}

export function findMatchingZone(userLat, userLng, zones) {
  const matches = zones
    .map((zone) => {
      const result = isWithinRadius(userLat, userLng, zone, zone.radius);
      return result.allowed ? { zone, distance: result.distance } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance);

  return matches[0] ?? null;
}

export function zonesForClient(zones) {
  return zones.map(({ id, name, lat, lng, radius }) => ({
    id,
    name,
    lat,
    lng,
    radius,
  }));
}
