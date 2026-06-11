import { GEO_CONFIG } from "./config.js";
import {
  formatDistance,
  getCurrentPosition,
  isWithinRadius,
} from "./geo.js";
import { grantAccess, hasValidAccess } from "./session.js";

const TARGET_STORAGE_KEY = "geostop_target";

const statusBox = document.getElementById("status-box");
const statusIcon = document.getElementById("status-icon");
const statusTitle = document.getElementById("status-title");
const statusText = document.getElementById("status-text");
const verifyBtn = document.getElementById("verify-btn");
const retryBtn = document.getElementById("retry-btn");
const enterBtn = document.getElementById("enter-btn");
const targetForm = document.getElementById("target-form");
const applyBtn = document.getElementById("apply-btn");
const formError = document.getElementById("form-error");
const inputLabel = document.getElementById("input-label");
const inputLat = document.getElementById("input-lat");
const inputLng = document.getElementById("input-lng");
const inputRadius = document.getElementById("input-radius");
const targetLabelEl = document.getElementById("target-label");
const targetCoords = document.getElementById("target-coords");
const targetRadiusEl = document.getElementById("target-radius");
const userDistance = document.getElementById("user-distance");
const radiusLabel = document.getElementById("radius-label");

let map;
let marker;
let circle;
let activeTarget = { ...GEO_CONFIG.target };
let activeRadius = GEO_CONFIG.radiusMeters;
let syncTimer;

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

function showFormError(message) {
  if (!message) {
    formError.textContent = "";
    formError.classList.add("hidden");
    return;
  }

  formError.textContent = message;
  formError.classList.remove("hidden");
}

function parseTargetValues({ lat, lng, radiusMeters, label }) {
  const parsedLat = Number(String(lat).trim().replace(",", "."));
  const parsedLng = Number(String(lng).trim().replace(",", "."));
  const parsedRadius =
    radiusMeters != null && radiusMeters !== ""
      ? Number(String(radiusMeters).trim())
      : GEO_CONFIG.radiusMeters;
  const parsedLabel = String(label ?? "").trim() || "Punto personalizado";

  if (!Number.isFinite(parsedLat) || parsedLat < -90 || parsedLat > 90) {
    throw new Error("La latitud debe estar entre -90 y 90.");
  }

  if (!Number.isFinite(parsedLng) || parsedLng < -180 || parsedLng > 180) {
    throw new Error("La longitud debe estar entre -180 y 180.");
  }

  if (!Number.isFinite(parsedRadius) || parsedRadius <= 0) {
    throw new Error("El radio debe ser un número mayor que 0.");
  }

  return {
    target: { lat: parsedLat, lng: parsedLng, label: parsedLabel },
    radiusMeters: parsedRadius,
  };
}

function parseTargetFromForm() {
  return parseTargetValues({
    lat: inputLat.value,
    lng: inputLng.value,
    radiusMeters: inputRadius.value,
    label: inputLabel.value,
  });
}

function saveTargetToStorage(target, radiusMeters) {
  localStorage.setItem(
    TARGET_STORAGE_KEY,
    JSON.stringify({ target, radiusMeters })
  );
}

