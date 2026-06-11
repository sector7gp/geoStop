import { GEO_CONFIG } from "./config.js";
import {
  formatDistance,
  getCurrentPosition,
  isWithinRadius,
} from "./geo.js";
import { grantAccess, hasValidAccess } from "./session.js";

const statusBox = document.getElementById("status-box");
const statusIcon = document.getElementById("status-icon");
const statusTitle = document.getElementById("status-title");
const statusText = document.getElementById("status-text");
const verifyBtn = document.getElementById("verify-btn");
const retryBtn = document.getElementById("retry-btn");
const enterBtn = document.getElementById("enter-btn");
const targetLabel = document.getElementById("target-label");
const targetCoords = document.getElementById("target-coords");
const targetRadius = document.getElementById("target-radius");
const userDistance = document.getElementById("user-distance");
const radiusLabel = document.getElementById("radius-label");

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

function showActions({ verify, retry, enter }) {
  verifyBtn.classList.toggle("hidden", !verify);
  retryBtn.classList.toggle("hidden", !retry);
  enterBtn.classList.toggle("hidden", !enter);
}

function initMap() {
  const { target, radiusMeters } = GEO_CONFIG;
  const map = L.map("map", { scrollWheelZoom: false }).setView(
    [target.lat, target.lng],
    16
  );

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
  }).addTo(map);

  L.marker([target.lat, target.lng]).addTo(map).bindPopup(target.label);
  L.circle([target.lat, target.lng], {
    radius: radiusMeters,
    color: "#22d3ee",
    fillColor: "#22d3ee",
    fillOpacity: 0.15,
    weight: 2,
  }).addTo(map);
}

function renderConfig() {
  const { target, radiusMeters } = GEO_CONFIG;
  targetLabel.textContent = target.label;
  targetCoords.textContent = `${target.lat.toFixed(5)}, ${target.lng.toFixed(5)}`;
  targetRadius.textContent = formatDistance(radiusMeters);
  radiusLabel.textContent = formatDistance(radiusMeters);
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
  showActions({ verify: false, retry: false, enter: false });
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
    const result = isWithinRadius(
      latitude,
      longitude,
      GEO_CONFIG.target,
      GEO_CONFIG.radiusMeters
    );

    userDistance.textContent = formatDistance(result.distance);

    if (result.allowed) {
      grantAccess();
      setStatus(
        "success",
        "✅",
        "Acceso autorizado",
        `Estás a ${formatDistance(result.distance)} del punto. Puedes entrar al sitio principal.`
      );
      showActions({ verify: false, retry: true, enter: true });
    } else {
      setStatus(
        "error",
        "🚫",
        "Acceso denegado",
        `Estás a ${formatDistance(result.distance)} del punto. Debes estar dentro de ${formatDistance(GEO_CONFIG.radiusMeters)}.`
      );
      showActions({ verify: false, retry: true, enter: false });
    }
  } catch (error) {
    const message =
      error.message === "GEOLOCATION_UNSUPPORTED"
        ? "Tu navegador no soporta geolocalización."
        : geoErrorMessage(error);

    setStatus("error", "⚠️", "No se pudo verificar", message);
    showActions({ verify: false, retry: true, enter: false });
  } finally {
    setLoading(false);
  }
}

function init() {
  renderConfig();
  initMap();

  if (hasValidAccess()) {
    setStatus(
      "success",
      "✅",
      "Sesión activa",
      "Ya tienes acceso validado en esta pestaña. Puedes entrar al sitio principal."
    );
    showActions({ verify: false, retry: true, enter: true });
    return;
  }

  verifyBtn.addEventListener("click", verifyLocation);
  retryBtn.addEventListener("click", verifyLocation);
}

init();
