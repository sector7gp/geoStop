import { formatDistance, getCurrentPosition } from "./geo.js";

const statusBox = document.getElementById("status-box");
const statusIcon = document.getElementById("status-icon");
const statusTitle = document.getElementById("status-title");
const statusText = document.getElementById("status-text");
const verifyBtn = document.getElementById("verify-btn");
const retryBtn = document.getElementById("retry-btn");
const zonesList = document.getElementById("zones-list");

const ZONE_COLORS = ["#22d3ee", "#6366f1", "#34d399", "#fbbf24", "#f87171"];
let map;
let zones = [];

function setStatus(type, icon, title, text) {
  statusBox.className = `status status-${type}`;
  statusIcon.textContent = icon;
  statusTitle.textContent = title;
  statusText.textContent = text;
}

function setLoading(isLoading) {
  verifyBtn.disabled = isLoading;
  retryBtn.disabled = isLoading;
}

function showActions({ verify, retry }) {
  verifyBtn.classList.toggle("hidden", !verify);
  retryBtn.classList.toggle("hidden", !retry);
}

function renderZonesList() {
  if (zones.length === 0) {
    zonesList.innerHTML = "<li>No hay zonas configuradas.</li>";
    return;
  }

  zonesList.innerHTML = zones
    .map(
      (zone) => `
        <li>
          <strong>${zone.name}</strong>
          <span>${zone.lat.toFixed(5)}, ${zone.lng.toFixed(5)} · ${formatDistance(zone.radius)}</span>
        </li>
      `
    )
    .join("");
}

function initMap() {
  const fallbackCenter = zones[0]
    ? [zones[0].lat, zones[0].lng]
    : [0, 0];

  map = L.map("map", { scrollWheelZoom: false }).setView(fallbackCenter, 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
  }).addTo(map);

  const bounds = [];

  zones.forEach((zone, index) => {
    const color = ZONE_COLORS[index % ZONE_COLORS.length];
    const center = [zone.lat, zone.lng];

    L.marker(center).addTo(map).bindPopup(zone.name);
    const circle = L.circle(center, {
      radius: zone.radius,
      color,
      fillColor: color,
      fillOpacity: 0.15,
      weight: 2,
    }).addTo(map);

    bounds.push(circle.getBounds());
  });

  if (bounds.length === 1) {
    map.fitBounds(bounds[0], { padding: [24, 24], maxZoom: 16 });
  } else if (bounds.length > 1) {
    map.fitBounds(L.latLngBounds(bounds), { padding: [24, 24], maxZoom: 16 });
  }

  window.requestAnimationFrame(() => map.invalidateSize());
}

async function loadZones() {
  const response = await fetch("/api/zones");

  if (!response.ok) {
    throw new Error("No se pudieron cargar las zonas del servidor.");
  }

  const data = await response.json();
  zones = data.zones ?? [];
  renderZonesList();
  initMap();
}

function geoErrorMessage(error) {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Permiso de ubicación denegado. Actívalo en el navegador e inténtalo de nuevo.";
    case error.POSITION_UNAVAILABLE:
      return "No se pudo obtener tu posición. Comprueba GPS/Wi‑Fi e inténtalo otra vez.";
    case error.TIMEOUT:
      return "La solicitud de ubicación tardó demasiado. Reintenta en un lugar con mejor señal.";
    default:
      return "Error desconocido al obtener la ubicación.";
  }
}

async function verifyLocation() {
  setLoading(true);
  showActions({ verify: false, retry: false });
  setStatus(
    "loading",
    "⏳",
    "Verificando ubicación…",
    "Espera mientras el navegador obtiene tu posición."
  );
  statusIcon.innerHTML = '<span class="spinner" aria-hidden="true"></span>';

  try {
    const position = await getCurrentPosition();
    const { latitude, longitude } = position.coords;

    const response = await fetch("/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: latitude, lng: longitude }),
    });

    if (!response.ok) {
      throw new Error("VALIDATION_REQUEST_FAILED");
    }

    const result = await response.json();

    if (result.allowed) {
      setStatus(
        "success",
        "✅",
        "Acceso autorizado",
        `Zona: ${result.zone.name}. Redirigiendo a ${result.redirectUrl}…`
      );
      showActions({ verify: false, retry: false });
      window.setTimeout(() => {
        window.location.href = result.redirectUrl;
      }, 1200);
      return;
    }

    setStatus(
      "error",
      "🚫",
      "Acceso denegado",
      result.message || "No estás dentro de ninguna zona autorizada."
    );
    showActions({ verify: false, retry: true });
  } catch (error) {
    const message =
      error.message === "GEOLOCATION_UNSUPPORTED"
        ? "Tu navegador no soporta geolocalización."
        : error.message === "VALIDATION_REQUEST_FAILED"
          ? "No se pudo validar con el servidor."
          : geoErrorMessage(error);

    setStatus("error", "⚠️", "No se pudo verificar", message);
    showActions({ verify: false, retry: true });
  } finally {
    setLoading(false);
  }
}

async function init() {
  try {
    await loadZones();
  } catch (error) {
    setStatus(
      "error",
      "⚠️",
      "Error al iniciar",
      error.message || "No se pudo cargar la configuración del servidor."
    );
    showActions({ verify: false, retry: false });
    return;
  }

  verifyBtn.addEventListener("click", verifyLocation);
  retryBtn.addEventListener("click", verifyLocation);
}

init();