function loadTargetFromStorage() {
  const raw = localStorage.getItem(TARGET_STORAGE_KEY);
  if (!raw) return null;

  try {
    const data = JSON.parse(raw);
    if (
      !data?.target ||
      !Number.isFinite(data.target.lat) ||
      !Number.isFinite(data.target.lng) ||
      !Number.isFinite(data.radiusMeters)
    ) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function loadTargetFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const lat = params.get("lat");
  const lng = params.get("lng");

  if (lat == null || lng == null || lat === "" || lng === "") {
    return null;
  }

  try {
    return parseTargetValues({
      lat,
      lng,
      radiusMeters: params.get("radius"),
      label: params.get("label"),
    });
  } catch {
    return null;
  }
}

function clearUrlParams() {
  if (!window.location.search) return;
  window.history.replaceState({}, "", window.location.pathname);
}

function fillForm(target, radiusMeters) {
  inputLabel.value = target.label || "";
  inputLat.value = String(target.lat);
  inputLng.value = String(target.lng);
  inputRadius.value = String(radiusMeters);
}

function renderActiveTarget() {
  targetLabelEl.textContent = activeTarget.label;
  targetCoords.textContent = `${activeTarget.lat.toFixed(5)}, ${activeTarget.lng.toFixed(5)}`;
  targetRadiusEl.textContent = formatDistance(activeRadius);
  radiusLabel.textContent = formatDistance(activeRadius);
}

function replaceMapLayers() {
  if (!map) return;

  if (marker) {
    map.removeLayer(marker);
    marker = null;
  }

  if (circle) {
    map.removeLayer(circle);
    circle = null;
  }

  const center = [activeTarget.lat, activeTarget.lng];
  marker = L.marker(center).addTo(map).bindPopup(activeTarget.label);
  circle = L.circle(center, {
    radius: activeRadius,
    color: "#22d3ee",
    fillColor: "#22d3ee",
    fillOpacity: 0.15,
    weight: 2,
  }).addTo(map);

  map.fitBounds(circle.getBounds(), { padding: [24, 24], maxZoom: 17 });
}

function updateMapView() {
  if (!map) return;
  replaceMapLayers();
  window.requestAnimationFrame(() => map.invalidateSize());
}

function setActiveTarget(target, radiusMeters, { updateMap = true } = {}) {
  activeTarget = target;
  activeRadius = radiusMeters;
  renderActiveTarget();
  if (updateMap) {
    updateMapView();
  }
}

function applyTargetFromForm({ persist = true, updateMap = true } = {}) {
  const { target, radiusMeters } = parseTargetFromForm();

  setActiveTarget(target, radiusMeters, { updateMap });
  showFormError("");

  if (persist) {
    saveTargetToStorage(target, radiusMeters);
  }

  return { target, radiusMeters };
}

function scheduleLiveSync() {
  window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    try {
      const { target, radiusMeters } = parseTargetFromForm();
      setActiveTarget(target, radiusMeters);
      showFormError("");
    } catch (error) {
      showFormError(error.message);
    }
  }, 350);
}

function initMap() {
  map = L.map("map", { scrollWheelZoom: false }).setView(
    [activeTarget.lat, activeTarget.lng],
    16
  );

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
  }).addTo(map);

  replaceMapLayers();
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
  let target;
  let radiusMeters;

  try {
    ({ target, radiusMeters } = applyTargetFromForm());
  } catch (error) {
    showFormError(error.message);
    setStatus(
      "error",
      "⚠️",
      "Coordenadas inválidas",
      "Revisa los valores del formulario antes de verificar."
    );
    showActions({ verify: true, retry: false, enter: false });
    return;
  }

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
    const result = isWithinRadius(latitude, longitude, target, radiusMeters);

    userDistance.textContent = formatDistance(result.distance);

    if (result.allowed) {
      grantAccess(target.label);
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
        `Estás a ${formatDistance(result.distance)} del punto. Debes estar dentro de ${formatDistance(radiusMeters)}.`
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

function handleApply() {
  try {
    applyTargetFromForm();
    setStatus(
      "idle",
      "📍",
      "Punto actualizado",
      "Las coordenadas se aplicaron al mapa. Ya puedes verificar tu ubicación."
    );
    showActions({ verify: true, retry: false, enter: false });
  } catch (error) {
    showFormError(error.message);
  }
}

function init() {
  const fromUrl = loadTargetFromUrl();
  const saved = loadTargetFromStorage();

  if (fromUrl) {
    activeTarget = fromUrl.target;
    activeRadius = fromUrl.radiusMeters;
    fillForm(activeTarget, activeRadius);
    saveTargetToStorage(activeTarget, activeRadius);
    clearUrlParams();
  } else if (saved) {
    activeTarget = saved.target;
    activeRadius = saved.radiusMeters;
    fillForm(activeTarget, activeRadius);
  } else {
    fillForm(GEO_CONFIG.target, GEO_CONFIG.radiusMeters);
    activeTarget = { ...GEO_CONFIG.target };
    activeRadius = GEO_CONFIG.radiusMeters;
  }

  renderActiveTarget();
  initMap();

  applyBtn.addEventListener("click", handleApply);
  targetForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handleApply();
  });

  [inputLat, inputLng, inputRadius, inputLabel].forEach((input) => {
    input.addEventListener("input", scheduleLiveSync);
    input.addEventListener("change", scheduleLiveSync);
  });

  window.geoStopApplyFromForm = handleApply;

  if (hasValidAccess()) {
    setStatus(
      "success",
      "✅",
      "Sesión activa",
      "Ya tienes acceso validado en esta pestaña. Puedes entrar al sitio principal."
    );
    showActions({ verify: false, retry: true, enter: true });
  } else {
    verifyBtn.addEventListener("click", verifyLocation);
    retryBtn.addEventListener("click", verifyLocation);
  }
}

try {
  init();
} catch (error) {
  console.error("[GeoStop]", error);
  setStatus(
    "error",
    "⚠️",
    "Error al iniciar",
    "No se pudo cargar el mapa. Recarga la página o revisa la consola del navegador."
  );
}
